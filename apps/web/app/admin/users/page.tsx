'use client';

import React, { Suspense, useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  useAdminUsers,
  useAdminStats,
  useAdminUserSupportHistory,
  useUpdateUserStatus,
} from '../../../lib/admin-queries';
import { useAuth } from '../../../lib/auth-context';
import { AdminUser, UserStatus, UserRole, USER_ROLES, USER_STATUSES } from '../../../lib/types';
import { formatINR, formatDate, toNumber } from '../../../lib/format';
import { QueryState } from '../../../components/admin/QueryState';
import { useToast } from '../../../components/ui/Toast';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

// ---------------------------------------------------------------------------
// Role & Status Badges
// ---------------------------------------------------------------------------

export function UserRoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'badge-primary',
    SUPPORT: 'badge-info',
    MODERATOR: 'badge-info',
    CUSTOMER: 'badge-gray',
    GUEST: 'badge-gray',
  };
  return <span className={`badge ${styles[role] || 'badge-gray'}`}>{role}</span>;
}

export function UserStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    SUSPENDED: 'badge-danger',
    DELETED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Skeleton Loading Fallback (avoids layout shift)
// ---------------------------------------------------------------------------

function UsersLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading users">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Content Component
// ---------------------------------------------------------------------------

function UsersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { user: currentAdmin } = useAuth();
  const { addToast } = useToast();

  // 1. URL Query State
  const currentStatus = searchParams.get('status') || 'all';
  const currentRole = searchParams.get('role') || 'all';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearch);

  if (prevSearchParam !== currentSearch) {
    setPrevSearchParam(currentSearch);
    setSearchInput(currentSearch);
  }

  // URL Query String Updater
  const updateUrlFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all' || value.trim?.() === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        const queryString = params.toString();
        router.push(pathname + (queryString ? `?${queryString}` : ''), { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlFilters({ search: searchInput, page: '1' });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, currentSearch, updateUrlFilters]);

  // Handlers for filter controls
  const handleStatusChange = (status: string) => {
    updateUrlFilters({ status, page: '1' });
  };

  const handleRoleChange = (role: string) => {
    updateUrlFilters({ role, page: '1' });
  };

  const handlePageChange = (page: number) => {
    updateUrlFilters({ page: String(page) });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  // 2. Fetch authoritative data
  const { data: stats } = useAdminStats();

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      pageSize: 20,
      status: currentStatus !== 'all' ? currentStatus : undefined,
      role: currentRole !== 'all' ? currentRole : undefined,
      search: currentSearch || undefined,
    }),
    [currentPage, currentStatus, currentRole, currentSearch],
  );

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    isPlaceholderData,
  } = useAdminUsers(queryParams);

  const usersList: AdminUser[] = usersData?.items ?? [];
  const totalUsers = usersData?.total ?? 0;
  const pageSize = usersData?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  // 3. Status Mutation with Confirmation Modal
  const updateUserStatusMutation = useUpdateUserStatus();
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);
  const historyQuery = useAdminUserSupportHistory(historyUser?.id ?? null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    user: AdminUser | null;
    targetStatus: UserStatus | null;
  }>({
    open: false,
    user: null,
    targetStatus: null,
  });

  const openStatusConfirmModal = (user: AdminUser, targetStatus: UserStatus) => {
    setModalState({
      open: true,
      user,
      targetStatus,
    });
  };

  const closeStatusModal = () => {
    setModalState({ open: false, user: null, targetStatus: null });
  };

  const handleConfirmStatusChange = async () => {
    if (!modalState.user || !modalState.targetStatus) return;

    const targetUser = modalState.user;
    const targetStatus = modalState.targetStatus;

    try {
      await updateUserStatusMutation.mutateAsync({
        id: targetUser.id,
        status: targetStatus,
      });

      addToast(
        'success',
        `Account ${targetUser.name || targetUser.email || targetUser.id} is now ${targetStatus}.`,
      );
      closeStatusModal();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update account status. Please try again.';
      addToast('error', errorMsg);
    }
  };

  const hasActiveFilters =
    currentStatus !== 'all' ||
    currentRole !== 'all' ||
    Boolean(currentSearch);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Accounts</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage customer accounts, roles, access status, and affiliate tiers
          </p>
        </div>
        <button
          onClick={() => refetchUsers()}
          className="btn btn-secondary text-xs flex items-center space-x-1.5 self-start sm:self-auto"
          title="Refresh user accounts list"
          aria-label="Refresh user accounts list"
        >
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Users
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats?.totalUsers ?? totalUsers}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All registered accounts</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Matching Filter
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {totalUsers}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current search results</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Active Status
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {usersList.filter((u) => u.status === 'ACTIVE').length} / {usersList.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active on this page</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Page Earnings
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatINR(
              usersList.reduce((sum, u) => sum + toNumber(u.referralEarnings), 0),
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total referral commissions</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by user name or email address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-9 w-full"
              aria-label="Search users by name or email"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  updateUrlFilters({ search: '', page: '1' });
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="input md:w-48 text-sm"
            aria-label="Filter users by role"
          >
            <option value="all">All Roles</option>
            {USER_ROLES.map((role: UserRole) => (
              <option key={role} value={role}>
                {role === 'ADMIN'
                  ? 'Administrator'
                  : role === 'MODERATOR'
                    ? 'Moderator'
                    : role === 'CUSTOMER'
                      ? 'Customer'
                      : 'Guest'}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="input md:w-44 text-sm"
            aria-label="Filter users by status"
          >
            <option value="all">All Statuses</option>
            {USER_STATUSES.map((status: UserStatus) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary text-xs px-3 self-center"
              title="Reset all search and filter fields"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <QueryState
        isLoading={usersLoading}
        error={usersError}
        isEmpty={!usersLoading && !usersError && usersList.length === 0}
        onRetry={refetchUsers}
        emptyTitle="No users found"
        emptyMessage={
          hasActiveFilters
            ? 'No user accounts match the current filter criteria. Try adjusting your search query or filters.'
            : 'No user accounts exist in the database yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Reset Filter
            </Button>
          ) : undefined
        }
      >
        <div className="table-container card overflow-x-auto">
          <table className="table min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Referral Info</th>
                <th scope="col">Commission</th>
                <th scope="col">Joined</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {usersList.map((row) => {
                const isSelf = currentAdmin?.id === row.id;
                const isOtherAdmin = row.role === 'ADMIN' && !isSelf;
                const isModifying = updateUserStatusMutation.isPending && modalState.user?.id === row.id;
                const initial = (row.name || row.email || 'U').charAt(0).toUpperCase();

                return (
                  <tr key={row.id} className="hover:bg-gray-50/75 dark:hover:bg-gray-800/40 transition-colors">
                    <td>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0"
                          aria-hidden="true"
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {row.name || 'Unnamed Account'}
                          </p>
                          {isSelf && (
                            <span className="inline-block text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="text-sm text-gray-600 dark:text-gray-300">
                      {row.email || '—'}
                    </td>

                    <td>
                      <UserRoleBadge role={row.role} />
                    </td>

                    <td>
                      <UserStatusBadge status={row.status} />
                    </td>

                    <td>
                      <div className="flex flex-col text-xs">
                        <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
                          {row.referralCode || '—'}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Tier: {row.referralTier || 'BASIC'}
                        </span>
                      </div>
                    </td>

                    <td className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatINR(row.referralEarnings)}
                    </td>

                    <td className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryUser(row)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          Support history
                        </button>
                        {isSelf ? (
                        <span
                          className="text-xs text-gray-400 dark:text-gray-500 italic select-none"
                          title="You cannot modify your own administrator account status"
                        >
                          Self (Active)
                        </span>
                      ) : isOtherAdmin ? (
                        <span
                          className="text-xs text-gray-400 dark:text-gray-500 italic select-none"
                          title="Admin accounts are protected from suspension"
                        >
                          Admin Protected
                        </span>
                      ) : row.status === 'ACTIVE' ? (
                        <button
                          onClick={() => openStatusConfirmModal(row, 'SUSPENDED')}
                          disabled={isModifying}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 transition-colors"
                          aria-label={`Suspend account for ${row.name || row.email}`}
                        >
                          Suspend
                        </button>
                      ) : row.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => openStatusConfirmModal(row, 'ACTIVE')}
                          disabled={isModifying}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-900/60 hover:bg-green-50 dark:hover:bg-green-950/20 disabled:opacity-40 transition-colors"
                          aria-label={`Reactivate account for ${row.name || row.email}`}
                        >
                          Reactivate
                        </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Deleted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          <p className="text-gray-500 dark:text-gray-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {totalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.min(currentPage * pageSize, totalUsers)}
            </span>{' '}
            of <span className="font-semibold text-gray-900 dark:text-white">{totalUsers}</span> accounts
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPlaceholderData}
              className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              ← Previous
            </button>

            <span className="px-2 text-gray-600 dark:text-gray-300 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPlaceholderData}
              className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      </QueryState>

      {/* Confirmation Modal */}
      <Modal
        open={modalState.open}
        onClose={closeStatusModal}
        title={
          modalState.targetStatus === 'SUSPENDED'
            ? 'Suspend User Account'
            : 'Reactivate User Account'
        }
        description={
          modalState.targetStatus === 'SUSPENDED'
            ? 'Are you sure you want to suspend this user? They will be immediately blocked from logging in or placing orders.'
            : 'Are you sure you want to reactivate this user? Their account access and store privileges will be restored.'
        }
        size="md"
      >
        <div className="space-y-4 pt-2">
          {modalState.user && (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Account Name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {modalState.user.name || 'Unnamed Account'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {modalState.user.email || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Role:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {modalState.user.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Status:</span>
                <UserStatusBadge status={modalState.user.status} />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={closeStatusModal}
              disabled={updateUserStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={modalState.targetStatus === 'SUSPENDED' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleConfirmStatusChange}
              loading={updateUserStatusMutation.isPending}
            >
              {modalState.targetStatus === 'SUSPENDED' ? 'Confirm Suspend' : 'Confirm Reactivate'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!historyUser}
        onClose={() => setHistoryUser(null)}
        title="Support history"
        description={historyUser ? `Read-only history for ${historyUser.name || historyUser.email || 'customer'}` : undefined}
        size="lg"
      >
        {historyQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading support history...</p>
        ) : historyQuery.isError ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-red-600">{historyQuery.error.message}</p>
            <Button variant="secondary" size="sm" onClick={() => void historyQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : historyQuery.data ? (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500">Tickets</p>
                <p className="text-lg font-semibold">{historyQuery.data.ticketCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500">Returns</p>
                <p className="text-lg font-semibold">{historyQuery.data.returnCount}</p>
              </div>
            </div>

            <section>
              <h2 className="mb-2 text-sm font-semibold">Ticket categories</h2>
              {Object.keys(historyQuery.data.categoryCounts).length ? (
                <ul className="space-y-1 text-sm">
                  {Object.entries(historyQuery.data.categoryCounts).map(([category, count]) => (
                    <li key={category} className="flex justify-between">
                      <span>{category}</span><span>{count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No ticket history.</p>}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">Tickets and satisfaction ratings</h2>
              {historyQuery.data.tickets.length ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historyQuery.data.tickets.map((ticket) => (
                    <li key={ticket.id} className="py-2 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-medium">{ticket.ticketNumber} · {ticket.subject}</span>
                        <span>{ticket.status} · {ticket.csatScore ? `${ticket.csatScore}/5` : 'Not rated'}</span>
                      </div>
                      <p className="text-xs text-gray-500">{ticket.category} · {formatDate(ticket.createdAt)}</p>
                      {ticket.csatComment && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{ticket.csatComment}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No ticket history.</p>}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">Returns</h2>
              {historyQuery.data.returns.length ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historyQuery.data.returns.map((request) => (
                    <li key={request.id} className="py-2 text-sm">
                      <p className="font-medium">{request.returnNumber} · {request.status}</p>
                      <p className="text-xs text-gray-500">
                        {request.order.orderNumber} · {request.type} · {formatDate(request.createdAt)}
                        {request.ticket ? ` · ${request.ticket.ticketNumber}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{request.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No return history.</p>}
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with Suspense Wrapper for Next.js App Router useSearchParams
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<UsersLoadingSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
