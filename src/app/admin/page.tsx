'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Users, MapPin, Tag, TrendingUp } from 'lucide-react';

interface CostSummary {
  total: number;
  byService: Array<{ service: string; cost: number; count: number }>;
  byUser: Array<{
    userId: string;
    user: { email: string; name: string | null } | null;
    totalCost: number;
    count: number;
  }>;
}

export default function AdminOverview() {
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const res = await fetch('/api/admin/costs?period=month');
      const data = await res.json();
      setCosts(data.summary);
    } catch (error) {
      console.error('Failed to fetch costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case 'anthropic_claude':
        return 'bg-purple-100 text-purple-800';
      case 'openai_whisper':
        return 'bg-green-100 text-green-800';
      case 'mapbox':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceLabel = (service: string) => {
    switch (service) {
      case 'anthropic_claude':
        return 'Claude';
      case 'openai_whisper':
        return 'Whisper';
      case 'mapbox':
        return 'Mapbox';
      default:
        return service;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor usage and costs across your application</p>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {costs ? formatCost(costs.total) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">API Calls</p>
              <p className="text-2xl font-bold text-gray-900">
                {costs?.byService.reduce((acc, s) => acc + s.count, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {costs?.byUser.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost by Service</h2>
          {costs?.byService.length ? (
            <div className="space-y-4">
              {costs.byService.map((service) => {
                const percentage = costs.total > 0 ? (service.cost / costs.total) * 100 : 0;
                return (
                  <div key={service.service}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm font-medium px-2 py-1 rounded ${getServiceColor(service.service)}`}>
                        {getServiceLabel(service.service)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCost(service.cost)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{service.count} calls</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No usage data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Users by Cost</h2>
          {costs?.byUser.length ? (
            <div className="space-y-3">
              {costs.byUser.slice(0, 5).map((user, idx) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-900">
                      {user.user?.name || user.user?.email || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCost(user.totalCost)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No usage data yet</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/admin/api-keys"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-yellow-100 rounded-lg">
              <MapPin className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="font-medium text-gray-900">Configure API Keys</span>
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900">System Settings</span>
          </a>
          <a
            href="/admin/costs"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-gray-900">View All Costs</span>
          </a>
          <a
            href="/admin/tags"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900">Manage Tags</span>
          </a>
        </div>
      </div>
    </div>
  );
}
