'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: any;
  discountAmount: any;
  finalAmount: any;
  shippingAddress: any;
  phone: string | null;
  email: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  items: {
    id: string;
    quantity: number;
    price: any;
    product: {
      id: string;
      name: string;
    };
  }[];
  deliveries: {
    id: string;
    status: string;
    trackingNumber: string | null;
    carrier: string | null;
  }[];
}

const apiClient = {
  async get(url: string) {
    const mockOrders: Order[] = [
      {
        id: 'order-1',
        orderNumber: 'ORD-12345',
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'razorpay',
        subtotal: 78000,
        discountAmount: 7800,
        finalAmount: 70200,
        shippingAddress: { address: '123 Main St, Mumbai', city: 'Mumbai', state: 'MH', pincode: '400001' },
        phone: '+919876543210',
        email: 'john@example.com',
        notes: null,
        createdAt: '2024-09-15T14:30:00.000Z',
        updatedAt: '2024-09-18T10:15:00.000Z',
        user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
        items: [
          {
            id: 'item-1',
            quantity: 1,
            price: 78000,
            product: { id: 'prod-1', name: 'Dell Latitude 5420' },
          },
        ],
        deliveries: [{ id: 'del-1', status: 'PENDING', trackingNumber: null, carrier: null }],
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-12346',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        subtotal: 137000,
        discountAmount: 0,
        finalAmount: 137000,
        shippingAddress: { address: '456 Park Ave, Delhi', city: 'Delhi', state: 'DL', pincode: '110001' },
        phone: '+919876543210',
        email: 'jane@example.com',
        notes: 'Please deliver after 6 PM',
        createdAt: '2024-09-20T09:00:00.000Z',
        updatedAt: '2024-09-20T09:00:00.000Z',
        user: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
        items: [
          {
            id: 'item-2',
            quantity: 1,
            price: 89000,
            product: { id: 'prod-3', name: 'Lenovo ThinkPad X1 Carbon' },
          },
          {
            id: 'item-3',
            quantity: 1,
            price: 48000,
            product: { id: 'prod-2', name: 'HP EliteBook 840 G8' },
          },
        ],
        deliveries: [{ id: 'del-2', status: 'PENDING', trackingNumber: null, carrier: null }],
      },
      {
        id: 'order-3',
        orderNumber: 'ORD-12344',
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'razorpay',
        subtotal: 185000,
        discountAmount: 18500,
        finalAmount: 166500,
        shippingAddress: { address: '789 Lake Rd, Bangalore', city: 'Bangalore', state: 'KA', pincode: '560001' },
        phone: '+919876543210',
        email: 'bob@example.com',
        notes: null,
        createdAt: '2024-09-01T12:00:00.000Z',
        updatedAt: '2024-09-05T18:30:00.000Z',
        user: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
        items: [
          {
            id: 'item-4',
            quantity: 1,
            price: 185000,
            product: { id: 'prod-4', name: 'Apple MacBook Pro 16"' },
          },
        ],
        deliveries: [{ id: 'del-3', status: 'DELIVERED', trackingNumber: 'TRK-987654321', carrier: 'DTDC' }],
      },
      {
        id: 'order-4',
        orderNumber: 'ORD-12347',
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        paymentMethod: 'cod',
        subtotal: 35000,
        discountAmount: 0,
        finalAmount: 35000,
        shippingAddress: { address: '321 Hill St, Chennai', city: 'Chennai', state: 'TN', pincode: '600001' },
        phone: '+919876543210',
        email: 'alice@example.com',
        notes: null,
        createdAt: '2024-09-19T15:45:00.000Z',
        updatedAt: '2024-09-20T08:00:00.000Z',
        user: { id: 'user-4', name: null, email: 'alice@example.com' },
        items: [
          {
            id: 'item-5',
            quantity: 1,
            price: 35000,
            product: { id: 'prod-5', name: 'ASUS VivoBook 15' },
          },
        ],
        deliveries: [{ id: 'del-4', status: 'CANCELLED', trackingNumber: null, carrier: null }],
      },
    ];

    if (url === '/admin/orders') {
      return { data: mockOrders };
    }
    if (url.startsWith('/admin/orders/')) {
      const order = mockOrders.find((o) => o.id === url.split('/')[3]);
      return { data: order || null };
    }
    throw new Error('Unknown endpoint');
  },

  async put(url: string, body: any) {
    return { data: { success: true } };
  },
};

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    SHIPPING: 'badge-primary',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    PROCESSING: 'badge-info',
    COMPLETED: 'badge-success',
    FAILED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function formatPrice(price: any) {
  const numPrice = typeof price === 'object' ? Number(price) : Number(price);
  return `₹${numPrice.toLocaleString('en-IN')}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        const response: any = await apiClient.get('/admin/orders');
        setOrders(response.data as Order[]);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    const searchMatch =
      searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && paymentMatch && searchMatch;
  });

  const totalRevenue = filteredOrders
    .filter((o) => o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.finalAmount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total Revenue: {formatPrice(totalRevenue)}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by order # or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
          aria-label="Search orders"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          aria-label="Filter by order status"
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPING">Shipping</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="input"
          aria-label="Filter by payment status"
        >
          <option value="all">All Payment Statuses</option>
          <option value="PENDING">Payment Pending</option>
          <option value="COMPLETED">Payment Completed</option>
          <option value="FAILED">Payment Failed</option>
          <option value="REFUNDED">Payment Refunded</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {orders.filter((o) => o.status === 'PENDING').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'SHIPPING').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {orders.filter((o) => o.status === 'DELIVERED').length}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container card">
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="font-mono text-sm text-gray-900 dark:text-white">
                  {order.orderNumber}
                </td>
                <td>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white block">
                      {order.user.name || 'Unnamed User'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {order.user.email}
                    </span>
                  </div>
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDate(order.createdAt)}
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-300">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </td>
                <td className="text-gray-900 dark:text-white font-medium">
                  {formatPrice(order.finalAmount)}
                </td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </td>
                <td>
                  <a
                    href={`/admin/orders/${order.id}`}
                    className="text-sm text-primary hover:text-blue-700 dark:text-blue-400 hover:dark:text-blue-300"
                    aria-label={`View order ${order.orderNumber}`}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No orders found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}
