const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Admin - Users
  getUsers: () => fetchAPI('/admin/users'),
  updateUserStatus: (userId: string, status: string) =>
    fetchAPI(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Admin - Products
  getProducts: () => fetchAPI('/admin/products'),

  // Admin - Orders
  getOrders: () => fetchAPI('/admin/orders'),
  updateOrderStatus: (orderId: string, status: string) =>
    fetchAPI(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Admin - Dashboard
  getDashboardStats: () => fetchAPI('/admin/dashboard/stats'),
};
