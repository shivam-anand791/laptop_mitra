'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  finalAmount: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  items: Array<{
    quantity: number;
    price: number;
    product: {
      name: string;
    };
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-8">{error}</div>;
  }

  const statusOptions = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {orders.length}
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Order #{order.orderNumber}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {order.user.name} ({order.user.email})
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold mb-2">
                  ₹{order.finalAmount.toLocaleString()}
                </div>
                <div className="space-y-1">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'DELIVERED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : order.status === 'CANCELLED'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                    }`}
                  >
                    {order.status}
                  </span>
                  <br />
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      order.paymentStatus === 'COMPLETED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Payment: {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              <h4 className="text-sm font-semibold mb-2">Items:</h4>
              <ul className="space-y-1 text-sm">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <label className="text-sm font-medium">Update Status:</label>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
