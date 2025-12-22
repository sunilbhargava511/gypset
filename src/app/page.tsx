import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { MapPin, Mic, Tag, Share2, Map, Search } from 'lucide-react';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Trip Curator</span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Curate Your Travels with{' '}
            <span className="text-indigo-600">AI-Powered</span> Notes
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Bookmark places from the web, record your thoughts, and let AI transform them into
            polished travel writing with smart tags for easy discovery.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything You Need to Plan Perfect Trips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Bookmark from Anywhere
              </h3>
              <p className="text-gray-600">
                Save places from any URL. We automatically extract location info and coordinates.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Voice Notes to Travel Writing
              </h3>
              <p className="text-gray-600">
                Record your thoughts and let AI transform them into polished travel descriptions.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Auto-Tagging
              </h3>
              <p className="text-gray-600">
                AI automatically extracts tags for ambience, timing, cuisine, and more.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Interactive Maps
              </h3>
              <p className="text-gray-600">
                Visualize all your places on a beautiful map with click-to-view details.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Powerful Search
              </h3>
              <p className="text-gray-600">
                Find the perfect spot with text search and tag-based filtering.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share with Friends
              </h3>
              <p className="text-gray-600">
                Share your curated trips with a simple link. No account needed to view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Import Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Import Your Existing Plans
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Already have trips planned elsewhere? Import from Google Maps, Google Docs, CSV files, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-white rounded-lg border border-gray-200">
              Google Maps KML
            </div>
            <div className="px-6 py-3 bg-white rounded-lg border border-gray-200">
              Google Docs
            </div>
            <div className="px-6 py-3 bg-white rounded-lg border border-gray-200">
              CSV Spreadsheet
            </div>
            <div className="px-6 py-3 bg-white rounded-lg border border-gray-200">
              JSON
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Start Curating Your Travels Today
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Free to use. Your data stays private.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-400" />
            <span className="text-white font-semibold">Trip Curator</span>
          </div>
          <p className="text-gray-400 text-sm">
            Made for travelers who love to plan
          </p>
        </div>
      </footer>
    </div>
  );
}
