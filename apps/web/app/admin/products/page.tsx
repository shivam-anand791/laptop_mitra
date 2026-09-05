'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: any;
  stock: number;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { name: string };
  images?: { url: string; altText: string | null; isPrimary: boolean }[];
}

const apiClient = {
  async get(url: string) {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Dell Latitude 5420',
        sku: 'DELL-LATITUDE-5420',
        slug: 'dell-latitude-5420',
        price: 45000.0,
        stock: 45,
        status: 'ACTIVE',
        isFeatured: true,
        isNewArrival: false,
        categoryId: 'cat-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-09-20T14:22:00.000Z',
        category: { name: 'Business Laptops' },
        images: [{ url: 'https://via.placeholder.com/400x300', altText: 'Dell Latitude 5420', isPrimary: true }],
      },
      {
        id: '2',
        name: 'HP EliteBook 840 G8',
        sku: 'HP-ELITEBOOK-840-G8',
        slug: 'hp-elitebook-840-g8',
        price: 52000.0,
        stock: 23,
        status: 'ACTIVE',
        isFeatured: false,
        isNewArrival: true,
        categoryId: 'cat-1',
        createdAt: '2024-02-10T08:15:00.000Z',
        updatedAt: '2024-09-21T09:10:00.000Z',
        category: { name: 'Business Laptops' },
        images: [{ url: 'https://via.placeholder.com/400x300', altText: 'HP EliteBook 840 G8', isPrimary: true }],
      },
      {
        id: '3',
        name: 'Lenovo ThinkPad X1 Carbon',
        sku: 'LENOVO-THINKPAD-X1-CARBON',
        slug: 'lenovo-thinkpad-x1-carbon',
        price: 89000.0,
        stock: 0,
        status: 'ACTIVE',
        isFeatured: true,
        isNewArrival: false,
        categoryId: 'cat-2',
        createdAt: '2024-03-05T16:45:00.000Z',
        updatedAt: '2024-09-18T11:30:00.000Z',
        category: { name: 'Ultrabooks' },
        images: [{ url: 'https://via.placeholder.com/400x300', altText: 'Lenovo ThinkPad X1 Carbon', isPrimary: true }],
      },
      {
        id: '4',
        name: 'Apple MacBook Pro 16"',
        sku: 'APPLE-MACBOOK-PRO-16',
        slug: 'apple-macbook-pro-16',
        price: 185000.0,
        stock: 12,
        status: 'ACTIVE',
        isFeatured: true,
        isNewArrival: true,
        categoryId: 'cat-3',
        createdAt: '2024-04-12T12:00:00.000Z',
        updatedAt: '2024-09-22T16:45:00.000Z',
        category: { name: 'MacBooks' },
        images: [{ url: 'https://via.placeholder.com/400x300', altText: 'MacBook Pro 16"', isPrimary: true }],
      },
      {
        id: '5',
        name: 'ASUS VivoBook 15',
        sku: 'ASUS-VIVOBOOK-15',
        slug: 'asus-vivobook-15',
        price: 35000.0,
        stock: 0,
        status: 'INACTIVE',
        isFeatured: false,
        isNewArrival: false,
        categoryId: 'cat-1',
        createdAt: '2024-05-01T09:30:00.000Z',
        updatedAt: '2024-09-22T10:15:00.000Z',
        category: { name: 'Business Laptops' },
        images: [{ url: 'https://via.placeholder.com/400x300', altText: 'ASUS VivoBook 15', isPrimary: true }],
      },
    ];

    if (url === '/products') {
      return { data: { products: mockProducts, total: mockProducts.length } };
    }
    throw new Error('Unknown endpoint');
  },

  async post(url: string, body: any) {
    return { data: { success: true } };
  },

  async put(url: string, body: any) {
    return { data: { success: true } };
  },

  async delete(url: string) {
    return { data: { success: true } };
  },
};

function ProductStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-warning',
    DISCONTINUED: 'badge-danger',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function formatPrice(price: any) {
  const numPrice = typeof price === 'object' ? Number(price) : Number(price);
  return `₹${numPrice.toLocaleString('en-IN')}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadProducts() {
      try {
        const response: any = await apiClient.get('/products');
        setProducts(response.data.products as Product[]);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const statusMatch = statusFilter === 'all' || product.status === statusFilter;
    const searchMatch =
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    try {
      await apiClient.put(`/admin/products/${productId}`, {
        isFeatured: !product.isFeatured,
      });
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p
        )
      );
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const toggleNewArrival = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    try {
      await apiClient.put(`/admin/products/${productId}`, {
        isNewArrival: !product.isNewArrival,
      });
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, isNewArrival: !p.isNewArrival } : p
        )
      );
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
        <a
          href="/admin/products/new"
          className="btn btn-primary"
        >
          Add Product
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
          aria-label="Search products"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">In Stock</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {products.filter((p) => p.stock > 0).length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {products.filter((p) => p.stock === 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container card">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Featured</th>
              <th>New Arrival</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="flex items-center space-x-3">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].altText || product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{product.sku}</span>
                    </div>
                  </div>
                </td>
                <td className="text-gray-900 dark:text-white">{formatPrice(product.price)}</td>
                <td>
                  <span className={product.stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}>
                    {product.stock}
                  </span>
                </td>
                <td>
                  <ProductStatusBadge status={product.status} />
                </td>
                <td>
                  <button
                    onClick={() => toggleFeatured(product.id)}
                    className={`badge ${product.isFeatured ? 'badge-success' : 'badge-gray'}`}
                    aria-label={`Toggle featured for ${product.name}`}
                  >
                    {product.isFeatured ? 'Yes' : 'No'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggleNewArrival(product.id)}
                    className={`badge ${product.isNewArrival ? 'badge-info' : 'badge-gray'}`}
                    aria-label={`Toggle new arrival for ${product.name}`}
                  >
                    {product.isNewArrival ? 'Yes' : 'No'}
                  </button>
                </td>
                <td>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/admin/products/${product.id}/edit`}
                      className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
                      aria-label={`Edit ${product.name}`}
                    >
                      Edit
                    </a>
                    <button
                      className="text-sm text-danger hover:text-red-700 dark:text-red-400 hover:dark:text-red-300"
                      aria-label={`Delete ${product.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
