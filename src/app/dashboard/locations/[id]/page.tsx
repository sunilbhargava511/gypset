'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, Tag, MapPin, Mic, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { AudioRecorder, ProcessingIndicator } from '@/components/AudioRecorder';
import ImageUpload from '@/components/ImageUpload';

interface LocationTag {
  tag: {
    id: string;
    name: string;
    category: string;
  };
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
  urlTitle: string | null;
  urlDescription: string | null;
  urlImage: string | null;
  userImage: string | null;
  rawTranscription: string | null;
  polishedDescription: string | null;
  tags: LocationTag[];
  trip: {
    id: string;
    title: string;
  };
}

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'transcribing' | 'generating' | 'tagging' | 'done'>('transcribing');
  const [maxDuration, setMaxDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    fetchLocation();
    fetchSettings();
  }, [id]);

  const fetchLocation = async () => {
    try {
      const res = await fetch(`/api/locations/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch location');
      }
      const data = await res.json();
      setLocation(data);
    } catch (error) {
      console.error('Failed to fetch location:', error);
      toast.error('Failed to load location');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/audio');
      if (res.ok) {
        const data = await res.json();
        setMaxDuration(data.maxDuration || 0);
        setAudioEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    setProcessing(true);
    setProcessingStage('transcribing');

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('duration', duration.toString());

      // Simulate stage progression (actual processing happens on server)
      setTimeout(() => setProcessingStage('generating'), 2000);
      setTimeout(() => setProcessingStage('tagging'), 4000);

      const res = await fetch(`/api/locations/${id}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setProcessingStage('done');
        toast.success('Voice note processed successfully!');
        await fetchLocation();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to process audio');
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      toast.error('Failed to process audio');
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'place_type':
        return 'bg-blue-100 text-blue-700';
      case 'ambience':
        return 'bg-purple-100 text-purple-700';
      case 'timing':
        return 'bg-orange-100 text-orange-700';
      case 'feature':
        return 'bg-green-100 text-green-700';
      case 'cuisine':
        return 'bg-red-100 text-red-700';
      case 'activity':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/dashboard/trips/${location.trip.id}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-sm text-gray-500">{location.trip.title}</p>
          <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ImageUpload
              currentImage={location.userImage || location.urlImage}
              locationId={location.id}
              onImageUploaded={(imageUrl) => {
                setLocation((prev) =>
                  prev ? { ...prev, userImage: imageUrl } : prev
                );
              }}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {location.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <p className="text-gray-600">{location.address}</p>
              </div>
            )}

            {location.sourceUrl && (
              <a
                href={location.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                View Source
              </a>
            )}

            {location.polishedDescription && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Description
                </h3>
                <p className="text-gray-600 whitespace-pre-wrap">{location.polishedDescription}</p>
              </div>
            )}

            {location.rawTranscription && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-gray-400" />
                  Original Notes
                </h3>
                <p className="text-gray-500 italic text-sm whitespace-pre-wrap">
                  {location.rawTranscription}
                </p>
              </div>
            )}

            {location.tags.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {location.tags.map((lt) => (
                    <span
                      key={lt.tag.id}
                      className={`text-sm px-3 py-1 rounded-full ${getCategoryColor(lt.tag.category)}`}
                    >
                      {lt.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Audio Recording */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              {location.polishedDescription ? 'Re-record Voice Note' : 'Add Voice Note'}
            </h2>

            {!audioEnabled ? (
              <div className="text-center py-8">
                <Mic className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Audio recording is currently disabled</p>
                <p className="text-sm text-gray-400 mt-2">
                  Contact your administrator to enable this feature
                </p>
              </div>
            ) : processing ? (
              <ProcessingIndicator stage={processingStage} />
            ) : (
              <div className="py-8">
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  maxDuration={maxDuration}
                  disabled={processing}
                />
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">How it works</h3>
              <ul className="text-sm text-gray-500 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0">
                    1
                  </span>
                  Record your thoughts about this place
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0">
                    2
                  </span>
                  AI transcribes and transforms your notes into polished writing
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0">
                    3
                  </span>
                  Relevant tags are automatically extracted for easy searching
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
