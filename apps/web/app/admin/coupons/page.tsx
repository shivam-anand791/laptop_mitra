'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatINR, formatDate, formatNumber } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminModal from '@/components/admin/AdminModal';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { DiscountCode, CouponRedemption, CouponType, CouponStatus, CouponVisibility } from '@/lib/types';

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Exhausted', value: 'EXHAUSTED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' },
];

interface CouponFormData {
  id?: string;
  code: string;
  title: string;
  description: string;
  internalNote: string;
  type: string;
  value: string;
  maxDiscountCap: string;
  minOrderValue: string;
  maxOrderValue: string;
  maxUses: string;
  maxUsesPerUser: string;
  minQuantity: string;
  allowRentLease: boolean;
  excludeWarranty: boolean;
  firstOrderOnly: boolean;
  canCombineWithReferral: boolean;
  allowedPaymentMethods: string;
  visibility: string;
  targetedUserIds: string;
  badgeText: string;
  highlight: boolean;
  validFrom: string;
  validUntil: string;
  terms: string;
}

const initialFormData: CouponFormData = {
  code: '',
  title: '',
  description: '',
  internalNote: '',
  type: 'percentage',
  value: '10',
  maxDiscountCap: '',
  minOrderValue: '',
  maxOrderValue: '',
  maxUses: '',
  maxUsesPerUser: '1',
  minQuantity: '',
  allowRentLease: false,
  excludeWarranty: true,
  firstOrderOnly: false,
  canCombineWithReferral: false,
  allowedPaymentMethods: 'ANY',
  visibility: 'PUBLIC',
  targetedUserIds: '',
  badgeText: '',
  highlight: false,
  validFrom: '',
  validUntil: '',
  terms: '',
};

function CouponsPageContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // State: List
  const [coupons, setCoupons] = useState<DiscountCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State: Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State: Bulk Generator
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('VIP');
  const [bulkTitle, setBulkTitle] = useState('VIP Voucher');
  const [bulkType, setBulkType] = useState('fixed');
  const [bulkValue, setBulkValue] = useState('500');
  const [bulkMinSpend, setBulkMinSpend] = useState('2000');
  const [bulkQuantity, setBulkQuantity] = useState('10');
  const [bulkExpiry, setBulkExpiry] = useState('');
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // State: Redemptions Ledger
  const [isRedemptionsModalOpen, setIsRedemptionsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCode | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [redemptionsTotal, setRedemptionsTotal] = useState(0);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  // State: Archive Confirmation
  const [couponToArchive, setCouponToArchive] = useState<DiscountCode | null>(null);
  const [archiving, setArchiving] = useState(false);

  // State: Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Coupons
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminCoupons({
        status: statusFilter,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setCoupons(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load coupon list.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    addToast('success', `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData(initialFormData);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (coupon: DiscountCode) => {
    setIsEditing(true);
    setFormData({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title || coupon.name || '',
      description: coupon.description || '',
      internalNote: coupon.internalNote || '',
      type: coupon.type,
      value: String(coupon.value),
      maxDiscountCap: coupon.maxDiscountCap ? String(coupon.maxDiscountCap) : '',
      minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : '',
      maxOrderValue: coupon.maxOrderValue ? String(coupon.maxOrderValue) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      maxUsesPerUser: coupon.maxUsesPerUser ? String(coupon.maxUsesPerUser) : '1',
      minQuantity: coupon.minQuantity ? String(coupon.minQuantity) : '',
      allowRentLease: !!coupon.allowRentLease,
      excludeWarranty: coupon.excludeWarranty !== false,
      firstOrderOnly: !!coupon.firstOrderOnly,
      canCombineWithReferral: !!coupon.canCombineWithReferral,
      allowedPaymentMethods: coupon.allowedPaymentMethods || 'ANY',
      visibility: coupon.visibility || 'PUBLIC',
      targetedUserIds: coupon.targetedUserIds || '',
      badgeText: coupon.badgeText || '',
      highlight: !!coupon.highlight,
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 16) : '',
      terms: coupon.terms || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Save Coupon (Create or Update)
  const handleSaveCoupon = async () => {
    setFormError(null);
    if (!formData.code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Title shown to customers is required.');
      return;
    }
    const val = Number(formData.value);
    if (isNaN(val) || val <= 0) {
      setFormError('Discount value must be a positive number.');
      return;
    }
    if (formData.type === 'percentage' && val > 90) {
      setFormError('Percentage discount cannot exceed 90%.');
      return;
    }

    setSavingCoupon(true);
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        internalNote: formData.internalNote.trim() || undefined,
        type: formData.type,
        value: val,
        maxDiscountCap: formData.maxDiscountCap ? Number(formData.maxDiscountCap) : undefined,
        minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : undefined,
        maxOrderValue: formData.maxOrderValue ? Number(formData.maxOrderValue) : undefined,
        maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
        maxUsesPerUser: formData.maxUsesPerUser ? Number(formData.maxUsesPerUser) : 1,
        minQuantity: formData.minQuantity ? Number(formData.minQuantity) : undefined,
        allowRentLease: formData.allowRentLease,
        excludeWarranty: formData.excludeWarranty,
        firstOrderOnly: formData.firstOrderOnly,
        canCombineWithReferral: formData.canCombineWithReferral,
        allowedPaymentMethods: formData.allowedPaymentMethods,
        visibility: formData.visibility,
        targetedUserIds: formData.targetedUserIds.trim() || undefined,
        badgeText: formData.badgeText.trim() || undefined,
        highlight: formData.highlight,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        terms: formData.terms.trim() || undefined,
      };

      if (isEditing && formData.id) {
        const updated = await api.updateAdminCoupon(formData.id, payload);
        addToast('success', `Coupon "${payload.code}" updated successfully.`);
        if (updated.notice) {
          addToast('info', updated.notice);
        }
      } else {
        await api.createAdminCoupon(payload);
        addToast('success', `Coupon "${payload.code}" created successfully.`);
      }
      setIsFormModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save coupon.');
    } finally {
      setSavingCoupon(false);
    }
  };

  // Toggle Pause / Resume
  const handleToggleStatus = async (coupon: DiscountCode) => {
    const newStatus = coupon.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    try {
      await api.updateAdminCouponStatus(coupon.id, newStatus);
      addToast('success', `Coupon "${coupon.code}" status changed to ${newStatus}.`);
      fetchCoupons();
    } catch (err: any) {
      addToast('error', err?.message || 'Could not update coupon status.');
    }
  };

  // Archive Coupon (Soft Delete)
  const handleArchiveCoupon = async () => {
    if (!couponToArchive) return;
    setArchiving(true);
    try {
      await api.updateAdminCouponStatus(couponToArchive.id, 'ARCHIVED');
      addToast('success', `Coupon "${couponToArchive.code}" archived. It is now inactive and hidden from customers.`);
      setCouponToArchive(null);
      fetchCoupons();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to archive coupon.');
    } finally {
      setArchiving(false);
    }
  };

  // Bulk Generator
  const handleGenerateBulk = async () => {
    setFormError(null);
    const qty = parseInt(bulkQuantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 500) {
      setFormError('Quantity must be between 1 and 500.');
      return;
    }
    const val = Number(bulkValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    setGeneratingBulk(true);
    try {
      const res = await api.bulkGenerateAdminCoupons({
        quantity: qty,
        prefix: bulkPrefix.trim().toUpperCase() || 'PROMO',
        title: bulkTitle.trim() || 'Single-Use Promo Voucher',
        type: bulkType,
        value: val,
        minOrderValue: bulkMinSpend ? Number(bulkMinSpend) : undefined,
        validUntil: bulkExpiry ? new Date(bulkExpiry).toISOString() : undefined,
      });
      setGeneratedCodes(res.codes || []);
      addToast('success', res.message || `Generated ${qty} coupons successfully.`);
      fetchCoupons();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to generate bulk coupons.');
    } finally {
      setGeneratingBulk(false);
    }
  };

  // View Redemptions History
  const handleOpenRedemptions = async (coupon: DiscountCode) => {
    setSelectedCoupon(coupon);
    setRedemptionsPage(1);
    setIsRedemptionsModalOpen(true);
    setLoadingRedemptions(true);
    try {
      const data = await api.getAdminCouponRedemptions(coupon.id, { page: 1, limit: 20 });
      setRedemptions(data?.items || []);
      setRedemptionsTotal(data?.total || 0);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load redemption history.');
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const fetchRedemptionsPage = async (newPage: number) => {
    if (!selectedCoupon) return;
    setRedemptionsPage(newPage);
    setLoadingRedemptions(true);
    try {
      const data = await api.getAdminCouponRedemptions(selectedCoupon.id, { page: newPage, limit: 20 });
      setRedemptions(data?.items || []);
      setRedemptionsTotal(data?.total || 0);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load redemptions page.');
    } finally {
      setLoadingRedemptions(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/coupons/export', {
        headers: {
          Authorization: `Bearer ${await (await import('@/lib/firebase')).auth.currentUser?.getIdToken()}`,
        },
      });
      if (!res.ok) throw new Error('Failed to download CSV export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laptopmitra-coupons-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Coupon CSV exported successfully.');
    } catch {
      // Fallback: generate CSV client side from current coupons
      if (coupons.length > 0) {
        const headers = ['Code', 'Title', 'Type', 'Value', 'Status', 'Uses', 'Max Uses', 'Min Spend', 'Visibility'];
        const rows = coupons.map((c) => [
          c.code,
          `"${(c.title || c.name || '').replace(/"/g, '""')}"`,
          c.type,
          c.value,
          c.status,
          c.uses,
          c.maxUses || 'Unlimited',
          c.minOrderValue || 0,
          c.visibility,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laptopmitra_coupons_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('success', 'Coupons CSV exported successfully.');
      } else {
        addToast('error', 'No coupons available to export.');
      }
    } finally {
      setExporting(false);
    }
  };

  // KPI Summary
  const stats = useMemo(() => {
    const activeCount = coupons.filter((c) => c.status === 'ACTIVE').length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.uses || 0), 0);
    const scheduledCount = coupons.filter((c) => c.status === 'SCHEDULED').length;
    return { activeCount, totalRedemptions, scheduledCount };
  }, [coupons]);

  // Table Columns Definition
  const columns: Column<DiscountCode>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code & Offer',
        render: (coupon) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {coupon.code}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(coupon.code)}
                title="Copy code"
                className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                {copiedCode === coupon.code ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {coupon.highlight && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                  Featured
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {coupon.title || coupon.name}
            </div>
            {coupon.badgeText && (
              <span className="inline-block text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 max-w-fit">
                {coupon.badgeText}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'discount',
        header: 'Discount & Scope',
        render: (coupon) => {
          let discountText = '';
          if (coupon.type === 'percentage') {
            discountText = `${coupon.value}% OFF`;
            if (coupon.maxDiscountCap) {
              discountText += ` (Up to ${formatINR(coupon.maxDiscountCap)})`;
            }
          } else if (coupon.type === 'fixed') {
            discountText = `${formatINR(coupon.value)} Flat OFF`;
          } else if (coupon.type === 'free_shipping') {
            discountText = 'Free Shipping';
          } else {
            discountText = 'Free Extended Warranty';
          }

          return (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-slate-900">{discountText}</span>
              <span className="text-slate-500">
                {coupon.minOrderValue ? `Min order ${formatINR(coupon.minOrderValue)}` : 'No minimum spend'}
              </span>
              <span className="text-slate-400 text-[11px]">
                {coupon.allowRentLease ? 'Includes Rentals' : 'Outright purchase only'}
                {coupon.firstOrderOnly ? ' • 1st Order Only' : ''}
              </span>
            </div>
          );
        },
      },
      {
        key: 'rules',
        header: 'Payment & Redemptions',
        render: (coupon) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium text-slate-800">
              {coupon.allowedPaymentMethods === 'ONLINE_ONLY' || coupon.allowedPaymentMethods === 'PREPAID'
                ? 'Prepaid Only (UPI/Card)'
                : coupon.allowedPaymentMethods === 'COD_ONLY'
                ? 'COD Only'
                : 'All Payment Methods'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{
                    width: coupon.maxUses ? `${Math.min(100, ((coupon.uses || 0) / coupon.maxUses) * 100)}%` : '20%',
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-500">
                {coupon.uses || 0} / {coupon.maxUses || '∞'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Limit: {coupon.maxUsesPerUser || 1} per customer
            </span>
          </div>
        ),
      },
      {
        key: 'schedule',
        header: 'Schedule',
        render: (coupon) => {
          if (!coupon.validFrom && !coupon.validUntil) {
            return <span className="text-xs text-slate-500">Always active</span>;
          }
          return (
            <div className="flex flex-col text-xs text-slate-600 gap-0.5">
              {coupon.validFrom && <span>From: {formatDate(coupon.validFrom)}</span>}
              {coupon.validUntil && <span>Until: {formatDate(coupon.validUntil)}</span>}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (coupon) => (
          <StatusBadge status={coupon.status} />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (coupon) => (
          <div className="flex items-center justify-end gap-1.5">
            {/* View Redemptions History */}
            <button
              type="button"
              onClick={() => handleOpenRedemptions(coupon)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
              title="View Redemptions Ledger"
            >
              History
            </button>

            {isAdmin && (
              <>
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(coupon)}
                  className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Edit Coupon"
                >
                  Edit
                </button>

                {/* Pause / Resume */}
                {coupon.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(coupon)}
                    className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                    title={coupon.status === 'PAUSED' ? 'Resume Coupon' : 'Pause Coupon'}
                  >
                    {coupon.status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                )}

                {/* Archive (Soft delete) */}
                {coupon.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    onClick={() => setCouponToArchive(coupon)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors cursor-pointer"
                    title="Archive Coupon"
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </div>
        ),
      },
    ],
    [copiedCode, isAdmin],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Coupon & Promo Codes"
        description="Create, schedule, and track customer discount offers, promotional banners, and single-use partner vouchers."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkModalOpen(true);
                    setGeneratedCodes([]);
                    setFormError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Bulk Generate</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-primary text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Coupon</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Campaigns</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.activeCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">{stats.scheduledCount} scheduled for upcoming dates</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Redemptions</div>
          <div className="text-2xl font-bold text-primary mt-1">{formatNumber(stats.totalRedemptions)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Recorded across all historical orders</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons in Database</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{total}</div>
          <div className="text-xs text-slate-400 mt-0.5">Managed through server rules</div>
        </div>
      </div>

      {/* Main Table with Filters */}
      <DataTable
        columns={columns}
        data={coupons}
        keyExtractor={(c) => c.id}
        isLoading={loading}
        error={error}
        onRetry={fetchCoupons}
        filterBar={
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white border-b border-slate-200">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === f.value
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        }
        pagination={{
          currentPage: page,
          totalItems: total,
          pageSize: limit,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyState={{
          title: 'No coupons found',
          description: search || statusFilter !== 'ALL'
            ? 'No coupons match your filter or search query.'
            : 'No coupons created yet. Click "Create Coupon" to launch your first promotion.',
          action: isAdmin && !search && statusFilter === 'ALL' ? {
            label: 'Create First Coupon',
            onClick: handleOpenCreate,
          } : undefined,
        }}
      />

      {/* Modal 1: Create / Edit Coupon */}
      <AdminModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? `Edit Coupon: ${formData.code}` : 'Create New Coupon'}
        description="Configure discount rules, order eligibility constraints, schedule, and visibility."
        size="xl"
        primaryAction={{
          label: savingCoupon ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Coupon',
          onClick: handleSaveCoupon,
          loading: savingCoupon,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsFormModalOpen(false),
        }}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-1">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {formError}
            </div>
          )}

          {/* Section: Basic Information */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Coupon Identity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="e.g. WELCOME500"
                  disabled={isEditing}
                  maxLength={20}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded border border-slate-200 uppercase focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-slate-50"
                />
                <span className="text-[10px] text-slate-400">4-20 alphanumeric uppercase characters</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Display Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. ₹500 Off On Your First Laptop"
                  maxLength={100}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Shown in customer cart & checkout sheets</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief explanation of the offer for customer view..."
                rows={2}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Note (Private to Admins)</label>
              <input
                type="text"
                value={formData.internalNote}
                onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
                placeholder="e.g. Partner promo code for TechFest October 2026"
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Section: Discount Value */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Discount Calculation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Flat Amount (₹)</option>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="free_warranty">Free Extended Warranty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Value {formData.type === 'percentage' ? '(%)' : '(₹)'} *
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  min="1"
                  max={formData.type === 'percentage' ? '90' : undefined}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {formData.type === 'percentage' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={formData.maxDiscountCap}
                    onChange={(e) => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                    placeholder="e.g. 1500 (Optional)"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Protects against excessive discounts on large carts</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Order Limits */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Spend & Usage Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Order Value (₹)</label>
                <input
                  type="number"
                  value={formData.minOrderValue}
                  onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Order Value (₹)</label>
                <input
                  type="number"
                  value={formData.maxOrderValue}
                  onChange={(e) => setFormData({ ...formData, maxOrderValue: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Total Uses</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Uses Per Customer</label>
                <input
                  type="number"
                  value={formData.maxUsesPerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                  min="1"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Business Rules (Checkboxes) */}
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Eligibility & Policy Enforcements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  checked={formData.allowRentLease}
                  onChange={(e) => setFormData({ ...formData, allowRentLease: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-semibold text-slate-800">Allow Rent / Lease Products</span>
                  <p className="text-[11px] text-slate-400">By default, coupons apply to outright purchases only.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  checked={formData.excludeWarranty}
                  onChange={(e) => setFormData({ ...formData, excludeWarranty: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-semibold text-slate-800">Exclude Warranty Add-on From Discount Base</span>
                  <p className="text-[11px] text-slate-400">Recommended: keeps warranty price undiscounted.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  checked={formData.firstOrderOnly}
                  onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-semibold text-slate-800">First Order Only</span>
                  <p className="text-[11px] text-slate-400">Restricts offer to customers with zero prior completed orders.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  checked={formData.canCombineWithReferral}
                  onChange={(e) => setFormData({ ...formData, canCombineWithReferral: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-semibold text-slate-800">Can Combine With Referral Discount</span>
                  <p className="text-[11px] text-slate-400">By default, referral codes and coupon codes cannot be combined.</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed Payment Method</label>
                <select
                  value={formData.allowedPaymentMethods}
                  onChange={(e) => setFormData({ ...formData, allowedPaymentMethods: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="ANY">Any Payment Method</option>
                  <option value="ONLINE_ONLY">Online / Prepaid Only (UPI, Card, Netbanking)</option>
                  <option value="COD_ONLY">Cash on Delivery (COD) Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="PUBLIC">Public (Visible in customer cart offers list)</option>
                  <option value="PRIVATE">Private (Secret code entry only)</option>
                  <option value="TARGETED">Targeted (Only for specific user IDs)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Schedule & Badging */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Schedule & UI Badging</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valid From</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Until</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Text (e.g. FESTIVE 10)</label>
                <input
                  type="text"
                  value={formData.badgeText}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder="Shown on the coupon chip in cart"
                  maxLength={30}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.highlight}
                    onChange={(e) => setFormData({ ...formData, highlight: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">Pin to Top of Offers List (Featured)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </AdminModal>

      {/* Modal 2: Bulk Generator */}
      <AdminModal
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Generate Single-Use Coupons"
        description="Generate unique, single-use codes (e.g. VIP-XXXXX) for corporate partners or promotional distributions."
        size="lg"
        primaryAction={{
          label: generatingBulk ? 'Generating...' : 'Generate Codes',
          onClick: handleGenerateBulk,
          loading: generatingBulk,
        }}
        secondaryAction={{
          label: 'Close',
          onClick: () => setIsBulkModalOpen(false),
        }}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code Prefix *</label>
              <input
                type="text"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. VIP or PROMO"
                maxLength={8}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded border border-slate-200 uppercase focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Result will look like {bulkPrefix || 'VIP'}-A7B2C</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Title *</label>
              <input
                type="text"
                value={bulkTitle}
                onChange={(e) => setBulkTitle(e.target.value)}
                placeholder="e.g. Partner VIP Voucher"
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="fixed">Flat Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Value {bulkType === 'percentage' ? '(%)' : '(₹)'} *
              </label>
              <input
                type="number"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                min="1"
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (1 - 500) *</label>
              <input
                type="number"
                value={bulkQuantity}
                onChange={(e) => setBulkQuantity(e.target.value)}
                min="1"
                max="500"
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Spend (₹)</label>
              <input
                type="number"
                value={bulkMinSpend}
                onChange={(e) => setBulkMinSpend(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={bulkExpiry}
                onChange={(e) => setBulkExpiry(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Generated Codes Output Display */}
          {generatedCodes.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {generatedCodes.length} Codes Generated Successfully
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedCodes.join('\n'))}
                  className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Copy All Codes
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto p-2 bg-white rounded border border-slate-200 font-mono text-xs space-y-1">
                {generatedCodes.map((code) => (
                  <div key={code} className="text-slate-800 select-all">{code}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminModal>

      {/* Modal 3: Redemptions Ledger History */}
      <AdminModal
        open={isRedemptionsModalOpen}
        onClose={() => setIsRedemptionsModalOpen(false)}
        title={selectedCoupon ? `Redemptions Ledger: ${selectedCoupon.code}` : 'Coupon Redemptions'}
        description="Immutable record of completed and restored discount redemptions."
        size="xl"
      >
        <div className="space-y-4">
          {loadingRedemptions ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading redemption history...</div>
          ) : redemptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-100">
              No redemptions recorded for this coupon yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Order Number</th>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5">Subtotal</th>
                    <th className="p-2.5">Discount Saved</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-600 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="p-2.5 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {r.order?.orderNumber ? (
                          <Link href={`/admin/orders/${r.orderId}`} className="text-primary hover:underline">
                            {r.order.orderNumber}
                          </Link>
                        ) : (
                          r.orderId.slice(0, 8)
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {r.user?.email || r.user?.name || 'Customer'}
                      </td>
                      <td className="p-2.5 text-slate-900 font-medium">
                        {formatINR(r.orderSubtotal)}
                      </td>
                      <td className="p-2.5 text-emerald-600 font-bold">
                        -{formatINR(r.discountAmount)}
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={r.status} />
                          {r.status === 'RESTORED' && r.restorationReason && (
                            <span className="text-[10px] text-slate-400 italic">
                              {r.restorationReason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Simple pagination inside ledger modal */}
          {redemptionsTotal > 20 && (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>Showing {redemptions.length} of {redemptionsTotal} records</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={redemptionsPage <= 1}
                  onClick={() => fetchRedemptionsPage(redemptionsPage - 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={redemptionsPage * 20 >= redemptionsTotal}
                  onClick={() => fetchRedemptionsPage(redemptionsPage + 1)}
                  className="px-2 py-1 border border-slate-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminModal>

      {/* Modal 4: Archive Confirmation Dialog */}
      <AdminModal
        open={Boolean(couponToArchive)}
        onClose={() => setCouponToArchive(null)}
        title="Archive Coupon"
        description="Are you sure you want to archive this coupon code?"
        size="sm"
        primaryAction={{
          label: archiving ? 'Archiving...' : 'Archive Coupon',
          onClick: handleArchiveCoupon,
          loading: archiving,
          variant: 'danger',
        }}
        secondaryAction={{
          label: 'Keep Active',
          onClick: () => setCouponToArchive(null),
        }}
      >
        <div className="text-xs text-slate-600 space-y-2">
          <p>
            Archiving <strong className="font-mono text-slate-900">{couponToArchive?.code}</strong> will immediately disable it from customer use and hide it from available offers.
          </p>
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
            <strong>No data is deleted:</strong> all historical redemption records and order audit trails remain preserved.
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading coupons workspace...</div>}>
      <CouponsPageContent />
    </Suspense>
  );
}

