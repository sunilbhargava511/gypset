'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Check, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKeyConfig {
  key: string;
  label: string;
  description: string;
  helpUrl: string;
  helpSteps: string[];
}

const API_KEYS: ApiKeyConfig[] = [
  {
    key: 'google_api_key',
    label: 'Google API Key',
    description: 'Required for Gemini AI (text generation, audio transcription, geocoding), Maps, and imports',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    helpSteps: [
      'Go to console.cloud.google.com/apis/credentials',
      'Sign in with your Google account',
      'Create a new project or select existing one',
      'Click "Create Credentials" → "API Key"',
      'Copy the generated API key',
      'Go to "APIs & Services" → "Library"',
      'Enable: Generative Language API, Maps JavaScript API, Places API',
    ],
  },
];

export default function ApiKeysPage() {
  const [settings, setSettings] = useState<Record<string, { value: string; hasValue: boolean }>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });

      if (res.ok) {
        toast.success('API key saved successfully');
        setEditingKey(null);
        setNewValue('');
        fetchSettings();
      } else {
        toast.error('Failed to save API key');
      }
    } catch {
      toast.error('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Keys Configuration</h1>
        <p className="text-gray-500 mt-1">Configure the API keys required for the application to function</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Simplified Setup</h3>
            <p className="text-sm text-green-700 mt-1">
              GYPSET uses Google for everything - Gemini AI for transcription, text generation, geocoding, and Google Maps for map display. You only need one API key!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <p className="text-sm text-yellow-700 mt-1">
              API keys are stored securely in the database. Never share these keys publicly or commit them to version control.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {API_KEYS.map((apiKey) => {
          const setting = settings[apiKey.key];
          const isEditing = editingKey === apiKey.key;
          const isHelpExpanded = expandedHelp === apiKey.key;

          return (
            <div key={apiKey.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{apiKey.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">{apiKey.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {setting?.hasValue ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                        <Check className="w-4 h-4" />
                        Configured
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                        Not Set
                      </span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <input
                        type={showValue[apiKey.key] ? 'text' : 'password'}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={`Enter your ${apiKey.label}`}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowValue((prev) => ({ ...prev, [apiKey.key]: !prev[apiKey.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showValue[apiKey.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(apiKey.key)}
                        disabled={saving || !newValue}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(null);
                          setNewValue('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-4">
                    {setting?.hasValue && (
                      <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-600 truncate">
                        {setting.value}
                      </code>
                    )}
                    <button
                      onClick={() => {
                        setEditingKey(apiKey.key);
                        setNewValue('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      {setting?.hasValue ? 'Update' : 'Add Key'}
                    </button>
                  </div>
                )}

                {/* Help section */}
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedHelp(isHelpExpanded ? null : apiKey.key)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    {isHelpExpanded ? 'Hide' : 'Show'} setup instructions
                  </button>
                </div>
              </div>

              {isHelpExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">How to get this API key:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    {apiKey.helpSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <a
                    href={apiKey.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Open {apiKey.label.split(' ')[0]} Console
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pricing Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900">Google Gemini 2.0 Flash</h3>
            <p className="text-sm text-gray-500 mt-1">$0.10 / million input tokens, $0.40 / million output tokens</p>
            <p className="text-xs text-green-600 mt-1">Very affordable - handles text, audio, and images!</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Google Maps JavaScript API</h3>
            <p className="text-sm text-gray-500 mt-1">$7.00 per 1,000 loads after free tier (28,000 free loads/month)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
