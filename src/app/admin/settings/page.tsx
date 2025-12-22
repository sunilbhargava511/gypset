'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Settings {
  [key: string]: {
    value: string;
    hasValue: boolean;
    description: string | null;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data);

      // Initialize local values
      const initial: Record<string, string> = {};
      Object.entries(data).forEach(([key, setting]) => {
        if (!key.includes('api_key')) {
          initial[key] = (setting as { value: string }).value;
        }
      });
      setLocalValues(initial);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: localValues[key] }),
      });

      if (res.ok) {
        toast.success('Setting saved');
        fetchSettings();
      } else {
        toast.error('Failed to save setting');
      }
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(null);
    }
  };

  const handleChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanged = (key: string) => {
    return localValues[key] !== settings[key]?.value;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure application behavior and limits</p>
      </div>

      {/* Audio Recording Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Audio Recording</h2>

        <div className="space-y-6">
          <div>
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">Enable Audio Recording</span>
                <p className="text-sm text-gray-500 mt-1">
                  Allow users to record voice notes for locations
                </p>
              </div>
              <button
                onClick={() => {
                  const newValue = localValues['audio_recording_enabled'] === 'true' ? 'false' : 'true';
                  handleChange('audio_recording_enabled', newValue);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localValues['audio_recording_enabled'] === 'true' ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localValues['audio_recording_enabled'] === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            {hasChanged('audio_recording_enabled') && (
              <button
                onClick={() => handleSave('audio_recording_enabled')}
                disabled={saving === 'audio_recording_enabled'}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving === 'audio_recording_enabled' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Maximum Audio Duration (seconds)</span>
              <p className="text-sm text-gray-500 mt-1">
                Set to 0 for unlimited duration. Longer recordings cost more to transcribe.
              </p>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  value={localValues['max_audio_duration_seconds'] || '0'}
                  onChange={(e) => handleChange('max_audio_duration_seconds', e.target.value)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-sm text-gray-500">
                  {parseInt(localValues['max_audio_duration_seconds'] || '0') === 0
                    ? 'Unlimited'
                    : `${Math.floor(parseInt(localValues['max_audio_duration_seconds'] || '0') / 60)}m ${parseInt(localValues['max_audio_duration_seconds'] || '0') % 60}s`}
                </span>
                {hasChanged('max_audio_duration_seconds') && (
                  <button
                    onClick={() => handleSave('max_audio_duration_seconds')}
                    disabled={saving === 'max_audio_duration_seconds'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving === 'max_audio_duration_seconds' ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Cost Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cost Alerts</h2>

        <div>
          <label className="block">
            <span className="text-sm font-medium text-gray-900">Monthly Cost Alert Threshold (USD)</span>
            <p className="text-sm text-gray-500 mt-1">
              Receive an alert when monthly API costs exceed this amount
            </p>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={localValues['cost_alert_threshold_usd'] || '100'}
                  onChange={(e) => handleChange('cost_alert_threshold_usd', e.target.value)}
                  className="w-32 pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {hasChanged('cost_alert_threshold_usd') && (
                <button
                  onClick={() => handleSave('cost_alert_threshold_usd')}
                  disabled={saving === 'cost_alert_threshold_usd'}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving === 'cost_alert_threshold_usd' ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* LLM Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">LLM Configuration</h2>

        <div className="space-y-6">
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Claude Model</span>
              <p className="text-sm text-gray-500 mt-1">
                Choose the Claude model for text generation and geocoding
              </p>
              <div className="mt-2 flex items-center gap-4">
                <select
                  value={localValues['claude_model'] || 'claude-sonnet-4-20250514'}
                  onChange={(e) => handleChange('claude_model', e.target.value)}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Faster, Cheaper)</option>
                </select>
                {hasChanged('claude_model') && (
                  <button
                    onClick={() => handleSave('claude_model')}
                    disabled={saving === 'claude_model'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving === 'claude_model' ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Whisper Model</span>
              <p className="text-sm text-gray-500 mt-1">
                Choose the Whisper model for audio transcription
              </p>
              <div className="mt-2 flex items-center gap-4">
                <select
                  value={localValues['whisper_model'] || 'whisper-1'}
                  onChange={(e) => handleChange('whisper_model', e.target.value)}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="whisper-1">Whisper-1 (Default)</option>
                </select>
                {hasChanged('whisper_model') && (
                  <button
                    onClick={() => handleSave('whisper_model')}
                    disabled={saving === 'whisper_model'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving === 'whisper_model' ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
