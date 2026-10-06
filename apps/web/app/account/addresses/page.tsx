'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Address, CreateAddressDto } from '@/lib/types';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Building2,
  Home,
  Briefcase,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.deleteAddress(id);
      loadAddresses();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete address.');
    }
  };

  const handleSetDefault = async (addr: Address) => {
    try {
      await api.updateAddress(addr.id, { isDefault: true });
      loadAddresses();
    } catch (err: any) {
      alert(err?.message || 'Failed to set default address.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manage Delivery Addresses</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save multiple shipping locations with GSTIN details for business and personal deliveries.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading addresses...
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No addresses saved</p>
          <p className="text-xs text-slate-500 mt-1">Add a shipping address for faster one-click checkout.</p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-2xl p-5 border transition relative flex flex-col justify-between ${
                addr.isDefault
                  ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    {addr.label === 'Work' ? (
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Home className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {addr.label || 'Home'}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                      Default Address
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{addr.fullName || 'Receiver'}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {addr.address}
                  {addr.landmark && `, Landmark: ${addr.landmark}`}
                  <br />
                  {addr.city}, {addr.state} - <span className="font-semibold text-slate-900">{addr.pincode}</span>
                </p>

                {addr.phone && (
                  <p className="text-xs text-slate-500 mt-2 font-medium">Phone: {addr.phone}</p>
                )}

                {addr.gstin && (
                  <div className="mt-3 bg-slate-100 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700 flex items-center gap-1.5 font-mono">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>GSTIN: {addr.gstin}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                {!addr.isDefault ? (
                  <button
                    onClick={() => handleSetDefault(addr)}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 transition"
                  >
                    Set as Default
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(addr)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAddress ? 'Edit Address' : 'Add New Shipping Address'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PIN Code (6-Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none font-mono"
                    placeholder="560103"
                  />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-2"
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
