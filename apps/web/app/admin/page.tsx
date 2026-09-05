'use client';

import { useEffect, useState } from 'react';

// Mock API client - will be replaced with real api-client import
const apiClient = {
  get: async (url: string) => {
    // In a real implementation, this would use the shared api-client
    // For now, return mock data
    const mockData: Record<string, any> = {
      'admin/dashboard': {
        totalUsers: 1250,
        totalProducts: 142,
        totalOrders: 3847,
        pendingOrders: 24,
        revenue: {
          completed: 25600000,
          pending: 1840000,
        },
      },
    };
    return { data: mockData[url] || {} };
  },
};

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  revenue: {
    completed: number;
    pending: number;
  };
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  bgColor?: string;
}

function StatCard({ title, value, change, icon, bgColor = 'bg-blue-100 dark:bg-blue-900/30' }: StatCardProps) {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {change && <p className="text-sm text-green-600 dark:text-green-400 mt-1">{change}</p>}
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4.21.78-5.83 2.15L5 12l1.17 1.85A7.954 7.954 0 0012 16c2.21 0 4.21-.78 5.83-2.15L19 12l-1.17-1.85A7.954 7.954 0 0012 8z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10l2 2 4-4" />
    </svg>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100); // Amount is in paise
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('en-IN').format(num);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await apiClient.get('admin/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      icon: <UsersIcon />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Total Products',
      value: formatNumber(stats.totalProducts),
      icon: <ProductsIcon />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Total Orders',
      value: formatNumber(stats.totalOrders),
      icon: <OrdersIcon />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Pending Orders',
      value: formatNumber(stats.pendingOrders),
      change: 'Requires attention',
      icon: <OrdersIcon />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Revenue Section */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.revenue.completed)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.revenue.pending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/admin/products" className="btn btn-secondary justify-center">
              Add Product
            </a>
            <a href="/admin/orders" className="btn btn-secondary justify-center">
              View Orders
            </a>
            <a href="/admin/users" className="btn btn-secondary justify-center">
              Manage Users
            </a>
            <a href="/admin/settings" className="btn btn-secondary justify-center">
              Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
