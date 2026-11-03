'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { adminApi } from '../../lib/admin-api';
import { useToast } from '../ui/Toast';
import { formatDate } from '../../lib/format';

interface UserCorporateAndNotesModalProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  open: boolean;
  onClose: () => void;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function UserCorporateAndNotesModal({
  user,
  open,
  onClose,
}: UserCorporateAndNotesModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'notes' | '360'>('360');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Business profile form
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [priorityEnabled, setPriorityEnabled] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  // 360 Customer view
  const [user360, setUser360] = useState<any>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    loadData();
  }, [open, user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profileRes, notesRes, user360Res] = await Promise.allSettled([
        adminApi.getBusinessProfile(user.id),
        adminApi.getClientNotes(user.id),
        adminApi.getUser360(user.id),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value;
        setCompanyName(p.companyName || '');
        setGstin(p.gstin || '');
        setBillingAddress(p.billingAddress || '');
        setContactPerson(p.contactPerson || '');
        setAccountManager(p.accountManager || '');
        setPriorityEnabled(Boolean(p.priorityEnabled));
      } else {
        setCompanyName('');
        setGstin('');
        setBillingAddress('');
        setContactPerson('');
        setAccountManager('');
        setPriorityEnabled(false);
      }

      if (notesRes.status === 'fulfilled' && Array.isArray(notesRes.value)) {
        setNotes(notesRes.value);
      } else {
        setNotes([]);
      }

      if (user360Res.status === 'fulfilled' && user360Res.value) {
        setUser360(user360Res.value);
      } else {
        setUser360(null);
      }
    } catch {
      addToast('error', 'Failed to load user profile or notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (gstin && !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      addToast('error', 'Invalid GSTIN format. Expected 15 characters (e.g. 29ABCDE1234F1Z5).');
      return;
    }

    setSavingProfile(true);
    try {
      await adminApi.upsertBusinessProfile(user.id, {
        companyName: companyName.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        accountManager: accountManager.trim() || undefined,
        priorityEnabled,
      });
      addToast('success', 'Corporate business profile updated.');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update business profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const created = await adminApi.createClientNote(user.id, newNote.trim());
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
      addToast('success', 'Client note appended.');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to add client note.');
    } finally {
      setAddingNote(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Client Management: ${user.name || user.email || user.id}`}
      description="Corporate profile and append-only staff notes."
      size="lg"
    >
      <div className="space-y-4 pt-2">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('360')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === '360'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Customer 360
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Corporate Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Staff Notes ({notes.length})
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading details...</div>
        ) : activeTab === '360' ? (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Total Orders</span>
                <p className="text-lg font-bold text-blue-950 dark:text-blue-100 mt-0.5">
                  {user360?.counts?.totalOrders ?? 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">Lease Contracts</span>
                <p className="text-lg font-bold text-indigo-950 dark:text-indigo-100 mt-0.5">
                  {user360?.counts?.totalLeases ?? 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Buyback Claims</span>
                <p className="text-lg font-bold text-emerald-950 dark:text-emerald-100 mt-0.5">
                  {user360?.counts?.totalBuybacks ?? 0}
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Support Tickets</span>
                <p className="text-lg font-bold text-amber-950 dark:text-amber-100 mt-0.5">
                  {user360?.counts?.totalTickets ?? 0}
                </p>
              </div>
            </div>

            {/* Corporate Summary Pill */}
            {user360?.businessProfile?.companyName ? (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-950 dark:text-blue-200">
                      {user360.businessProfile.companyName}
                    </span>
                    {user360.businessProfile.priorityEnabled && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                        VIP Priority Client
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    GSTIN: {user360.businessProfile.gstin || 'None recorded'} &bull; Contact: {user360.businessProfile.contactPerson || 'None'}
                  </p>
                </div>
                {user360.businessProfile.accountManager && (
                  <span className="text-[11px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-medium">
                    Account Mgr: {user360.businessProfile.accountManager}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 text-gray-500">
                Standard Retail Consumer Account (No corporate profile assigned).
              </div>
            )}

            {/* Recent Orders */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span>Recent Orders</span>
                <span className="text-[10px] text-gray-400">Showing last {user360?.recentOrders?.length || 0}</span>
              </div>
              {(!user360?.recentOrders || user360.recentOrders.length === 0) ? (
                <p className="text-gray-400 p-3 text-center">No orders placed yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {user360.recentOrders.map((ord: any) => (
                    <div key={ord.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {ord.orderNumber}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {formatDate(ord.createdAt)} &bull; {ord.items?.length || 0} item(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Lease Contracts */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span>Lease Contracts</span>
                <span className="text-[10px] text-gray-400">Showing last {user360?.recentLeases?.length || 0}</span>
              </div>
              {(!user360?.recentLeases || user360.recentLeases.length === 0) ? (
                <p className="text-gray-400 p-3 text-center">No active or historical leases.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {user360.recentLeases.map((l: any) => (
                    <div key={l.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {l.contractNumber} ({l.tenureMonths} Months)
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Status: <span className="font-medium text-gray-700 dark:text-gray-300">{l.status}</span> &bull; {l.installments?.length || 0} schedule(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ₹{Number(l.monthlyRent || 0).toLocaleString('en-IN')}/mo
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(l.startDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Buybacks */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span>Buyback Requests</span>
                <span className="text-[10px] text-gray-400">Showing last {user360?.recentBuybacks?.length || 0}</span>
              </div>
              {(!user360?.recentBuybacks || user360.recentBuybacks.length === 0) ? (
                <p className="text-gray-400 p-3 text-center">No buyback claims filed.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {user360.recentBuybacks.map((bb: any) => (
                    <div key={bb.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {bb.requestNumber}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {formatDate(bb.createdAt)} &bull; Tier: {bb.tierPercent}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ₹{Number(bb.finalPayout || bb.quoteAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {bb.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Support Tickets & Feedback */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span>Support Tickets & CSAT</span>
                <span className="text-[10px] text-gray-400">Showing last {user360?.recentTickets?.length || 0}</span>
              </div>
              {(!user360?.recentTickets || user360.recentTickets.length === 0) ? (
                <p className="text-gray-400 p-3 text-center">No support tickets found.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {user360.recentTickets.map((t: any) => (
                    <div key={t.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {t.ticketNumber}: {t.subject}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {t.category} &bull; Priority: {t.priority} &bull; {formatDate(t.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {t.status}
                        </span>
                        {t.satisfactionRating && (
                          <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                            CSAT: {t.satisfactionRating} / 5
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Technologies Pvt Ltd"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  className="input w-full font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Primary liaison"
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Billing Address
              </label>
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={2}
                placeholder="Full official tax & invoice address"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Manager (Optional)
                </label>
                <input
                  type="text"
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  placeholder="Staff owner name"
                  className="input w-full"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priorityEnabled}
                    onChange={(e) => setPriorityEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    VIP Priority Client
                  </span>
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Gives priority sorting to all support tickets opened by this client.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={savingProfile}>
                Save Business Profile
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="block font-medium text-gray-700 dark:text-gray-300">
                Append Internal Staff Note
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                placeholder="Add confidential customer context, verification detail, or call record..."
                className="input w-full"
                required
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500 italic">
                  Notes are immutable once logged (append-only audit trail).
                </span>
                <Button variant="primary" size="sm" type="submit" loading={addingNote}>
                  Add Note
                </Button>
              </div>
            </form>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Note History</h4>
              {notes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No staff notes recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-1"
                    >
                      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{n.note}</p>
                      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>By: {n.staff?.name || n.staff?.email || 'Staff'}</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

