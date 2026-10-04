export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
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
  stock: number;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  dealEndsAt?: string | null;
  metadata?: {
    processor?: string;
    ram?: string;
    storage?: string;
    display?: string;
    graphics?: string;
    condition?: string;
    warranty?: string;
    batteryHealth?: string;
    os?: string;
    [key: string]: any;
  } | null;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtAdd: number | string;
  product: Product;
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
  productId: string;
  product: Product;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  referralCode: string;
  referralEarnings?: number | string;
  referralTier?: string;
  referralLinkClickedCount?: number;
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
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string | null;
  paymentId?: string | null;
  subtotal: number | string;
  discountAmount: number | string;
  discountType?: string | null;
  referralCode?: string | null;
  referralDiscount?: number | string;
  finalAmount: number | string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  phone?: string | null;
  email: string;
  createdAt: string;
  items: OrderItem[];
}
