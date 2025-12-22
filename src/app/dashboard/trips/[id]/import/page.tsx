'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Upload,
  FileText,
  Table,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ImportType = 'csv' | 'json' | 'google_docs' | 'kml';

interface ParsedLocation {
  name: string;
  address?: string;
  url?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  selected: boolean;
}

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsedLocations, setParsedLocations] = useState<ParsedLocation[]>([]);
  const [importing, setImporting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const text = await file.text();

      if (importType === 'csv') {
        parseCSV(text);
      } else if (importType === 'json') {
        parseJSON(text);
      } else if (importType === 'kml') {
        parseKML(text);
      }
    } catch (error) {
      toast.error('Failed to parse file');
      console.error(error);
    } finally {
      setParsing(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error('CSV file is empty or has no data rows');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'place' || h === 'title');
    const addressIdx = headers.findIndex((h) => h === 'address' || h === 'location');
    const urlIdx = headers.findIndex((h) => h === 'url' || h === 'link');
    const notesIdx = headers.findIndex((h) => h === 'notes' || h === 'description');
    const latIdx = headers.findIndex((h) => h === 'lat' || h === 'latitude');
    const lngIdx = headers.findIndex((h) => h === 'lng' || h === 'longitude' || h === 'lon');

    if (nameIdx === -1) {
      toast.error('CSV must have a "name" column');
      return;
    }

    const locations: ParsedLocation[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      if (values[nameIdx]) {
        locations.push({
          name: values[nameIdx],
          address: addressIdx >= 0 ? values[addressIdx] : undefined,
          url: urlIdx >= 0 ? values[urlIdx] : undefined,
          notes: notesIdx >= 0 ? values[notesIdx] : undefined,
          latitude: latIdx >= 0 ? parseFloat(values[latIdx]) || undefined : undefined,
          longitude: lngIdx >= 0 ? parseFloat(values[lngIdx]) || undefined : undefined,
          selected: true,
        });
      }
    }

    setParsedLocations(locations);
    toast.success(`Found ${locations.length} locations`);
  };

  const parseJSON = (text: string) => {
    try {
      const data = JSON.parse(text);
      const locationsArray = data.locations || data.places || data;

      if (!Array.isArray(locationsArray)) {
        toast.error('Invalid JSON format. Expected an array of locations.');
        return;
      }

      const locations: ParsedLocation[] = locationsArray.map((l: Record<string, unknown>) => ({
        name: (l.name || l.title || l.place) as string,
        address: l.address as string | undefined,
        url: (l.url || l.link) as string | undefined,
        notes: (l.notes || l.description) as string | undefined,
        latitude: (l.lat || l.latitude) as number | undefined,
        longitude: (l.lng || l.longitude || l.lon) as number | undefined,
        selected: true,
      })).filter((l: ParsedLocation) => l.name);

      setParsedLocations(locations);
      toast.success(`Found ${locations.length} locations`);
    } catch {
      toast.error('Invalid JSON file');
    }
  };

  const parseKML = (text: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const placemarks = doc.getElementsByTagName('Placemark');

      const locations: ParsedLocation[] = [];
      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        const name = placemark.getElementsByTagName('name')[0]?.textContent;
        const description = placemark.getElementsByTagName('description')[0]?.textContent;
        const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;

        if (name && coordinates) {
          const [lng, lat] = coordinates.trim().split(',').map(Number);
          locations.push({
            name,
            notes: description || undefined,
            latitude: lat,
            longitude: lng,
            selected: true,
          });
        }
      }

      setParsedLocations(locations);
      toast.success(`Found ${locations.length} locations from KML`);
    } catch {
      toast.error('Failed to parse KML file');
    }
  };

  const handleTextParse = async () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setParsing(true);
    try {
      const res = await fetch('/api/import/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });

      if (res.ok) {
        const data = await res.json();
        const locations = data.locations.map((l: ParsedLocation) => ({
          ...l,
          selected: true,
        }));
        setParsedLocations(locations);
        toast.success(`Found ${locations.length} locations`);
      } else {
        toast.error('Failed to parse text');
      }
    } catch {
      toast.error('Failed to parse text');
    } finally {
      setParsing(false);
    }
  };

  const toggleLocation = (index: number) => {
    setParsedLocations((prev) =>
      prev.map((l, i) => (i === index ? { ...l, selected: !l.selected } : l))
    );
  };

  const selectAll = () => {
    setParsedLocations((prev) => prev.map((l) => ({ ...l, selected: true })));
  };

  const deselectAll = () => {
    setParsedLocations((prev) => prev.map((l) => ({ ...l, selected: false })));
  };

  const handleImport = async () => {
    const selected = parsedLocations.filter((l) => l.selected);
    if (selected.length === 0) {
      toast.error('No locations selected');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: id,
          sourceType: 'direct',
          locations: selected.map(({ selected: _, ...l }) => l),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportResult({
          total: data.totalLocations,
          imported: data.importedLocations,
          errors: data.errors,
        });
        toast.success(`Imported ${data.importedLocations} locations`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = parsedLocations.filter((l) => l.selected).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/dashboard/trips/${id}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Places</h1>
          <p className="text-gray-500 mt-1">Import locations from various sources</p>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800">Import Complete</h3>
              <p className="text-green-700 mt-1">
                Successfully imported {importResult.imported} of {importResult.total} locations.
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-green-600">Some locations could not be imported:</p>
                  <ul className="text-sm text-green-600 mt-1 list-disc list-inside">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>...and {importResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              <button
                onClick={() => router.push(`/dashboard/trips/${id}`)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Type Selection */}
      {!importType && !importResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setImportType('csv')}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all text-left"
          >
            <Table className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900">CSV File</h3>
            <p className="text-sm text-gray-500 mt-1">
              Import from a spreadsheet with name, address, coordinates
            </p>
          </button>

          <button
            onClick={() => setImportType('json')}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all text-left"
          >
            <FileText className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900">JSON File</h3>
            <p className="text-sm text-gray-500 mt-1">
              Import from a structured JSON file
            </p>
          </button>

          <button
            onClick={() => setImportType('kml')}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all text-left"
          >
            <MapPin className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Google Maps KML</h3>
            <p className="text-sm text-gray-500 mt-1">
              Export from Google Maps and upload the KML file
            </p>
          </button>

          <button
            onClick={() => setImportType('google_docs')}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all text-left"
          >
            <FileText className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Text / Google Docs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Paste text with locations - AI will extract them
            </p>
          </button>
        </div>
      )}

      {/* File Upload */}
      {importType && importType !== 'google_docs' && parsedLocations.length === 0 && !importResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <button
            onClick={() => setImportType(null)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back to options
          </button>

          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload {importType.toUpperCase()} File
            </h3>
            <p className="text-gray-500 mb-6">
              {importType === 'csv' && 'File should have columns: name, address, url, lat, lng'}
              {importType === 'json' && 'File should contain an array of location objects'}
              {importType === 'kml' && 'Export your map from Google Maps as KML'}
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              Choose File
              <input
                type="file"
                accept={
                  importType === 'csv'
                    ? '.csv'
                    : importType === 'json'
                    ? '.json'
                    : '.kml,.kmz'
                }
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Text Input */}
      {importType === 'google_docs' && parsedLocations.length === 0 && !importResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <button
            onClick={() => setImportType(null)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            ← Back to options
          </button>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Paste Your Text
          </h3>
          <p className="text-gray-500 mb-4">
            Copy and paste text containing places. AI will extract location names and details.
          </p>

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your text here...

Example:
- Blue Bottle Coffee, Ferry Building
- Tartine Bakery at 600 Guerrero Street
- That amazing ramen place in Japantown"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
          />

          <button
            onClick={handleTextParse}
            disabled={parsing || !textInput.trim()}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting locations...
              </>
            ) : (
              <>Extract Locations</>
            )}
          </button>
        </div>
      )}

      {/* Preview and Select */}
      {parsedLocations.length > 0 && !importResult && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Preview Locations</h3>
              <p className="text-sm text-gray-500">
                {selectedCount} of {parsedLocations.length} selected
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Deselect all
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
            {parsedLocations.map((location, index) => (
              <div
                key={index}
                onClick={() => toggleLocation(index)}
                className={`p-4 cursor-pointer transition-colors ${
                  location.selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={location.selected}
                    onChange={() => {}}
                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{location.name}</h4>
                    {location.address && (
                      <p className="text-sm text-gray-500">{location.address}</p>
                    )}
                    {location.notes && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {location.notes}
                      </p>
                    )}
                    {location.latitude && location.longitude ? (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Coordinates available
                      </p>
                    ) : (
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Will geocode from name/address
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => {
                setParsedLocations([]);
                setImportType(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import {selectedCount} Locations</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
