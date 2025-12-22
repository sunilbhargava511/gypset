'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Merge, X, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Tag {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  createdByLlm: boolean;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'place_type', label: 'Place Type', color: 'bg-blue-100 text-blue-800' },
  { id: 'ambience', label: 'Ambience', color: 'bg-purple-100 text-purple-800' },
  { id: 'timing', label: 'Timing', color: 'bg-orange-100 text-orange-800' },
  { id: 'feature', label: 'Feature', color: 'bg-green-100 text-green-800' },
  { id: 'cuisine', label: 'Cuisine', color: 'bg-red-100 text-red-800' },
  { id: 'activity', label: 'Activity', color: 'bg-yellow-100 text-yellow-800' },
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [mergeSource, setMergeSource] = useState<Tag | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');

  // Form states
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('place_type');

  useEffect(() => {
    fetchTags();
  }, [search, showInactive, selectedCategory]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showInactive) params.set('includeInactive', 'true');
      if (selectedCategory) params.set('category', selectedCategory);

      const res = await fetch(`/api/admin/tags?${params}`);
      const data = await res.json();
      setTags(data.tags);
      setGrouped(data.grouped);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, category: newTagCategory }),
      });

      if (res.ok) {
        toast.success('Tag created');
        setShowAddModal(false);
        setNewTagName('');
        fetchTags();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create tag');
      }
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTag.id,
          name: editingTag.name,
          category: editingTag.category,
          isActive: editingTag.isActive,
        }),
      });

      if (res.ok) {
        toast.success('Tag updated');
        setEditingTag(null);
        fetchTags();
      } else {
        toast.error('Failed to update tag');
      }
    } catch {
      toast.error('Failed to update tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const res = await fetch(`/api/admin/tags?id=${id}`, { method: 'DELETE' });

      if (res.ok) {
        const data = await res.json();
        if (data.softDeleted) {
          toast.success('Tag deactivated (still in use by locations)');
        } else {
          toast.success('Tag deleted');
        }
        fetchTags();
      } else {
        toast.error('Failed to delete tag');
      }
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) {
      toast.error('Select a target tag');
      return;
    }

    try {
      const res = await fetch('/api/admin/tags/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTagId: mergeSource.id,
          targetTagId: mergeTarget,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Merged ${data.mergedCount} locations to target tag`);
        setShowMergeModal(false);
        setMergeSource(null);
        setMergeTarget('');
        fetchTags();
      } else {
        toast.error('Failed to merge tags');
      }
    } catch {
      toast.error('Failed to merge tags');
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || { label: categoryId, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tag Management</h1>
          <p className="text-gray-500 mt-1">Manage global tags used across all trips</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Show inactive</span>
          </label>
        </div>
      </div>

      {/* Tags by Category */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter((c) => !selectedCategory || c.id === selectedCategory).map((category) => {
            const categoryTags = grouped[category.id] || [];
            if (categoryTags.length === 0) return null;

            return (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900">{category.label}</h2>
                  <p className="text-sm text-gray-500">{categoryTags.length} tags</p>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                          tag.isActive
                            ? 'bg-white border-gray-200 hover:border-gray-300'
                            : 'bg-gray-100 border-gray-200 opacity-60'
                        }`}
                      >
                        <span className={`text-sm ${tag.isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                          {tag.name}
                        </span>
                        <span className="text-xs text-gray-400">({tag.usageCount})</span>
                        {tag.createdByLlm && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">AI</span>
                        )}
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <button
                            onClick={() => setEditingTag(tag)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={() => {
                              setMergeSource(tag);
                              setShowMergeModal(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Merge className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Tag</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., rooftop-bar"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase with hyphens</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Tag</h3>
              <button onClick={() => setEditingTag(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingTag.category}
                  onChange={(e) => setEditingTag({ ...editingTag, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTag.isActive}
                  onChange={(e) => setEditingTag({ ...editingTag, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingTag(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTag}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Tags Modal */}
      {showMergeModal && mergeSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Merge Tags</h3>
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeSource(null);
                  setMergeTarget('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Tag (will be deleted)</label>
                <div className={`px-4 py-2 rounded-lg ${getCategoryInfo(mergeSource.category).color}`}>
                  {mergeSource.name} ({mergeSource.usageCount} uses)
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Tag (will keep)</label>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select target tag...</option>
                  {tags
                    .filter((t) => t.id !== mergeSource.id && t.isActive)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({getCategoryInfo(t.category).label}) - {t.usageCount} uses
                      </option>
                    ))}
                </select>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  All locations using &quot;{mergeSource.name}&quot; will be updated to use the target tag.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeSource(null);
                  setMergeTarget('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!mergeTarget}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Merge className="w-4 h-4" />
                Merge Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
