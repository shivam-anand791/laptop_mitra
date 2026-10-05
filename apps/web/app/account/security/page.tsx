'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Smartphone,
  RefreshCw,
  X,
  Radio,
} from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Actions state
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [signOutEverywhereMsg, setSignOutEverywhereMsg] = useState<string | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('lm_user');
    if (localUser) {
      try {
        setUser(JSON.parse(localUser));
      } catch {
        // ignore
      }
    }
    api.getProfile()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSignOutEverywhere = async () => {
    if (!confirm('This will invalidate all active login sessions on all your phones, tablets, and computers. Proceed?')) {
      return;
    }
    setSigningOutEverywhere(true);
    setSignOutEverywhereMsg(null);
    try {
      const res = await api.signoutEverywhere();
      setSignOutEverywhereMsg(res.message || 'All sessions have been revoked. Please sign in again.');
      setTimeout(() => {
        api.logout().then(() => router.push('/login'));
      }, 2000);
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke sessions.');
    } finally {
      setSigningOutEverywhere(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationInput !== 'DELETE') {
      setDeleteError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      alert('Your account has been deleted and personal data anonymized.');
      router.push('/');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Account Access</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your authentication credentials, multi-device sessions, and privacy settings.
        </p>
      </div>

      {/* Linked Sign-in Providers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Linked Sign-in Methods
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Email Address</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {user?.email || 'Not configured'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Active
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Phone Number</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {user?.phone || 'Not linked'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {user?.phone ? 'Verified' : 'Optional'}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions & Token Invalidation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LogOut className="w-5 h-5 text-blue-600" /> Active Sessions
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          If you suspect unauthorized access or lost a device, you can revoke all active Firebase refresh tokens. You will be logged out everywhere and required to sign in again.
        </p>

        {signOutEverywhereMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {signOutEverywhereMsg}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleSignOutEverywhere}
            disabled={signingOutEverywhere}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-all shadow-sm"
          >
            {signingOutEverywhere ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {signingOutEverywhere ? 'Revoking Sessions...' : 'Sign Out Everywhere'}
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Deleting your account will anonymize all your personally identifiable information (name, email, phone, addresses) and revoke login access permanently. Past order invoices and financial records are retained in compliance with statutory tax laws.
        </p>

        <div className="pt-2">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Delete Account & Anonymize Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirm Account Deletion
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This action <strong className="text-red-600">CANNOT</strong> be undone. All saved addresses, wishlist items, and personal details will be irreversibly erased.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> below to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteConfirmationInput !== 'DELETE'}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-red-500/20"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
