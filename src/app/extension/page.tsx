'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Chrome,
  Puzzle,
  FolderOpen,
  ToggleRight,
  Mic,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Shield,
  Sparkles,
  Globe,
} from 'lucide-react';

export default function ExtensionPage() {
  const [copied, setCopied] = useState(false);

  const copyExtensionUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">GYPSET</span>
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
          <Chrome className="w-4 h-4" />
          Chrome Extension
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Save Places from Anywhere
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Install the GYPSET Chrome extension to save restaurants, hotels, and attractions
          from any website with one click. Add voice notes to remember why you want to visit.
        </p>

        <a
          href="/gypset-extension.zip"
          download
          className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
        >
          <Download className="w-6 h-6" />
          Download Extension
        </a>
        <p className="text-sm text-gray-500 mt-3">
          Version 1.0.0 • Works with Chrome, Edge, Brave, and Arc
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Save from Any Site</h3>
            <p className="text-gray-600 text-sm">
              Works on TripAdvisor, Yelp, Google Maps, blogs, Instagram, and any website with location info.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Voice Notes</h3>
            <p className="text-gray-600 text-sm">
              Record voice memos about why you want to visit. AI transcribes and creates beautiful descriptions.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Details</h3>
            <p className="text-gray-600 text-sm">
              Automatically extracts hours, phone, ratings, and more from Google Places and the website.
            </p>
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Installation Guide
        </h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-600" />
                  Download & Unzip
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the download button above to get the extension ZIP file.
                  Unzip it to a folder on your computer (e.g., Downloads/gypset-extension).
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">
                    <strong>Tip:</strong> Remember where you save the unzipped folder — you'll need it in step 3.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <Puzzle className="w-5 h-5 text-indigo-600" />
                  Open Chrome Extensions
                </h3>
                <p className="text-gray-600 mb-4">
                  Open Chrome and go to the extensions page. You can do this by:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Type <code className="px-2 py-0.5 bg-gray-100 rounded text-sm font-mono">chrome://extensions</code> in the address bar
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Or click ⋮ menu → Extensions → Manage Extensions
                  </li>
                </ul>
                <button
                  onClick={copyExtensionUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      Copy chrome://extensions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <ToggleRight className="w-5 h-5 text-indigo-600" />
                  Enable Developer Mode
                </h3>
                <p className="text-gray-600 mb-4">
                  In the top-right corner of the extensions page, toggle on <strong>"Developer mode"</strong>.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Why Developer Mode?</strong> This allows you to install extensions that aren't from the Chrome Web Store.
                    The extension is safe — you can review all the code on GitHub.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  Load the Extension
                </h3>
                <p className="text-gray-600 mb-4">
                  Click <strong>"Load unpacked"</strong> button (appears after enabling Developer mode).
                  Select the folder where you unzipped the extension.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    You should see "GYPSET" appear in your extensions list.
                    The extension icon will appear in your browser toolbar!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 - Voice */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-purple-600" />
                  Enable Voice Recording (Optional but Recommended)
                </h3>
                <p className="text-gray-600 mb-4">
                  To use voice notes, you need to grant microphone permission:
                </p>
                <ol className="space-y-3 mb-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-sm font-medium flex-shrink-0">a</span>
                    <span className="text-gray-600">Click the GYPSET extension icon in your toolbar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-sm font-medium flex-shrink-0">b</span>
                    <span className="text-gray-600">Click the microphone button to start recording</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-sm font-medium flex-shrink-0">c</span>
                    <span className="text-gray-600">Chrome will ask for microphone permission — click <strong>"Allow"</strong></span>
                  </li>
                </ol>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-800">
                    <strong>Pro tip:</strong> Voice notes are the magic! Just say why you want to visit and our AI will
                    create a beautiful description with all the important details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          How to Use
        </h2>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Browse</h3>
              <p className="text-white/80 text-sm">
                Find a restaurant, hotel, or attraction you want to save on any website
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Record</h3>
              <p className="text-white/80 text-sm">
                Click the extension, record a voice note about why you want to visit
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Save</h3>
              <p className="text-white/80 text-sm">
                Click save and we'll extract all the details and add it to your trip
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Start Saving Places?
        </h2>
        <p className="text-gray-600 mb-8">
          Create an account to sync your saved places across devices and share trips with friends.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
          >
            Create Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/sunilbhargava511/gypste"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
          >
            <Shield className="w-4 h-4" />
            View Source Code
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2024 GYPSET. Open source travel planning.</p>
        </div>
      </footer>
    </div>
  );
}
