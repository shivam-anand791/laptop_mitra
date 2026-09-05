export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder?: number;
  createdAt?: Date | string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number | string;
  compareAtPrice?: number | string | null;
  sku: string;
  barcode?: string | null;
  stock: number;
  allowBackorder?: boolean;
  status: string;
  metadata?: Record<string, any> | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  quantity: number;
  priceAtAdd: number | string;
  product?: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface WishlistItem {
  id: string;
  wishlistId?: string;
  productId: string;
  product?: Product;
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  referralCode: string;
  referralEarnings?: number | string;
  referralTier?: string;
  referralLinkClickedCount?: number;
  createdAt?: Date | string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number | string;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentId?: string | null;
  subtotal: number | string;
  discountAmount: number | string;
  discountType?: string | null;
  referralCode?: string | null;
  referralDiscount?: number | string;
  finalAmount: number | string;
  shippingAddress?: Record<string, any> | null;
  phone?: string | null;
  email: string;
  notes?: string | null;
  items?: OrderItem[];
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number | string;
  minOrderValue?: number | string | null;
  maxUses?: number | null;
  uses: number;
  maxUsesPerUser?: number | null;
  isActive: boolean;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
}
