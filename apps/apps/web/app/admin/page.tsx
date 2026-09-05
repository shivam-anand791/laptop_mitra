'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  revenueCompleted: number;
  revenuePending: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-8">{error}</div>;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'blue' },
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: '💻', color: 'green' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: '📦', color: 'purple' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: '⏳', color: 'yellow' },
    { label: 'Delivered Orders', value: stats?.deliveredOrders || 0, icon: '✅', color: 'green' },
    { 
      label: 'Revenue (Completed)', 
      value: `₹${stats?.revenueCompleted.toLocaleString() || 0}`, 
      icon: '💰', 
      color: 'green' 
    },
    { 
      label: 'Revenue (Pending)', 
      value: `₹${stats?.revenuePending.toLocaleString() || 0}`, 
      icon: '💳', 
      color: 'yellow' 
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{card.icon}</span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              {card.label}
            </h3>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
