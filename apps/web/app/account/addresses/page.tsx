'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Address, CreateAddressDto } from '@/lib/types';
import { AddressCard, ConfirmDialog, SkeletonList } from '@/components/account';
import {
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
];

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Accessible confirmation dialog for deletion
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateAddressDto>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    landmark: '',
    label: 'Home',
    gstin: '',
    isDefault: false,
  });

  const [pincodeStatus, setPincodeStatus] = useState<{ valid: boolean; serviceable: boolean; text: string } | null>(null);
  const [verifyingPincode, setVerifyingPincode] = useState(false);

  // Debounced pincode verification in address modal
  useEffect(() => {
    const cleanPin = form.pincode?.trim() || '';
    let active = true;
    setPincodeStatus(null);
    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setPincodeStatus(null);
      setVerifyingPincode(false);
      return () => { active = false; };
    }

    const timer = setTimeout(async () => {
      setVerifyingPincode(true);
      try {
        const res = await api.verifyPincode(cleanPin);
        if (!active) return;
        if (res.valid && res.serviceable) {
          setPincodeStatus({ valid: true, serviceable: true, text: `✓ Delivery available to ${res.city || ''}, ${res.state || ''}` });
          setForm((prev) => ({
            ...prev,
            city: res.city || prev.city,
            state: res.state || prev.state,
          }));
        } else if (!res.valid) {
          setPincodeStatus({ valid: false, serviceable: false, text: '⚠️ Please enter a valid Indian pincode.' });
        } else {
          setPincodeStatus({ valid: true, serviceable: false, text: '⚠️ Sorry, we currently do not deliver to this pincode.' });
        }
      } catch {
        if (active) setPincodeStatus({ valid: false, serviceable: false, text: '⚠️ Pincode verification is temporarily unavailable.' });
      } finally {
        if (active) setVerifyingPincode(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.pincode]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await api.getAddresses();
      setAddresses(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setPincodeStatus(null);
    setForm({
      fullName: '',
      phone: '',
      address: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      landmark: '',
      label: 'Home',
      gstin: '',
      isDefault: addresses.length === 0,
    });
    setModalOpen(true);
    setStatusMessage(null);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || 'Karnataka',
      pincode: addr.pincode || '',
      landmark: addr.landmark || '',
      label: addr.label || 'Home',
      gstin: addr.gstin || '',
      isDefault: addr.isDefault,
    });
    setModalOpen(true);
    setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address.trim()) {
      setStatusMessage({ type: 'error', text: 'Street address is required.' });
      return;
    }
    if (!/^\d{6}$/.test(form.pincode?.trim() || '')) {
      setStatusMessage({ type: 'error', text: 'PIN code must be exactly 6 numeric digits (e.g. 560103).' });
      return;
    }
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(form.gstin.trim())) {
      setStatusMessage({ type: 'error', text: 'Invalid GSTIN format (15 characters: 29ABCDE1234F1Z5).' });
      return;
    }

    setSaving(true);
    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress.id, form);
        setStatusMessage({ type: 'success', text: 'Address updated successfully!' });
      } else {
        await api.createAddress(form);
        setStatusMessage({ type: 'success', text: 'Address added successfully!' });
      }
      setModalOpen(false);
      loadAddresses();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save address.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAddress(deleteTarget.id);
      setDeleteTarget(null);
      loadAddresses();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete address.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    setSettingDefaultId(addr.id);
    try {
      await api.updateAddress(addr.id, { isDefault: true });
      loadAddresses();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to set default address.' });
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manage Delivery Addresses</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save shipping locations with optional GSTIN details for business and personal deliveries.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <SkeletonList count={2} />
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No addresses saved</p>
          <p className="text-xs text-slate-500 mt-1">Add a shipping address for faster one-click checkout.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={openEditModal}
              onDelete={(target) => setDeleteTarget(target)}
              onSetDefault={handleSetDefault}
              isSettingDefault={settingDefaultId === addr.id}
            />
          ))}
        </div>
      )}

      {/* Accessible Confirmation Dialog for Deleting Address */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Delivery Address"
        message={`Are you sure you want to delete the address for "${deleteTarget?.fullName || 'this location'}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Address'}
        cancelLabel="Keep Address"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAddress ? 'Edit Address' : 'Add New Shipping Address'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Receiver Name *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                    placeholder="e.g. Shivam Anand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Street Address *</label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  placeholder="Flat/House No., Building Name, Street"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">PIN Code (6-Digits) *</label>
                    {verifyingPincode && <span className="text-[10px] text-blue-600 animate-pulse font-medium">Verifying...</span>}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
                    className={`w-full px-3.5 py-2 rounded-xl border ${
                      pincodeStatus?.valid && pincodeStatus?.serviceable ? 'border-emerald-300' : pincodeStatus && !pincodeStatus.valid ? 'border-rose-300' : 'border-slate-200'
                    } text-sm focus:border-blue-500 outline-none font-mono`}
                    placeholder="560103"
                  />
                  {pincodeStatus && (
                    <p className={`text-[10px] mt-1 font-medium ${pincodeStatus.serviceable ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {pincodeStatus.text}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                    placeholder="Bengaluru"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none bg-white"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={form.landmark}
                    onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                    placeholder="Near Marathahalli Bridge"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Address Label</label>
                  <select
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work / Office</option>
                    <option value="Warehouse">Warehouse / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Business GSTIN (Optional - for tax invoices)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none font-mono uppercase"
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is-default-checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <label htmlFor="is-default-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Make this my default shipping address
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
