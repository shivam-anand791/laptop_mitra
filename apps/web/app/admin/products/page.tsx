'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Product, ProductVariant, Category } from '../../../lib/types';
import { formatPrice } from '../../../lib/format';

function ProductStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-warning',
    DISCONTINUED: 'badge-danger',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

const RAM_OPTIONS = ['8GB', '16GB', '24GB', '32GB', '64GB', '96GB', '128GB'];
const STORAGE_OPTIONS = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD'];
const STANDARD_BRANDS = ['Apple', 'Dell', 'Lenovo', 'HP', 'ASUS', 'Acer', 'Microsoft'];

export interface StructuredVariantDraft {
  id?: string;
  name: string;
  sku: string;
  ram: string;
  storage: string;
  processor: string;
  graphics: string;
  extraAttributes: Record<string, string>;
  price: string;
  compareAtPrice: string;
  leasePriceMonthly: string;
  stock: string;
  allowBackorder: boolean;
  isActive: boolean;
  isDefault: boolean;
  imageUrls: string;
  rawJsonMode: boolean;
  rawAttributesJson: string;
}

function toStructuredVariantDraft(variant: ProductVariant): StructuredVariantDraft {
  const attrs = (variant.attributes || {}) as Record<string, any>;
  const ram = String(attrs.ram || attrs.RAM || attrs.memory || '');
  const storage = String(attrs.storage || attrs.SSD || attrs.drive || '');
  const processor = String(attrs.processor || attrs.cpu || attrs.CPU || '');
  const graphics = String(attrs.graphics || attrs.gpu || attrs.GPU || '');

  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (!['ram', 'storage', 'processor', 'graphics', 'RAM', 'memory', 'SSD', 'drive', 'cpu', 'CPU', 'gpu', 'GPU'].includes(k)) {
      extra[k] = String(v);
    }
  }

  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    ram,
    storage,
    processor,
    graphics,
    extraAttributes: extra,
    price: variant.price !== undefined && variant.price !== null ? String(variant.price) : '',
    compareAtPrice: variant.compareAtPrice !== undefined && variant.compareAtPrice !== null ? String(variant.compareAtPrice) : '',
    leasePriceMonthly: variant.leasePriceMonthly !== undefined && variant.leasePriceMonthly !== null ? String(variant.leasePriceMonthly) : '',
    stock: String(variant.stock ?? '0'),
    allowBackorder: !!variant.allowBackorder,
    isActive: variant.isActive !== false,
    isDefault: !!variant.isDefault,
    imageUrls: (variant.images || []).map((image) => image.url).join('\n'),
    rawJsonMode: false,
    rawAttributesJson: JSON.stringify(variant.attributes, null, 2),
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dedicated Product Variants Section State
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<StructuredVariantDraft[]>([]);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [savingVariants, setSavingVariants] = useState(false);
  const [variantValidationErrors, setVariantValidationErrors] = useState<string[]>([]);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    sku: '',
    price: '',
    compareAtPrice: '',
    leasePriceMonthly: '',
    bulkSellPrice: '',
    bulkLeasePrice: '',
    stock: '10',
    shortDescription: '',
    description: '',
    imageUrls: '',
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: false,
  });

  // Edit Product Details Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductData, setEditProductData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    shortDescription: '',
    description: '',
    imageUrls: '',
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: false,
  });
  const [savingProductDetails, setSavingProductDetails] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getAdminProducts().catch(() => []),
        api.getCategories().catch(() => []),
      ]);
      const productList = Array.isArray(productsData) ? productsData : (productsData as any)?.items || [];
      setProducts(productList);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      console.error('Failed to load products catalog:', err);
      setError(err?.message || 'Failed to fetch catalog from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductData.name.trim() || !newProductData.sku.trim() || !newProductData.price) {
      alert('Product Name, SKU, and Base Price are required.');
      return;
    }

    try {
      const images = newProductData.imageUrls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

      const payload: any = {
        name: newProductData.name.trim(),
        sku: newProductData.sku.trim(),
        price: parseFloat(newProductData.price),
        compareAtPrice: newProductData.compareAtPrice ? parseFloat(newProductData.compareAtPrice) : undefined,
        leasePriceMonthly: newProductData.leasePriceMonthly ? parseFloat(newProductData.leasePriceMonthly) : undefined,
        bulkSellPrice: newProductData.bulkSellPrice ? parseFloat(newProductData.bulkSellPrice) : undefined,
        bulkLeasePrice: newProductData.bulkLeasePrice ? parseFloat(newProductData.bulkLeasePrice) : undefined,
        stock: parseInt(newProductData.stock || '0', 10),
        shortDescription: newProductData.shortDescription.trim() || undefined,
        description: newProductData.description.trim() || undefined,
        categoryId: newProductData.categoryId || undefined,
        status: newProductData.status,
        isFeatured: newProductData.isFeatured,
        isNewArrival: newProductData.isNewArrival,
        metadata: newProductData.brand ? { brand: newProductData.brand } : undefined,
        images: images.length > 0 ? images : undefined,
      };

      const created = await api.createAdminProduct(payload);
      setProducts([created, ...products]);
      setIsAddModalOpen(false);
      setNewProductData({
        name: '',
        brand: '',
        categoryId: '',
        sku: '',
        price: '',
        compareAtPrice: '',
        leasePriceMonthly: '',
        bulkSellPrice: '',
        bulkLeasePrice: '',
        stock: '10',
        shortDescription: '',
        description: '',
        imageUrls: '',
        status: 'ACTIVE',
        isFeatured: false,
        isNewArrival: false,
      });
      setFeedbackMessage({ text: `Product "${created.name}" created successfully. You can now manage its variants.`, type: 'success' });
    } catch (err: any) {
      alert(err?.message || 'Failed to create product');
    }
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    const brand = (product.metadata as any)?.brand || '';
    const imageUrls = (product.images || []).map((img) => img.url).join('\n');
    setEditProductData({
      name: product.name,
      brand,
      categoryId: product.categoryId || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      imageUrls,
      status: product.status,
      isFeatured: !!product.isFeatured,
      isNewArrival: !!product.isNewArrival,
    });
  };

  const handleUpdateProductDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingProductDetails(true);
    try {
      const images = editProductData.imageUrls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

      const existingMetadata = (editingProduct.metadata as any) || {};
      const updatedMetadata = { ...existingMetadata };
      if (editProductData.brand.trim()) {
        updatedMetadata.brand = editProductData.brand.trim();
      }

      const updated = await api.updateAdminProduct(editingProduct.id, {
        name: editProductData.name.trim(),
        categoryId: editProductData.categoryId || null,
        shortDescription: editProductData.shortDescription.trim() || null,
        description: editProductData.description.trim() || null,
        status: editProductData.status,
        isFeatured: editProductData.isFeatured,
        isNewArrival: editProductData.isNewArrival,
        metadata: updatedMetadata,
        images,
      });

      setProducts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
      setFeedbackMessage({ text: `Product "${updated.name}" updated successfully.`, type: 'success' });
    } catch (err: any) {
      alert(err?.message || 'Failed to update product details');
    } finally {
      setSavingProductDetails(false);
    }
  };

  const openVariantsSection = (product: Product) => {
    setVariantsProduct(product);
    const drafts = (product.variants || []).map(toStructuredVariantDraft);
    setVariantDrafts(drafts);
    setEditingVariantIndex(null);
    setVariantValidationErrors([]);
  };

  const addNewVariantDraft = () => {
    if (!variantsProduct) return;
    const baseAttrs = (variantsProduct.metadata as any) || {};
    const defaultProcessor = baseAttrs.processor || '';
    const defaultGraphics = baseAttrs.graphics || '';
    const variantNumber = variantDrafts.length + 1;

    const newDraft: StructuredVariantDraft = {
      name: `${variantsProduct.name} - Option ${variantNumber}`,
      sku: `${variantsProduct.sku}-V${variantNumber}`,
      ram: '16GB',
      storage: '512GB SSD',
      processor: defaultProcessor,
      graphics: defaultGraphics,
      extraAttributes: {},
      price: String(variantsProduct.price),
      compareAtPrice: variantsProduct.compareAtPrice ? String(variantsProduct.compareAtPrice) : '',
      leasePriceMonthly: variantsProduct.leasePriceMonthly ? String(variantsProduct.leasePriceMonthly) : '',
      stock: '10',
      allowBackorder: false,
      isActive: true,
      isDefault: variantDrafts.length === 0,
      imageUrls: (variantsProduct.images || []).map((img) => img.url).slice(0, 1).join('\n'),
      rawJsonMode: false,
      rawAttributesJson: JSON.stringify({ ram: '16GB', storage: '512GB SSD' }, null, 2),
    };

    setVariantDrafts([...variantDrafts, newDraft]);
    setEditingVariantIndex(variantDrafts.length);
  };

  const duplicateVariantDraft = (index: number) => {
    const source = variantDrafts[index];
    const duplicate: StructuredVariantDraft = {
      ...source,
      id: undefined, // Clear ID so it creates a new variant
      name: `${source.name} (Copy)`,
      sku: `${source.sku}-COPY`,
      isDefault: false,
      isActive: true,
    };
    setVariantDrafts([...variantDrafts, duplicate]);
    setEditingVariantIndex(variantDrafts.length);
  };

  const setDefaultVariant = (index: number) => {
    setVariantDrafts((drafts) =>
      drafts.map((draft, idx) => ({
        ...draft,
        isDefault: idx === index,
        isActive: idx === index ? true : draft.isActive,
      }))
    );
  };

  const toggleVariantActive = (index: number) => {
    setVariantDrafts((drafts) =>
      drafts.map((draft, idx) => {
        if (idx !== index) return draft;
        const newActive = !draft.isActive;
        return {
          ...draft,
          isActive: newActive,
          // If deactivated and it was default, default must be passed to another active variant
          isDefault: !newActive ? false : draft.isDefault,
        };
      })
    );
  };

  const validateVariantsBeforeSave = (): { valid: boolean; errors: string[]; payload?: any[] } => {
    const errors: string[] = [];
    if (!variantDrafts.length) {
      return { valid: true, errors: [], payload: [] };
    }

    const skus = new Set<string>();
    const activeCombinations = new Set<string>();
    let expectedActiveKeys: string[] | null = null;
    let activeDefaultCount = 0;

    const payload = [];

    for (let i = 0; i < variantDrafts.length; i++) {
      const v = variantDrafts[i];
      const rowLabel = `Variant #${i + 1} (${v.name || 'Untitled'})`;

      if (!v.name.trim()) errors.push(`${rowLabel}: Variant name is required.`);
      if (!v.sku.trim()) errors.push(`${rowLabel}: SKU is required.`);

      const skuKey = v.sku.trim().toLowerCase();
      if (skus.has(skuKey)) errors.push(`${rowLabel}: Duplicate SKU "${v.sku.trim()}". SKUs must be unique.`);
      skus.add(skuKey);

      const price = Number(v.price);
      if (isNaN(price) || price < 0) errors.push(`${rowLabel}: Price must be a non-negative number.`);

      const stock = Number(v.stock);
      if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) errors.push(`${rowLabel}: Stock must be a non-negative integer.`);

      // Build attributes
      let attributes: Record<string, string | number | boolean> = {};
      if (v.rawJsonMode) {
        try {
          attributes = JSON.parse(v.rawAttributesJson);
          if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
            errors.push(`${rowLabel}: JSON attributes must be an object.`);
          }
        } catch {
          errors.push(`${rowLabel}: Malformed attributes JSON.`);
        }
      } else {
        if (v.ram.trim()) attributes.ram = v.ram.trim();
        if (v.storage.trim()) attributes.storage = v.storage.trim();
        if (v.processor.trim()) attributes.processor = v.processor.trim();
        if (v.graphics.trim()) attributes.graphics = v.graphics.trim();
        for (const [k, val] of Object.entries(v.extraAttributes || {})) {
          if (k.trim() && val.trim()) attributes[k.trim()] = val.trim();
        }
      }

      if (!Object.keys(attributes).length) {
        errors.push(`${rowLabel}: Must define at least one hardware attribute (e.g. RAM or Storage).`);
      }

      if (v.isActive) {
        if (v.isDefault) activeDefaultCount++;

        const attrKeys = Object.keys(attributes).sort();
        if (expectedActiveKeys === null) {
          expectedActiveKeys = attrKeys;
        } else if (attrKeys.join(',') !== expectedActiveKeys.join(',')) {
          errors.push(
            `${rowLabel}: Active variants must define the exact same attribute keys. Expected [${expectedActiveKeys.join(', ')}], but got [${attrKeys.join(', ')}].`
          );
        }

        const comboKey = JSON.stringify(Object.fromEntries(attrKeys.map((k) => [k, attributes[k]])));
        if (activeCombinations.has(comboKey)) {
          errors.push(`${rowLabel}: Duplicate active hardware combination. A variant with this exact specification already exists.`);
        }
        activeCombinations.add(comboKey);
      }

      const images = v.imageUrls
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

      payload.push({
        ...(v.id ? { id: v.id } : {}),
        name: v.name.trim(),
        sku: v.sku.trim(),
        attributes,
        price,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        leasePriceMonthly: v.leasePriceMonthly ? Number(v.leasePriceMonthly) : null,
        stock,
        allowBackorder: v.allowBackorder,
        isActive: v.isActive,
        isDefault: v.isDefault,
        images,
      });
    }

    const hasActiveVariants = variantDrafts.some((v) => v.isActive);
    if (hasActiveVariants && activeDefaultCount !== 1) {
      errors.push(`Exactly one active variant must be designated as the Default Variant (currently ${activeDefaultCount} selected).`);
    }

    return { valid: errors.length === 0, errors, payload };
  }

  const saveProductVariants = async () => {
    if (!variantsProduct) return;
    const { valid, errors, payload } = validateVariantsBeforeSave();
    if (!valid) {
      setVariantValidationErrors(errors);
      return;
    }

    setVariantValidationErrors([]);
    setSavingVariants(true);
    try {
      const updated = await api.updateAdminProduct(variantsProduct.id, { variants: payload });
      setProducts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      setVariantsProduct(null);
      setEditingVariantIndex(null);
      setFeedbackMessage({
        text: `Successfully saved ${payload?.length || 0} configurations for "${updated.name}". Storefront has been updated.`,
        type: 'success',
      });
    } catch (err: any) {
      setVariantValidationErrors([err?.message || 'Failed to save variants. Check constraints.']);
    } finally {
      setSavingVariants(false);
    }
  };

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setActionInProgressId(productId);
    try {
      const updated = await api.updateAdminProduct(productId, { isFeatured: !product.isFeatured });
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
      const updated = await api.updateAdminProduct(productId, { isNewArrival: !product.isNewArrival });
      setProducts(products.map((p) => (p.id === productId ? { ...p, isNewArrival: updated.isNewArrival } : p)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update new arrival flag');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUpdateStock = async (productId: string, currentStock: number) => {
    const input = window.prompt('Enter new stock quantity for base product:', currentStock.toString());
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
    if (!window.confirm(`Are you sure you want to delete or discontinue "${product.name}"? If historical orders exist, it will be safely discontinued without losing order integrity.`)) {
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
    const categoryMatch = categoryFilter === 'all' || product.categoryId === categoryFilter;
    const searchMatch =
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((product.metadata as any)?.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading catalog items from authoritative database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 card p-8 max-w-lg mx-auto">
        <div className="text-red-500 mb-3 font-semibold text-lg">Unable to load product catalog</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Catalog &amp; Variants</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Authoritative inventory, configurable hardware variants, and pricing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="btn btn-secondary text-xs flex items-center space-x-1"
            title="Refresh catalog from backend"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary text-xs flex items-center space-x-1"
          >
            <span>+</span>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center justify-between shadow-sm ${
            feedbackMessage.type === 'success' ? 'bg-green-50 text-green-900 border border-green-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span className="font-medium">{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="font-bold ml-2 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{products.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Configurable Products</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {products.filter((p) => p.variants && p.variants.length > 0).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Stock</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {products.filter((p) => p.stock > 0).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {products.filter((p) => p.stock === 0).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, SKU, or brand..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1 text-sm"
          aria-label="Search products"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input sm:w-48 text-sm"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-40 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="table-container card overflow-x-auto">
        <table className="table w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Category / Brand</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Variants</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Featured</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const activeVariantsCount = product.variants?.filter((v) => v.isActive).length || 0;
              const totalVariantsCount = product.variants?.length || 0;
              const brand = (product.metadata as any)?.brand || '';

              return (
                <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText || product.name}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white block text-sm leading-tight">{product.name}</span>
                        <span className="block text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{product.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                      {brand && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">{brand}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold text-sm">
                    {formatPrice(product.price)}
                    {product.compareAtPrice ? (
                      <span className="block text-[11px] text-gray-400 line-through font-normal">{formatPrice(product.compareAtPrice)}</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleUpdateStock(product.id, product.stock)}
                      className="hover:underline flex items-center space-x-1"
                      title="Click to quickly update base stock"
                    >
                      <span className={product.stock === 0 ? 'text-red-600 font-bold' : 'text-gray-900 dark:text-white font-medium'}>
                        {product.stock}
                      </span>
                      <span className="text-[10px] text-gray-400">✏️</span>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    {totalVariantsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        <span>⚙️ {activeVariantsCount} Active</span>
                        {totalVariantsCount > activeVariantsCount && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">({totalVariantsCount} total)</span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Single SKU (Legacy)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleFeatured(product.id)}
                      disabled={actionInProgressId === product.id}
                      className={`badge cursor-pointer ${product.isFeatured ? 'badge-success' : 'badge-gray'}`}
                      aria-label={`Toggle featured for ${product.name}`}
                    >
                      {product.isFeatured ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openVariantsSection(product)}
                        disabled={actionInProgressId === product.id}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 py-1 px-2.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                        title="Manage hardware configurations & variants"
                      >
                        ⚙️ Variants
                      </button>
                      <button
                        onClick={() => openEditProductModal(product)}
                        disabled={actionInProgressId === product.id}
                        className="text-xs font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit product name, description, brand, and category"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        disabled={actionInProgressId === product.id}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 py-1 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Delete or discontinue product"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            No products found matching your search and filter criteria.
          </div>
        )}
      </div>

      {/* DEDICATED PRODUCT VARIANTS MANAGEMENT SECTION (PHASE 2) */}
      {variantsProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-variants-modal-title"
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Product Variants Management
                  </span>
                  <span className="text-xs font-mono text-gray-400">{variantsProduct.sku}</span>
                </div>
                <h2 id="product-variants-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {variantsProduct.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage individual hardware configurations, independent pricing, SKU inventory, and availability.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addNewVariantDraft}
                  className="btn btn-secondary text-xs flex items-center gap-1 font-semibold"
                >
                  <span>+</span>
                  <span>Add New Variant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariantsProduct(null)}
                  className="btn btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Guiding Context Alert */}
            <div className="my-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-200 flex items-start gap-2">
              <span className="text-base leading-none">ℹ️</span>
              <div>
                <p className="font-semibold">Authoritative Storefront Rules:</p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                  Storefront selectors (RAM, Storage, Processor, Graphics) are dynamically derived from active rows. Exactly <strong>one active default variant</strong> is required. Disabling an existing variant archives it safely without deleting historical order references.
                </p>
              </div>
            </div>

            {/* Validation Errors Box */}
            {variantValidationErrors.length > 0 && (
              <div className="my-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-200">
                <p className="font-bold mb-1">Please correct the following before saving:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {variantValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Variants Table / List */}
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="table w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 text-center">Default</th>
                      <th className="py-2.5 px-3 text-center">Active</th>
                      <th className="py-2.5 px-3">Variant Name &amp; SKU</th>
                      <th className="py-2.5 px-3">Configuration Specs</th>
                      <th className="py-2.5 px-3">Selling Price</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {variantDrafts.map((variant, index) => {
                      const isEditing = editingVariantIndex === index;
                      return (
                        <tr
                          key={variant.id || `variant-${index}`}
                          className={`${
                            !variant.isActive
                              ? 'bg-gray-50/70 dark:bg-gray-900/30 opacity-70'
                              : isEditing
                              ? 'bg-blue-50/30 dark:bg-blue-950/10'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="radio"
                              name="defaultVariantGroup"
                              checked={variant.isDefault}
                              onChange={() => setDefaultVariant(index)}
                              title="Set as Default Variant"
                              className="cursor-pointer"
                            />
                            {variant.isDefault && (
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase mt-0.5">
                                Default
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVariantActive(index)}
                              className={`badge cursor-pointer text-[10px] ${
                                variant.isActive ? 'badge-success' : 'badge-gray'
                              }`}
                              title={variant.isActive ? 'Click to disable variant' : 'Click to enable variant'}
                            >
                              {variant.isActive ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-900 dark:text-white block text-sm">
                              {variant.name || 'Untitled Variant'}
                            </span>
                            <span className="font-mono text-[11px] text-gray-500">{variant.sku || 'No SKU'}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {variant.ram && (
                                <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-[10px]">
                                  {variant.ram}
                                </span>
                              )}
                              {variant.storage && (
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold text-[10px]">
                                  {variant.storage}
                                </span>
                              )}
                              {variant.processor && (
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[10px]">
                                  {variant.processor}
                                </span>
                              )}
                              {variant.graphics && (
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                                  {variant.graphics}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 dark:text-white">
                              ₹{Number(variant.price || 0).toLocaleString('en-IN')}
                            </span>
                            {variant.compareAtPrice && (
                              <span className="block text-[10px] text-gray-400 line-through">
                                ₹{Number(variant.compareAtPrice).toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold ${
                                Number(variant.stock) === 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {variant.stock} units
                            </span>
                            {variant.allowBackorder && (
                              <span className="block text-[10px] text-blue-600">Backorder allowed</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingVariantIndex(isEditing ? null : index)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                {isEditing ? 'Close' : 'Configure'}
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateVariantDraft(index)}
                                className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 py-1 px-1.5"
                                title="Duplicate variant configuration"
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove this variant row? If you only wish to temporarily hide it, consider using the "Disabled" switch instead to preserve historical orders.`)) {
                                    setVariantDrafts((drafts) => drafts.filter((_, i) => i !== index));
                                    if (editingVariantIndex === index) setEditingVariantIndex(null);
                                  }
                                }}
                                className="text-xs text-red-600 hover:text-red-800 py-1 px-1.5"
                                title="Remove variant draft"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {variantDrafts.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No variants added yet. Click <strong>"+ Add New Variant"</strong> above to create your first configurable option.
                  </div>
                )}
              </div>

              {/* INLINE VARIANT CONFIGURATION FORM */}
              {editingVariantIndex !== null && variantDrafts[editingVariantIndex] && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-200/50 pb-3 dark:border-blue-900/40">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <span>⚙️ Configure Variant #{editingVariantIndex + 1}</span>
                      <span className="font-normal text-xs text-gray-500 font-mono">
                        ({variantDrafts[editingVariantIndex].sku || 'New SKU'})
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingVariantIndex(null)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                    >
                      Done Editing Row
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="lg:col-span-2">
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Variant Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="input w-full text-xs"
                        placeholder="e.g. 16GB RAM / 512GB SSD / Intel Core i7"
                        value={variantDrafts[editingVariantIndex].name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, name: val } : d))
                          );
                        }}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Unique Variant SKU *
                      </label>
                      <input
                        type="text"
                        required
                        className="input w-full text-xs font-mono"
                        placeholder="e.g. LM-DEL-7420-16-512"
                        value={variantDrafts[editingVariantIndex].sku}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, sku: val } : d))
                          );
                        }}
                      />
                    </div>

                    {/* Structured Hardware Specifications */}
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        RAM *
                      </label>
                      <div className="flex gap-1">
                        <select
                          className="input flex-1 text-xs"
                          value={RAM_OPTIONS.includes(variantDrafts[editingVariantIndex].ram) ? variantDrafts[editingVariantIndex].ram : 'custom'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDrafts((drafts) =>
                              drafts.map((d, i) =>
                                i === editingVariantIndex
                                  ? { ...d, ram: val === 'custom' ? '' : val }
                                  : d
                              )
                            );
                          }}
                        >
                          <option value="">Select RAM</option>
                          {RAM_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                        {!RAM_OPTIONS.includes(variantDrafts[editingVariantIndex].ram) && (
                          <input
                            type="text"
                            placeholder="e.g. 18GB"
                            className="input w-24 text-xs"
                            value={variantDrafts[editingVariantIndex].ram}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariantDrafts((drafts) =>
                                drafts.map((d, i) => (i === editingVariantIndex ? { ...d, ram: val } : d))
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Storage *
                      </label>
                      <div className="flex gap-1">
                        <select
                          className="input flex-1 text-xs"
                          value={STORAGE_OPTIONS.includes(variantDrafts[editingVariantIndex].storage) ? variantDrafts[editingVariantIndex].storage : 'custom'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDrafts((drafts) =>
                              drafts.map((d, i) =>
                                i === editingVariantIndex
                                  ? { ...d, storage: val === 'custom' ? '' : val }
                                  : d
                              )
                            );
                          }}
                        >
                          <option value="">Select Storage</option>
                          {STORAGE_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                        {!STORAGE_OPTIONS.includes(variantDrafts[editingVariantIndex].storage) && (
                          <input
                            type="text"
                            placeholder="e.g. 512GB NVMe"
                            className="input w-28 text-xs"
                            value={variantDrafts[editingVariantIndex].storage}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariantDrafts((drafts) =>
                                drafts.map((d, i) => (i === editingVariantIndex ? { ...d, storage: val } : d))
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Processor (CPU)
                      </label>
                      <input
                        type="text"
                        className="input w-full text-xs"
                        placeholder="e.g. Intel Core i7-1260P"
                        value={variantDrafts[editingVariantIndex].processor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, processor: val } : d))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Graphics (GPU)
                      </label>
                      <input
                        type="text"
                        className="input w-full text-xs"
                        placeholder="e.g. Intel Iris Xe / RTX 4060"
                        value={variantDrafts[editingVariantIndex].graphics}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, graphics: val } : d))
                          );
                        }}
                      />
                    </div>

                    {/* Pricing & Stock */}
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="input w-full text-xs font-semibold"
                        placeholder="38999"
                        value={variantDrafts[editingVariantIndex].price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, price: val } : d))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Original Compare Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input w-full text-xs"
                        placeholder="e.g. 75000"
                        value={variantDrafts[editingVariantIndex].compareAtPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, compareAtPrice: val } : d))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Monthly Lease Price (₹/mo)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input w-full text-xs"
                        placeholder="e.g. 2999"
                        value={variantDrafts[editingVariantIndex].leasePriceMonthly}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, leasePriceMonthly: val } : d))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Inventory Stock *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="input w-full text-xs"
                        placeholder="10"
                        value={variantDrafts[editingVariantIndex].stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, stock: val } : d))
                          );
                        }}
                      />
                    </div>

                    {/* Variant Image URLs */}
                    <div className="lg:col-span-4">
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Variant-Specific Image URLs (one per line)
                      </label>
                      <textarea
                        rows={2}
                        className="input w-full text-xs font-mono"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={variantDrafts[editingVariantIndex].imageUrls}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, imageUrls: val } : d))
                          );
                        }}
                      />
                    </div>

                    {/* Checkboxes & Advanced Toggle */}
                    <div className="lg:col-span-4 flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-blue-200/50">
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variantDrafts[editingVariantIndex].isDefault}
                            onChange={() => setDefaultVariant(editingVariantIndex)}
                            className="rounded text-primary"
                          />
                          <span>Set as Default Variant</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variantDrafts[editingVariantIndex].isActive}
                            onChange={() => toggleVariantActive(editingVariantIndex)}
                            className="rounded text-primary"
                          />
                          <span>Active on Storefront</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variantDrafts[editingVariantIndex].allowBackorder}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVariantDrafts((drafts) =>
                                drafts.map((d, i) => (i === editingVariantIndex ? { ...d, allowBackorder: checked } : d))
                              );
                            }}
                            className="rounded text-primary"
                          />
                          <span>Allow Backorder</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const current = variantDrafts[editingVariantIndex];
                          const toggled = !current.rawJsonMode;
                          let jsonStr = current.rawAttributesJson;
                          if (toggled) {
                            const attrs: Record<string, any> = {};
                            if (current.ram) attrs.ram = current.ram;
                            if (current.storage) attrs.storage = current.storage;
                            if (current.processor) attrs.processor = current.processor;
                            if (current.graphics) attrs.graphics = current.graphics;
                            jsonStr = JSON.stringify(attrs, null, 2);
                          }
                          setVariantDrafts((drafts) =>
                            drafts.map((d, i) => (i === editingVariantIndex ? { ...d, rawJsonMode: toggled, rawAttributesJson: jsonStr } : d))
                          );
                        }}
                        className="text-[11px] text-gray-500 hover:text-gray-700 underline"
                      >
                        {variantDrafts[editingVariantIndex].rawJsonMode ? 'Switch to Standard Specs Form' : 'Advanced: Edit Raw JSON'}
                      </button>
                    </div>

                    {variantDrafts[editingVariantIndex].rawJsonMode && (
                      <div className="lg:col-span-4 mt-2">
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Raw Attributes JSON
                        </label>
                        <textarea
                          rows={4}
                          className="input w-full text-xs font-mono"
                          value={variantDrafts[editingVariantIndex].rawAttributesJson}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDrafts((drafts) =>
                              drafts.map((d, i) => (i === editingVariantIndex ? { ...d, rawAttributesJson: val } : d))
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={addNewVariantDraft}
                  className="btn btn-secondary text-xs"
                >
                  + Add another configuration
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setVariantsProduct(null)}
                    className="btn btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProductVariants}
                    disabled={savingVariants}
                    className="btn btn-primary text-xs font-semibold px-4 disabled:opacity-50"
                  >
                    {savingVariants ? 'Saving Configurations...' : 'Save & Publish Variants'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ADD CERTIFIED LAPTOP MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Certified Laptop</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 7420 (Core i5 11th Gen, 16GB)"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    list="brand-suggestions"
                    placeholder="e.g. Dell, Apple, Lenovo"
                    value={newProductData.brand}
                    onChange={(e) => setNewProductData({ ...newProductData, brand: e.target.value })}
                    className="input w-full text-xs"
                  />
                  <datalist id="brand-suggestions">
                    {STANDARD_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    className="input w-full text-xs"
                    value={newProductData.categoryId}
                    onChange={(e) => setNewProductData({ ...newProductData, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Base SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LM-DEL-7420"
                    value={newProductData.sku}
                    onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Starting Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="38999"
                    value={newProductData.price}
                    onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                    className="input w-full text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Compare Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 75000"
                    value={newProductData.compareAtPrice}
                    onChange={(e) => setNewProductData({ ...newProductData, compareAtPrice: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Lease (₹/mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2999"
                    value={newProductData.leasePriceMonthly}
                    onChange={(e) => setNewProductData({ ...newProductData, leasePriceMonthly: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={newProductData.stock}
                    onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    className="input w-full text-xs"
                    value={newProductData.status}
                    onChange={(e) => setNewProductData({ ...newProductData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Short Specs Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Intel Core i5-1145G7, 16GB RAM, 512GB SSD, 14 inch FHD IPS"
                  value={newProductData.shortDescription}
                  onChange={(e) => setNewProductData({ ...newProductData, shortDescription: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Detailed Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Full description with 32-point inspection guarantees, warranty terms, and cosmetic grade."
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product Image URLs (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="https://images.unsplash.com/..."
                  value={newProductData.imageUrls}
                  onChange={(e) => setNewProductData({ ...newProductData, imageUrls: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProductData.isFeatured}
                    onChange={(e) => setNewProductData({ ...newProductData, isFeatured: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
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
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT DETAILS MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Product Details</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{editingProduct.sku}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleUpdateProductDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={editProductData.name}
                  onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    list="brand-suggestions-edit"
                    value={editProductData.brand}
                    onChange={(e) => setEditProductData({ ...editProductData, brand: e.target.value })}
                    className="input w-full text-xs"
                  />
                  <datalist id="brand-suggestions-edit">
                    {STANDARD_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    className="input w-full text-xs"
                    value={editProductData.categoryId}
                    onChange={(e) => setEditProductData({ ...editProductData, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Short Specs Summary
                </label>
                <input
                  type="text"
                  value={editProductData.shortDescription}
                  onChange={(e) => setEditProductData({ ...editProductData, shortDescription: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Detailed Description
                </label>
                <textarea
                  rows={3}
                  value={editProductData.description}
                  onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product Image URLs (one per line)
                </label>
                <textarea
                  rows={2}
                  value={editProductData.imageUrls}
                  onChange={(e) => setEditProductData({ ...editProductData, imageUrls: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    className="input w-full text-xs"
                    value={editProductData.status}
                    onChange={(e) => setEditProductData({ ...editProductData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editProductData.isFeatured}
                      onChange={(e) => setEditProductData({ ...editProductData, isFeatured: e.target.checked })}
                      className="rounded text-primary"
                    />
                    <span>Featured</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editProductData.isNewArrival}
                      onChange={(e) => setEditProductData({ ...editProductData, isNewArrival: e.target.checked })}
                      className="rounded text-primary"
                    />
                    <span>New Arrival</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProductDetails}
                  className="btn btn-primary text-xs font-semibold disabled:opacity-50"
                >
                  {savingProductDetails ? 'Saving...' : 'Update Product Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
