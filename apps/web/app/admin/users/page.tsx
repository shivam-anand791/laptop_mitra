'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  referralCode: string;
  referralEarnings: any;
  referralTier: string;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Mock API client - in production, use shared @laptopmitra/api-client
const apiClient = {
  async get(url: string): Promise<ApiResponse<any>> {
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-09-20T14:22:00.000Z',
        referralCode: 'REF1234567',
        referralEarnings: 5000,
        referralTier: 'GOLD',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: '2024-02-10T08:15:00.000Z',
        updatedAt: '2024-09-21T09:10:00.000Z',
        referralCode: 'ADM9876543',
        referralEarnings: 15000,
        referralTier: 'PLATINUM',
      },
      {
        id: '3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'USER',
        status: 'SUSPENDED',
        createdAt: '2024-03-05T16:45:00.000Z',
        updatedAt: '2024-09-18T11:30:00.000Z',
        referralCode: 'REF2468013',
        referralEarnings: 0,
        referralTier: 'BASIC',
      },
      {
        id: '4',
        name: null,
        email: 'alice@example.com',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: '2024-04-12T12:00:00.000Z',
        updatedAt: '2024-09-22T16:45:00.000Z',
        referralCode: 'REF1357924',
        referralEarnings: 2500,
        referralTier: 'BASIC',
      },
    ];

    if (url === '/admin/users') {
      return { data: mockUsers };
    }
    throw new Error('Unknown endpoint');
  },

  async put(url: string, body: any): Promise<any> {
    // Mock PUT
    return { data: { success: true } };
  },
};

function UserStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    SUSPENDED: 'badge-danger',
    DELETED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function UserRoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'badge-danger',
    MODERATOR: 'badge-warning',
    USER: 'badge-info',
  };
  return <span className={`badge ${styles[role] || 'badge-gray'}`}>{role}</span>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await apiClient.get('/admin/users');
        setUsers(response.data as User[]);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const statusMatch = statusFilter === 'all' || user.status === statusFilter;
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    return statusMatch && roleMatch;
  });

  const updateUserStatus = async (userId: string, newStatus: string) => {
    const confirmed = window.confirm(`Set user status to ${newStatus}?`);
    if (!confirmed) return;

    try {
      await apiClient.put(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers(users.map((u) =>
        u.id === userId ? { ...u, status: newStatus } : u
      ));
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status');
    }
  };

  const totalReferralEarnings = users.reduce(
    (sum, user) => sum + (Number(user.referralEarnings) || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {users.filter((u) => u.status === 'ACTIVE').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {users.filter((u) => u.status === 'SUSPENDED').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Referral Earnings</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₹{(totalReferralEarnings / 100).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input"
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="MODERATOR">Moderator</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container card">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Referral Code</th>
              <th>Tier</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user.name || 'Unnamed User'}
                    </span>
                  </div>
                </td>
                <td className="text-gray-600 dark:text-gray-300">{user.email}</td>
                <td>
                  <UserRoleBadge role={user.role} />
                </td>
                <td>
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-300">{user.referralCode}</td>
                <td>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {user.referralTier}
                  </span>
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex items-center space-x-2">
                    {user.status === 'ACTIVE' && (
                      <button
                        onClick={() => updateUserStatus(user.id, 'SUSPENDED')}
                        className="text-sm text-danger hover:text-red-700 dark:text-red-400 hover:dark:text-red-300"
                        aria-label={`Suspend ${user.email}`}
                      >
                        Suspend
                      </button>
                    )}
                    {user.status === 'SUSPENDED' && (
                      <button
                        onClick={() => updateUserStatus(user.id, 'ACTIVE')}
                        className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 hover:dark:text-green-300"
                        aria-label={`Activate ${user.email}`}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
                      aria-label={`View ${user.email}`}
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No users found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}
