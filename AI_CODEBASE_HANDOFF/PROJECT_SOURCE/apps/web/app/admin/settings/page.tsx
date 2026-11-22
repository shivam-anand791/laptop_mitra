'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useAdminSettings,
  useUpdateAdminSettings,
  useAdminRentalPrices,
  useAdminRentalPricingCatalog,
  useAdminRentalPriceHistory,
  useCreateRentalPriceDraft,
  useUpdateRentalPriceDraft,
  useApproveRentalPrice,
  useAdminRentalTerminationRequests,
  useApproveRentalTermination,
} from '../../../lib/admin-queries';
import type { AdminRentalPrice } from '../../../lib/admin-api';
import { useToast } from '../../../components/ui/Toast';
import { QueryState } from '../../../components/admin/QueryState';
import Button from '../../../components/ui/Button';
import { AdminSettings } from '../../../lib/types';

import { Store, Package, Truck, Receipt, RefreshCw } from 'lucide-react';

type SettingsTab = 'store' | 'inventory' | 'shipping' | 'tax' | 'rentals';

interface TabConfig {
  id: SettingsTab;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  {
    id: 'store',
    label: 'Store Profile & Contact',
    description: 'Public business details and support channels',
    Icon: Store,
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock Alerts',
    description: 'Catalog thresholds and low-stock warnings',
    Icon: Package,
  },
  {
    id: 'shipping',
    label: 'Shipping & Delivery Rules',
    description: 'Delivery timelines and free shipping threshold',
    Icon: Truck,
  },
  {
    id: 'tax',
    label: 'GST & Tax',
    description: 'Configure whether tax applies to purchases and rentals',
    Icon: Receipt,
  },
  {
    id: 'rentals',
    label: 'Rental Pricing',
    description: 'Review rental price drafts and termination requests',
    Icon: RefreshCw,
  },
];

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading settings">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-72" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="lg:col-span-3 h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: initialSettings, isLoading, error, refetch } = useAdminSettings();
  const updateSettingsMutation = useUpdateAdminSettings();
  const { data: rentalPrices, error: rentalPricesError } = useAdminRentalPrices();
  const { data: rentalCatalog, error: rentalCatalogError } = useAdminRentalPricingCatalog();
  const createRentalPrice = useCreateRentalPriceDraft();
  const updateRentalPrice = useUpdateRentalPriceDraft();
  const approveRentalPrice = useApproveRentalPrice();
  const {
    data: terminationRequests,
    refetch: refetchTerminationRequests,
    error: terminationRequestsError,
  } = useAdminRentalTerminationRequests();
  const approveRentalTermination = useApproveRentalTermination();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const [formData, setFormData] = useState<AdminSettings>({
    storeName: 'LaptopMitra',
    supportEmail: 'support@laptopmitra.com',
    contactPhone: '+91-1800-123-4567',
    storeAddress: '123 Tech Park, Bangalore, Karnataka 560001',
    lowStockThreshold: 5,
    freeShippingThreshold: 999,
    standardDeliveryDays: '3-5',
    expressDeliveryDays: '1-2',
    gstEnabled: false,
    gstRate: 18,
    gstAppliesToPurchases: false,
    gstAppliesToRentals: false,
    gstPriceInclusive: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rentalForm, setRentalForm] = useState({
    productId: '',
    variantId: '',
    tenureMonths: '12',
    monthlyPrice: '',
    securityDeposit: '0',
    deliveryCharge: '0',
    reason: '',
  });
  const [editingRentalPriceId, setEditingRentalPriceId] = useState<string | null>(null);
  const [historyRentalPriceId, setHistoryRentalPriceId] = useState<string | null>(null);
  const { data: rentalPriceHistory, error: rentalPriceHistoryError } =
    useAdminRentalPriceHistory(historyRentalPriceId);
  const selectedRentalProduct = rentalCatalog?.find(
    (product) => product.id === rentalForm.productId,
  );

  // Sync form state when backend data loads
  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (field: keyof AdminSettings, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      errors.storeName = 'Store name is required';
    }

    if (!formData.supportEmail.trim()) {
      errors.supportEmail = 'Support email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      errors.supportEmail = 'Please enter a valid email address';
    }

    if (!formData.contactPhone.trim()) {
      errors.contactPhone = 'Contact phone is required';
    }

    if (!formData.storeAddress.trim()) {
      errors.storeAddress = 'Store address is required';
    }

    if (Number(formData.lowStockThreshold) < 1 || isNaN(Number(formData.lowStockThreshold))) {
      errors.lowStockThreshold = 'Low-stock threshold must be at least 1';
    }

    if (
      Number(formData.freeShippingThreshold) < 0 ||
      isNaN(Number(formData.freeShippingThreshold))
    ) {
      errors.freeShippingThreshold = 'Free shipping threshold cannot be negative';
    }
    if (
      Number(formData.gstRate) < 0 ||
      Number(formData.gstRate) > 100 ||
      isNaN(Number(formData.gstRate))
    ) {
      errors.gstRate = 'GST rate must be between 0 and 100';
    }

    if (!formData.standardDeliveryDays.trim()) {
      errors.standardDeliveryDays = 'Standard delivery timeframe is required (e.g. 3-5)';
    }

    if (!formData.expressDeliveryDays.trim()) {
      errors.expressDeliveryDays = 'Express delivery timeframe is required (e.g. 1-2)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('error', 'Please resolve the validation errors before saving.');
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        ...formData,
        lowStockThreshold: Number(formData.lowStockThreshold),
        freeShippingThreshold: Number(formData.freeShippingThreshold),
      });
      addToast('success', 'Store and platform settings saved successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update administrative settings';
      addToast('error', msg);
    }
  };

  const handleApproveRentalPrice = async (id: string) => {
    try {
      await approveRentalPrice.mutateAsync(id);
      addToast('success', 'Rental price approved and is now available to customers.');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Could not approve rental price.');
    }
  };

  const handleEditRentalPrice = (draft: AdminRentalPrice) => {
    setEditingRentalPriceId(draft.id);
    setRentalForm({
      productId: draft.productId,
      variantId: draft.variantId ?? '',
      tenureMonths: String(draft.tenureMonths),
      monthlyPrice: String(draft.monthlyPrice),
      securityDeposit: String(draft.securityDeposit),
      deliveryCharge: String(draft.deliveryCharge),
      reason: '',
    });
  };

  const resetRentalForm = () => {
    setEditingRentalPriceId(null);
    setRentalForm({
      productId: '',
      variantId: '',
      tenureMonths: '12',
      monthlyPrice: '',
      securityDeposit: '0',
      deliveryCharge: '0',
      reason: '',
    });
  };

  const handleSaveRentalPrice = async () => {
    const monthlyPrice = Number(rentalForm.monthlyPrice);
    const securityDeposit = Number(rentalForm.securityDeposit);
    const deliveryCharge = Number(rentalForm.deliveryCharge);
    const reason = rentalForm.reason.trim();
    if (
      (!editingRentalPriceId &&
        (!selectedRentalProduct ||
          (selectedRentalProduct.variants.length > 0 && !rentalForm.variantId))) ||
      !Number.isFinite(monthlyPrice) ||
      monthlyPrice <= 0 ||
      !Number.isFinite(securityDeposit) ||
      securityDeposit < 0 ||
      !Number.isFinite(deliveryCharge) ||
      deliveryCharge < 0 ||
      reason.length < 3
    ) {
      addToast('error', 'Enter a product, valid amounts, and a reason of at least 3 characters.');
      return;
    }

    const amounts = { monthlyPrice, securityDeposit, deliveryCharge, reason };
    try {
      if (editingRentalPriceId) {
        await updateRentalPrice.mutateAsync({ id: editingRentalPriceId, data: amounts });
      } else {
        await createRentalPrice.mutateAsync({
          ...amounts,
          productId: rentalForm.productId,
          ...(rentalForm.variantId ? { variantId: rentalForm.variantId } : {}),
          tenureMonths: Number(rentalForm.tenureMonths),
        });
      }
      addToast(
        'success',
        editingRentalPriceId ? 'Rental draft updated.' : 'Manual rental draft created.',
      );
      resetRentalForm();
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Could not save rental price draft.');
    }
  };

  const handleApproveTermination = async (id: string) => {
    if (!window.confirm('Cancel this customer’s Razorpay AutoPay mandate now?')) return;
    try {
      await approveRentalTermination.mutateAsync(id);
      await refetchTerminationRequests();
      addToast('success', 'Razorpay confirmed the rental mandate cancellation.');
    } catch (err: unknown) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Razorpay could not confirm cancellation.',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center space-x-1.5"
        >
          <Link href="/admin" className="hover:text-blue-600 dark:hover:text-blue-400">
            Admin
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-900 dark:text-white">Settings</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Authoritative store profile, inventory thresholds, and shipping policies
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={updateSettingsMutation.isPending}
            className="self-start sm:self-auto"
          >
            Save All Settings
          </Button>
        </div>
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={false} onRetry={refetch}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar Tabs */}
          <nav className="space-y-1.5" aria-label="Settings categories">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 border-gray-200 dark:border-gray-700'
                  }`}
                  aria-current={active ? 'true' : undefined}
                >
                  <div className="flex items-center space-x-2.5">
                    <tab.Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} aria-hidden="true" />
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </div>
                  <p
                    className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </nav>

          {/* Form Content Panel */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
              {/* Tab 1: Store Profile & Contact */}
              {activeTab === 'store' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Store Profile & Contact Information
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Information displayed on customer invoices, order confirmations, and customer
                      support channels.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="storeName" className="label">
                        Store Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="storeName"
                        type="text"
                        value={formData.storeName}
                        onChange={(e) => handleChange('storeName', e.target.value)}
                        className={`input ${fieldErrors.storeName ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.storeName)}
                        aria-describedby={fieldErrors.storeName ? 'storeName-error' : undefined}
                      />
                      {fieldErrors.storeName && (
                        <p id="storeName-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.storeName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="supportEmail" className="label">
                        Customer Support Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="supportEmail"
                        type="email"
                        value={formData.supportEmail}
                        onChange={(e) => handleChange('supportEmail', e.target.value)}
                        className={`input ${fieldErrors.supportEmail ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.supportEmail)}
                        aria-describedby={
                          fieldErrors.supportEmail ? 'supportEmail-error' : undefined
                        }
                      />
                      {fieldErrors.supportEmail && (
                        <p id="supportEmail-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.supportEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactPhone" className="label">
                        Support Contact Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contactPhone"
                        type="text"
                        value={formData.contactPhone}
                        onChange={(e) => handleChange('contactPhone', e.target.value)}
                        className={`input ${fieldErrors.contactPhone ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.contactPhone)}
                        aria-describedby={
                          fieldErrors.contactPhone ? 'contactPhone-error' : undefined
                        }
                      />
                      {fieldErrors.contactPhone && (
                        <p id="contactPhone-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.contactPhone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="storeAddress" className="label">
                        Operating Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="storeAddress"
                        type="text"
                        value={formData.storeAddress}
                        onChange={(e) => handleChange('storeAddress', e.target.value)}
                        className={`input ${fieldErrors.storeAddress ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.storeAddress)}
                        aria-describedby={
                          fieldErrors.storeAddress ? 'storeAddress-error' : undefined
                        }
                      />
                      {fieldErrors.storeAddress && (
                        <p id="storeAddress-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.storeAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Inventory & Stock Alerts */}
              {activeTab === 'inventory' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Inventory & Stock Alert Thresholds
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Configure automated low-stock warnings across the administrative dashboard and
                      product catalog.
                    </p>
                  </div>

                  <div className="max-w-md">
                    <label htmlFor="lowStockThreshold" className="label">
                      Low-Stock Warning Threshold (Units) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lowStockThreshold"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.lowStockThreshold}
                      onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                      className={`input ${fieldErrors.lowStockThreshold ? 'border-red-500 focus:ring-red-500' : ''}`}
                      aria-invalid={Boolean(fieldErrors.lowStockThreshold)}
                      aria-describedby={
                        fieldErrors.lowStockThreshold ? 'lowStock-error' : 'lowStock-hint'
                      }
                    />
                    <p id="lowStock-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Products with stock at or below this number are flagged in the admin panel and
                      dashboard alerts.
                    </p>
                    {fieldErrors.lowStockThreshold && (
                      <p id="lowStock-error" className="text-xs text-red-500 mt-1">
                        {fieldErrors.lowStockThreshold}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Shipping & Delivery Rules */}
              {activeTab === 'shipping' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Shipping Policies & Estimated Delivery Times
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Defines free delivery qualifications and estimated transit timelines presented
                      at checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="freeShippingThreshold" className="label">
                        Free Shipping Minimum Order Value (₹){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="freeShippingThreshold"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.freeShippingThreshold}
                        onChange={(e) => handleChange('freeShippingThreshold', e.target.value)}
                        className={`input ${fieldErrors.freeShippingThreshold ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.freeShippingThreshold)}
                        aria-describedby={
                          fieldErrors.freeShippingThreshold ? 'freeShipping-error' : undefined
                        }
                      />
                      {fieldErrors.freeShippingThreshold && (
                        <p id="freeShipping-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.freeShippingThreshold}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="standardDeliveryDays" className="label">
                        Standard Delivery Window (Days) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="standardDeliveryDays"
                        type="text"
                        placeholder="e.g. 3-5"
                        value={formData.standardDeliveryDays}
                        onChange={(e) => handleChange('standardDeliveryDays', e.target.value)}
                        className={`input ${fieldErrors.standardDeliveryDays ? 'border-red-500 focus:ring-red-500' : ''}`}
                        aria-invalid={Boolean(fieldErrors.standardDeliveryDays)}
                        aria-describedby={
                          fieldErrors.standardDeliveryDays ? 'standardDays-error' : undefined
                        }
                      />
                      {fieldErrors.standardDeliveryDays && (
                        <p id="standardDays-error" className="text-xs text-red-500 mt-1">
                          {fieldErrors.standardDeliveryDays}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="max-w-md">
                    <label htmlFor="expressDeliveryDays" className="label">
                      Express Delivery Window (Days) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="expressDeliveryDays"
                      type="text"
                      placeholder="e.g. 1-2"
                      value={formData.expressDeliveryDays}
                      onChange={(e) => handleChange('expressDeliveryDays', e.target.value)}
                      className={`input ${fieldErrors.expressDeliveryDays ? 'border-red-500 focus:ring-red-500' : ''}`}
                      aria-invalid={Boolean(fieldErrors.expressDeliveryDays)}
                      aria-describedby={
                        fieldErrors.expressDeliveryDays ? 'expressDays-error' : undefined
                      }
                    />
                    {fieldErrors.expressDeliveryDays && (
                      <p id="expressDays-error" className="text-xs text-red-500 mt-1">
                        {fieldErrors.expressDeliveryDays}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      GST Configuration
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      GST is disabled by default. Customers are charged tax only when enabled here
                      and applicable to their order type.
                    </p>
                  </div>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.gstEnabled}
                      onChange={(event) => handleChange('gstEnabled', event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Enable GST calculations
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Enabling GST changes server-calculated checkout totals.
                      </span>
                    </span>
                  </label>
                  <div className="max-w-xs">
                    <label htmlFor="gstRate" className="label">
                      GST rate (%)
                    </label>
                    <input
                      id="gstRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.gstRate}
                      onChange={(event) => handleChange('gstRate', event.target.value)}
                      className={`input ${fieldErrors.gstRate ? 'border-red-500' : ''}`}
                      aria-invalid={Boolean(fieldErrors.gstRate)}
                    />
                    {fieldErrors.gstRate && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.gstRate}</p>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['gstAppliesToPurchases', 'Apply GST to purchases'],
                        ['gstAppliesToRentals', 'Apply GST to rentals'],
                        ['gstPriceInclusive', 'Prices include GST'],
                      ] as const
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={formData[field]}
                          onChange={(event) => handleChange(field, event.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Confirm tax treatment with your finance team before enabling. Existing orders
                    retain their saved tax snapshots.
                  </p>
                </div>
              )}

              {activeTab === 'rentals' && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          Manual Rental Pricing
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Create unpublished prices for active products. Approval publishes only
                          manual prices.
                        </p>
                      </div>
                    </div>
                    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Approved prices are used for customer checkout. Deposits and delivery fees
                      must remain ₹0 until checkout supports collecting them.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="rentalProduct" className="label">
                          Product
                        </label>
                        <select
                          id="rentalProduct"
                          className="input"
                          value={rentalForm.productId}
                          disabled={Boolean(editingRentalPriceId)}
                          onChange={(event) =>
                            setRentalForm((current) => ({
                              ...current,
                              productId: event.target.value,
                              variantId: '',
                            }))
                          }
                        >
                          <option value="">Select an active product</option>
                          {rentalCatalog?.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      {!!selectedRentalProduct?.variants.length && (
                        <div>
                          <label htmlFor="rentalVariant" className="label">
                            Configuration
                          </label>
                          <select
                            id="rentalVariant"
                            className="input"
                            value={rentalForm.variantId}
                            disabled={Boolean(editingRentalPriceId)}
                            onChange={(event) =>
                              setRentalForm((current) => ({
                                ...current,
                                variantId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select a configuration</option>
                            {selectedRentalProduct.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.name} ({variant.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label htmlFor="rentalTenure" className="label">
                          Tenure
                        </label>
                        <select
                          id="rentalTenure"
                          className="input"
                          value={rentalForm.tenureMonths}
                          disabled={Boolean(editingRentalPriceId)}
                          onChange={(event) =>
                            setRentalForm((current) => ({
                              ...current,
                              tenureMonths: event.target.value,
                            }))
                          }
                        >
                          {[1, 3, 6, 12, 24].map((months) => (
                            <option key={months} value={months}>
                              {months} months
                            </option>
                          ))}
                        </select>
                      </div>
                      {[
                        ['monthlyPrice', 'Monthly rent (₹)', '1'],
                        ['securityDeposit', 'Refundable deposit (₹)', '0'],
                        ['deliveryCharge', 'One-time delivery (₹)', '0'],
                      ].map(([field, label, min]) => (
                        <div key={field}>
                          <label htmlFor={`rental-${field}`} className="label">
                            {label}
                          </label>
                          <input
                            id={`rental-${field}`}
                            className="input"
                            type="number"
                            min={min}
                            step="0.01"
                            value={rentalForm[field as keyof typeof rentalForm]}
                            onChange={(event) =>
                              setRentalForm((current) => ({
                                ...current,
                                [field]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <label htmlFor="rentalReason" className="label">
                          Reason for this price change
                        </label>
                        <textarea
                          id="rentalReason"
                          className="input min-h-20"
                          minLength={3}
                          maxLength={500}
                          value={rentalForm.reason}
                          onChange={(event) =>
                            setRentalForm((current) => ({ ...current, reason: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={createRentalPrice.isPending || updateRentalPrice.isPending}
                        onClick={handleSaveRentalPrice}
                      >
                        {editingRentalPriceId ? 'Save Draft Changes' : 'Create Manual Draft'}
                      </Button>
                      {editingRentalPriceId && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={resetRentalForm}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                    {rentalCatalogError && (
                      <p role="alert" className="text-sm text-red-600">
                        {rentalCatalogError.message}
                      </p>
                    )}
                    {rentalPricesError && (
                      <p role="alert" className="text-sm text-red-600">
                        {rentalPricesError.message}
                      </p>
                    )}
                    {!rentalPricesError && !rentalPrices?.length && (
                      <p className="text-sm text-gray-500">No rental prices are configured.</p>
                    )}
                    {!!rentalPrices?.length && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-xs text-gray-500">
                            <tr>
                              <th className="py-2 pr-3">Product / variant</th>
                              <th className="py-2 pr-3">Term</th>
                              <th className="py-2 pr-3">Monthly rent</th>
                              <th className="py-2 pr-3">Deposit / delivery</th>
                              <th className="py-2 pr-3">State</th>
                              <th className="py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rentalPrices.map((price) => {
                              const hasApprovalAudit = Boolean(
                                price.auditHistory?.some((entry) => entry.action === 'APPROVED'),
                              );
                              const needsManualReview =
                                price.status === 'DRAFT' &&
                                price.sourceType === 'MANUAL' &&
                                !price.changeReason;
                              return (
                                <tr
                                  key={price.id}
                                  className="border-t border-gray-100 dark:border-gray-800"
                                >
                                <td className="py-3 pr-3">
                                  <span className="block font-semibold text-gray-900 dark:text-white">
                                    {price.product.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {price.variant?.name || price.product.sku}
                                  </span>
                                </td>
                                <td className="py-3 pr-3">{price.tenureMonths} months</td>
                                <td className="py-3 pr-3 font-semibold">
                                  ₹{Number(price.monthlyPrice).toLocaleString('en-IN')}/mo
                                </td>
                                <td className="py-3 pr-3 text-xs">
                                  ₹{Number(price.securityDeposit).toLocaleString('en-IN')} / ₹
                                  {Number(price.deliveryCharge).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 pr-3">
                                  <span>
                                    {price.status === 'APPROVED' && !hasApprovalAudit
                                      ? 'LEGACY · NOT PUBLISHED'
                                      : `${price.status} · ${price.sourceType}`}
                                  </span>
                                  {needsManualReview && (
                                    <span className="block text-xs text-amber-700">
                                      Save a manual price and reason before approval
                                    </span>
                                  )}
                                  {price.estimateLabel && (
                                    <span className="block text-xs text-amber-700">
                                      {price.estimateLabel}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {price.status === 'DRAFT' && price.sourceType === 'MANUAL' && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleEditRentalPrice(price)}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="primary"
                                          size="sm"
                                          loading={approveRentalPrice.isPending}
                                          disabled={
                                            needsManualReview ||
                                            Number(price.securityDeposit) !== 0 ||
                                            Number(price.deliveryCharge) !== 0
                                          }
                                          onClick={() => handleApproveRentalPrice(price.id)}
                                        >
                                          Approve
                                        </Button>
                                        {needsManualReview && (
                                          <span className="self-center text-xs text-amber-700">
                                            Edit and save to review this legacy draft
                                          </span>
                                        )}
                                        {!needsManualReview &&
                                          (Number(price.securityDeposit) !== 0 ||
                                            Number(price.deliveryCharge) !== 0) && (
                                          <span className="self-center text-xs text-amber-700">
                                            One-time fees are not billable yet
                                          </span>
                                        )}
                                      </>
                                    )}
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        setHistoryRentalPriceId(
                                          historyRentalPriceId === price.id ? null : price.id,
                                        )
                                      }
                                    >
                                      {historyRentalPriceId === price.id
                                        ? 'Hide history'
                                        : 'History'}
                                    </Button>
                                  </div>
                                </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {historyRentalPriceId && (
                      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Price change history
                        </h3>
                        {rentalPriceHistoryError && (
                          <p role="alert" className="mt-2 text-sm text-red-600">
                            {rentalPriceHistoryError.message}
                          </p>
                        )}
                        {!rentalPriceHistoryError && !rentalPriceHistory?.length && (
                          <p className="mt-2 text-sm text-gray-500">
                            No audit entries for this price.
                          </p>
                        )}
                        {!!rentalPriceHistory?.length && (
                          <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                            {rentalPriceHistory.map((entry) => (
                              <li
                                key={entry.id}
                                className="border-t border-gray-100 pt-2 dark:border-gray-800"
                              >
                                <strong>{entry.action}</strong> ·{' '}
                                {entry.admin.name || entry.admin.email} ·{' '}
                                {new Date(entry.createdAt).toLocaleString('en-IN')}
                                <span className="block">{entry.reason}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="space-y-4">
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Termination Requests
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Approving a request immediately cancels its Razorpay AutoPay mandate.
                      </p>
                    </div>
                    {terminationRequestsError && (
                      <p role="alert" className="text-sm text-red-600">
                        {terminationRequestsError.message}
                      </p>
                    )}
                    {!terminationRequestsError && !terminationRequests?.length && (
                      <p className="text-sm text-gray-500">
                        No rental termination requests awaiting review.
                      </p>
                    )}
                    {!!terminationRequests?.length &&
                      terminationRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {request.order.orderNumber} ·{' '}
                              {request.user.name || request.user.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.tenureMonths} months · ₹
                              {Number(request.monthlyAmount).toLocaleString('en-IN')}/month ·
                              Requested{' '}
                              {request.terminationRequestedAt
                                ? new Date(request.terminationRequestedAt).toLocaleDateString(
                                    'en-IN',
                                  )
                                : '—'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            loading={approveRentalTermination.isPending}
                            onClick={() => handleApproveTermination(request.id)}
                          >
                            Approve & cancel mandate
                          </Button>
                        </div>
                      ))}
                  </section>
                </div>
              )}

              {/* Form Action Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Settings are written directly to PostgreSQL database.
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={updateSettingsMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
