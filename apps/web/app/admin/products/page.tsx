'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import { adminApi } from '../../../lib/admin-api';
import { Product, ProductVariant, Category } from '../../../lib/types';
import { formatPrice } from '../../../lib/format';
import { formatIndianRupees } from '@/lib/account-helpers';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { useToast } from '../../../components/ui/Toast';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldAlert,
  ArrowUpDown,
  Download,
  Upload,
  History,
  Sliders,
  Layers,
  RefreshCw,
  Eye,
  AlertCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

const STANDARD_BRANDS = ['Apple', 'Dell', 'Lenovo', 'HP', 'ASUS', 'Acer', 'Microsoft'];
const RAM_OPTIONS = ['8GB', '16GB', '24GB', '32GB', '64GB', '96GB', '128GB'];
const STORAGE_OPTIONS = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '4TB SSD'];
const TENURES = [1, 3, 6, 12, 24] as const;

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
}

function toStructuredVariantDraft(variant: ProductVariant): StructuredVariantDraft {
  const attrs = (variant.attributes || {}) as Record<string, any>;
  const ram = String(attrs.ram || attrs.RAM || attrs.memory || '');
  const storage = String(attrs.storage || attrs.SSD || attrs.drive || '');
  const processor = String(attrs.processor || attrs.cpu || attrs.CPU || '');
  const graphics = String(attrs.graphics || attrs.gpu || attrs.GPU || '');

  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (
      ![
        'ram',
        'storage',
        'processor',
        'graphics',
        'RAM',
        'memory',
        'SSD',
        'drive',
        'cpu',
        'CPU',
        'gpu',
        'GPU',
      ].includes(k)
    ) {
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
    compareAtPrice:
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? String(variant.compareAtPrice)
        : '',
    leasePriceMonthly:
      variant.leasePriceMonthly !== undefined && variant.leasePriceMonthly !== null
        ? String(variant.leasePriceMonthly)
        : '',
    stock: String(variant.stock ?? '0'),
    allowBackorder: !!variant.allowBackorder,
    isActive: variant.isActive !== false,
    isDefault: !!variant.isDefault,
    imageUrls: (variant.images || []).map((image) => image.url).join('\n'),
  };
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isSupport = user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN' || !isSupport;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rentFilter, setRentFilter] = useState('all'); // all, rent_enabled, rent_not_set, out_of_stock
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Multi-select
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Inline editing states: { [productId]: { field: 'price' | 'stock', value: string } }
  const [inlineEditing, setInlineEditing] = useState<{
    id: string;
    field: 'price' | 'stock';
    value: string;
  } | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);

  // Modals
  const [editModalProduct, setEditModalProduct] = useState<Product | null>(null);
  const [editTab, setEditTab] = useState<'basics' | 'pricing' | 'rent' | 'stock' | 'specs' | 'images'>('basics');
  const [editFormData, setEditFormData] = useState<any>({});
  const [initialEditFormData, setInitialEditFormData] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState<any>({
    name: '',
    brand: '',
    categoryId: '',
    sku: '',
    price: '',
    compareAtPrice: '',
    stock: '10',
    shortDescription: '',
    description: '',
    imageUrls: '',
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: false,
    warrantyMonths: 6,
    specs: {
      processor: '',
      ram: '',
      storage: '',
      display: '',
      condition: 'Grade A+ (Pristine)',
    },
  });

  // Variants Modal
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<StructuredVariantDraft[]>([]);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [savingVariants, setSavingVariants] = useState(false);

  // Bulk Price Modal
  const [bulkPricingModalOpen, setBulkPricingModalOpen] = useState(false);
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState<string>('5');
  const [bulkApplyToMRP, setBulkApplyToMRP] = useState(true);
  const [bulkPreviewItems, setBulkPreviewItems] = useState<any[]>([]);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);

  // Price History Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reference Check / Safe Archive Modal
  const [archiveTargetProduct, setArchiveTargetProduct] = useState<Product | null>(null);
  const [referenceSummary, setReferenceSummary] = useState<any>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // CSV Import Modal
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvDryRunResult, setCsvDryRunResult] = useState<any>(null);
  const [csvValidating, setCsvValidating] = useState(false);
  const [csvCommitting, setCsvCommitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getAdminProducts().catch(() => []),
        api.getCategories().catch(() => []),
      ]);
      const list = Array.isArray(prods) ? prods : (prods as any)?.items || [];
      setProducts(list);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to fetch catalog');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Filtered & Paginated Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const brand = ((p.metadata as any)?.brand || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const cat = (p.category?.name || '').toLowerCase();
      const q = debouncedSearch.toLowerCase().trim();

      const searchMatch = !q || name.includes(q) || sku.includes(q) || brand.includes(q) || cat.includes(q);
      const catMatch = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const statusMatch = statusFilter === 'all' || p.status === statusFilter;

      let rentMatch = true;
      const hasRent = p.rentalPrices && p.rentalPrices.length > 0;
      if (rentFilter === 'rent_enabled') {
        rentMatch = !!hasRent || (p.leasePriceMonthly !== null && Number(p.leasePriceMonthly) > 0);
      } else if (rentFilter === 'rent_not_set') {
        rentMatch = !hasRent && (!p.leasePriceMonthly || Number(p.leasePriceMonthly) <= 0);
      } else if (rentFilter === 'out_of_stock') {
        rentMatch = (p.stock ?? 0) <= 0;
      }

      return searchMatch && catMatch && statusMatch && rentMatch;
    });
  }, [products, debouncedSearch, categoryFilter, statusFilter, rentFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  // Inline edit handlers
  const handleInlineSave = async (product: Product) => {
    if (!inlineEditing || isSupport) return;
    setInlineSaving(true);
    const { field, value } = inlineEditing;

    // Optimistic snapshot
    const oldProducts = [...products];

    try {
      if (field === 'price') {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          throw new Error('Price must be a positive number');
        }
        if (product.compareAtPrice && Number(product.compareAtPrice) < num) {
          throw new Error('Selling price cannot exceed compare-at price (MRP)');
        }

        // Optimistic update
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, price: num } : p)),
        );

        await adminApi.updateProduct(product.id, {
          price: num,
          priceChangeReason: 'Inline table update',
        });
        addToast('success', `Price updated for "${product.name}"`);
      } else if (field === 'stock') {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          throw new Error('Stock must be a non-negative integer');
        }

        // Optimistic update
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, stock: num } : p)),
        );

        await adminApi.updateProduct(product.id, { stock: num });
        addToast('success', `Stock updated for "${product.name}"`);
      }
      setInlineEditing(null);
    } catch (err: any) {
      // Rollback
      setProducts(oldProducts);
      addToast('error', err?.message || 'Failed to update field');
    } finally {
      setInlineSaving(false);
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (product: Product) => {
    if (isSupport) return;
    const nextVal = !product.isFeatured;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isFeatured: nextVal } : p)),
    );
    try {
      await adminApi.updateProduct(product.id, { isFeatured: nextVal });
      addToast('success', `${product.name} featured status: ${nextVal ? 'Featured' : 'Standard'}`);
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isFeatured: !nextVal } : p)),
      );
      addToast('error', 'Failed to toggle featured status');
    }
  };

  // Open Edit Modal
  const openEditModal = (product: Product) => {
    const meta = (product.metadata as any) || {};
    const brand = meta.brand || '';
    const warrantyMonths = meta.warrantyMonths || 6;
    const specs = meta.specs || {
      processor: meta.processor || '',
      ram: meta.ram || '',
      storage: meta.storage || '',
      display: meta.display || '',
      condition: meta.condition || 'Grade A+ (Pristine)',
    };

    // Extract rental prices per tenure
    const rentalRates: Record<number, string> = { 1: '', 3: '', 6: '', 12: '', 24: '' };
    let rentEnabled = false;
    if (product.rentalPrices && product.rentalPrices.length > 0) {
      rentEnabled = true;
      for (const rp of product.rentalPrices) {
        if (rp.tenureMonths && (rp.status === 'APPROVED' || rp.status === 'DRAFT')) {
          rentalRates[rp.tenureMonths] = String(Number(rp.monthlyPrice));
        }
      }
    } else if (product.leasePriceMonthly && Number(product.leasePriceMonthly) > 0) {
      rentEnabled = true;
      rentalRates[12] = String(Number(product.leasePriceMonthly));
    }

    const initial = {
      name: product.name,
      slug: product.slug || '',
      brand,
      categoryId: product.categoryId || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      status: product.status,
      isFeatured: !!product.isFeatured,
      isNewArrival: !!product.isNewArrival,
      price: String(Number(product.price)),
      compareAtPrice: product.compareAtPrice ? String(Number(product.compareAtPrice)) : '',
      leasePriceMonthly: product.leasePriceMonthly ? String(Number(product.leasePriceMonthly)) : '',
      bulkSellPrice: product.bulkSellPrice ? String(Number(product.bulkSellPrice)) : '',
      bulkLeasePrice: product.bulkLeasePrice ? String(Number(product.bulkLeasePrice)) : '',
      stock: String(product.stock ?? '0'),
      warrantyMonths,
      specs,
      imageUrls: (product.images || []).map((img) => img.url).join('\n'),
      rentEnabled,
      rentalRates,
      publishImmediately: true,
      priceChangeReason: '',
    };

    setEditFormData(initial);
    setInitialEditFormData(JSON.parse(JSON.stringify(initial)));
    setIsDirty(false);
    setEditTab('basics');
    setEditModalProduct(product);
  };

  // Track dirty changes
  const updateFormField = (key: string, value: any) => {
    setEditFormData((prev: any) => {
      const next = { ...prev, [key]: value };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialEditFormData));
      return next;
    });
  };

  const updateRentalRate = (tenure: number, rate: string) => {
    setEditFormData((prev: any) => {
      const nextRates = { ...prev.rentalRates, [tenure]: rate };
      const next = { ...prev, rentalRates: nextRates };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialEditFormData));
      return next;
    });
  };

  const updateSpecField = (specKey: string, value: string) => {
    setEditFormData((prev: any) => {
      const nextSpecs = { ...prev.specs, [specKey]: value };
      const next = { ...prev, specs: nextSpecs };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialEditFormData));
      return next;
    });
  };

  // Save Edit Form
  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalProduct || isSupport) return;

    const price = parseFloat(editFormData.price);
    if (isNaN(price) || price <= 0) {
      addToast('error', 'Selling price must be greater than 0');
      return;
    }

    let compareAtPrice: number | null = null;
    if (editFormData.compareAtPrice.trim()) {
      compareAtPrice = parseFloat(editFormData.compareAtPrice);
      if (isNaN(compareAtPrice) || compareAtPrice < price) {
        addToast('error', 'MRP (compare-at price) must be greater than or equal to selling price');
        return;
      }
    }

    const stock = parseInt(editFormData.stock, 10);
    if (isNaN(stock) || stock < 0) {
      addToast('error', 'Stock must be a positive integer');
      return;
    }

    setSavingEdit(true);
    try {
      const images = editFormData.imageUrls
        .split(/\r?\n/)
        .map((url: string) => url.trim())
        .filter(Boolean)
        .map((url: string, idx: number) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

      // 1. Update core product
      const updated = await adminApi.updateProduct(editModalProduct.id, {
        name: editFormData.name.trim(),
        brand: editFormData.brand.trim(),
        categoryId: editFormData.categoryId || null,
        shortDescription: editFormData.shortDescription.trim() || null,
        description: editFormData.description.trim() || null,
        status: editFormData.status,
        isFeatured: editFormData.isFeatured,
        isNewArrival: editFormData.isNewArrival,
        price,
        compareAtPrice,
        stock,
        bulkSellPrice: editFormData.bulkSellPrice ? parseFloat(editFormData.bulkSellPrice) : null,
        bulkLeasePrice: editFormData.bulkLeasePrice ? parseFloat(editFormData.bulkLeasePrice) : null,
        warrantyMonths: editFormData.warrantyMonths,
        specs: editFormData.specs,
        images,
        priceChangeReason: editFormData.priceChangeReason.trim() || 'Admin catalog update',
      });

      // 2. Save rental pricing
      const rentalPricesPayload = TENURES.map((t) => ({
        tenureMonths: t,
        monthlyPrice: parseFloat(editFormData.rentalRates[t] || '0') || 0,
      })).filter((p) => p.monthlyPrice > 0);

      await adminApi.saveProductRentalPricing(editModalProduct.id, {
        enabled: editFormData.rentEnabled,
        publishImmediately: editFormData.publishImmediately,
        prices: rentalPricesPayload,
        reason: editFormData.priceChangeReason.trim() || 'Admin catalog rental pricing update',
      });

      addToast('success', `Product "${updated.name}" updated successfully.`);
      setIsDirty(false);
      setEditModalProduct(null);
      loadCatalog();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to save product updates');
    } finally {
      setSavingEdit(false);
    }
  };

  // Safe Archive / Delete Product
  const handleOpenDelete = async (product: Product) => {
    if (isSupport) return;
    setArchiveTargetProduct(product);
    setReferenceLoading(true);
    try {
      const refs = await adminApi.getProductReferences(product.id);
      setReferenceSummary(refs);
    } catch {
      setReferenceSummary({ totalOrders: 0, activeOrders: 0, totalLeases: 0, activeLeases: 0 });
    } finally {
      setReferenceLoading(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTargetProduct || isSupport) return;
    setArchiving(true);
    try {
      const res = await adminApi.deleteProduct(archiveTargetProduct.id);
      addToast('success', res.message || 'Product soft-archived / deleted');
      setArchiveTargetProduct(null);
      loadCatalog();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to archive product');
    } finally {
      setArchiving(false);
    }
  };

  // Price History
  const handleOpenPriceHistory = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const hist = await adminApi.getProductPriceHistory(product.id);
      setHistoryData(hist);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to fetch price history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Bulk Price Actions
  const handleOpenBulkPricing = async () => {
    if (selectedProductIds.length === 0) return;
    setBulkPricingModalOpen(true);
    setBulkPreviewLoading(true);
    try {
      const res = await adminApi.previewBulkPricing({
        productIds: selectedProductIds,
        type: bulkAdjustmentType,
        value: parseFloat(bulkAdjustmentValue) || 0,
        applyToCompareAtPrice: bulkApplyToMRP,
      });
      setBulkPreviewItems(res.items || []);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to calculate preview');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleUpdateBulkPreview = async (type: 'PERCENTAGE' | 'FIXED', val: string, applyMRP: boolean) => {
    setBulkAdjustmentType(type);
    setBulkAdjustmentValue(val);
    setBulkApplyToMRP(applyMRP);
    setBulkPreviewLoading(true);
    try {
      const res = await adminApi.previewBulkPricing({
        productIds: selectedProductIds,
        type,
        value: parseFloat(val) || 0,
        applyToCompareAtPrice: applyMRP,
      });
      setBulkPreviewItems(res.items || []);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to calculate preview');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleApplyBulkPricing = async () => {
    setBulkApplying(true);
    try {
      await adminApi.applyBulkPricing({
        productIds: selectedProductIds,
        type: bulkAdjustmentType,
        value: parseFloat(bulkAdjustmentValue) || 0,
        applyToCompareAtPrice: bulkApplyToMRP,
        reason: `Bulk price adjustment (${bulkAdjustmentType === 'PERCENTAGE' ? `${bulkAdjustmentValue}%` : `₹${bulkAdjustmentValue}`})`,
      });
      addToast('success', `Bulk pricing updated for ${selectedProductIds.length} products.`);
      setBulkPricingModalOpen(false);
      setSelectedProductIds([]);
      loadCatalog();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to apply bulk pricing');
    } finally {
      setBulkApplying(false);
    }
  };

  // CSV Export & Import
  const handleExportCsv = () => {
    window.open('http://localhost:3001/admin/products/export/csv', '_blank');
    addToast('success', 'Catalog CSV export initiated.');
  };

  const handleCsvValidate = async () => {
    if (!csvText.trim()) return;
    setCsvValidating(true);
    try {
      const res = await adminApi.importProductsCsv(csvText, true);
      setCsvDryRunResult(res);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to parse CSV');
    } finally {
      setCsvValidating(false);
    }
  };

  const handleCsvCommit = async () => {
    setCsvCommitting(true);
    try {
      const res = await adminApi.importProductsCsv(csvText, false);
      addToast('success', `CSV imported: ${res.createdCount || 0} created, ${res.updatedCount || 0} updated.`);
      setCsvImportModalOpen(false);
      setCsvText('');
      setCsvDryRunResult(null);
      loadCatalog();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to commit CSV changes');
    } finally {
      setCsvCommitting(false);
    }
  };

  // Dedicated Variants Management
  const openVariantsModal = (product: Product) => {
    setVariantsProduct(product);
    setVariantDrafts((product.variants || []).map(toStructuredVariantDraft));
    setEditingVariantIndex(null);
  };

  const handleSaveVariants = async () => {
    if (!variantsProduct || isSupport) return;
    setSavingVariants(true);
    try {
      const payloadVariants = variantDrafts.map((d) => {
        const attributes: Record<string, string> = { ...d.extraAttributes };
        if (d.ram) attributes.ram = d.ram;
        if (d.storage) attributes.storage = d.storage;
        if (d.processor) attributes.processor = d.processor;
        if (d.graphics) attributes.graphics = d.graphics;

        const images = d.imageUrls
          .split(/\r?\n/)
          .map((u) => u.trim())
          .filter(Boolean)
          .map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

        return {
          id: d.id,
          name: d.name,
          sku: d.sku,
          price: parseFloat(d.price) || Number(variantsProduct.price),
          compareAtPrice: d.compareAtPrice ? parseFloat(d.compareAtPrice) : null,
          leasePriceMonthly: d.leasePriceMonthly ? parseFloat(d.leasePriceMonthly) : null,
          stock: parseInt(d.stock, 10) || 0,
          allowBackorder: d.allowBackorder,
          isActive: d.isActive,
          isDefault: d.isDefault,
          attributes,
          images,
        };
      });

      await api.updateAdminProduct(variantsProduct.id, {
        variants: payloadVariants,
      });

      addToast('success', `Variants updated for "${variantsProduct.name}"`);
      setVariantsProduct(null);
      loadCatalog();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to save variants');
    } finally {
      setSavingVariants(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View-only banner for SUPPORT role */}
      {isSupport && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>You have view-only access. Product updates, price changes, and archive actions are disabled.</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 mb-1 flex items-center space-x-1.5">
            <Link href="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span>Commerce</span>
            <span>/</span>
            <span className="font-semibold text-gray-900 dark:text-white">Products & Pricing</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Rental Pricing</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage catalog hardware, selling prices, multi-tenure rental rates, and inventory.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
            title="Export catalog as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setCsvImportModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                title="Import catalog from CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search, Filter, and Selection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search by name, SKU, or brand"
              placeholder="Search by name, SKU, brand, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>

          {/* Rent Status Filter */}
          <select
            aria-label="Filter by rental status"
            value={rentFilter}
            onChange={(e) => {
              setRentFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Pricing Types</option>
            <option value="rent_enabled">Rent Configured</option>
            <option value="rent_not_set">Rent Not Set</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <button
            onClick={() => loadCatalog()}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
            title="Refresh catalog"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (when rows selected) */}
      {selectedProductIds.length > 0 && isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">{selectedProductIds.length} products selected</span>
            <button
              onClick={() => setSelectedProductIds([])}
              className="text-blue-600 hover:underline text-[11px]"
            >
              Deselect all
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenBulkPricing}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bulk Adjust Prices</span>
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="py-3 px-3 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={
                    paginatedProducts.length > 0 &&
                    paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const ids = Array.from(new Set([...selectedProductIds, ...paginatedProducts.map((p) => p.id)]));
                      setSelectedProductIds(ids);
                    } else {
                      setSelectedProductIds(
                        selectedProductIds.filter((id) => !paginatedProducts.some((p) => p.id === id)),
                      );
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="py-3 px-3">Product</th>
              <th className="py-3 px-3">Category & Brand</th>
              <th className="py-3 px-3">Selling Price (₹)</th>
              <th className="py-3 px-3">Rent / Lease</th>
              <th className="py-3 px-3">Stock</th>
              <th className="py-3 px-3">Variants</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Featured</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading certified laptops and catalog items...
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400">
                  No products found matching the criteria.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const brand = (product.metadata as any)?.brand || '';
                const activeVariants = product.variants?.filter((v) => v.isActive) || [];
                const totalVariants = product.variants?.length || 0;
                const isSelected = selectedProductIds.includes(product.id);

                // Compute Rent display
                let rentRateDisplay = 'Rent not set';
                let hasApprovedRent = false;
                if (product.rentalPrices && product.rentalPrices.length > 0) {
                  const p12 = product.rentalPrices.find((r) => r.tenureMonths === 12);
                  const first = product.rentalPrices[0];
                  const chosen = p12 || first;
                  if (chosen && chosen.monthlyPrice) {
                    rentRateDisplay = `Rent from ₹${Number(chosen.monthlyPrice).toLocaleString('en-IN')}/mo`;
                    hasApprovedRent = true;
                  }
                } else if (product.leasePriceMonthly && Number(product.leasePriceMonthly) > 0) {
                  rentRateDisplay = `Rent from ₹${Number(product.leasePriceMonthly).toLocaleString('en-IN')}/mo`;
                  hasApprovedRent = true;
                }

                const priceNum = Number(product.price);
                const compareNum = product.compareAtPrice ? Number(product.compareAtPrice) : null;
                const discount =
                  compareNum && compareNum > priceNum
                    ? Math.round(((compareNum - priceNum) / compareNum) * 100)
                    : 0;

                const isEditingPrice =
                  inlineEditing?.id === product.id && inlineEditing?.field === 'price';
                const isEditingStock =
                  inlineEditing?.id === product.id && inlineEditing?.field === 'stock';

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        aria-label={`Select product ${product.name}`}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds([...selectedProductIds, product.id]);
                          } else {
                            setSelectedProductIds(selectedProductIds.filter((id) => id !== product.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].altText || product.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-[10px] text-gray-400">
                            No img
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block truncate max-w-[220px]" title={product.name}>
                            {product.name}
                          </span>
                          <span className="font-mono text-[11px] text-gray-400 block">{product.sku}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category & Brand */}
                    <td className="py-3 px-3">
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                      {brand && <span className="block text-[11px] text-gray-500 mt-0.5">{brand}</span>}
                    </td>

                    {/* Selling Price with Inline Edit */}
                    <td className="py-3 px-3">
                      {isEditingPrice ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            autoFocus
                            value={inlineEditing.value}
                            onChange={(e) =>
                              setInlineEditing({ ...inlineEditing, value: e.target.value })
                            }
                            className="w-20 px-1.5 py-0.5 text-xs border border-blue-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                          />
                          <button
                            onClick={() => handleInlineSave(product)}
                            disabled={inlineSaving}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save price"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setInlineEditing(null)}
                            disabled={inlineSaving}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            if (isAdmin) {
                              setInlineEditing({
                                id: product.id,
                                field: 'price',
                                value: String(priceNum),
                              });
                            }
                          }}
                          className={`group cursor-pointer flex items-baseline space-x-1.5 ${
                            isAdmin ? 'hover:text-blue-600' : ''
                          }`}
                          title={isAdmin ? 'Click to edit price inline' : undefined}
                        >
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatIndianRupees(priceNum)}
                          </span>
                          {compareNum && (
                            <span className="text-[11px] text-gray-400 line-through">
                              {formatIndianRupees(compareNum)}
                            </span>
                          )}
                          {discount > 0 && (
                            <span className="text-[10px] text-green-600 font-bold">
                              {discount}% OFF
                            </span>
                          )}
                          {isAdmin && (
                            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Rent / Lease Column */}
                    <td className="py-3 px-3">
                      {hasApprovedRent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {rentRateDisplay}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Rent not set
                        </span>
                      )}
                    </td>

                    {/* Stock with Inline Edit */}
                    <td className="py-3 px-3">
                      {isEditingStock ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            autoFocus
                            value={inlineEditing.value}
                            onChange={(e) =>
                              setInlineEditing({ ...inlineEditing, value: e.target.value })
                            }
                            className="w-16 px-1.5 py-0.5 text-xs border border-blue-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                          />
                          <button
                            onClick={() => handleInlineSave(product)}
                            disabled={inlineSaving}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save stock"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setInlineEditing(null)}
                            disabled={inlineSaving}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            if (isAdmin) {
                              setInlineEditing({
                                id: product.id,
                                field: 'stock',
                                value: String(product.stock ?? 0),
                              });
                            }
                          }}
                          className={`group cursor-pointer flex items-center space-x-1 ${
                            isAdmin ? 'hover:text-blue-600' : ''
                          }`}
                          title={isAdmin ? 'Click to edit stock inline' : undefined}
                        >
                          <span
                            className={
                              (product.stock ?? 0) <= 0
                                ? 'text-red-600 font-bold'
                                : 'font-medium text-gray-900 dark:text-gray-100'
                            }
                          >
                            {product.stock ?? 0}
                          </span>
                          {isAdmin && (
                            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Truthful Variants Label */}
                    <td className="py-3 px-3">
                      {totalVariants > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {activeVariants.length} Active ({totalVariants} versions)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Single version
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <StatusBadge status={product.status} />
                    </td>

                    {/* Featured */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        disabled={isSupport}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          product.isFeatured
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {product.isFeatured ? 'Yes' : 'No'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openVariantsModal(product)}
                          className="px-2 py-1 text-[11px] font-semibold rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                          title="Manage hardware configurations"
                        >
                          Variants
                        </button>

                        <button
                          onClick={() => openEditModal(product)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                          title="Edit product, selling price, and rental rates"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleOpenPriceHistory(product)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600"
                          title="View price change history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleOpenDelete(product)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            title="Soft-archive or delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length} items
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPREHENSIVE PRODUCT EDIT MODAL                                         */}
      {/* ========================================================================= */}
      {editModalProduct && (
        <AdminModal
          open={true}
          onClose={() => {
            if (isDirty) {
              setConfirmDiscardOpen(true);
            } else {
              setEditModalProduct(null);
            }
          }}
          title={`Edit Product: ${editModalProduct.name}`}
        >
          <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
            {/* Tab navigation inside edit dialog */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-4">
              <button
                type="button"
                onClick={() => setEditTab('basics')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'basics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Basics
              </button>
              <button
                type="button"
                onClick={() => setEditTab('pricing')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'pricing'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pricing & MRP
              </button>
              <button
                type="button"
                onClick={() => setEditTab('rent')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'rent'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rental Pricing ({editFormData.rentEnabled ? 'Enabled' : 'Off'})
              </button>
              <button
                type="button"
                onClick={() => setEditTab('stock')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'stock'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Stock & Warranty
              </button>
              <button
                type="button"
                onClick={() => setEditTab('specs')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'specs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Specs
              </button>
              <button
                type="button"
                onClick={() => setEditTab('images')}
                className={`py-2 border-b-2 font-semibold ${
                  editTab === 'images'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Images
              </button>
            </div>

            {/* TAB: BASICS */}
            {editTab === 'basics' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      list="edit-brands"
                      value={editFormData.brand}
                      onChange={(e) => updateFormField('brand', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                    <datalist id="edit-brands">
                      {STANDARD_BRANDS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editFormData.categoryId}
                      onChange={(e) => updateFormField('categoryId', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Catalog Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => updateFormField('status', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="DISCONTINUED">DISCONTINUED</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5 space-x-2">
                    <input
                      type="checkbox"
                      id="edit-featured"
                      checked={editFormData.isFeatured}
                      onChange={(e) => updateFormField('isFeatured', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="edit-featured" className="font-semibold text-gray-700 dark:text-gray-300">
                      Featured
                    </label>
                  </div>
                  <div className="flex items-center pt-5 space-x-2">
                    <input
                      type="checkbox"
                      id="edit-new-arrival"
                      checked={editFormData.isNewArrival}
                      onChange={(e) => updateFormField('isNewArrival', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="edit-new-arrival" className="font-semibold text-gray-700 dark:text-gray-300">
                      New Arrival
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Short Summary
                  </label>
                  <input
                    type="text"
                    value={editFormData.shortDescription}
                    onChange={(e) => updateFormField('shortDescription', e.target.value)}
                    placeholder="Brief 1-line headline for card previews"
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TAB: PRICING & MRP */}
            {editTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={editFormData.price}
                      onChange={(e) => updateFormField('price', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
                    />
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Active customer purchase price.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Compare-At Price / MRP (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editFormData.compareAtPrice}
                      onChange={(e) => updateFormField('compareAtPrice', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Original manufacturer price for strike-through savings.
                    </span>
                  </div>
                </div>

                {/* Live Discount Calculation */}
                {parseFloat(editFormData.price) > 0 &&
                  parseFloat(editFormData.compareAtPrice) >= parseFloat(editFormData.price) && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                      <span>Customer Savings Preview:</span>
                      <span className="font-bold">
                        Save ₹
                        {(
                          parseFloat(editFormData.compareAtPrice) - parseFloat(editFormData.price)
                        ).toLocaleString('en-IN')}{' '}
                        (
                        {Math.round(
                          ((parseFloat(editFormData.compareAtPrice) -
                            parseFloat(editFormData.price)) /
                            parseFloat(editFormData.compareAtPrice)) *
                            100,
                        )}
                        % OFF)
                      </span>
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      B2B Bulk Sell Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editFormData.bulkSellPrice}
                      onChange={(e) => updateFormField('bulkSellPrice', e.target.value)}
                      placeholder="Optional corporate quote rate"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      B2B Bulk Lease Price (₹/mo)
                    </label>
                    <input
                      type="number"
                      value={editFormData.bulkLeasePrice}
                      onChange={(e) => updateFormField('bulkLeasePrice', e.target.value)}
                      placeholder="Optional bulk rental rate"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Price Change (Audit Trail)
                  </label>
                  <input
                    type="text"
                    value={editFormData.priceChangeReason}
                    onChange={(e) => updateFormField('priceChangeReason', e.target.value)}
                    placeholder="e.g. Festival promotional price or component cost revaluation"
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TAB: RENTAL PRICING */}
            {editTab === 'rent' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-semibold block text-gray-900 dark:text-gray-100">
                      Enable Renting for this Product
                    </span>
                    <span className="text-[11px] text-gray-500">
                      When enabled, customer can lease this laptop across multiple tenures.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label="Enable renting switch"
                      checked={editFormData.rentEnabled}
                      onChange={(e) => updateFormField('rentEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {editFormData.rentEnabled && (
                  <div className="space-y-3">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                      Per-Tenure Monthly Rent Rates (₹/Month)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {TENURES.map((tenure) => {
                        const monthlyRate = parseFloat(editFormData.rentalRates[tenure] || '0') || 0;
                        const totalCommitment = monthlyRate * tenure;

                        return (
                          <div
                            key={tenure}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 space-y-1.5"
                          >
                            <span className="font-semibold text-xs text-blue-600 dark:text-blue-400 block">
                              {tenure} {tenure === 1 ? 'Month' : 'Months'}
                            </span>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-400 font-semibold">₹</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="e.g. 1499"
                                value={editFormData.rentalRates[tenure] || ''}
                                onChange={(e) => updateRentalRate(tenure, e.target.value)}
                                className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-transparent font-medium"
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 block">
                              Total: ₹{totalCommitment.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-900 dark:text-blue-300 text-xs space-y-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="publish-immediately"
                          checked={editFormData.publishImmediately}
                          onChange={(e) => updateFormField('publishImmediately', e.target.checked)}
                          className="rounded border-blue-300 text-blue-600"
                        />
                        <label htmlFor="publish-immediately" className="font-semibold cursor-pointer">
                          Publish immediately (Approve for storefront display & customer checkout)
                        </label>
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400 pl-5">
                        Single admin approval is authorized. Publishing supersedes previous rates and activates them on the product page instantly.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: STOCK & WARRANTY */}
            {editTab === 'stock' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Base Stock Count *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editFormData.stock}
                      onChange={(e) => updateFormField('stock', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Physical inventory count. If variants exist, stock is managed per variant.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Standard Doorstep Warranty (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.warrantyMonths}
                      onChange={(e) => updateFormField('warrantyMonths', parseInt(e.target.value, 10) || 6)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Included free warranty period (default 6 months).
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                  <span className="font-semibold block text-gray-900 dark:text-gray-100">
                    Warranty Extension Add-On Policy
                  </span>
                  <p className="text-gray-500 text-[11px]">
                    Optional 1-Year Doorstep Warranty Extension is offered at checkout for a flat ₹1,999.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: SPECS */}
            {editTab === 'specs' && (
              <div className="space-y-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                  Technical Specifications (Certified Inspection Metadata)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Processor</label>
                    <input
                      type="text"
                      value={editFormData.specs.processor || ''}
                      onChange={(e) => updateSpecField('processor', e.target.value)}
                      placeholder="e.g. Apple M1 8-Core / Intel Core i7-1185G7"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">RAM</label>
                    <input
                      type="text"
                      value={editFormData.specs.ram || ''}
                      onChange={(e) => updateSpecField('ram', e.target.value)}
                      placeholder="e.g. 16GB Unified / 16GB DDR4"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Storage</label>
                    <input
                      type="text"
                      value={editFormData.specs.storage || ''}
                      onChange={(e) => updateSpecField('storage', e.target.value)}
                      placeholder="e.g. 512GB NVMe SSD"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Display</label>
                    <input
                      type="text"
                      value={editFormData.specs.display || ''}
                      onChange={(e) => updateSpecField('display', e.target.value)}
                      placeholder="e.g. 13.3-inch Retina True Tone (2560x1600)"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Physical Condition</label>
                    <select
                      value={editFormData.specs.condition || 'Grade A+ (Pristine)'}
                      onChange={(e) => updateSpecField('condition', e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    >
                      <option value="Grade A+ (Pristine)">Grade A+ (Pristine - Zero Blemishes)</option>
                      <option value="Grade A (Like-New)">Grade A (Like-New - Minor Scratches)</option>
                      <option value="Grade B (Refurbished)">Grade B (Refurbished - Visible Wear)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Battery Health</label>
                    <input
                      type="text"
                      value={editFormData.specs.batteryHealth || ''}
                      onChange={(e) => updateSpecField('batteryHealth', e.target.value)}
                      placeholder="e.g. 92% Original Capacity (Tested)"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: IMAGES */}
            {editTab === 'images' && (
              <div className="space-y-3">
                <label className="block font-semibold text-gray-700 dark:text-gray-300">
                  Image URLs (One per line)
                </label>
                <textarea
                  rows={4}
                  value={editFormData.imageUrls}
                  onChange={(e) => updateFormField('imageUrls', e.target.value)}
                  placeholder="https://images.unsplash.com/... (First line is primary)"
                  className="w-full p-2 font-mono text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                />
                <div className="flex gap-2 overflow-x-auto py-2">
                  {editFormData.imageUrls
                    .split(/\r?\n/)
                    .map((url: string) => url.trim())
                    .filter(Boolean)
                    .map((url: string, idx: number) => (
                      <div key={idx} className="relative w-16 h-16 rounded border shrink-0 overflow-hidden">
                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[9px] text-center font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-[11px] text-gray-400">
                SKU: {editModalProduct.sku} &bull; Updated:{' '}
                {new Date(editModalProduct.updatedAt || Date.now()).toLocaleDateString()}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDirty) {
                      setConfirmDiscardOpen(true);
                    } else {
                      setEditModalProduct(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                {isAdmin && (
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Discard confirmation modal */}
      {confirmDiscardOpen && (
        <AdminModal
          open={true}
          onClose={() => setConfirmDiscardOpen(false)}
          title="Discard Unsaved Changes?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-600 dark:text-gray-300">
              You have modified fields on this product. Are you sure you want to discard your changes?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscardOpen(false);
                  setIsDirty(false);
                  setEditModalProduct(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* BULK PRICING MODAL                                                       */}
      {/* ========================================================================= */}
      {bulkPricingModalOpen && (
        <AdminModal
          open={true}
          onClose={() => setBulkPricingModalOpen(false)}
          title={`Bulk Price Adjustment (${selectedProductIds.length} Products)`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={bulkAdjustmentType}
                  onChange={(e) =>
                    handleUpdateBulkPreview(
                      e.target.value as any,
                      bulkAdjustmentValue,
                      bulkApplyToMRP,
                    )
                  }
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Adjustment Value (positive or negative)
                </label>
                <input
                  type="number"
                  step="1"
                  value={bulkAdjustmentValue}
                  onChange={(e) =>
                    handleUpdateBulkPreview(
                      bulkAdjustmentType,
                      e.target.value,
                      bulkApplyToMRP,
                    )
                  }
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bulk-mrp"
                checked={bulkApplyToMRP}
                onChange={(e) =>
                  handleUpdateBulkPreview(
                    bulkAdjustmentType,
                    bulkAdjustmentValue,
                    e.target.checked,
                  )
                }
                className="rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="bulk-mrp" className="font-semibold text-gray-700 dark:text-gray-300">
                Also adjust Compare-At Price / MRP proportionally
              </label>
            </div>

            {/* Live Preview List */}
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Preview Price Adjustments
              </span>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-1.5 px-3">Product</th>
                      <th className="py-1.5 px-3">Old Price</th>
                      <th className="py-1.5 px-3">New Price</th>
                      <th className="py-1.5 px-3">New MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {bulkPreviewLoading ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-400">
                          Calculating preview...
                        </td>
                      </tr>
                    ) : (
                      bulkPreviewItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5 px-3 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                            {item.name}
                          </td>
                          <td className="py-1.5 px-3 text-gray-400 line-through">
                            {formatIndianRupees(item.oldPrice)}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-blue-600">
                            {formatIndianRupees(item.newPrice)}
                          </td>
                          <td className="py-1.5 px-3 text-gray-500">
                            {item.newCompareAt ? formatIndianRupees(item.newCompareAt) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setBulkPricingModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkApplying || bulkPreviewItems.length === 0}
                onClick={handleApplyBulkPricing}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              >
                {bulkApplying ? 'Applying...' : `Apply to ${selectedProductIds.length} Products`}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* PRICE HISTORY MODAL                                                       */}
      {/* ========================================================================= */}
      {historyProduct && (
        <AdminModal
          open={true}
          onClose={() => setHistoryProduct(null)}
          title={`Price & Rental History: ${historyProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            {historyLoading ? (
              <div className="py-8 text-center text-gray-400">Loading audit history...</div>
            ) : (
              <div className="space-y-4">
                {/* Selling Price Audits */}
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    Selling Price Audits
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-semibold border-b">
                        <tr>
                          <th className="py-1.5 px-3">Date</th>
                          <th className="py-1.5 px-3">Old Price</th>
                          <th className="py-1.5 px-3">New Price</th>
                          <th className="py-1.5 px-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {historyData?.priceAudits && historyData.priceAudits.length > 0 ? (
                          historyData.priceAudits.map((a: any) => (
                            <tr key={a.id}>
                              <td className="py-1.5 px-3 text-gray-400">
                                {new Date(a.createdAt).toLocaleString()}
                              </td>
                              <td className="py-1.5 px-3 text-gray-500">
                                ₹{a.metadata?.oldPrice || '-'}
                              </td>
                              <td className="py-1.5 px-3 font-bold text-blue-600">
                                ₹{a.metadata?.newPrice || '-'}
                              </td>
                              <td className="py-1.5 px-3 text-gray-500">{a.metadata?.reason || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-gray-400">
                              No previous selling price modifications recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rental Pricing Audits */}
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    Rental Price Approvals
                  </span>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-semibold border-b">
                        <tr>
                          <th className="py-1.5 px-3">Tenure</th>
                          <th className="py-1.5 px-3">Monthly Rent</th>
                          <th className="py-1.5 px-3">Status</th>
                          <th className="py-1.5 px-3">Approved Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {historyData?.rentalPrices && historyData.rentalPrices.length > 0 ? (
                          historyData.rentalPrices.map((rp: any) => (
                            <tr key={rp.id}>
                              <td className="py-1.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                                {rp.tenureMonths} Months
                              </td>
                              <td className="py-1.5 px-3 font-bold text-emerald-600">
                                ₹{Number(rp.monthlyPrice).toLocaleString('en-IN')}/mo
                              </td>
                              <td className="py-1.5 px-3">
                                <StatusBadge status={rp.status} />
                              </td>
                              <td className="py-1.5 px-3 text-gray-500">
                                {rp.approvedAt ? new Date(rp.approvedAt).toLocaleDateString() : 'Draft'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-gray-400">
                              No rental rates configured yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* SAFE ARCHIVE / REFERENCE CHECK MODAL                                      */}
      {/* ========================================================================= */}
      {archiveTargetProduct && (
        <AdminModal
          open={true}
          onClose={() => setArchiveTargetProduct(null)}
          title={`Archive / Delete: ${archiveTargetProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            {referenceLoading ? (
              <div className="py-6 text-center text-gray-400">Checking active order and lease references...</div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-300">
                  <span className="font-semibold block mb-1">Integrity Check</span>
                  {referenceSummary?.totalOrders > 0 || referenceSummary?.totalLeases > 0 ? (
                    <p>
                      This product is referenced in {referenceSummary.totalOrders} order(s) and{' '}
                      {referenceSummary.totalLeases} lease contract(s). It will be safely <strong>soft-archived</strong>{' '}
                      (DISCONTINUED) to preserve historical customer invoices, contracts, and tracking records.
                    </p>
                  ) : (
                    <p>
                      This product has no active or historical orders/leases. It can be safely removed from the catalog.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 border rounded bg-gray-50 dark:bg-slate-800">
                    <span className="text-gray-400 block">Total Orders</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {referenceSummary?.totalOrders ?? 0} ({referenceSummary?.activeOrders ?? 0} active)
                    </span>
                  </div>
                  <div className="p-2 border rounded bg-gray-50 dark:bg-slate-800">
                    <span className="text-gray-400 block">Lease Contracts</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {referenceSummary?.totalLeases ?? 0} ({referenceSummary?.activeLeases ?? 0} active)
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setArchiveTargetProduct(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={archiving}
                    onClick={handleConfirmArchive}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                  >
                    {archiving ? 'Archiving...' : 'Confirm Discontinue & Archive'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* CSV IMPORT MODAL                                                         */}
      {/* ========================================================================= */}
      {csvImportModalOpen && (
        <AdminModal
          open={true}
          onClose={() => {
            setCsvImportModalOpen(false);
            setCsvDryRunResult(null);
            setCsvText('');
          }}
          title="Import Products from CSV"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                CSV Content (Paste CSV with headers: SKU, Name, Brand, Category, Price, MRP, Stock)
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="SKU,Name,Brand,Category,Status,Stock,Price,MRP&#10;LM-MBP14,Apple MacBook Pro 14,Apple,Laptops,ACTIVE,10,129999,149999"
                className="w-full p-2 font-mono text-[11px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            {/* Dry Run Preview Summary */}
            {csvDryRunResult && (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border rounded-lg grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Total Rows</span>
                    <span className="font-bold">{csvDryRunResult.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">To Create</span>
                    <span className="font-bold text-green-600">{csvDryRunResult.toCreate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">To Update</span>
                    <span className="font-bold text-blue-600">{csvDryRunResult.toUpdate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Errors</span>
                    <span
                      className={`font-bold ${
                        csvDryRunResult.errors?.length > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {csvDryRunResult.errors?.length || 0}
                    </span>
                  </div>
                </div>

                {csvDryRunResult.errors?.length > 0 && (
                  <div className="max-h-24 overflow-y-auto p-2 bg-red-50 text-red-800 rounded border border-red-200 text-[11px]">
                    {csvDryRunResult.errors.map((err: any, i: number) => (
                      <div key={i}>
                        Row {err.row} ({err.sku}): {err.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                disabled={csvValidating || !csvText.trim()}
                onClick={handleCsvValidate}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                {csvValidating ? 'Validating...' : 'Dry-Run Preview'}
              </button>

              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setCsvImportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvCommitting || !csvDryRunResult || csvDryRunResult.errors?.length > 0}
                  onClick={handleCsvCommit}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {csvCommitting ? 'Importing...' : 'Commit Changes'}
                </button>
              </div>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* VARIANTS CONFIGURATION MODAL                                             */}
      {/* ========================================================================= */}
      {variantsProduct && (
        <AdminModal
          open={true}
          onClose={() => setVariantsProduct(null)}
          title={`Hardware Variants: ${variantsProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-300">
              <span className="font-semibold block mb-0.5">Configuration-Driven Pricing</span>
              When hardware variants (RAM, SSD, GPU) are active, customers choose their preferred configuration, and pricing adapts directly to the selected variant.
            </div>

            {/* Variants Table */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Variant / Config</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Selling Price</th>
                    <th className="py-2 px-3">Stock</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {variantDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No hardware variants configured. This product runs as a single version.
                      </td>
                    </tr>
                  ) : (
                    variantDrafts.map((v, idx) => (
                      <tr key={idx} className={v.isActive ? '' : 'opacity-50 bg-gray-50'}>
                        <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                          {v.name}
                          <span className="block text-[10px] text-gray-400">
                            {[v.ram, v.storage, v.processor].filter(Boolean).join(' • ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-500">{v.sku}</td>
                        <td className="py-2 px-3 font-semibold text-blue-600">
                          {formatIndianRupees(parseFloat(v.price) || 0)}
                        </td>
                        <td className="py-2 px-3">{v.stock}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...variantDrafts];
                              copy[idx].isActive = !copy[idx].isActive;
                              setVariantDrafts(copy);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              v.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {v.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = variantDrafts.filter((_, i) => i !== idx);
                              setVariantDrafts(copy);
                            }}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Add Variant Row */}
            <div className="p-3 border rounded-lg bg-gray-50 dark:bg-slate-800 space-y-2">
              <span className="font-semibold block text-gray-700 dark:text-gray-300">
                Add Configuration Variant
              </span>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="e.g. 16GB / 512GB SSD"
                  id="new-variant-name"
                  className="p-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="text"
                  placeholder="SKU"
                  id="new-variant-sku"
                  className="p-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="number"
                  placeholder="Selling Price (₹)"
                  id="new-variant-price"
                  className="p-1.5 border rounded bg-white text-xs"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  id="new-variant-stock"
                  defaultValue="5"
                  className="p-1.5 border rounded bg-white text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const nameEl = document.getElementById('new-variant-name') as HTMLInputElement;
                  const skuEl = document.getElementById('new-variant-sku') as HTMLInputElement;
                  const priceEl = document.getElementById('new-variant-price') as HTMLInputElement;
                  const stockEl = document.getElementById('new-variant-stock') as HTMLInputElement;
                  if (!nameEl?.value.trim() || !priceEl?.value) {
                    addToast('error', 'Variant title and price are required.');
                    return;
                  }
                  setVariantDrafts([
                    ...variantDrafts,
                    {
                      name: nameEl.value.trim(),
                      sku: skuEl.value.trim() || `${variantsProduct.sku}-V${variantDrafts.length + 1}`,
                      price: priceEl.value,
                      compareAtPrice: '',
                      leasePriceMonthly: '',
                      stock: stockEl.value || '5',
                      ram: '',
                      storage: '',
                      processor: '',
                      graphics: '',
                      extraAttributes: {},
                      allowBackorder: false,
                      isActive: true,
                      isDefault: variantDrafts.length === 0,
                      imageUrls: '',
                    },
                  ]);
                  nameEl.value = '';
                  skuEl.value = '';
                  priceEl.value = '';
                }}
                className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 font-semibold text-xs"
              >
                + Add Configuration Row
              </button>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setVariantsProduct(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              {isAdmin && (
                <button
                  type="button"
                  disabled={savingVariants}
                  onClick={handleSaveVariants}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {savingVariants ? 'Saving...' : 'Save All Variants'}
                </button>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW PRODUCT MODAL                                                    */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <AdminModal
          open={true}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Certified Laptop"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newProductData.name.trim() || !newProductData.sku.trim() || !newProductData.price) {
                addToast('error', 'Title, SKU, and Selling Price are required.');
                return;
              }
              const price = parseFloat(newProductData.price);
              if (isNaN(price) || price <= 0) {
                addToast('error', 'Selling price must be greater than 0.');
                return;
              }
              try {
                const images = newProductData.imageUrls
                  .split(/\r?\n/)
                  .map((u: string) => u.trim())
                  .filter(Boolean)
                  .map((url: string, idx: number) => ({ url, isPrimary: idx === 0, sortOrder: idx }));

                await api.createAdminProduct({
                  name: newProductData.name.trim(),
                  sku: newProductData.sku.trim(),
                  price,
                  compareAtPrice: newProductData.compareAtPrice ? parseFloat(newProductData.compareAtPrice) : null,
                  stock: parseInt(newProductData.stock, 10) || 10,
                  categoryId: newProductData.categoryId || null,
                  shortDescription: newProductData.shortDescription.trim() || null,
                  description: newProductData.description.trim() || null,
                  status: newProductData.status,
                  isFeatured: newProductData.isFeatured,
                  isNewArrival: newProductData.isNewArrival,
                  metadata: {
                    brand: newProductData.brand.trim(),
                    warrantyMonths: newProductData.warrantyMonths,
                    specs: newProductData.specs,
                  },
                  images,
                });
                addToast('success', `Product "${newProductData.name}" created successfully.`);
                setIsAddModalOpen(false);
                loadCatalog();
              } catch (err: any) {
                addToast('error', err?.message || 'Failed to create product');
              }
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={newProductData.name}
                onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                placeholder="e.g. Apple MacBook Air 13.3 (M1 Chip, 8GB RAM, 256GB SSD)"
                className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={newProductData.sku}
                  onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                  placeholder="e.g. LM-MBA-M1-256"
                  className="w-full p-2 font-mono border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                <input
                  type="text"
                  list="add-brands"
                  value={newProductData.brand}
                  onChange={(e) => setNewProductData({ ...newProductData, brand: e.target.value })}
                  placeholder="e.g. Apple, Dell, Lenovo"
                  className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
                />
                <datalist id="add-brands">
                  {STANDARD_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newProductData.price}
                  onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">MRP / Strike-Through (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newProductData.compareAtPrice}
                  onChange={(e) => setNewProductData({ ...newProductData, compareAtPrice: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  value={newProductData.stock}
                  onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={newProductData.categoryId}
                onChange={(e) => setNewProductData({ ...newProductData, categoryId: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Image URLs (One per line)</label>
              <textarea
                rows={3}
                value={newProductData.imageUrls}
                onChange={(e) => setNewProductData({ ...newProductData, imageUrls: e.target.value })}
                placeholder="https://..."
                className="w-full p-2 font-mono text-xs border border-gray-200 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Create Product
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
