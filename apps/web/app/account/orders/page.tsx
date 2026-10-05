'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  ArrowRight,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'Processing' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'SHIPPING', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async (status?: string) => {
    setLoading(true);
    try {
      const data = await api.getOrders(status === 'ALL' ? undefined : status);
      setOrders(data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedStatus);
  }, [selectedStatus]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.items?.some((it) => it.product?.name?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders & Purchases</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track dispatches, initiate warranty claims, download GST tax invoices, and reorder.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID or laptop model..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No orders found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try changing your search keywords or clearing filters.' : 'You have not placed any orders matching this status.'}
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Explore Laptops Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const firstItem = order.items?.[0];
            const itemCount = order.items?.reduce((s, it) => s + it.quantity, 0) || 1;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition overflow-hidden"
              >
                {/* Order Header */}
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <span className="text-slate-400 font-medium block">Order Placed</span>
                      <span className="font-bold text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Order ID</span>
                      <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Total</span>
                      <span className="font-bold text-slate-900">
                        ₹{Number(order.finalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'SHIPPING'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status === 'DELIVERED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : order.status === 'SHIPPING' ? (
                        <Truck className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items & Actions */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                      <img
                        src={firstItem?.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200'}
                        alt="Product"
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {firstItem?.product?.name || 'Certified Refurbished Laptop'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {itemCount > 1 ? `+ ${itemCount - 1} more items` : '1 unit'} • 1-Year Assured Warranty
                      </p>
                      {order.trackingNumber && (
                        <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Tracking: {order.trackingNumber} ({order.carrier || 'Express'})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      View Details & Tracking <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
