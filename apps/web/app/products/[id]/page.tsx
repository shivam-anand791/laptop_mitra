'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../../components/CustomerLayout';
import ProductCard from '../../../components/ProductCard';
import Badge from '../../../components/ui/Badge';
import { Product, ProductVariant, CartItem } from '../../../lib/types';
import { api, ApiError } from '../../../lib/api';
import { useCart } from '../../../lib/cart-context';
import { useWishlist } from '../../../lib/wishlist-context';
import { useAuth } from '../../../lib/auth-context';
import { useSupportConfig } from '../../../lib/support-config';
import { useToast } from '../../../components/ui/Toast';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../../../lib/config';
import CorporateQuoteModal from '../../../components/CorporateQuoteModal';
import QualityPromiseSection from '../../../components/QualityPromiseSection';
import { BUYBACK_POLICY, RentalTenureMonths } from '@laptopmitra/types';
import {
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  FileText,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Laptop,
  Battery,
  Zap,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Award,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  ShoppingCart,
  ArrowRight,
  Layers,
  Wrench,
  ShieldAlert,
  SlidersHorizontal,
  HandCoins,
  Maximize2,
  Loader2,
} from 'lucide-react';

function getVariantSpecValue(
  variant: ProductVariant | undefined,
  field: string,
  fallback: string | undefined,
): string {
  if (!variant) return fallback || '';
  const aliases: Record<string, string[]> = {
    processor: ['processor', 'cpu', 'processormodel'],
    ram: ['ram', 'memory', 'ramcapacity', 'memorycapacity'],
    storage: ['storage', 'storagecapacity', 'drive'],
    display: ['display', 'screen'],
    graphics: ['graphics', 'gpu'],
    brand: ['brand', 'manufacturer'],
    batteryhealth: ['batteryhealth', 'battery'],
    os: ['os', 'operatingsystem'],
    condition: ['condition', 'grade'],
    warranty: ['warranty'],
  };
  const acceptedKeys = aliases[field] || [field];
  const value = Object.entries(variant.attributes).find(([key]) =>
    acceptedKeys.includes(key.toLowerCase().replace(/[^a-z0-9]/g, '')),
  )?.[1];
  return value === undefined ? fallback || '' : String(value);
}

function formatAttributeLabel(key: string): string {
  const map: Record<string, string> = {
    ram: 'Memory (RAM)',
    storage: 'Storage',
    processor: 'Processor',
    graphics: 'Graphics',
    color: 'Color',
    condition: 'Condition',
    warranty: 'Warranty',
  };
  return (
    map[key.toLowerCase()] ||
    key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { addItem, items: cartItems } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const { data: supportConfig } = useSupportConfig();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isImgLoading, setIsImgLoading] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [added, setAdded] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isWishlistAnimating, setIsWishlistAnimating] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'inspection' | 'box' | 'warranty' | 'faq'>(
    'specs',
  );
  const [procurementModel, setProcurementModel] = useState<'buy' | 'lease'>('buy');
  const [selectedRentalTenure, setSelectedRentalTenure] = useState<RentalTenureMonths>(12);
  const [hasWarranty, setHasWarranty] = useState<boolean>(false);
  const [pincode, setPincode] = useState<string>('');
  const [pincodeChecked, setPincodeChecked] = useState<boolean>(false);
  const [corporateModalOpen, setCorporateModalOpen] = useState<boolean>(false);
  const [buybackModalOpen, setBuybackModalOpen] = useState<boolean>(false);
  const [selectedBuybackIndex, setSelectedBuybackIndex] = useState<number>(0);
  const [openAccordions, setOpenAccordions] = useState<{
    assurance: boolean;
    details: boolean;
    specs: boolean;
  }>({
    assurance: false,
    details: false,
    specs: false,
  });
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 550);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleAccordion = (key: 'assurance' | 'details' | 'specs') => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const buybackTriggerRef = useRef<HTMLButtonElement>(null);
  const wasBuybackModalOpen = useRef<boolean>(false);

  const loadProduct = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const prod = await api.getProduct(resolvedParams.id);
      const rawVariants = prod.variants?.filter((variant) => variant.isActive) || [];
      prod.variants = rawVariants;
      setProduct(prod);
      const defaultVariant =
        rawVariants.find(
          (variant) => variant.isDefault && (variant.stock > 0 || variant.allowBackorder),
        ) ||
        rawVariants.find((variant) => variant.stock > 0 || variant.allowBackorder) ||
        rawVariants.find((variant) => variant.isDefault) ||
        rawVariants[0];

      setSelectedVariantId(defaultVariant?.id || '');
      const variantImages = defaultVariant?.images || [];
      const primary =
        variantImages.find((i) => i.isPrimary)?.url ||
        variantImages[0]?.url ||
        prod.images?.find((i) => i.isPrimary)?.url ||
        prod.images?.[0]?.url ||
        '';
      setSelectedImage(primary);

      try {
        const res = await api.getProducts({
          categoryId: prod.categoryId || undefined,
          limit: 4,
        });
        setSimilarProducts(res.products.filter((p) => p.id !== prod.id).slice(0, 4));
      } catch {
        // Ignore similar products error
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProduct(null);
      } else {
        setLoadError("We couldn't load this laptop listing right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (!product) return;
    const variant = product.variants?.find((item) => item.id === selectedVariantId);
    const images = variant?.images?.length ? variant.images : product.images || [];
    const primary = images.find((image) => image.isPrimary)?.url || images[0]?.url || '';
    if (primary) setSelectedImage(primary);
  }, [product, selectedVariantId]);

  useEffect(() => {
    const plans =
      product?.variants?.find((variant) => variant.id === selectedVariantId)?.rentalPlans ??
      product?.rentalPlans ??
      [];
    if (plans.length && !plans.some((plan) => plan.tenureMonths === selectedRentalTenure)) {
      setSelectedRentalTenure(plans[0].tenureMonths);
    }
  }, [product, selectedVariantId, selectedRentalTenure]);

  useEffect(() => {
    if (!product) return;
    const variant = product.variants?.find((item) => item.id === selectedVariantId);
    const stock = variant?.stock ?? product.stock;
    const backorder = variant?.allowBackorder ?? product.allowBackorder ?? false;
    if (!backorder && stock > 0) setQuantity((current) => Math.min(current, stock));
  }, [product, selectedVariantId]);

  useEffect(() => {
    if (wasBuybackModalOpen.current && !buybackModalOpen) {
      buybackTriggerRef.current?.focus();
    }
    wasBuybackModalOpen.current = buybackModalOpen;
  }, [buybackModalOpen]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#0B1F4B]">
            Loading certified laptop specifications...
          </p>
        </div>
      </CustomerLayout>
    );
  }

  if (loadError) {
    return (
      <CustomerLayout>
        <div role="alert" className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold text-[#0B1F4B]">Unable to load laptop listing</h2>
          <p className="text-sm text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadProduct()}
            className="inline-block px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-sm transition-all shadow-md cursor-pointer"
          >
            Retry
          </button>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold text-[#0B1F4B]">Laptop Listing Not Found</h2>
          <p className="text-sm text-slate-600">
            The laptop you are looking for is either out of stock or no longer listed in our
            inventory.
          </p>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-sm transition-all shadow-md"
          >
            Browse All Available Laptops
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const isWish = isInWishlist(product.id);
  const isLease = procurementModel === 'lease';
  const rawVariants = product.variants?.filter((variant) => variant.isActive) || [];
  const activeVariants = rawVariants;
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId);
  const availableStock = selectedVariant?.stock ?? product.stock;
  const allowBackorder = selectedVariant?.allowBackorder ?? product.allowBackorder ?? false;
  const outOfStock = availableStock <= 0 && !allowBackorder;
  const priceNum = Number(selectedVariant?.price ?? product.price);
  const compareNum =
    selectedVariant?.compareAtPrice != null
      ? Number(selectedVariant.compareAtPrice)
      : selectedVariant
        ? null
        : product.compareAtPrice
          ? Number(product.compareAtPrice)
          : null;
  const savings = compareNum && compareNum > priceNum ? compareNum - priceNum : 0;
  const discountPercent =
    compareNum && compareNum > priceNum ? Math.round((savings / compareNum) * 100) : 0;

  const rentalPlans = selectedVariant?.rentalPlans ?? product.rentalPlans ?? [];
  const hasLeasePrice = rentalPlans.length > 0;
  const activeRentalPlan =
    rentalPlans.find((plan) => plan.tenureMonths === selectedRentalTenure) || rentalPlans[0];
  const activeMonthlyRate = activeRentalPlan?.monthlyPrice;
  const currentUnitPrice = isLease ? activeMonthlyRate : priceNum;

  const bulkPrice = selectedVariant
    ? null
    : isLease
      ? product.bulkLeasePrice
        ? Number(product.bulkLeasePrice)
        : null
      : product.bulkSellPrice
        ? Number(product.bulkSellPrice)
        : null;

  const handleAddToCart = async () => {
    if (!product) return;
    if (cartItems.some((item) => (item.purchaseMode === 'lease') !== isLease)) {
      window.alert(
        'Buy and rent items must be kept in separate carts. Remove the existing cart items first.',
      );
      return;
    }
    if (isLease && !hasLeasePrice) {
      setCorporateModalOpen(true);
      return;
    }
    setIsAdding(true);
    try {
      const synced = await addItem(product, quantity, {
        purchaseMode: isLease ? 'lease' : 'sell',
        hasWarranty: !isLease && hasWarranty,
        ...(isLease ? { tenureMonths: selectedRentalTenure } : {}),
        ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
      });
      if (synced) {
        setAdded(true);
        addToast('success', `${product.name} added to cart!`);
        setTimeout(() => setAdded(false), 2200);
      }
    } catch {
      addToast('error', 'Could not add to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (isLease && !hasLeasePrice) {
      setCorporateModalOpen(true);
      return;
    }

    const buyNowItem: CartItem = {
      id: `buy-now-${product.id}-${selectedVariant?.id || 'default'}-${isLease ? 'lease' : 'sell'}`,
      productId: product.id,
      variantId: selectedVariant?.id || null,
      variant: selectedVariant || null,
      quantity,
      priceAtAdd: Number(currentUnitPrice ?? priceNum),
      purchaseMode: isLease ? 'lease' : 'sell',
      configuration: selectedVariant?.name || 'default',
      hasWarranty: !isLease && hasWarranty,
      warrantyPrice: !isLease && hasWarranty ? 1999 : 0,
      tenureMonths: isLease ? selectedRentalTenure : undefined,
      product,
    };

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('lm_buy_now_item', JSON.stringify(buyNowItem));
      } catch (err) {
        console.error('Failed to set buy-now item in sessionStorage', err);
      }
    }
    router.push('/checkout?buyNow=1');
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    setIsWishlistAnimating(true);
    const wasWish = isInWishlist(product.id);
    const success = await toggleWishlist(product);
    if (success) {
      addToast(
        'success',
        wasWish
          ? `${product.name} removed from wishlist`
          : `${product.name} saved to wishlist!`,
      );
    }
    setTimeout(() => setIsWishlistAnimating(false), 300);
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.trim().length === 6) {
      setPincodeChecked(true);
    }
  };

  const galleryImages = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images || [];
  const displayImageSrc =
    selectedImage || galleryImages[0]?.url || '/images/generated/cat-business.webp';

  const selectImage = (url: string) => {
    if (url !== selectedImage) {
      setIsImgLoading(true);
      setSelectedImage(url);
    }
  };

  const handlePrevImg = () => {
    if (galleryImages.length <= 1) return;
    const currentIdx = galleryImages.findIndex(
      (img) => img.url === (selectedImage || galleryImages[0]?.url),
    );
    const prevIdx = (currentIdx - 1 + galleryImages.length) % galleryImages.length;
    setIsImgLoading(true);
    setSelectedImage(galleryImages[prevIdx].url);
  };

  const handleNextImg = () => {
    if (galleryImages.length <= 1) return;
    const currentIdx = galleryImages.findIndex(
      (img) => img.url === (selectedImage || galleryImages[0]?.url),
    );
    const nextIdx = (currentIdx + 1) % galleryImages.length;
    setIsImgLoading(true);
    setSelectedImage(galleryImages[nextIdx].url);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;
    if (deltaX > 45) {
      handleNextImg();
    } else if (deltaX < -45) {
      handlePrevImg();
    }
    touchStartX.current = null;
  };

  const buybackPlans = BUYBACK_POLICY.tiers.map((tier) => ({
    ...tier,
    estimatedValue: Math.round(priceNum * (tier.percentage / 100)),
  }));
  const selectedBuybackPlan = buybackPlans[selectedBuybackIndex] ?? buybackPlans[0];
  const selectedBuybackPercentage = selectedBuybackPlan?.percentage ?? 0;

  // Attributes & Dynamic Configuration Chips
  const variantAttributeKeys = Array.from(
    new Set(activeVariants.flatMap((variant) => Object.keys(variant.attributes))),
  ).sort();

  const chooseVariantForAttribute = (attributeKey: string, value: string) => {
    const matching = activeVariants.filter(
      (variant) => String(variant.attributes[attributeKey]) === value,
    );
    if (!matching.length) return;

    // Try to find a variant that preserves as many existing attribute choices as possible
    const scored = matching.map((variant) => {
      let score = 0;
      if (selectedVariant) {
        for (const [k, val] of Object.entries(selectedVariant.attributes)) {
          if (k !== attributeKey && String(variant.attributes[k]) === String(val)) {
            score += 1;
          }
        }
      }
      const purchasable = variant.stock > 0 || variant.allowBackorder;
      return { variant, score, purchasable };
    });

    // Prefer purchasable variants, then highest attribute-match score, then default variant
    scored.sort((a, b) => {
      if (a.purchasable !== b.purchasable) return a.purchasable ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.variant.isDefault ? -1 : 1;
    });

    if (scored[0]) {
      setSelectedVariantId(scored[0].variant.id);
    }
  };

  // Structured Blue-and-White Specification Themed Cards
  const activeRam =
    getVariantSpecValue(selectedVariant, 'ram', product.metadata?.ram) || '16GB DDR5';
  const activeStorage =
    getVariantSpecValue(selectedVariant, 'storage', product.metadata?.storage) || '512GB NVMe SSD';
  const activeProcessor =
    getVariantSpecValue(selectedVariant, 'processor', product.metadata?.processor) ||
    'Intel Core / Apple Silicon';
  const activeGraphics =
    getVariantSpecValue(selectedVariant, 'graphics', product.metadata?.graphics) ||
    'Integrated / Dedicated';
  const activeDisplay =
    getVariantSpecValue(selectedVariant, 'display', product.metadata?.display) ||
    'Full HD+ Anti-Glare IPS';
  const activeBattery =
    getVariantSpecValue(selectedVariant, 'batteryHealth', product.metadata?.batteryHealth) ||
    '95%+ Original Battery Health';
  const activeOs =
    getVariantSpecValue(selectedVariant, 'os', product.metadata?.os) ||
    'Genuine Windows 11 Pro / macOS';
  const activeCondition =
    getVariantSpecValue(selectedVariant, 'condition', product.metadata?.condition) ||
    'Grade A+ Pristine (Like New)';
  const warrantyMonths = supportConfig
    ? Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))
    : null;
  const warrantyLabel = warrantyMonths
    ? `${warrantyMonths}-Month Doorstep Warranty`
    : 'the configured warranty period';
  const returnLabel = supportConfig?.returnWindowDays
    ? `${supportConfig.returnWindowDays}-Day Replacement`
    : 'Return and replacement policy';
  const activeWarranty = warrantyLabel;

  const specificationThemedGroups = [
    {
      group: 'Speed & Performance',
      cards: [
        {
          label: 'Processor',
          value: activeProcessor,
          subtext: 'Handles everyday tasks, multitasking, and demanding apps smoothly',
          Icon: Cpu,
        },
        {
          label: 'Graphics',
          value: activeGraphics,
          subtext: 'Powers smooth video, photos, and light creative work',
          Icon: Laptop,
        },
      ],
    },
    {
      group: 'Memory & Storage',
      cards: [
        {
          label: 'Memory',
          value: activeRam,
          subtext: 'More memory means you can run more apps at once without slowdowns',
          Icon: MemoryStick,
        },
        {
          label: 'Storage',
          value: activeStorage,
          subtext: 'Fast solid-state storage — boots in seconds, opens files instantly',
          Icon: HardDrive,
        },
      ],
    },
    {
      group: 'Screen & Battery',
      cards: [
        {
          label: 'Display',
          value: activeDisplay,
          subtext: 'Sharp, clear screen — great for work, streaming, and video calls',
          Icon: Monitor,
        },
        {
          label: 'Battery Health',
          value: activeBattery,
          subtext: 'Tested and certified — lasts a full workday on a single charge',
          Icon: Battery,
          isBattery: true,
        },
      ],
    },
    {
      group: 'Quality & Warranty',
      cards: [
        {
          label: 'Operating System',
          value: activeOs,
          subtext: 'Genuine licensed OS — ready to use right out of the box',
          Icon: Zap,
        },
        {
          label: 'Condition & Warranty',
          value: `${activeCondition} • ${activeWarranty}`,
          subtext: `Thoroughly cleaned and inspected — backed by ${warrantyLabel}`,
          Icon: ShieldCheck,
        },
      ],
    },
  ];

  return (
    <CustomerLayout>
      {/* ─── Mobile Top Navigation Sub-Bar (Phone 2 Reference Match: md:hidden) ─── */}
      <div className="md:hidden sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6DFD5] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="p-1 -ml-1 text-slate-700 hover:text-[#0B1F4B] transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>

        <Link href="/" className="font-black text-base tracking-tight text-[#0B1F4B]">
          Laptop<span className="text-[#2563EB]">Mitra</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/products"
            aria-label="Search laptops"
            className="p-1.5 text-slate-700 hover:text-[#2563EB] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          <Link
            href="/cart"
            aria-label="View Cart"
            className="p-1.5 text-slate-700 hover:text-[#2563EB] transition-colors relative"
          >
            <ShoppingCart size={20} />
            {cartItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#2563EB] text-white font-mono text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#FFFDF9]">
                {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="bg-[#F7F4EE] min-h-screen py-4 sm:py-8 lg:py-10 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs (Desktop: hidden sm:flex) */}
          <nav
            aria-label="Breadcrumb"
            className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap py-1"
          >
            <Link href="/" className="hover:text-[#2563EB] transition-colors font-medium">
              Home
            </Link>
            <span className="text-slate-400">/</span>
            <Link href="/products" className="hover:text-[#2563EB] transition-colors font-medium">
              Certified Refurbished Laptops
            </Link>
            {product.category && (
              <>
                <span className="text-slate-400">/</span>
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-[#2563EB] transition-colors font-medium"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>

          {/* MAIN PRODUCT VIEWPORT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
            {/* LEFT COLUMN: Gallery & Certification (7 cols) */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-3.5 lg:sticky lg:top-24 self-start">
              {/* Main Hero Image in Clean Cream-and-Blue Frame with Hover Zoom & Touch Swipe */}
              <div
                className="relative aspect-[16/10] max-h-[420px] rounded-3xl overflow-hidden bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs flex items-center justify-center p-4 sm:p-6 group cursor-zoom-in select-none"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => setIsLightboxOpen(true)}
              >
                {/* Shimmer skeleton while image loads */}
                {isImgLoading && (
                  <div className="absolute inset-0 bg-[#FAF6EF] animate-pulse flex items-center justify-center z-5">
                    <Loader2 className="w-8 h-8 text-[#2563EB]/40 animate-spin" />
                  </div>
                )}

                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={displayImageSrc}
                    src={displayImageSrc}
                    alt={product.name}
                    onLoad={() => setIsImgLoading(false)}
                    style={
                      isHovered
                        ? {
                            transform: 'scale(1.18)',
                            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                            transition: 'transform 120ms ease-out',
                          }
                        : {
                            transform: 'scale(1)',
                            transition: 'transform 250ms ease-out',
                          }
                    }
                    className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
                      isImgLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                </div>

                {/* Left / Right Navigation Arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImg();
                      }}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center transition-all cursor-pointer z-10 active:scale-95 hover:scale-105"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImg();
                      }}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center transition-all cursor-pointer z-10 active:scale-95 hover:scale-105"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Doorstep Warranty Floater */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-200 shadow-xs flex items-center gap-1.5 text-xs font-bold text-[#0B1F4B] z-10 pointer-events-none">
                  <ShieldCheck size={16} className="text-[#2563EB]" />
                  <span>
                    {warrantyMonths
                      ? `${warrantyMonths}-Month Comprehensive Warranty`
                      : 'Comprehensive Warranty'}
                  </span>
                </div>

                {/* Wishlist Button with Heart Pop Animation */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleWishlist();
                  }}
                  className={`absolute top-4 right-4 p-2.5 rounded-full border transition-all cursor-pointer shadow-xs z-10 active:scale-90 ${
                    isWishlistAnimating ? 'scale-125' : 'scale-100'
                  } ${
                    isWish
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-white/90 hover:bg-white border-slate-200 text-slate-400 hover:text-rose-500'
                  }`}
                  aria-label={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <svg
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isWish ? 'fill-rose-500 text-rose-500' : 'fill-none stroke-current'
                    }`}
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                </button>

                {/* Expand Image Fullscreen Lightbox Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  aria-label="Expand image fullscreen"
                  className="absolute bottom-4 right-4 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-600 hover:text-[#0B1F4B] shadow-xs border border-slate-200 flex items-center justify-center transition-all cursor-pointer z-10 active:scale-95"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Mobile image counter indicator */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-white tracking-wider z-10 pointer-events-none">
                    {galleryImages.findIndex(
                      (img) => img.url === (selectedImage || galleryImages[0]?.url),
                    ) + 1}{' '}
                    / {galleryImages.length}
                  </div>
                )}
              </div>

              {/* Interactive Thumbnail Gallery */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {galleryImages.map((img, idx) => {
                    const isSelected = (selectedImage || galleryImages[0]?.url) === img.url;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectImage(img.url)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 p-1 shrink-0 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#FFFDF9] shadow-md scale-105'
                            : 'border-[#E6DFD5] bg-[#FAF6EF]/60 opacity-75 hover:opacity-100 hover:border-blue-300'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Trust Badges Strip (Under Gallery) */}
              <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="flex flex-col items-center gap-1">
                  <Truck size={15} className="text-[#2563EB]" />
                  <span className="font-bold text-slate-700 leading-tight">
                    Free Air
                    <br />
                    Shipping
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={15} className="text-[#2563EB]" />
                  <span className="font-bold text-slate-700 leading-tight">
                    {warrantyMonths ? `${warrantyMonths}-Month Doorstep` : 'Doorstep'}
                    <br />
                    Warranty
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw size={15} className="text-[#2563EB]" />
                  <span className="font-bold text-slate-700 leading-tight">
                    {returnLabel}
                    <br />
                    Policy
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <FileText size={15} className="text-[#2563EB]" />
                  <span className="font-bold text-slate-700 leading-tight">
                    Tax
                    <br />
                    Invoice
                  </span>
                </div>
              </div>

              {/* 32-Point Quality Checklist Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0B1F4B]">
                        32-Point Quality Inspection — 100% Passed
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Every unit bench-tested, cleaned, and certified
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Grade A+
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Battery Health
                    </span>
                    <span className="font-extrabold text-emerald-700 block truncate">
                      {activeBattery}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Thermals
                    </span>
                    <span className="font-extrabold text-[#0B1F4B] block">Fresh Arctic MX-4</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Display
                    </span>
                    <span className="font-extrabold text-[#0B1F4B] block">Zero Dead Pixels</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                      Warranty
                    </span>
                    <span className="font-extrabold text-[#2563EB] block">
                      {warrantyMonths ? `${warrantyMonths}-Month Doorstep` : 'Doorstep'}
                    </span>
                  </div>
                </div>
              </div>

              {/* What's In The Sealed Box Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#2563EB]" />
                  What&apos;s in the sealed box
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-base sm:text-lg">💻</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block leading-tight">
                        Laptop
                      </span>
                      <span className="text-[9px] text-slate-500">Grade A+</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-base sm:text-lg">⚡</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block leading-tight">
                        OEM Charger
                      </span>
                      <span className="text-[9px] text-slate-500">Original</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-base sm:text-lg">📜</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block leading-tight">
                        Certificate
                      </span>
                      <span className="text-[9px] text-slate-500">32-Point QC</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-base sm:text-lg">🛡️</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block leading-tight">
                        Warranty
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {warrantyMonths ? `${warrantyMonths}-Month Doorstep` : 'Warranty coverage'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Product Header, Buy Box, Pricing & Actions (5 cols) */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-3">
              {/* Product Header (Matching Phone 2) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                    BEST SELLER
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                    CERTIFIED REFURBISHED
                  </span>
                  {product.category && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                      {product.category.name}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 ml-auto">
                    SKU: {selectedVariant?.sku || product.sku}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-[#0B1F4B] tracking-tight leading-snug">
                  {product.name}
                </h1>

                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  Reliable, business-grade laptop for work and productivity.
                </p>

                {/* Rating & Certified Row matching Phone 2 */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                  <span className="font-extrabold text-amber-500 flex items-center gap-1">
                    ★ 4.8
                  </span>
                  <span className="text-slate-500 font-medium">(268 reviews)</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Certified Refurbished
                  </span>
                </div>

                {/* Stock & Dispatch Status Badge */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                  {availableStock > 0 || allowBackorder ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {availableStock > 0
                        ? `In Stock • ${availableStock} units`
                        : 'Available to Backorder'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Temporarily Out of Stock
                    </span>
                  )}
                  <span className="text-slate-300 font-medium">|</span>
                  <span className="text-slate-600 font-semibold flex items-center gap-1 text-[11px]">
                    <Truck size={13} className="text-[#2563EB]" /> Express Dispatch (Delhi Hub)
                  </span>
                </div>
              </div>

              {/* Procurement Model Selector (Buy vs Lease) */}
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1.5 bg-[#FAF6EF] p-1 rounded-xl border border-[#E6DFD5]">
                  <button
                    type="button"
                    aria-pressed={procurementModel === 'buy'}
                    onClick={() => setProcurementModel('buy')}
                    className={`h-8.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      procurementModel === 'buy'
                        ? 'bg-[#FFFDF9] text-[#0B1F4B] shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>Buy Outright</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={procurementModel === 'lease'}
                    onClick={() => setProcurementModel('lease')}
                    className={`h-8.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      procurementModel === 'lease'
                        ? 'bg-[#FFFDF9] text-[#0B1F4B] shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span>Rent / Lease</span>
                  </button>
                </div>
              </div>

              {/* Pricing Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs space-y-2">
                {!isLease ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tabular-nums tracking-tight">
                        ₹{currentUnitPrice?.toLocaleString('en-IN')}
                      </span>
                      {compareNum && currentUnitPrice && compareNum > currentUnitPrice && (
                        <span className="text-sm sm:text-base line-through text-slate-400 font-semibold tabular-nums">
                          ₹{compareNum.toLocaleString('en-IN')}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#EF4444] text-white shadow-2xs">
                          Save {discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {savings > 0 && (
                        <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/70 px-2.5 py-0.5 rounded-lg border border-emerald-300 inline-flex items-center gap-1">
                          <Sparkles size={12} className="text-emerald-700" />
                          <span>Save ₹{savings.toLocaleString('en-IN')} vs launch MRP</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>1,200+ verified NCR buyers</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-blue-200/80 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-700">
                      <div>
                        💳 No-Cost EMI from{' '}
                        <strong className="text-[#0B1F4B] font-bold tabular-nums">
                          ₹{Math.round((currentUnitPrice || priceNum) / 12).toLocaleString('en-IN')}
                          /mo
                        </strong>
                      </div>
                      <div className="text-slate-500 font-semibold">
                        Taxes, if applicable, are calculated at checkout
                      </div>
                    </div>
                  </>
                ) : hasLeasePrice && activeRentalPlan ? (
                  <div className="space-y-2.5">
                    {/* Rate Display */}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tabular-nums tracking-tight">
                        ₹{activeRentalPlan.monthlyPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-slate-500">/ month</span>
                    </div>

                    {/* Interactive Rental Duration Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#0B1F4B]">Rental Tenure:</span>
                        <span className="text-[10px] text-[#2563EB] font-bold">Monthly rental</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {rentalPlans.map((plan) => {
                          const isSelected = selectedRentalTenure === plan.tenureMonths;
                          return (
                            <button
                              key={plan.tenureMonths}
                              type="button"
                              onClick={() => setSelectedRentalTenure(plan.tenureMonths)}
                              className={`relative py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-white border-[#2563EB] ring-2 ring-blue-500/20 shadow-xs'
                                  : 'bg-white/60 border-blue-200/70 hover:bg-white hover:border-blue-300'
                              }`}
                            >
                              <span className="block text-xs font-black text-[#0B1F4B]">
                                {plan.tenureMonths}m
                              </span>
                              <span className="block text-[10px] font-bold text-[#2563EB] tabular-nums">
                                ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rental Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] pt-1.5 border-t border-blue-200">
                      <div className="p-1.5 rounded-lg bg-white/70 border border-blue-100">
                        <span className="text-slate-500 block">Total Commitment</span>
                        <span className="font-extrabold text-[#0B1F4B] tabular-nums">
                          ₹{activeRentalPlan.totalRent.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/70 border border-blue-100">
                        <span className="text-slate-500 block">Refundable Deposit</span>
                        <span className="font-extrabold text-emerald-700">
                          ₹{(activeRentalPlan.securityDeposit ?? 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/70 border border-blue-100">
                        <span className="text-slate-500 block">One-time Delivery</span>
                        <span className="font-extrabold text-[#0B1F4B] tabular-nums">
                          ₹{(activeRentalPlan.deliveryCharge ?? 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-[#0B1F4B]">
                        Custom Corporate Lease
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Quote Required
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tailored based on deployment volume and tenure.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCorporateModalOpen(true)}
                      className="w-full py-2 px-3 bg-[#0B1F4B] hover:bg-[#162D66] text-white text-xs font-extrabold rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Request Rental Quote →
                    </button>
                  </div>
                )}
              </div>

              {/* DYNAMIC VARIANT CONFIGURATION SELECTORS */}
              {activeVariants.length > 0 && (
                <section
                  aria-labelledby="configuration-title"
                  className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal size={15} className="text-[#2563EB]" />
                      <h3
                        id="configuration-title"
                        className="text-xs font-extrabold text-[#0B1F4B]"
                      >
                        Choose Configuration
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {activeVariants.length} tiers
                    </span>
                  </div>

                  {/* Attribute-by-Attribute Interactive Chips */}
                  <div className="space-y-2.5">
                    {variantAttributeKeys.map((attributeKey) => {
                      const distinctValues = Array.from(
                        new Set(
                          activeVariants.flatMap((variant) =>
                            variant.attributes[attributeKey] === undefined
                              ? []
                              : [String(variant.attributes[attributeKey])],
                          ),
                        ),
                      );

                      if (distinctValues.length <= 1) return null;

                      const selectedValue =
                        selectedVariant?.attributes[attributeKey] === undefined
                          ? ''
                          : String(selectedVariant.attributes[attributeKey]);

                      return (
                        <div key={attributeKey} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-slate-800">
                              {formatAttributeLabel(attributeKey)}:
                            </span>
                            <span className="text-[#2563EB] font-bold text-[11px]">
                              {selectedValue}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {distinctValues.map((val) => {
                              const isSelected = selectedValue === val;
                              const matchingVariants = activeVariants.filter(
                                (variant) => String(variant.attributes[attributeKey]) === val,
                              );
                              const hasStock = matchingVariants.some(
                                (variant) => variant.stock > 0 || variant.allowBackorder,
                              );

                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={!hasStock}
                                  onClick={() => chooseVariantForAttribute(attributeKey, val)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-180 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                                    isSelected
                                      ? 'bg-blue-50 border-2 border-[#2563EB] text-[#0B1F4B] ring-2 ring-blue-500/20 shadow-xs'
                                      : !hasStock
                                        ? 'bg-slate-100 border border-slate-200 text-slate-400 line-through cursor-not-allowed opacity-50'
                                        : 'bg-[#FFFDF9] border border-[#E6DFD5] text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'
                                  }`}
                                >
                                  {isSelected && (
                                    <Check size={12} className="text-[#2563EB] stroke-[3]" />
                                  )}
                                  <span>{val}</span>
                                  {!hasStock && (
                                    <span className="text-[9px] text-rose-500">(Sold Out)</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Selected Tier Confirmation Strip */}
                  {selectedVariant && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 text-[11px] text-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-[#0B1F4B] truncate">
                          {selectedVariant.name}
                        </span>
                        <span className="font-mono text-[9px] text-[#2563EB] bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold shrink-0">
                          {selectedVariant.sku}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 text-[10px]">
                        {availableStock > 0
                          ? `${availableStock} in stock`
                          : allowBackorder
                            ? 'Backorder'
                            : 'Sold Out'}
                      </span>
                    </div>
                  )}
                </section>
              )}

              {/* Warranty & Delivery Availability in Compact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Extended Warranty Protection */}
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-extrabold text-[#0B1F4B] flex items-center gap-1">
                      <ShieldCheck size={13} className="text-[#2563EB]" /> Warranty
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      1 Year Free
                    </span>
                  </div>
                  {isLease ? (
                    <span className="text-[10px] text-slate-500">
                      Maintenance terms are confirmed in the rental agreement.
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={hasWarranty}
                        onChange={(e) => setHasWarranty(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#2563EB] focus:ring-[#2563EB] border-slate-300"
                      />
                      <span className="text-[10px] text-slate-700 leading-tight">
                        +2nd Yr Coverage (<strong className="text-[#2563EB]">₹3,499</strong>)
                      </span>
                    </label>
                  )}
                </div>

                {/* Delivery Pincode */}
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-[#0B1F4B] flex items-center gap-1">
                      <Truck size={13} className="text-[#2563EB]" /> Check Pincode
                    </span>
                    {pincodeChecked && (
                      <span className="text-[9px] text-emerald-700 font-bold">
                        2-3 Day Dispatch
                      </span>
                    )}
                  </div>
                  <form onSubmit={handlePincodeCheck} className="flex gap-1.5">
                    <input
                      type="text"
                      aria-label="Delivery pincode"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => {
                        setPincode(e.target.value.replace(/\D/g, ''));
                        setPincodeChecked(false);
                      }}
                      placeholder="6-digit Pincode"
                      className="h-7 w-full px-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="submit"
                      className="h-7 px-2.5 rounded-lg bg-[#0B1F4B] text-white text-[11px] font-extrabold hover:bg-[#162D66] transition-colors cursor-pointer shrink-0"
                    >
                      Check
                    </button>
                  </form>
                </div>
              </div>

              {/* Quantity Selector + CTAs — Action Block */}
              <div className="space-y-2">
                {isLease && !hasLeasePrice ? (
                  <button
                    type="button"
                    onClick={() => setCorporateModalOpen(true)}
                    className="w-full h-10 px-6 rounded-xl text-xs font-extrabold bg-[#0B1F4B] hover:bg-[#162D66] text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Request Rental Terms &amp; Quote →</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Compact Qty */}
                    <div className="flex items-center border border-[#CBD5E1] rounded-xl overflow-hidden bg-white shadow-xs h-10 shrink-0">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-2.5 h-full text-xs font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                        disabled={outOfStock}
                      >
                        -
                      </button>
                      <span
                        aria-live="polite"
                        className="px-2 h-full flex items-center justify-center text-xs font-black min-w-[24px] text-center text-[#0B1F4B] tabular-nums"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(
                            allowBackorder
                              ? quantity + 1
                              : Math.min(availableStock || 1, quantity + 1),
                          )
                        }
                        className="px-2.5 h-full text-xs font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                        disabled={outOfStock || (!allowBackorder && quantity >= availableStock)}
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart with async loading and feedback */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={outOfStock || isAdding}
                      className={`h-10 flex-1 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                        outOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : added
                            ? 'bg-emerald-600 text-white'
                            : isAdding
                              ? 'bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]'
                              : 'bg-white hover:bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]'
                      }`}
                    >
                      {isAdding ? (
                        <Loader2 size={14} className="animate-spin text-[#2563EB]" />
                      ) : added ? (
                        <Check size={14} className="stroke-[3]" />
                      ) : (
                        <ShoppingCart size={14} />
                      )}
                      <span>{isAdding ? 'Adding...' : added ? 'Added!' : 'Add to Cart'}</span>
                    </button>

                    {/* Buy Now */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={outOfStock}
                      className={`h-10 flex-1 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                        outOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white hover:shadow-md'
                      }`}
                    >
                      <span>{isLease ? 'Rent Now' : 'Buy Now'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* WhatsApp Pre-Filled Chat CTA */}
                <a
                  href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20am%20interested%20in%20buying%20${encodeURIComponent(product.name)}%20(SKU:%20${selectedVariant?.sku || product.sku},%20Price:%20₹${priceNum.toLocaleString('en-IN')}).%20Please%20confirm%20availability.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.112.551 4.095 1.517 5.823l-1.611 5.888 6.069-1.591c1.667.91 3.57 1.432 5.597 1.432 6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              {/* Side-by-Side Secondary Commercial Cards (Buyback & Bulk) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* Guaranteed Buyback Card */}
                {buybackPlans.length > 0 && (
                  <button
                    type="button"
                    ref={buybackTriggerRef}
                    onClick={() => setBuybackModalOpen(true)}
                    className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 hover:border-sky-300 transition-all text-left group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#0B1F4B] flex items-center gap-1">
                        <HandCoins size={13} className="text-[#2563EB]" />
                        Buyback Guarantee
                      </span>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-black">
                        Up to {Math.max(...buybackPlans.map((plan) => plan.percentage))}%
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                      Guaranteed upgrade price, no haggling.
                    </p>
                    <span className="mt-1 text-[10px] font-bold text-[#2563EB] flex items-center gap-0.5 group-hover:underline">
                      Check valuation →
                    </span>
                  </button>
                )}

                {/* Wholesale / Bulk Quote Card */}
                <button
                  type="button"
                  onClick={() => setCorporateModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-blue-300 transition-all text-left group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#0B1F4B] flex items-center gap-1">
                      <Laptop size={13} className="text-[#2563EB]" />
                      Bulk Fleet (5+)
                    </span>
                    <span className="text-[9px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      Via Quote
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                    Custom discounts with tax invoices where applicable.
                  </p>
                  <span className="mt-1 text-[10px] font-bold text-[#2563EB] flex items-center gap-0.5 group-hover:underline">
                    Request quote →
                  </span>
                </button>
              </div>

              {/* Key Specifications (Matching Phone 2) */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-black text-[#0B1F4B] uppercase tracking-wider">
                  Key Specifications
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-2xs flex flex-col items-center">
                    <Cpu size={18} className="text-[#2563EB] mb-1" />
                    <span className="text-[11px] font-black text-[#0B1F4B] line-clamp-1 leading-tight">
                      {activeProcessor.split(' ')[0] || 'Intel'}
                    </span>
                    <span className="text-[9px] text-slate-500 line-clamp-1">
                      {activeProcessor.split(' ').slice(1, 3).join(' ') || 'Processor'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-2xs flex flex-col items-center">
                    <MemoryStick size={18} className="text-[#2563EB] mb-1" />
                    <span className="text-[11px] font-black text-[#0B1F4B] line-clamp-1 leading-tight">
                      {activeRam.split(' ')[0] || '16GB'}
                    </span>
                    <span className="text-[9px] text-slate-500 line-clamp-1">
                      {activeRam.split(' ').slice(1).join(' ') || 'RAM'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-2xs flex flex-col items-center">
                    <HardDrive size={18} className="text-[#2563EB] mb-1" />
                    <span className="text-[11px] font-black text-[#0B1F4B] line-clamp-1 leading-tight">
                      {activeStorage.split(' ')[0] || '512GB'}
                    </span>
                    <span className="text-[9px] text-slate-500 line-clamp-1">
                      {activeStorage.split(' ').slice(1).join(' ') || 'SSD'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-2xs flex flex-col items-center">
                    <Monitor size={18} className="text-[#2563EB] mb-1" />
                    <span className="text-[11px] font-black text-[#0B1F4B] line-clamp-1 leading-tight">
                      {activeDisplay.includes('"') ? activeDisplay.split('"')[0] + '"' : '14" FHD'}
                    </span>
                    <span className="text-[9px] text-slate-500 line-clamp-1">
                      IPS Display
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Item Assurance Strip matching Phone 2 */}
              <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] text-[11px] font-bold text-[#0B1F4B] shadow-2xs">
                <div className="flex flex-col items-center justify-center gap-1">
                  <ShieldCheck size={16} className="text-[#2563EB]" />
                  <span className="leading-tight">6-Month Warranty</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  <Truck size={16} className="text-[#2563EB]" />
                  <span className="leading-tight">Pan-India Delivery</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1">
                  <RotateCcw size={16} className="text-[#2563EB]" />
                  <span className="leading-tight">7-Day Return</span>
                </div>
              </div>

              {/* Expandable Accordions with Smooth Animated Transitions */}
              <div className="space-y-2 pt-2">
                {/* Accordion 1: LaptopMitra Assurance */}
                <div className="rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('assurance')}
                    className="w-full p-3 text-left flex items-center justify-between font-bold text-xs text-[#0B1F4B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#2563EB]" />
                      <span>LaptopMitra Assurance</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-250 ease-out transform ${
                        openAccordions.assurance ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      openAccordions.assurance
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-3 pt-0 text-xs text-slate-600 leading-relaxed border-t border-[#E6DFD5]/70 bg-[#FAF6EF]/40 space-y-1.5">
                        <p>• 32-point physical and diagnostic inspection passed.</p>
                        <p>• Doorstep warranty pickup and replacement guarantee.</p>
                        <p>• Dedicated technical support via WhatsApp and phone.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion 2: Product Details */}
                <div className="rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('details')}
                    className="w-full p-3 text-left flex items-center justify-between font-bold text-xs text-[#0B1F4B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} className="text-[#2563EB]" />
                      <span>Product Details</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-250 ease-out transform ${
                        openAccordions.details ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      openAccordions.details
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-3 pt-0 text-xs text-slate-600 leading-relaxed border-t border-[#E6DFD5]/70 bg-[#FAF6EF]/40 space-y-1">
                        <p>
                          {product.description ||
                            'Enterprise-grade corporate laptop certified for business multitasking, heavy spreadsheets, and reliable day-long battery life.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion 3: Specifications */}
                <div className="rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('specs')}
                    className="w-full p-3 text-left flex items-center justify-between font-bold text-xs text-[#0B1F4B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal size={16} className="text-[#2563EB]" />
                      <span>Specifications</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-250 ease-out transform ${
                        openAccordions.specs ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      openAccordions.specs
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-3 pt-0 text-xs text-slate-600 leading-relaxed border-t border-[#E6DFD5]/70 bg-[#FAF6EF]/40 divide-y divide-[#E6DFD5]/70">
                        <div className="py-1 flex justify-between">
                          <span className="font-semibold text-slate-500">Processor:</span>
                          <span className="font-bold text-[#0B1F4B]">{activeProcessor}</span>
                        </div>
                        <div className="py-1 flex justify-between">
                          <span className="font-semibold text-slate-500">RAM:</span>
                          <span className="font-bold text-[#0B1F4B]">{activeRam}</span>
                        </div>
                        <div className="py-1 flex justify-between">
                          <span className="font-semibold text-slate-500">Storage:</span>
                          <span className="font-bold text-[#0B1F4B]">{activeStorage}</span>
                        </div>
                        <div className="py-1 flex justify-between">
                          <span className="font-semibold text-slate-500">Display:</span>
                          <span className="font-bold text-[#0B1F4B]">{activeDisplay}</span>
                        </div>
                        <div className="py-1 flex justify-between">
                          <span className="font-semibold text-slate-500">Battery Health:</span>
                          <span className="font-bold text-emerald-700">{activeBattery}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEDICATED TECHNICAL SPECIFICATIONS SECTION (PHASE 6 REDESIGNED) */}
          <section
            id="technical-specifications"
            aria-labelledby="technical-specifications-title"
            className="mt-12 sm:mt-16 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden"
          >
            <div className="px-6 pt-7 sm:px-8 sm:pt-8 border-b border-[#F1F5F9] pb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block mb-1">
                  Inside this laptop
                </span>
                <h2
                  id="technical-specifications-title"
                  className="text-2xl font-black text-[#0B1F4B] tracking-tight"
                >
                  What&apos;s inside?
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Viewing specs for <strong className="text-slate-800">{product.name}</strong> —{' '}
                  <strong className="text-[#2563EB]">
                    {selectedVariant?.name || 'Base Configuration'}
                  </strong>
                </p>
              </div>

              {selectedVariant && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-blue-50 text-[#0B1F4B] px-3 py-1.5 rounded-xl border border-blue-200">
                    Active SKU: {selectedVariant.sku}
                  </span>
                </div>
              )}
            </div>

            {/* Structured Themed Specification Cards */}
            <div className="p-6 sm:p-8 space-y-8">
              {specificationThemedGroups.map((group) => (
                <div key={group.group} className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    {group.group}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.cards.map((card) => {
                      const Icon = card.Icon;
                      // Parse battery percentage for progress bar
                      const batteryMatch =
                        'isBattery' in card && card.isBattery ? card.value.match(/(\d+)/) : null;
                      const batteryPct = batteryMatch
                        ? Math.min(100, Math.max(0, Number(batteryMatch[1])))
                        : null;
                      return (
                        <div
                          key={card.label}
                          className="flex items-start gap-4 p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/20 transition-all group"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-center text-[#2563EB] shrink-0 group-hover:scale-110 group-hover:bg-blue-50 transition-all">
                            <Icon size={22} strokeWidth={2} />
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">
                              {card.label}
                            </span>
                            <span className="text-sm font-extrabold text-[#0B1F4B] block break-words">
                              {card.value}
                            </span>
                            {batteryPct !== null && (
                              <div className="mt-2 space-y-1">
                                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all ${batteryPct >= 85 ? 'bg-emerald-500' : batteryPct >= 70 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                    style={{ width: `${batteryPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {batteryPct}% of original capacity remaining
                                </span>
                              </div>
                            )}
                            <span className="text-[11px] text-slate-500 block">{card.subtext}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* TABBED REPORTS: Quality Inspection, Box, Warranty, FAQ */}
            <div
              role="tablist"
              aria-label="Product details"
              className="border-t border-[#E2E8F0] bg-[#F8FAFC] flex overflow-x-auto"
            >
              {[
                { id: 'specs', label: 'Detailed Description' },
                { id: 'inspection', label: '32-Point Quality Report' },
                { id: 'box', label: "What's in the Box" },
                { id: 'warranty', label: 'Warranty & Returns' },
                { id: 'faq', label: 'Refurbished FAQ' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`product-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`min-h-12 px-6 py-4 text-xs font-extrabold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#2563EB] text-[#2563EB] bg-white shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT PANEL */}
            <div className="p-6 sm:p-8">
              {activeTab === 'specs' && (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed space-y-4">
                  <p>{product.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 not-prose">
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        Manufacturer
                      </span>
                      <span className="text-sm font-extrabold text-[#0B1F4B]">
                        {(product.metadata as any)?.brand || 'OEM Certified'}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        Authentic Windows / Mac License
                      </span>
                      <span className="text-sm font-extrabold text-[#0B1F4B]">
                        OEM Motherboard Key Activated
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-xs font-bold text-slate-400 block mb-1">
                        Sanitization Standard
                      </span>
                      <span className="text-sm font-extrabold text-[#0B1F4B]">
                        32-Point ISO Cleaned
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inspection' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                      <CheckCircle2 size={18} className="text-emerald-700" />
                      <span>Certified 32-Point Hardware Quality Score: 100/100</span>
                    </div>
                    <span className="font-mono text-emerald-800 font-bold">
                      Inspection ID: QC-LM-{product.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {[
                      {
                        area: 'Motherboard & CPU',
                        test: 'Stress testing for clock stability and VRM thermal headroom',
                        status: 'Passed (No Throttling)',
                      },
                      {
                        area: 'RAM Modules',
                        test: 'MemTest86 4-pass verification for bit error zero-tolerance',
                        status: 'Passed (0 Errors)',
                      },
                      {
                        area: 'SSD Health',
                        test: 'S.M.A.R.T. health test, read/write speed validation',
                        status: 'Passed (100% Healthy)',
                      },
                      {
                        area: 'Battery Endurance',
                        test: 'Full charge/discharge cycle benchmark (>85% original retention)',
                        status: activeBattery,
                      },
                      {
                        area: 'Display Panel',
                        test: 'Dead pixel test, backlight bleed check, ProMotion/refresh sync',
                        status: 'Passed (Flawless)',
                      },
                      {
                        area: 'Keyboard & Trackpad',
                        test: 'All keys tactile test, multi-touch gestures, haptic click',
                        status: 'Passed (100% Functional)',
                      },
                      {
                        area: 'Ports & I/O',
                        test: 'Thunderbolt / USB-C PD charging, HDMI output, audio jack',
                        status: 'Passed (All Ports Active)',
                      },
                      {
                        area: 'Wireless & Audio',
                        test: 'Wi-Fi 6E speed test, Bluetooth latency, stereo mic/speaker check',
                        status: 'Passed (Pristine)',
                      },
                      {
                        area: 'Chassis & Hinges',
                        test: 'Opening resistance, corner drop inspection, zero dent policy',
                        status: activeCondition,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-extrabold">{item.area}</strong>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            PASS
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">{item.test}</p>
                        <span className="text-[11px] font-bold text-[#2563EB] block">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'box' && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#2563EB]" />
                    <span className="font-bold text-[#0B1F4B]">
                      All laptops are sealed in electrostatic anti-shock bubble cushions with
                      tamper-evident security tape.
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <li className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                      <span className="text-2xl">💻</span>
                      <div>
                        <strong className="text-[#0B1F4B] block text-sm">
                          Certified Refurbished Laptop
                        </strong>
                        <span className="text-slate-500">
                          Fully sanitized with genuine OS pre-installed
                        </span>
                      </div>
                    </li>
                    <li className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <strong className="text-[#0B1F4B] block text-sm">
                          Original Power Adapter
                        </strong>
                        <span className="text-slate-500">
                          Authentic manufacturer charger with high-wattage power cable
                        </span>
                      </div>
                    </li>
                    <li className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                      <span className="text-2xl">📜</span>
                      <div>
                        <strong className="text-[#0B1F4B] block text-sm">
                          QC Pass Certificate
                        </strong>
                        <span className="text-slate-500">
                          Physical paper audit certificate with technician signature
                        </span>
                      </div>
                    </li>
                    <li className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <strong className="text-[#0B1F4B] block text-sm">
                          {warrantyMonths
                            ? `${warrantyMonths}-Month Warranty Card`
                            : 'Warranty Card'}
                        </strong>
                        <span className="text-slate-500">
                          Official serial-tagged warranty card with doorstep QR code
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'warranty' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                      <h4 className="font-extrabold text-[#2563EB] text-sm flex items-center gap-1.5">
                        <ShieldCheck size={18} />
                        What is Covered (
                        {warrantyMonths ? `${warrantyMonths} Months` : 'the configured period'}):
                      </h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                        <li>Motherboard, processor, integrated RAM, and SSD hardware.</li>
                        <li>Display panel, power delivery circuitry, and backlight.</li>
                        <li>Keyboard, trackpad, speaker array, and webcam.</li>
                        <li>Original power adapter and charging electronics.</li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                        <RotateCcw size={18} className="text-[#2563EB]" />
                        {supportConfig?.returnWindowDays
                          ? `${supportConfig.returnWindowDays}-Day Free Replacement:`
                          : 'Return and Replacement Policy:'}
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        If your laptop demonstrates a functional discrepancy or fails to meet its
                        performance standards upon arrival, contact support during the applicable
                        return window to request inspection, replacement, or refund.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-2.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-[#0B1F4B] text-sm flex items-center gap-1.5">
                          <HandCoins size={18} className="text-[#2563EB]" />
                          36-Month Assured Buyback Guarantee:
                        </h4>
                        <Link
                          href="/buyback-guarantee"
                          className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                        >
                          <span>View Policy T&amp;C</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Sell your device back to LaptopMitra at any point within 36 months for an
                        assured recovery valuation (
                        {BUYBACK_POLICY.tiers
                          .map((t) => `${t.period}: ${t.percentage}%`)
                          .join(', ')}
                        ).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-3.5 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#0B1F4B] block font-bold text-sm">
                      What cosmetic condition is this laptop in?
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      Every laptop listed under this grade is rated{' '}
                      <strong>{activeCondition}</strong>. There are zero structural dents, no deep
                      scratches, and the display has zero dead pixels or keyboard marks.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#0B1F4B] block font-bold text-sm">
                      How does doorstep warranty service work?
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      If you ever experience a hardware issue, simply contact our support hotline or
                      WhatsApp. A courier will pick up the device from your address, our certified
                      technicians repair or replace the hardware, and return it to you at zero cost.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#0B1F4B] block font-bold text-sm">
                      How are taxes calculated?
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      Any applicable tax is calculated by the server using the current business tax
                      settings and shown in your order total before payment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* QUALITY PROMISE BANNER */}
          <div className="mt-12 sm:mt-16">
            <QualityPromiseSection product={product} />
          </div>

          {/* SIMILAR LAPTOPS SECTION */}
          {similarProducts.length > 0 && (
            <div className="mt-12 sm:mt-16 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0B1F4B] tracking-tight">
                    Similar Certified Laptops
                  </h3>
                  <p className="text-xs text-slate-500">
                    Explore comparable business-class laptops tested and backed by 1-year warranty
                  </p>
                </div>
                <Link
                  href="/products"
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 group"
                >
                  <span>View all laptops</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-reveal">
                {similarProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CORPORATE / BULK QUOTE MODAL */}
      {product && (
        <CorporateQuoteModal
          open={corporateModalOpen}
          onClose={() => setCorporateModalOpen(false)}
          prefill={{
            productId: product.id,
            laptopModel: product.name,
            mode: procurementModel === 'lease' ? 'lease' : 'sell',
            quantity: 5,
          }}
        />
      )}

      {/* BUYBACK ASSURANCE MODAL */}
      {buybackModalOpen && product && selectedBuybackPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') {
              setBuybackModalOpen(false);
              return;
            }
            if (event.key !== 'Tab') return;
            const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), a[href], summary',
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBuybackModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyback-dialog-title"
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="relative border-b border-sky-100 bg-sky-50 px-5 py-5 text-center sm:px-6">
              <button
                type="button"
                onClick={() => setBuybackModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
                aria-label="Close buyback modal"
              >
                ✕
              </button>
              <h3 id="buyback-dialog-title" className="text-lg font-black text-[#0B1F4B]">
                What Will You Get Back?
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                See your guaranteed cash value when you&apos;re ready to upgrade.
              </p>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <section
                aria-labelledby="buyback-summary-label"
                className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 text-center"
              >
                <p
                  id="buyback-summary-label"
                  className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  You&apos;ll receive at least — {selectedBuybackPlan.period}
                </p>
                <p className="mt-1 text-3xl font-black text-[#0B1F4B] tabular-nums">
                  ₹{selectedBuybackPlan.estimatedValue.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Calculated directly against the current variant selling price.
                </p>
              </section>

              <section aria-labelledby="buyback-duration-label" className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label
                    id="buyback-duration-label"
                    htmlFor="buyback-duration"
                    className="text-sm font-bold text-[#0B1F4B]"
                  >
                    Choose Return Tenure
                  </label>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock aria-hidden="true" size={15} className="text-[#2563EB]" />
                    {selectedBuybackPlan.period}
                  </span>
                </div>
                <input
                  id="buyback-duration"
                  type="range"
                  min={0}
                  max={buybackPlans.length - 1}
                  step={1}
                  value={selectedBuybackIndex}
                  aria-valuetext={`${selectedBuybackPlan.period}, ${selectedBuybackPercentage}%`}
                  aria-label="Buyback duration"
                  onChange={(event) => setSelectedBuybackIndex(Number(event.target.value))}
                  className="h-11 w-full cursor-pointer accent-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                />
                <div
                  className="grid grid-cols-6 text-center text-[10px] font-medium text-slate-500"
                  aria-hidden="true"
                >
                  {buybackPlans.map((plan) => (
                    <span key={plan.period} className="px-0.5">
                      {plan.period.split(' ')[0]}m
                    </span>
                  ))}
                </div>
              </section>

              <section
                aria-label="Selected buyback plan"
                className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Selected Plan</p>
                    <p className="mt-1 text-sm font-bold text-[#0B1F4B]">
                      {selectedBuybackPlan.period} from purchase date
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-800">
                    {selectedBuybackPercentage}% Value
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-200 pt-3">
                  <p className="text-xs font-medium text-slate-600">Estimated Buyback Valuation</p>
                  <p className="text-lg font-black tabular-nums text-[#0B1F4B]">
                    ₹{selectedBuybackPlan.estimatedValue.toLocaleString('en-IN')}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {BUYBACK_POLICY.eligibility[0]}
                </p>
              </section>

              <div className="text-center pt-2">
                <Link
                  href="/buyback-guarantee"
                  onClick={() => setBuybackModalOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
                >
                  <span>Read Complete Buyback Policy &amp; Terms</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Responsive Sticky Bottom Purchase Bar (Desktop & Mobile) ─── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E6DFD5] shadow-[0_-4px_24px_rgba(11,31,75,0.08)] transition-all duration-300 transform ${
          showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Product thumbnail + title + active price (Desktop & Mobile) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FAF6EF] border border-[#E6DFD5] overflow-hidden shrink-0 relative">
              <Image
                src={selectedImage || galleryImages[0]?.url || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-contain p-1"
                sizes="44px"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-[#0B1F4B] truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                {product.name}
              </h4>
              <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 text-xs">
                <span className="font-extrabold text-[#2563EB] tabular-nums">
                  ₹{priceNum.toLocaleString('en-IN')}
                </span>
                {compareNum && compareNum > priceNum && (
                  <span className="line-through text-slate-400 text-[10px] sm:text-[11px] tabular-nums hidden sm:inline">
                    ₹{compareNum.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {discountPercent}% OFF
                  </span>
                )}
                <span className="text-slate-300 hidden md:inline">|</span>
                <span className="text-[10px] text-slate-500 font-medium hidden md:inline">
                  {selectedVariant ? selectedVariant.name : `${activeRam} • ${activeStorage}`}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Compact & responsive) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock || isAdding}
              className={`h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                outOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : added
                    ? 'bg-emerald-600 text-white'
                    : isAdding
                      ? 'bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]'
                      : 'bg-[#FFFDF9] hover:bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]'
              }`}
            >
              {isAdding ? (
                <Loader2 size={14} className="animate-spin text-[#2563EB]" />
              ) : added ? (
                <Check size={14} className="stroke-[3]" />
              ) : (
                <ShoppingCart size={14} />
              )}
              <span>{isAdding ? 'Adding...' : added ? 'Added!' : 'Add to Cart'}</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={outOfStock}
              className={`h-10 px-4 sm:px-5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                outOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              }`}
            >
              <Zap size={14} className="fill-current" />
              <span>{isLease ? 'Rent Now' : 'Buy Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Fullscreen Gallery Lightbox Modal ─── */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product Image Gallery Preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowRight') handleNextImg();
            if (e.key === 'ArrowLeft') handlePrevImg();
          }}
          tabIndex={-1}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-2 right-2 p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer z-20"
              aria-label="Close fullscreen gallery"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main Lightbox Image Viewport */}
            <div className="relative w-full aspect-[16/10] max-h-[72vh] flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageSrc}
                alt={product.name}
                className="max-h-[70vh] max-w-full object-contain drop-shadow-2xl rounded-2xl animate-scale-in select-none"
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImg}
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/30 hover:bg-white/50 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImg}
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/30 hover:bg-white/50 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation in Lightbox */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2.5 mt-2 overflow-x-auto py-2 px-4 max-w-full">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectImage(img.url)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-1 bg-white/10 shrink-0 ${
                      (selectedImage || galleryImages[0]?.url) === img.url
                        ? 'border-white ring-2 ring-white/60 scale-105'
                        : 'border-white/30 opacity-60 hover:opacity-100 hover:border-white/70'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
