// GYPSET Chrome Extension

const API_BASE = 'https://gypset-production.up.railway.app';

let state = {
  isLoggedIn: false,
  trips: [],
  currentUrl: '',
  currentTitle: '',
  selectedTripId: '',
  isRecording: false,
  recordingTime: 0,
  audioBlob: null,
  audioUrl: null,
  isSubmitting: false,
  showSuccess: false,
  error: null,
  savedLocationId: null,
  savedLocationName: null,
  showNewTripForm: false,
  newTripName: '',
  isCreatingTrip: false,
};

let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentUrl = tab.url;
  state.currentTitle = tab.title;

  // Check if logged in and fetch trips
  await checkAuthAndFetchTrips();
  render();
});

async function checkAuthAndFetchTrips() {
  try {
    const response = await fetch(`${API_BASE}/api/extension/status`, {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      state.isLoggedIn = data.authenticated;
      if (data.authenticated) {
        state.trips = data.trips || [];
        if (state.trips.length > 0) {
          state.selectedTripId = state.trips[0].id;
        }
      }
    } else {
      state.isLoggedIn = false;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    state.isLoggedIn = false;
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.showSuccess) {
    app.innerHTML = renderSuccess();
    attachSuccessListeners();
    return;
  }

  if (!state.isLoggedIn) {
    app.innerHTML = renderLogin();
    return;
  }

  app.innerHTML = renderForm();
  attachEventListeners();
}

function renderLogin() {
  return `
    <div class="login-section">
      <p>Please log in to Gypste to save locations.</p>
      <button class="login-btn" onclick="openLogin()">Open Gypste</button>
    </div>
  `;
}

function renderForm() {
  return `
    <div class="content">
      ${state.error ? `<div class="error-message">${state.error}</div>` : ''}

      <div class="form-group">
        <label>Saving from</label>
        <div class="url-display">${escapeHtml(state.currentTitle || state.currentUrl)}</div>
      </div>

      <div class="form-group">
        <label for="tripSelect">Add to Trip</label>
        ${state.showNewTripForm ? `
          <div class="new-trip-form">
            <input type="text" id="newTripName" placeholder="Enter trip name" value="${escapeHtml(state.newTripName)}">
            <div class="new-trip-actions">
              <button type="button" class="btn-cancel" id="cancelNewTripBtn">Cancel</button>
              <button type="button" class="btn-create" id="createTripBtn" ${state.isCreatingTrip ? 'disabled' : ''}>
                ${state.isCreatingTrip ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ` : `
          <div class="trip-select-wrapper">
            <select id="tripSelect">
              ${state.trips.length === 0 ? '<option value="">No trips yet</option>' : ''}
              ${state.trips.map(trip => `
                <option value="${trip.id}" ${trip.id === state.selectedTripId ? 'selected' : ''}>
                  ${escapeHtml(trip.title)}
                </option>
              `).join('')}
            </select>
            <button type="button" class="btn-new-trip" id="showNewTripBtn" title="Create new trip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        `}
      </div>

      <div class="audio-section">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Voice Note
          <span class="optional-badge">Optional - tell us why you want to visit</span>
        </h3>

        ${state.audioBlob ? renderAudioPreview() : renderRecordButton()}
      </div>

      <button class="submit-btn" id="submitBtn" ${state.isSubmitting || !state.selectedTripId ? 'disabled' : ''}>
        ${state.isSubmitting ? `
          <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
          Saving...
        ` : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save This Place
        `}
      </button>

      <p class="helper-text">We'll automatically extract the name, address, hours, and other details.</p>
    </div>

    ${state.isSubmitting ? `
      <div class="processing-overlay">
        <div class="spinner"></div>
        <p>Extracting details & saving...</p>
      </div>
    ` : ''}
  `;
}

function renderRecordButton() {
  if (state.isRecording) {
    return `
      <div class="timer">${formatTime(state.recordingTime)}</div>
      <button class="record-btn recording" id="recordBtn">
        <div class="record-icon"></div>
        Stop Recording
      </button>
    `;
  }

  return `
    <button class="record-btn idle" id="recordBtn">
      <div class="record-icon"></div>
      Start Recording
    </button>
  `;
}

function renderAudioPreview() {
  return `
    <div class="audio-preview">
      <audio controls src="${state.audioUrl}"></audio>
      <div class="audio-actions">
        <button class="delete" id="deleteAudioBtn">Delete</button>
        <button id="reRecordBtn">Re-record</button>
      </div>
    </div>
  `;
}

function renderSuccess() {
  return `
    <div class="content">
      <div class="success-message">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2>Saved!</h2>
        <p>${state.savedLocationName ? escapeHtml(state.savedLocationName) : 'Location'} has been added to your trip.</p>
        <div class="success-actions">
          <button class="secondary" id="addAnotherBtn">Save Another</button>
          <button class="primary" id="viewLocationBtn">View Details</button>
        </div>
      </div>
    </div>
  `;
}

function attachSuccessListeners() {
  const addAnotherBtn = document.getElementById('addAnotherBtn');
  if (addAnotherBtn) {
    addAnotherBtn.addEventListener('click', resetForm);
  }

  const viewLocationBtn = document.getElementById('viewLocationBtn');
  if (viewLocationBtn) {
    viewLocationBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${API_BASE}/dashboard/locations/${state.savedLocationId}` });
    });
  }
}

function attachEventListeners() {
  const tripSelect = document.getElementById('tripSelect');
  if (tripSelect) {
    tripSelect.addEventListener('change', (e) => {
      state.selectedTripId = e.target.value;
    });
  }

  const showNewTripBtn = document.getElementById('showNewTripBtn');
  if (showNewTripBtn) {
    showNewTripBtn.addEventListener('click', () => {
      state.showNewTripForm = true;
      state.newTripName = '';
      render();
    });
  }

  const cancelNewTripBtn = document.getElementById('cancelNewTripBtn');
  if (cancelNewTripBtn) {
    cancelNewTripBtn.addEventListener('click', () => {
      state.showNewTripForm = false;
      state.newTripName = '';
      render();
    });
  }

  const newTripNameInput = document.getElementById('newTripName');
  if (newTripNameInput) {
    newTripNameInput.addEventListener('input', (e) => {
      state.newTripName = e.target.value;
    });
    newTripNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        createNewTrip();
      }
    });
  }

  const createTripBtn = document.getElementById('createTripBtn');
  if (createTripBtn) {
    createTripBtn.addEventListener('click', createNewTrip);
  }

  const recordBtn = document.getElementById('recordBtn');
  if (recordBtn) {
    recordBtn.addEventListener('click', toggleRecording);
  }

  const deleteAudioBtn = document.getElementById('deleteAudioBtn');
  if (deleteAudioBtn) {
    deleteAudioBtn.addEventListener('click', deleteAudio);
  }

  const reRecordBtn = document.getElementById('reRecordBtn');
  if (reRecordBtn) {
    reRecordBtn.addEventListener('click', () => {
      deleteAudio();
      toggleRecording();
    });
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitLocation);
  }
}

async function createNewTrip() {
  if (!state.newTripName.trim()) {
    state.error = 'Please enter a trip name.';
    render();
    return;
  }

  state.isCreatingTrip = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${API_BASE}/api/trips`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: state.newTripName.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create trip');
    }

    const newTrip = await response.json();

    // Add to trips list and select it
    state.trips.unshift(newTrip);
    state.selectedTripId = newTrip.id;
    state.showNewTripForm = false;
    state.newTripName = '';
    state.isCreatingTrip = false;
    render();
  } catch (error) {
    console.error('Create trip failed:', error);
    state.error = error.message || 'Failed to create trip. Please try again.';
    state.isCreatingTrip = false;
    render();
  }
}

async function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      state.audioBlob = blob;
      state.audioUrl = URL.createObjectURL(blob);
      stream.getTracks().forEach(track => track.stop());
      render();
    };

    mediaRecorder.start();
    state.isRecording = true;
    state.recordingTime = 0;

    recordingInterval = setInterval(() => {
      state.recordingTime++;
      render();
    }, 1000);

    render();
  } catch (error) {
    console.error('Failed to start recording:', error);
    state.error = 'Microphone access denied. Please allow microphone access in your browser settings.';
    render();
  }
}

function stopRecording() {
  if (mediaRecorder && state.isRecording) {
    mediaRecorder.stop();
    state.isRecording = false;
    clearInterval(recordingInterval);
  }
}

function deleteAudio() {
  if (state.audioUrl) {
    URL.revokeObjectURL(state.audioUrl);
  }
  state.audioBlob = null;
  state.audioUrl = null;
  render();
}

async function submitLocation() {
  if (!state.selectedTripId) {
    state.error = 'Please select or create a trip first.';
    render();
    return;
  }

  state.isSubmitting = true;
  state.error = null;
  render();

  try {
    const formData = new FormData();
    formData.append('tripId', state.selectedTripId);
    formData.append('sourceUrl', state.currentUrl);
    // Name is now optional - backend will extract from URL content
    formData.append('name', state.currentTitle || '');

    if (state.audioBlob) {
      formData.append('audio', state.audioBlob, 'recording.webm');
    }

    const response = await fetch(`${API_BASE}/api/extension/save-location`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save location');
    }

    const result = await response.json();
    state.savedLocationId = result.id;
    state.savedLocationName = result.name;
    state.showSuccess = true;
    state.isSubmitting = false;
    render();
  } catch (error) {
    console.error('Submit failed:', error);
    state.error = error.message || 'Failed to save location. Please try again.';
    state.isSubmitting = false;
    render();
  }
}

async function resetForm() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentUrl = tab.url;
  state.currentTitle = tab.title;
  state.audioBlob = null;
  state.audioUrl = null;
  state.showSuccess = false;
  state.savedLocationId = null;
  state.savedLocationName = null;
  state.error = null;
  render();
}

function openLogin() {
  chrome.tabs.create({ url: `${API_BASE}/login` });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Global function for onclick
window.openLogin = openLogin;
