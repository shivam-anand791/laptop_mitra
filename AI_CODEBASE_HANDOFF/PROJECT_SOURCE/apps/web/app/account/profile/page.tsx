'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.imageUrl || null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      if (user.dob) {
        try {
          setDob(new Date(user.dob).toISOString().split('T')[0]);
        } catch {
          // ignore date parse errors
        }
      }
      if (user.imageUrl) setAvatarPreview(user.imageUrl);

      api.getMyBusinessProfile()
        .then((res) => {
          if (res?.companyName || res?.gstin) {
            setBusinessProfile(res);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Full name cannot be empty.');
      return;
    }

    if (phone && !/^[0-9+ -]{10,15}$/.test(phone.trim())) {
      setErrorMessage('Please enter a valid phone number (10-15 digits).');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        dob: dob || undefined,
      });
      updateUser(updated);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
        <p className="text-xs text-slate-500 mt-1">
          Update your public name, primary contact details, and account preferences.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold p-4 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Avatar Section */}
      <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black overflow-hidden border-2 border-white shadow-xs">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-xs transition"
            title="Upload Photo"
          >
            <Camera className="w-3.5 h-3.5" />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Profile Photo</h4>
          <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG or WebP up to 5MB.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
                placeholder="e.g. Anand Sharma"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          {/* Email Address (Read Only) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address (Protected)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              Managed securely via Firebase Auth. To change email, go to Security settings.
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Date of Birth (Optional)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Corporate & Business Profile Card (Read Only) */}
      {businessProfile && (
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Corporate & Business Profile</h3>
                <p className="text-xs text-slate-500">
                  Registered enterprise billing profile for GST and priority support.
                </p>
              </div>
            </div>
            {businessProfile.priorityEnabled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                VIP Priority Enterprise Client
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                Company Name
              </span>
              <p className="font-bold text-slate-900 text-sm">{businessProfile.companyName || '—'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                GSTIN (Tax ID)
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm uppercase">
                {businessProfile.gstin || '—'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                Primary Contact Liaison
              </span>
              <p className="font-semibold text-slate-800">{businessProfile.contactPerson || '—'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                Dedicated Account Manager
              </span>
              <p className="font-semibold text-slate-800">{businessProfile.accountManager || 'LaptopMitra Corporate Desk'}</p>
            </div>
            {businessProfile.billingAddress && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                  Official Billing Address
                </span>
                <p className="font-medium text-slate-700 whitespace-pre-wrap">{businessProfile.billingAddress}</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Corporate details and priority tier are managed by your LaptopMitra enterprise administrator. To request updates, please contact your account manager or raise a billing support ticket.
          </p>
        </div>
      )}
    </div>
  );
}
