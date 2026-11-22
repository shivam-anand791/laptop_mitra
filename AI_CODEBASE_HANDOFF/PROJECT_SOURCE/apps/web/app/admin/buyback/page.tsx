'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { adminApi } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../components/ui/Toast';
import { formatIndianRupees } from '@/lib/account-helpers';
import {
  ShieldCheck,
  Search,
  Key,
  CreditCard,
  Settings,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';

export default function AdminBuybackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Buyback Console...</div>}>
      <BuybackConsoleContent />
    </Suspense>
  );
}

function BuybackConsoleContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'SETTINGS'>('QUEUE');

  // Queue State
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [inspectionTarget, setInspectionTarget] = useState<any | null>(null);
  const [inspectBoots, setInspectBoots] = useState(true);
  const [inspectMobo, setInspectMobo] = useState(true);
  const [inspectDisplay, setInspectDisplay] = useState(true);
  const [inspectCharger, setInspectCharger] = useState(true);
  const [inspectBattery, setInspectBattery] = useState(85);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [revisedAmount, setRevisedAmount] = useState<string>('');

  const [returnDispatchTarget, setReturnDispatchTarget] = useState<any | null>(null);
  const [courierName, setCourierName] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  const [payoutTarget, setPayoutTarget] = useState<any | null>(null);
  const [payoutUtr, setPayoutUtr] = useState('');
  const [decryptedDetails, setDecryptedDetails] = useState<any | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  // Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [quoteValidityDays, setQuoteValidityDays] = useState(15);
  const [convenienceCharge, setConvenienceCharge] = useState(0);
  const [batteryMinPercent, setBatteryMinPercent] = useState(70);
  const [tiers, setTiers] = useState<any[]>([]);

  const fetchBuybacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminBuybacks({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit: 20,
      });
      setRequests(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to fetch buyback claims');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page, addToast]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await adminApi.getAdminBuybackSettings();
      if (res.settings) {
        setQuoteValidityDays(res.settings.quoteValidityDays);
        setConvenienceCharge(Number(res.settings.convenienceCharge));
        setBatteryMinPercent(res.settings.batteryMinPercent);
      }
      setTiers(res.tiers || []);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to load buyback settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'QUEUE') fetchBuybacks();
    else fetchSettings();
  }, [activeTab, fetchBuybacks, fetchSettings]);

  // Inspection Submit
  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionTarget) return;

    try {
      await adminApi.submitBuybackInspection(inspectionTarget.id, {
        bootsToOs: inspectBoots,
        motherboardWorking: inspectMobo,
        displayIntact: inspectDisplay,
        originalCharger: inspectCharger,
        batteryHealthPercent: inspectBattery,
        inspectionNotes,
        revisedQuotedAmount: revisedAmount.trim() ? Number(revisedAmount) : undefined,
      });

      addToast('success', `Inspection submitted for #${inspectionTarget.requestNumber}`);
      setInspectionTarget(null);
      fetchBuybacks();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to submit inspection');
    }
  };

  // Return Dispatch Submit
  const handleReturnDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDispatchTarget) return;

    try {
      await adminApi.dispatchBuybackReturn(returnDispatchTarget.id, {
        courierName,
        trackingNumber,
      });

      addToast(
        'success',
        `Free return shipment dispatched via ${courierName} (AWB: ${trackingNumber})`,
      );
      setReturnDispatchTarget(null);
      fetchBuybacks();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to dispatch return shipment');
    }
  };

  // Payout Submit
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutTarget) return;

    try {
      await adminApi.processBuybackPayout(payoutTarget.id, {
        payoutUtr: payoutUtr.trim(),
      });

      addToast('success', `Payout recorded with UTR #${payoutUtr} for ${payoutTarget.requestNumber}`);
      setPayoutTarget(null);
      setPayoutUtr('');
      setDecryptedDetails(null);
      fetchBuybacks();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to record payout');
    }
  };

  // Decrypt Payout
  const handleDecrypt = async (id: string) => {
    setDecrypting(true);
    try {
      const res = await adminApi.decryptBuybackPayout(id);
      setDecryptedDetails(res);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to decrypt payout details');
    } finally {
      setDecrypting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.updateAdminBuybackSettings({
        quoteValidityDays,
        convenienceCharge,
        batteryMinPercent,
      });
      addToast('success', 'Buyback policy settings saved.');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update settings');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'requestNumber',
      header: 'Claim #',
      render: (row: any) => (
        <div>
          <span className="font-mono font-bold text-emerald-700 block">{row.requestNumber}</span>
          <span className="text-[11px] text-slate-500 font-sans">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer & Order',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.user?.name || 'Customer'}</span>
          <span className="text-[11px] text-slate-500 block">
            Order #{row.order?.orderNumber} • {row.user?.phone || row.user?.email}
          </span>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device & Age',
      render: (row: any) => (
        <div>
          <span className="font-medium text-slate-800 block text-xs">
            {row.orderItem?.product?.name || 'Laptop'}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {row.deviceAgeMonths} {row.deviceAgeMonths === 1 ? 'Month' : 'Months'} • Invoice {formatIndianRupees(Number(row.originalNetPrice))}
          </span>
        </div>
      ),
    },
    {
      key: 'valuation',
      header: 'Tier & Valuation',
      render: (row: any) => (
        <div>
          <span className="font-bold text-emerald-700 block font-mono text-xs">
            {formatIndianRupees(Number(row.finalPayoutAmount || row.initialQuotedAmount))}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Tier: {Number(row.tierPercentApplied)}%
            {row.revisedQuotedAmount ? ` (Revised from ₹${Number(row.initialQuotedAmount)})` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        let variant: any = 'neutral';
        if (row.status === 'QUOTE_ACCEPTED' || row.status === 'PICKUP_SCHEDULED') variant = 'info';
        if (row.status === 'INSPECTION_PASSED' || row.status === 'PAID') variant = 'success';
        if (row.status === 'REVISED_OFFER_PENDING' || row.status === 'REVISED_OFFER_DECLINED') variant = 'warning';
        if (row.status === 'REJECTED' || row.status === 'CANCELLED') variant = 'error';

        return <StatusBadge status={row.status} variant={variant} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Inspect Button */}
          {['QUOTE_ACCEPTED', 'PICKED_UP', 'INSPECTING'].includes(row.status) && (
            <button
              type="button"
              onClick={() => {
                setInspectionTarget(row);
                setInspectBoots(row.bootsToOs ?? true);
                setInspectMobo(row.motherboardWorking ?? true);
                setInspectDisplay(row.displayIntact ?? true);
                setInspectCharger(row.originalCharger ?? true);
                setInspectBattery(row.batteryHealthPercent ?? 85);
                setInspectionNotes(row.inspectionNotes || '');
                setRevisedAmount(row.revisedQuotedAmount ? String(row.revisedQuotedAmount) : '');
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Inspect
            </button>
          )}

          {/* Return Dispatch Button */}
          {(row.status === 'REVISED_OFFER_DECLINED' || row.status === 'REJECTED') && (
            <button
              type="button"
              onClick={() => {
                setReturnDispatchTarget(row);
                setTrackingNumber('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <RotateCcw className="w-3 h-3" />
              Dispatch Return
            </button>
          )}

          {/* Process Payout Button */}
          {['INSPECTION_PASSED', 'REVISED_OFFER_ACCEPTED', 'PAYOUT_PENDING'].includes(row.status) && (
            <button
              type="button"
              onClick={() => {
                setPayoutTarget(row);
                setPayoutUtr('');
                setDecryptedDetails(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <CreditCard className="w-3 h-3" />
              Payout
            </button>
          )}

          {row.status === 'PAID' && (
            <span className="text-[11px] text-emerald-700 font-semibold font-mono">
              UTR: {row.payoutUtr}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyback Guarantee Management"
        description="Oversee assured buyback claims, warehouse inspections, revised customer offers, free returns, and encrypted payouts."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('QUEUE')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'QUEUE'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Buyback Claims Queue ({total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'SETTINGS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          Policy & Tier Matrix
        </button>
      </div>

      {activeTab === 'QUEUE' ? (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold overflow-x-auto">
              {['ALL', 'QUOTE_ACCEPTED', 'PICKED_UP', 'INSPECTING', 'INSPECTION_PASSED', 'REVISED_OFFER_PENDING', 'PAID'].map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition ${
                      statusFilter === st
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ),
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by LM-BB, order, customer..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <DataTable
              columns={columns}
              data={requests}
              keyExtractor={(r: any) => r.id}
              isLoading={loading}
              emptyState={{
                title: 'No Buyback Claims',
                description: 'No buyback guarantee claims found.',
              }}
            />
          </div>
        </div>
      ) : (
        /* SETTINGS & TIERS TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Policy Settings Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              Buyback Policies
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quote Validity (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default 15 days. Admin delay never expires a customer-accepted quote.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Doorstep Pickup & Convenience Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={convenienceCharge}
                  onChange={(e) => setConvenienceCharge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default ₹0 (free pickup). If &gt; 0, subtracted from quote and shown as a separate line.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Battery Health Required (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={batteryMinPercent}
                  onChange={(e) => setBatteryMinPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default 70%. Below this, standard quote is withheld.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isAdmin}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  Save Policy Settings
                </button>
              </div>
            </form>
          </div>

          {/* Tier Matrix Display */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-emerald-600" />
              Authoritative 6-Tier Valuation Matrix
            </h3>

            <p className="text-xs text-slate-500">
              Database-backed tier schedule matching PHP policy. Age is calendar months in IST from delivery date; upper bound is inclusive.
            </p>

            <div className="divide-y divide-slate-100 text-xs border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 font-bold text-slate-700 grid grid-cols-3">
                <span>From - To</span>
                <span>Assured Rate</span>
                <span>Example ₹30,000</span>
              </div>
              {tiers.map((t) => (
                <div key={t.id} className="px-3 py-2.5 grid grid-cols-3 text-slate-800">
                  <span className="font-semibold">
                    {t.fromMonths} to {t.toMonths} Months
                  </span>
                  <span className="font-bold text-emerald-700 font-mono">{Number(t.percentage)}%</span>
                  <span className="text-slate-600 font-mono">
                    {formatIndianRupees(30000 * (Number(t.percentage) / 100))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PHYSICAL INSPECTION */}
      {inspectionTarget && (
        <AdminModal
          open={true}
          onClose={() => setInspectionTarget(null)}
          title={`Warehouse Inspection #${inspectionTarget.requestNumber}`}
        >
          <form onSubmit={handleInspectionSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">
                Laptop: {inspectionTarget.orderItem?.product?.name || 'Device'}
              </p>
              <p className="text-slate-600">
                Initial Quote: {formatIndianRupees(Number(inspectionTarget.initialQuotedAmount))} (
                {Number(inspectionTarget.tierPercentApplied)}% tier)
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-900 uppercase tracking-wider">Physical Check Results</p>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={inspectBoots}
                  onChange={(e) => setInspectBoots(e.target.checked)}
                />
                <span>Powers on and boots to operating system</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={inspectMobo}
                  onChange={(e) => setInspectMobo(e.target.checked)}
                />
                <span>Motherboard functional with no liquid damage</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={inspectDisplay}
                  onChange={(e) => setInspectDisplay(e.target.checked)}
                />
                <span>Display intact with no cracks or bleeding</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={inspectCharger}
                  onChange={(e) => setInspectCharger(e.target.checked)}
                />
                <span>Original charger included and working</span>
              </label>

              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tested Battery Health (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={inspectBattery}
                  onChange={(e) => setInspectBattery(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspection Notes / Discrepancies
                </label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="e.g. Scratches on bottom chassis; charger wire frayed"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revised Quoted Amount (₹) - Optional
                </label>
                <input
                  type="number"
                  min="0"
                  value={revisedAmount}
                  onChange={(e) => setRevisedAmount(e.target.value)}
                  placeholder="Leave empty if passing full quote"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Providing a revised amount triggers an updated 15-day quote offer for customer approval.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectionTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Submit Inspection
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* MODAL 2: RETURN SHIPMENT DISPATCH */}
      {returnDispatchTarget && (
        <AdminModal
          open={true}
          onClose={() => setReturnDispatchTarget(null)}
          title={`Dispatch Free Return #${returnDispatchTarget.requestNumber}`}
        >
          <form onSubmit={handleReturnDispatchSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold">Customer declined revised offer or device failed inspection.</p>
              <p>Per policy, laptop is returned to customer free of charge with zero convenience fee.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Partner</label>
              <input
                type="text"
                required
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. BlueDart Express, Delhivery"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">AWB Tracking Number</label>
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD123456789IN"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReturnDispatchTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Confirm Dispatch
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* MODAL 3: PAYOUT & DECRYPT */}
      {payoutTarget && (
        <AdminModal
          open={true}
          onClose={() => {
            setPayoutTarget(null);
            setDecryptedDetails(null);
          }}
          title={`Process Payout #${payoutTarget.requestNumber}`}
        >
          <form onSubmit={handlePayoutSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-900">
              <p className="font-bold">
                Payout Amount: {formatIndianRupees(Number(payoutTarget.finalPayoutAmount || payoutTarget.initialQuotedAmount))}
              </p>
              <p>Masked Account: {payoutTarget.payoutMaskedAccount || payoutTarget.payoutMaskedUpi || 'Recorded'}</p>
            </div>

            {/* Decrypt Details Box */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Encrypted Payout Vault</span>
                <button
                  type="button"
                  onClick={() => handleDecrypt(payoutTarget.id)}
                  disabled={decrypting || !isAdmin}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  <Key className="w-3 h-3 text-slate-600" />
                  {decrypting ? 'Decrypting...' : 'Decrypt (Audited)'}
                </button>
              </div>

              {decryptedDetails ? (
                <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] space-y-1">
                  <p>Method: {decryptedDetails.method}</p>
                  {decryptedDetails.accountNumber && <p>A/C: {decryptedDetails.accountNumber}</p>}
                  {decryptedDetails.ifscCode && <p>IFSC: {decryptedDetails.ifscCode}</p>}
                  {decryptedDetails.accountHolderName && <p>Holder: {decryptedDetails.accountHolderName}</p>}
                  {decryptedDetails.upiId && <p>UPI: {decryptedDetails.upiId}</p>}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Click decrypt to inspect full banking details. Every access is logged with timestamp and admin ID.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank / UPI Transaction Reference (UTR)
              </label>
              <input
                type="text"
                required
                value={payoutUtr}
                onChange={(e) => setPayoutUtr(e.target.value)}
                placeholder="e.g. HDFCR520261103001"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPayoutTarget(null);
                  setDecryptedDetails(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isAdmin}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                Confirm Payout Transfer
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
