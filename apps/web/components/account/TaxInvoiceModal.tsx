'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatIndianRupees } from '@/lib/account-helpers';
import { X, Building2, Printer, Loader2, AlertCircle } from 'lucide-react';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
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

export function TaxInvoiceModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
}: TaxInvoiceModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    setError(null);

    api
      .getOrderInvoice(orderId)
      .then((res: any) => {
        setInvoiceData(res);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Tax invoice is not yet available for this order.');
        setLoading(false);
      });
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <h3 id="invoice-modal-title" className="text-base font-bold text-slate-900">
                Tax Invoice / Receipt
              </h3>
              <p className="text-[11px] text-slate-500">Order #{orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoiceData && (
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                title="Print Invoice"
                aria-label="Print Invoice"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Generating tax invoice document...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : invoiceData ? (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Seller & Invoice Details */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {invoiceData.seller?.name || 'LaptopMitra Technologies Pvt Ltd'}
                </h4>
                <p className="text-slate-500 leading-relaxed mt-0.5">
                  {invoiceData.seller?.address || 'Pan-India Operations Hub, New Delhi, India'}
                  <br />
                  {invoiceData.seller?.gstin && (
                    <>
                      GSTIN:{' '}
                      <span className="font-mono font-bold text-slate-900">
                        {invoiceData.seller.gstin}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {invoiceData.invoiceNumber}
                </span>
                <span className="text-slate-500 block mt-1">
                  Date: {formatDateIST(invoiceData.issuedAt || invoiceData.order?.createdAt)}
                </span>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Bill To / Ship To
              </span>
              <p className="font-bold text-slate-900">
                {invoiceData.order?.shippingAddress?.name ||
                  invoiceData.order?.user?.name ||
                  'Valued Customer'}
              </p>
              <p className="text-slate-600 mt-0.5">
                {invoiceData.order?.shippingAddress?.addressLine1 ||
                  invoiceData.order?.shippingAddress?.address}
                , {invoiceData.order?.shippingAddress?.city},{' '}
                {invoiceData.order?.shippingAddress?.state} -{' '}
                {invoiceData.order?.shippingAddress?.postalCode ||
                  invoiceData.order?.shippingAddress?.pincode}
              </p>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {invoiceData.order?.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">
                          {it.product?.name || 'Refurbished Laptop'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{it.quantity || 1}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatIndianRupees(Number(it.price))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {formatIndianRupees(Number(it.price) * (it.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatIndianRupees(Number(invoiceData.order?.subtotal || invoiceData.order?.totalAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (Included)</span>
                  <span className="font-mono">
                    {formatIndianRupees(Number(invoiceData.taxBreakdown?.totalTax || 0))}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="font-mono text-blue-700">
                    {formatIndianRupees(Number(invoiceData.order?.totalAmount || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">Computer generated tax invoice.</span>
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

