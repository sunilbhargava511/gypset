'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImage: string | null;
  onImageUploaded: (imageUrl: string | null) => void;
  locationId: string;
}

export default function ImageUpload({
  currentImage,
  onImageUploaded,
  locationId,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImage);
  }, [currentImage]);

  const uploadImage = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or GIF image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/locations/${locationId}/image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(data.userImage);
        onImageUploaded(data.userImage);
        toast.success('Image uploaded successfully!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadImage(file);
    }
  }, [locationId]);

  // Handle paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            uploadImage(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [locationId]);

  const handleRemoveImage = async () => {
    try {
      const res = await fetch(`/api/locations/${locationId}/image`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPreviewUrl(null);
        onImageUploaded(null);
        toast.success('Image removed');
      } else {
        toast.error('Failed to remove image');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Photo
      </label>

      {previewUrl ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="Location"
            className="w-full h-48 object-cover rounded-xl border border-gray-200"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Replace image"
            >
              <Camera className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleRemoveImage}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Remove image"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-colors duration-200
            ${dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                {dragActive ? (
                  <Upload className="w-6 h-6 text-indigo-600" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragActive ? 'Drop image here' : 'Add a photo'}
              </p>
              <p className="text-xs text-gray-500">
                Drag & drop, paste from clipboard, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                JPEG, PNG, WebP, GIF • Max 5MB
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
