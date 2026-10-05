'use client';

import React, { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { NotificationPreferences } from '@/lib/types';
import { Bell, Mail, MessageSquare, Smartphone, Check, AlertCircle, RefreshCw, Save } from 'lucide-react';

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailOrderUpdates: true,
    emailPromotions: false,
    emailPriceAlerts: true,
    smsOrderUpdates: true,
    smsPromotions: false,
    pushOrderUpdates: true,
    pushPromotions: false,
    pushPriceAlerts: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotificationPreferences();
      if (data) {
        setPreferences((prev) => ({ ...prev, ...data }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateNotificationPreferences(preferences);
      if (updated) setPreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Preferences</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Choose what alerts and updates you want to receive via Email, SMS, and Mobile Push Notifications.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {error}
          </div>
          <button
            onClick={fetchPreferences}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Email Notifications Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-base">
              <Mail className="w-5 h-5 text-blue-600" /> Email Notifications
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Order Updates & Tracking</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Confirmation, shipping tracking numbers, and delivery receipts</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('emailOrderUpdates')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.emailOrderUpdates ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Price Drops & Stock Alerts</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Instant notification when items on your wishlist go on sale</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('emailPriceAlerts')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.emailPriceAlerts ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Promotions & Mitra Affiliate News</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Exclusive coupon codes, festive deals, and partner bonus updates</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('emailPromotions')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.emailPromotions ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* SMS Notifications Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-base">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> SMS & WhatsApp Alerts
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Order & Delivery OTPs</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Real-time SMS dispatch and delivery verification OTPs</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('smsOrderUpdates')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.smsOrderUpdates ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Promotional SMS</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Special seasonal discounts and festive clearance sales</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('smsPromotions')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.smsPromotions ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* Push Notifications Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-base">
              <Smartphone className="w-5 h-5 text-purple-600" /> Mobile App Push Notifications
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Order Status</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Live notifications when courier picks up or reaches your doorstep</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('pushOrderUpdates')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.pushOrderUpdates ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Price Alerts</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Lightning deals and stock restores on saved laptops</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('pushPriceAlerts')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    preferences.pushPriceAlerts ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                <Check className="w-4 h-4" /> Preferences saved successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
