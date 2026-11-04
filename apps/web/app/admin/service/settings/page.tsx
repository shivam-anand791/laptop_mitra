'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import PageHeader from '../../../../components/admin/PageHeader';

export default function AdminServiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings states
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [newPincode, setNewPincode] = useState('');
  const [turnaroundHours, setTurnaroundHours] = useState<number>(48);
  const [reminderDays, setReminderDays] = useState<string>('30, 7, 1');
  const [backupDisclaimer, setBackupDisclaimer] = useState('');
  const [serviceTerms, setServiceTerms] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await api.getAdminServiceSettings();
      setPincodes(data.serviceAreaPincodes || ['560001']);
      setTurnaroundHours(data.turnaroundHoursTarget || 48);
      setReminderDays((data.reminderLeadDays || [30, 7, 1]).join(', '));
      setBackupDisclaimer(
        data.dataBackupDisclaimerText ||
          'Please ensure all important personal and work data is backed up prior to device pickup.',
      );
      setServiceTerms(
        data.serviceTermsText ||
          'Includes 1 free general service within 6 months of delivery for outright purchased laptops.',
      );
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to load service settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAddPincode = () => {
    const trimmed = newPincode.trim();
    if (!trimmed) return;
    if (pincodes.includes(trimmed)) {
      alert('Pincode or prefix already present.');
      return;
    }
    setPincodes([...pincodes, trimmed]);
    setNewPincode('');
  };

  const handleRemovePincode = (code: string) => {
    setPincodes(pincodes.filter((p) => p !== code));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const parsedReminderDays = reminderDays
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    try {
      await api.updateAdminServiceSettings({
        serviceAreaPincodes: pincodes,
        turnaroundHoursTarget: turnaroundHours,
        reminderLeadDays: parsedReminderDays.length > 0 ? parsedReminderDays : [30, 7, 1],
        dataBackupDisclaimerText: backupDisclaimer.trim(),
        serviceTermsText: serviceTerms.trim(),
      });
      setFeedback({ type: 'success', text: 'Service configuration settings saved successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/admin/service/jobs" className="hover:text-primary underline">
            Service Jobs
          </Link>
          <span>/</span>
          <span className="text-gray-800">Settings</span>
        </div>
      </div>

      <PageHeader
        title="Service & Maintenance Settings"
        description="Configure doorstep coverage areas, diagnostic checklist parameters, and customer disclosure policies."
      />

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Doorstep Coverage Pincodes */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Doorstep Service Area Coverage</h3>
            <p className="text-xs text-gray-500">
              Only addresses matching these postal codes or regional 3-digit prefixes (e.g. 560 for Bangalore) can schedule doorstep service.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value)}
              placeholder="e.g. 560038 or 560"
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 w-48 font-mono outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleAddPincode}
              className="text-xs font-semibold px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              + Add Code
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {pincodes.map((pin) => (
              <span
                key={pin}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200"
              >
                {pin}
                <button
                  type="button"
                  onClick={() => handleRemovePincode(pin)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Operational Timings & Reminders */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Operations & Expiry Reminders</h3>
            <p className="text-xs text-gray-500">
              Internal operational benchmark hours and customer automated reminder intervals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Turnaround Target (Hours)
              </label>
              <input
                type="number"
                min="12"
                max="168"
                value={turnaroundHours}
                onChange={(e) => setTurnaroundHours(parseInt(e.target.value, 10) || 48)}
                className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-gray-500">
                Note: Per policy, turnaround time guarantee is NOT promised to customers.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reminder Lead Days (Comma separated)
              </label>
              <input
                type="text"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                placeholder="30, 7, 1"
                className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-gray-500">
                Days prior to the 6-month entitlement expiry when automated reminder alerts fire.
              </span>
            </div>
          </div>
        </div>

        {/* Customer Disclaimers */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Legal Disclaimers & Disclosures</h3>
            <p className="text-xs text-gray-500">
              Displayed during booking modal and stamped on the generated service receipt.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Data Backup Disclaimer Notice
            </label>
            <textarea
              rows={2}
              value={backupDisclaimer}
              onChange={(e) => setBackupDisclaimer(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Standard Service Terms Text
            </label>
            <textarea
              rows={2}
              value={serviceTerms}
              onChange={(e) => setServiceTerms(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

