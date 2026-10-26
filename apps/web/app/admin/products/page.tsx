'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Product } from '../../../lib/types';
import { formatPrice } from '../../../lib/format';

function ProductStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-warning',
    DISCONTINUED: 'badge-danger',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    shortDescription: '',
    description: '',
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: false,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err?.message || 'Failed to fetch catalog from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductData.name.trim() || !newProductData.sku.trim() || !newProductData.price) {
      alert('Name, SKU, and Price are required.');
      return;
    }

    try {
      const created = await api.createAdminProduct({
        ...newProductData,
        price: parseFloat(newProductData.price),
        stock: parseInt(newProductData.stock || '0', 10),
      });
      setProducts([created, ...products]);
      setIsAddModalOpen(false);
      setNewProductData({
        name: '',
        sku: '',
        price: '',
        stock: '',
        shortDescription: '',
        description: '',
        status: 'ACTIVE',
        isFeatured: false,
        isNewArrival: false,
      });
      setFeedbackMessage({ text: `Product "${created.name}" created successfully.`, type: 'success' });
    } catch (err: any) {
      alert(err?.message || 'Failed to create product');
    }
  };

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setActionInProgressId(productId);
    try {
      const updated = await api.updateAdminProduct(productId, {
        isFeatured: !product.isFeatured,
      });
      setProducts(products.map((p) => (p.id === productId ? { ...p, isFeatured: updated.isFeatured } : p)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update featured flag');
    } finally {
      setActionInProgressId(null);
    }
  };

  const toggleNewArrival = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setActionInProgressId(productId);
    try {
      const updated = await api.updateAdminProduct(productId, {
        isNewArrival: !product.isNewArrival,
      });
      setProducts(products.map((p) => (p.id === productId ? { ...p, isNewArrival: updated.isNewArrival } : p)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update new arrival flag');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUpdateStock = async (productId: string, currentStock: number) => {
    const input = window.prompt('Enter new stock quantity:', currentStock.toString());
    if (input === null) return;
    const newStock = parseInt(input.trim(), 10);
    if (isNaN(newStock) || newStock < 0) {
      alert('Please enter a valid non-negative integer.');
      return;
    }

    setActionInProgressId(productId);
    try {
      const updated = await api.updateAdminProduct(productId, { stock: newStock });
      setProducts(products.map((p) => (p.id === productId ? { ...p, stock: updated.stock } : p)));
      setFeedbackMessage({ text: 'Stock updated successfully.', type: 'success' });
    } catch (err: any) {
      alert(err?.message || 'Failed to update stock');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete or discontinue "${product.name}"?`)) {
      return;
    }

    setActionInProgressId(product.id);
    try {
      await api.deleteAdminProduct(product.id);
      setProducts(products.filter((p) => p.id !== product.id));
      setFeedbackMessage({ text: `Product "${product.name}" was removed or discontinued.`, type: 'success' });
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredProducts = products.filter((product) => {
    const statusMatch = statusFilter === 'all' || product.status === statusFilter;
    const searchMatch =
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading catalog items from backend...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 card p-8 max-w-lg mx-auto">
        <div className="text-red-500 mb-3 font-semibold text-lg">Unable to load product catalog</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={loadProducts} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Catalog</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Authoritative database inventory, stock, and pricing</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadProducts}
            className="btn btn-secondary text-xs flex items-center space-x-1"
            title="Refresh catalog from backend"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary text-xs"
          >
            + Add Product
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between ${
            feedbackMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search products by title or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1"
          aria-label="Search products"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
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
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">No img</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white block">{product.name}</span>
                      <span className="block text-xs font-mono text-gray-500 dark:text-gray-400">{product.sku}</span>
                    </div>
                  </div>
                </td>
                <td className="text-gray-900 dark:text-white font-medium">{formatPrice(product.price)}</td>
                <td>
                  <button
                    onClick={() => handleUpdateStock(product.id, product.stock)}
                    className="hover:underline flex items-center space-x-1"
                    title="Click to update stock count"
                  >
                    <span className={product.stock === 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-900 dark:text-white'}>
                      {product.stock}
                    </span>
                    <span className="text-[10px] text-gray-400">✏️</span>
                  </button>
                </td>
                <td>
                  <ProductStatusBadge status={product.status} />
                </td>
                <td>
                  <button
                    onClick={() => toggleFeatured(product.id)}
                    disabled={actionInProgressId === product.id}
                    className={`badge cursor-pointer ${product.isFeatured ? 'badge-success' : 'badge-gray'}`}
                    aria-label={`Toggle featured for ${product.name}`}
                  >
                    {product.isFeatured ? 'Yes' : 'No'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggleNewArrival(product.id)}
                    disabled={actionInProgressId === product.id}
                    className={`badge cursor-pointer ${product.isNewArrival ? 'badge-info' : 'badge-gray'}`}
                    aria-label={`Toggle new arrival for ${product.name}`}
                  >
                    {product.isNewArrival ? 'Yes' : 'No'}
                  </button>
                </td>
                <td>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      disabled={actionInProgressId === product.id}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
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
            No products found matching your search.
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Certified Laptop</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 7420 (Core i5 11th Gen, 16GB)"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LM-DEL-7420-1"
                    value={newProductData.sku}
                    onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="38999"
                    value={newProductData.price}
                    onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Initial Stock Count</label>
                <input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={newProductData.stock}
                  onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Short Specs</label>
                <input
                  type="text"
                  placeholder="Core i5-1145G7, 16GB RAM, 512GB SSD, 14 inch FHD"
                  value={newProductData.shortDescription}
                  onChange={(e) => setNewProductData({ ...newProductData, shortDescription: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newProductData.isFeatured}
                    onChange={(e) => setNewProductData({ ...newProductData, isFeatured: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newProductData.isNewArrival}
                    onChange={(e) => setNewProductData({ ...newProductData, isNewArrival: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>New Arrival</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
