'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  maxDuration?: number; // in seconds, 0 = unlimited
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, maxDuration = 0, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;
        onRecordingComplete(blob, finalDuration);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Auto-stop if max duration reached
        if (maxDuration > 0 && elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (permissionDenied) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">
          Microphone access denied. Please enable it in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>

        {isRecording && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-lg font-mono text-gray-900">
            {formatDuration(duration)}
            {maxDuration > 0 && (
              <span className="text-gray-400">/{formatDuration(maxDuration)}</span>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-4">
        {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
      </p>

      {maxDuration > 0 && !isRecording && (
        <p className="text-xs text-gray-400">
          Maximum duration: {formatDuration(maxDuration)}
        </p>
      )}
    </div>
  );
}

interface ProcessingIndicatorProps {
  stage: 'transcribing' | 'generating' | 'tagging' | 'done';
}

export function ProcessingIndicator({ stage }: ProcessingIndicatorProps) {
  const stages = [
    { id: 'transcribing', label: 'Transcribing audio...' },
    { id: 'generating', label: 'Generating description...' },
    { id: 'tagging', label: 'Extracting tags...' },
    { id: 'done', label: 'Complete!' },
  ];

  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <div className="space-y-2">
        {stages.map((s, idx) => (
          <div
            key={s.id}
            className={`flex items-center gap-2 text-sm ${
              idx < currentIndex
                ? 'text-green-600'
                : idx === currentIndex
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }`}
          >
            {idx < currentIndex ? (
              <span className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">
                ✓
              </span>
            ) : idx === currentIndex ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-gray-300" />
            )}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
