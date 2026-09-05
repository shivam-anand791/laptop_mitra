'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  revenue: {
    daily: { date: string; amount: number }[];
    total: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  products: {
    total: number;
    lowStock: number;
    bestSellers: { name: string; sales: number }[];
  };
}

const apiClient = {
  async get(url: string) {
    const mockData: AnalyticsData = {
      revenue: {
        daily: [
          { date: '2024-09-15', amount: 125000 },
          { date: '2024-09-16', amount: 189000 },
          { date: '2024-09-17', amount: 210000 },
          { date: '2024-09-18', amount: 156000 },
          { date: '2024-09-19', amount: 198000 },
          { date: '2024-09-20', amount: 234000 },
          { date: '2024-09-21', amount: 187000 },
        ],
        total: 12500000,
        growth: 12.5,
      },
      orders: {
        total: 3847,
        pending: 24,
        completed: 3200,
        cancelled: 156,
        conversionRate: 4.2,
      },
      users: {
        total: 1250,
        active: 890,
        newThisMonth: 67,
        growth: 8.3,
      },
      products: {
        total: 142,
        lowStock: 12,
        bestSellers: [
          { name: 'Dell Latitude 5420', sales: 156 },
          { name: 'HP EliteBook 840 G8', sales: 142 },
          { name: 'Lenovo ThinkPad X1 Carbon', sales: 98 },
          { name: 'Apple MacBook Pro 16"', sales: 87 },
          { name: 'ASUS VivoBook 15', sales: 65 },
        ],
      },
    };
    return { data: mockData };
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {change && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {change}
              </p>
            )}
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">{icon}</div>
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { date: string; amount: number }[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
  const barHeight = 40;
  const chartHeight = maxAmount * 0.8;

  return (
    <div className="space-y-4">
      <div className="flex items-end h-48 gap-1">
        {data.map((item) => {
          const height = (item.amount / maxAmount) * 100;
          return (
            <div key={item.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-primary rounded-t-sm transition-all duration-300 hover:opacity-80"
                style={{ height: `${height}%` }}
                title={`${new Date(item.date).toLocaleDateString()}: ${formatCurrency(item.amount * 100)}`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BestSellers({
  products,
}: {
  products: { name: string; sales: number }[];
}) {
  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div key={product.name} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
              #{index + 1}
            </span>
            <span className="text-sm text-gray-900 dark:text-white">{product.name}</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {product.sales} sold
          </span>
        </div>
      ))}
    </div>
  );
}

const RevenueIcon = () => (
  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4.21.78-5.83 2.15L5 12l1.17 1.85A7.954 7.954 0 0012 16c2.21 0 4.21-.78 5.83-2.15L19 12l-1.17-1.85A7.954 7.954 0 0012 8z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10l2 2 4-4" />
  </svg>
);

const OrdersIcon = () => (
  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response: any = await apiClient.get('/admin/analytics');
        setData(response.data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          change={`+${data.revenue.growth}% from last month`}
          icon={<RevenueIcon />}
        />
        <StatCard
          title="Total Orders"
          value={data.orders.total.toLocaleString()}
          change={`${data.orders.conversionRate}% conversion rate`}
          icon={<OrdersIcon />}
        />
        <StatCard
          title="Total Users"
          value={data.users.total.toLocaleString()}
          change={`+${data.users.growth}% this month`}
          icon={<UsersIcon />}
        />
        <StatCard
          title="Products"
          value={data.products.total.toString()}
          change={`${data.products.lowStock} low in stock`}
          icon={<ProductsIcon />}
        />
      </div>

      {/* Revenue Chart */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue (Last 7 Days)
          </h2>
          <RevenueChart data={data.revenue.daily} />
        </div>
      </div>

      {/* Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Best Sellers
            </h2>
            <BestSellers products={data.products.bestSellers} />
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Status Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Completed</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.orders.completed} ({Math.round((data.orders.completed / data.orders.total) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Pending</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.orders.pending} ({Math.round((data.orders.pending / data.orders.total) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Cancelled</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.orders.cancelled} ({Math.round((data.orders.cancelled / data.orders.total) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
