'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminSettings, useUpdateAdminSettings } from '../../../lib/admin-queries';
import { useToast } from '../../../components/ui/Toast';
import { QueryState } from '../../../components/admin/QueryState';
import Button from '../../../components/ui/Button';
import { AdminSettings } from '../../../lib/types';

type SettingsTab = 'store' | 'inventory' | 'shipping';

interface TabConfig {
  id: SettingsTab;
  label: string;
  description: string;
  icon: string;
}

const TABS: TabConfig[] = [
  {
    id: 'store',
    label: 'Store Profile & Contact',
    description: 'Public business details and support channels',
    icon: '🏬',
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock Alerts',
    description: 'Catalog thresholds and low-stock warnings',
    icon: '📦',
  },
  {
    id: 'shipping',
    label: 'Shipping & Delivery Rules',
    description: 'Delivery timelines and free shipping threshold',
    icon: '🚚',
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
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync form state when backend data loads
  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (field: keyof AdminSettings, value: string | number) => {
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

    if (Number(formData.freeShippingThreshold) < 0 || isNaN(Number(formData.freeShippingThreshold))) {
      errors.freeShippingThreshold = 'Free shipping threshold cannot be negative';
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

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center space-x-1.5">
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

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={false}
        onRetry={refetch}
      >
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
                    <span className="text-base" aria-hidden="true">{tab.icon}</span>
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </div>
                  <p className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
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
                      Information displayed on customer invoices, order confirmations, and customer support channels.
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
                        aria-describedby={fieldErrors.supportEmail ? 'supportEmail-error' : undefined}
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
                        aria-describedby={fieldErrors.contactPhone ? 'contactPhone-error' : undefined}
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
                        aria-describedby={fieldErrors.storeAddress ? 'storeAddress-error' : undefined}
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
                      Configure automated low-stock warnings across the administrative dashboard and product catalog.
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
                      aria-describedby={fieldErrors.lowStockThreshold ? 'lowStock-error' : 'lowStock-hint'}
                    />
                    <p id="lowStock-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Products with stock at or below this number are flagged in the admin panel and dashboard alerts.
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
                      Defines free delivery qualifications and estimated transit timelines presented at checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="freeShippingThreshold" className="label">
                        Free Shipping Minimum Order Value (₹) <span className="text-red-500">*</span>
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
                        aria-describedby={fieldErrors.freeShippingThreshold ? 'freeShipping-error' : undefined}
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
                        aria-describedby={fieldErrors.standardDeliveryDays ? 'standardDays-error' : undefined}
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
                      aria-describedby={fieldErrors.expressDeliveryDays ? 'expressDays-error' : undefined}
                    />
                    {fieldErrors.expressDeliveryDays && (
                      <p id="expressDays-error" className="text-xs text-red-500 mt-1">
                        {fieldErrors.expressDeliveryDays}
                      </p>
                    )}
                  </div>
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
