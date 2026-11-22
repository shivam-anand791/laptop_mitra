'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { ConfirmDialog } from '@/components/account';
import {
  ShieldCheck,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Smartphone,
  RefreshCw,
  X,
} from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign out everywhere dialog & action
  const [isSignoutDialogOpen, setIsSignoutDialogOpen] = useState(false);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [signOutEverywhereMsg, setSignOutEverywhereMsg] = useState<string | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfile()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSignOutEverywhere = async () => {
    setSigningOutEverywhere(true);
    setSignOutEverywhereMsg(null);
    try {
      const res = await api.signoutEverywhere();
      setIsSignoutDialogOpen(false);
      setSignOutEverywhereMsg(res.message || 'All sessions have been revoked. Signing you out now...');
      setTimeout(() => {
        logout().then(() => router.push('/login'));
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
      await logout();
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Security &amp; Account Access</h1>
        <p className="text-xs text-slate-500">
          Manage your authentication credentials, session security, and privacy settings.
        </p>
      </div>

      {/* Linked Sign-in Providers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Linked Sign-in Methods
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Email Address</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {user?.email || 'Not configured'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              Active
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Phone Number</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {user?.phone || 'Not linked'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {user?.phone ? 'Verified' : 'Optional'}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions & Token Invalidation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-blue-600" /> Active Sessions
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          If you suspect unauthorized access or lost a device, you can revoke all active refresh tokens. You will be signed out on all computers, tablets, and phones and will need to log in again.
        </p>

        {signOutEverywhereMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {signOutEverywhereMsg}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsSignoutDialogOpen(true)}
            disabled={signingOutEverywhere}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {signingOutEverywhere ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {signingOutEverywhere ? 'Revoking Sessions...' : 'Sign Out Everywhere'}
          </button>
        </div>
      </div>

      {/* Accessible Confirmation Dialog for Sign Out Everywhere */}
      <ConfirmDialog
        isOpen={isSignoutDialogOpen}
        title="Sign Out of All Devices"
        message="This will immediately invalidate all active sessions across all your browsers and devices. You will need to log in again. Do you want to proceed?"
        confirmLabel={signingOutEverywhere ? 'Revoking...' : 'Yes, Sign Out Everywhere'}
        cancelLabel="Stay Signed In"
        isDestructive={false}
        onConfirm={handleSignOutEverywhere}
        onCancel={() => setIsSignoutDialogOpen(false)}
      />

      {/* Danger Zone: Delete Account */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Deleting your account will anonymize your personal details (name, email, phone, addresses) and revoke login access permanently. Past order invoices and financial records are retained as required by Indian tax regulations.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete Account &amp; Anonymize Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-rose-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirm Account Deletion
              </h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                This action <strong className="text-rose-600 font-bold">CANNOT</strong> be undone. All saved addresses, wishlist items, and personal details will be irreversibly erased.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type <span className="font-mono font-bold text-rose-600">DELETE</span> below to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteConfirmationInput !== 'DELETE'}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
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
