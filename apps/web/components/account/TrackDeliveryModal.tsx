'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface TrackDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  productName: string;
}

function formatDateIST(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function TrackDeliveryModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  productName,
}: TrackDeliveryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    setError(null);

    api
      .getOrder(orderId)
      .then((res: any) => {
        setOrderData(res);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load tracking details.');
        setLoading(false);
      });
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const delivery = orderData?.deliveries?.[0];
  const carrier = delivery?.carrier || orderData?.carrier || 'Blue Dart Express';
  const trackingNumber = delivery?.trackingNumber || orderData?.trackingNumber || '';
  const deliveryStatus = delivery?.status || orderData?.status || 'PENDING';
  const deliveredAt = delivery?.deliveredAt || (orderData?.status === 'DELIVERED' ? orderData?.updatedAt : null);

  const getTrackingUrl = (courier: string, awb: string) => {
    if (!awb) return null;
    const c = courier.toLowerCase();
    if (c.includes('blue') || c.includes('dart')) {
      return `https://www.bluedart.com/tracking?handler=trak&action=track&numbers=${awb}`;
    }
    if (c.includes('delhivery')) {
      return `https://www.delhivery.com/track/package/${awb}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${awb}`)}`;
  };

  const trackingUrl = getTrackingUrl(carrier, trackingNumber);

  const handleCopy = () => {
    if (trackingNumber && navigator?.clipboard) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = [
    { title: 'Order Confirmed', done: true },
    {
      title: 'Dispatched from Hub',
      done: ['SHIPPING', 'DELIVERED'].includes(orderData?.status || ''),
    },
    {
      title: 'In Transit with Courier',
      done: ['SHIPPING', 'DELIVERED'].includes(orderData?.status || ''),
    },
    {
      title: 'Delivered',
      done: orderData?.status === 'DELIVERED',
      date: deliveredAt ? formatDateIST(deliveredAt) : undefined,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-delivery-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="track-delivery-title" className="text-sm font-bold text-slate-900">
                Track Delivery
              </h2>
              <p className="text-[11px] text-slate-500">
                Order #{orderNumber} • {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Fetching live shipment status...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Courier & AWB Header Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Logistics Partner
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{carrier}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {deliveryStatus.replace(/_/g, ' ')}
                </span>
              </div>

              {trackingNumber ? (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Tracking / AWB Number
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">{trackingNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition text-xs flex items-center gap-1"
                      title="Copy Tracking Number"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Courier Site <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 pt-1">
                  AWB number will be assigned once pickup is scheduled with our courier partner.
                </p>
              )}
            </div>

            {/* Timeline Steps */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Shipment Milestones
              </span>
              <div className="space-y-4 pt-1">
                {steps.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        st.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {st.done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${st.done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {st.title}
                      </p>
                      {st.date && (
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          Completed on {st.date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {orderData?.shippingAddress && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Delivery Destination
                </span>
                <p className="text-slate-800 mt-1">
                  {orderData.shippingAddress.addressLine1 || orderData.shippingAddress.address},{' '}
                  {orderData.shippingAddress.city}, {orderData.shippingAddress.state} -{' '}
                  {orderData.shippingAddress.postalCode || orderData.shippingAddress.pincode}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

