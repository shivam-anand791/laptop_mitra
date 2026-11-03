export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  parent?: Category | null;
  subcategories?: Category[];
  _count?: { products: number };
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

export interface ProductVariantImage {
  id: string;
  variantId: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  compareAtPrice?: number | null;
  leasePriceMonthly?: number | null;
  rentalPlans?: Array<{
    tenureMonths: 1 | 3 | 6 | 12 | 24;
    monthlyPrice: number;
    totalRent: number;
    securityDeposit?: number;
    deliveryCharge?: number;
  }>;
  stock: number;
  allowBackorder?: boolean;
  isActive: boolean;
  isDefault: boolean;
  images?: ProductVariantImage[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  sku: string;
  barcode?: string | null;
  stock: number;
  allowBackorder?: boolean;
  status: string;
  metadata?: Record<string, any> | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  leasePriceMonthly?: number | null;
  rentalPlans?: Array<{
    tenureMonths: 1 | 3 | 6 | 12 | 24;
    monthlyPrice: number;
    totalRent: number;
    securityDeposit?: number;
    deliveryCharge?: number;
  }>;
  bulkSellPrice?: number | null;
  bulkLeasePrice?: number | null;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

export interface ProductFilterParams {
  categoryId?: string;
  search?: string;
  tags?: string[];
  featured?: boolean;
  newArrival?: boolean;
  minPrice?: number;
  maxPrice?: number;
  stockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductFilterFacets {
  brands: string[];
  processors: string[];
  ramOptions: string[];
  storageOptions: string[];
  grades: string[];
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
  counts: {
    brands: Record<string, number>;
    processors: Record<string, number>;
    ram: Record<string, number>;
    storage: Record<string, number>;
    grades: Record<string, number>;
  };
  totalCount: number;
}

export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
  priceAtAdd: number;
  purchaseMode?: 'sell' | 'lease';
  configuration?: 'default' | 'ram-16gb' | string;
  hasWarranty?: boolean;
  warrantyPrice?: number;
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
  email: string | null;
  role: string;
  status: string;
  isGuest?: boolean;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  dob?: string | null;
  referralCode: string;
  referralEarnings?: number;
  referralReserved?: number;
  referralWithdrawn?: number;
  referralTier?: string;
  referralLinkClickedCount?: number;
  createdAt?: Date | string;
}

export interface Address {
  id: string;
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  label?: 'Home' | 'Work' | 'Other' | string | null;
  gstin?: string | null;
  isDefault: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateAddressDto {
  fullName?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  label?: string;
  gstin?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  variantSku?: string | null;
  variantName?: string | null;
  variantAttributes?: Record<string, string | number | boolean> | null;
  quantity: number;
  price: number;
  purchaseMode?: 'sell' | 'lease';
  tenureMonths?: 1 | 3 | 6 | 12 | 24 | null;
  configuration?: 'default' | 'ram-16gb' | string;
  hasWarranty?: boolean;
  warrantyPrice?: number;
  product?: Product;
  warrantyStatus?: string | null;
  warrantyValidUntil?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
  paymentMethod?: string | null;
  paymentId?: string | null;
  subtotal: number;
  discountAmount: number;
  discountType?: string | null;
  referralCode?: string | null;
  referralDiscount?: number;
  finalAmount: number;
  taxRate?: number;
  taxAmount?: number;
  taxInclusive?: boolean;
  pricingSnapshot?: Record<string, unknown> | null;
  rentalSubscription?: {
    id: string;
    tenureMonths: 1 | 3 | 6 | 12 | 24;
    monthlyAmount: number;
    totalCommitment: number;
    taxRate: number;
    taxAmount: number;
    taxInclusive: boolean;
    razorpaySubscriptionId?: string | null;
    mandateStatus: string;
    status: string;
    nextChargeAt?: Date | string | null;
    terminationRequestedAt?: Date | string | null;
    cancelledAt?: Date | string | null;
    payments?: Array<{
      id: string;
      amount: number;
      status: string;
      cycleNumber?: number | null;
      createdAt: Date | string;
    }>;
  } | null;
  shippingAddress?: Record<string, any> | null;
  phone?: string | null;
  email: string;
  notes?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  returnStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | string;
  returnReason?: string | null;
  deliveries?: any[];
  items?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  sender: 'USER' | 'SUPPORT' | 'SYSTEM';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  subject: string;
  category: 'WARRANTY' | 'ORDER' | 'PAYMENT' | 'GENERAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  emailOrderUpdates: boolean;
  emailPromotions: boolean;
  smsOrderUpdates: boolean;
  smsDeliveryTracking: boolean;
  pushNewArrivals: boolean;
  pushPriceDrops: boolean;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber?: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  refundStatus?: 'NONE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  refundAmount?: number;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  uses: number;
  maxUsesPerUser?: number | null;
  isActive: boolean;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
}

export interface CorporateInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  laptopModel?: string | null;
  productId?: string | null;
  mode: 'sell' | 'lease';
  quantity: number;
  city: string;
  expectedTenure?: string | null;
  notes?: string | null;
  status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED';
  source: 'web' | 'mobile';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCorporateInquiryDto {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  laptopModel?: string;
  productId?: string;
  mode?: 'sell' | 'lease';
  quantity?: number;
  city: string;
  expectedTenure?: string;
  notes?: string;
  source?: 'web' | 'mobile';
}

export interface AffiliatePaymentDetails {
  id: string;
  userId: string;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumberMasked?: string | null;
  ifscCode?: string | null;
  upiIdMasked?: string | null;
  qrCodeKey?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentMethodSnapshot: string;
  adminNotes?: string | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}


// ---------------------------------------------------------------------------
// Situation-Aware "Need Help" Engine Types
// ---------------------------------------------------------------------------

export type ItemSituationKey =
  | 'OUTRIGHT_BEFORE_DISPATCH'
  | 'OUTRIGHT_IN_TRANSIT'
  | 'OUTRIGHT_DELIVERED_RETURN_WINDOW'
  | 'OUTRIGHT_DELIVERED_IN_WARRANTY'
  | 'OUTRIGHT_DELIVERED_BUYBACK_ELIGIBLE'
  | 'OUTRIGHT_DELIVERED_OUT_OF_WARRANTY'
  | 'OUTRIGHT_RETURN_ACTIVE'
  | 'OUTRIGHT_BUYBACK_ACTIVE'
  | 'LEASE_PENDING_DISPATCH'
  | 'LEASE_ACTIVE'
  | 'ORDER_CANCELLED'
  | 'GENERAL_HELP';

export type ActionCategory =
  | 'RETURN'
  | 'WARRANTY'
  | 'BUYBACK'
  | 'ORDER_CHANGE'
  | 'LEASE'
  | 'INVOICE'
  | 'SUPPORT'
  | 'GENERAL'
  | 'CORPORATE';

export type ActionType = 'SELF_SERVE' | 'REQUEST_FORM' | 'TICKET' | 'MODAL' | 'LINK';

export const ACTION_HANDLERS_WEB = [
  'CANCEL_ORDER',
  'REQUEST_ADDRESS_CHANGE',
  'REQUEST_PHONE_CHANGE',
  'REQUEST_RETURN',
  'CLAIM_WARRANTY',
  'REQUEST_BUYBACK',
  'DOWNLOAD_INVOICE',
  'TRACK_SHIPMENT',
  'REQUEST_CALLBACK',
  'CREATE_TICKET',
  'LEASE_BUYOUT',
  'LEASE_MAINTENANCE',
  'CORP_GST_CORRECTION',
  'CORP_ADD_UNITS',
  'CORP_ACCOUNT_MANAGER_CALLBACK',
] as const;

export const ACTION_HANDLERS_MOBILE = [
  'CANCEL_ORDER',
  'REQUEST_ADDRESS_CHANGE',
  'REQUEST_PHONE_CHANGE',
  'REQUEST_RETURN',
  'CLAIM_WARRANTY',
  'REQUEST_BUYBACK',
  'REQUEST_CALLBACK',
  'CREATE_TICKET',
] as const;

export function isActionImplemented(actionId: string, platform: 'web' | 'mobile' = 'web'): boolean {
  if (platform === 'mobile') {
    return (ACTION_HANDLERS_MOBILE as readonly string[]).includes(actionId);
  }
  return (ACTION_HANDLERS_WEB as readonly string[]).includes(actionId);
}

export interface ItemAction {
  id: string;
  label: string;
  category: ActionCategory;
  enabled: boolean;
  disabledReason?: string;
  actionType: ActionType;
  targetUrl?: string;
}

export interface SituationResponse {
  orderItemId: string;
  itemStatus?: string;
  orderId: string;
  orderNumber: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  purchaseMode: 'sell' | 'lease';
  situation: ItemSituationKey;
  situationTitle: string;
  situationDescription: string;
  actions: ItemAction[];
  delivery: {
    status: string;
    deliveredAt?: string | null;
    daysSinceDelivery?: number | null;
  } | null;
  warranty: {
    hasWarranty: boolean;
    warrantyDays: number;
    warrantyExpiresAt?: string | null;
    isInWarranty: boolean;
  };
  buyback: {
    isEligible: boolean;
    deviceAgeMonths?: number | null;
    tierPercentage?: number | null;
    estimatedPayout?: number | null;
    convenienceCharge?: number;
    ineligibilityReason?: string | null;
    activeRequest?: {
      id: string;
      requestNumber: string;
      status: string;
      initialQuotedAmount: number;
      revisedQuotedAmount?: number | null;
      finalPayoutAmount?: number | null;
    } | null;
  } | null;
  returnState: {
    hasActiveReturn: boolean;
    returnRequest?: {
      id: string;
      returnNumber: string;
      status: string;
      type: string;
    } | null;
  };
  businessProfile: {
    isBusinessAccount: boolean;
    companyName?: string | null;
    priorityEnabled: boolean;
  } | null;
  invoice: {
    canDownload: boolean;
    ineligibilityReason?: string | null;
  };
  leaseContract?: {
    id: string;
    contractNumber: string;
    status: string;
    tenureMonths: number;
    monthlyAmount: number;
    buyoutQuoteAmount?: number | null;
    buyoutQuoteExpiresAt?: string | null;
    buyoutStatus?: string | null;
    startDate?: string;
    endDate?: string;
    installments?: Array<{
      id: string;
      installmentNumber: number;
      dueDate: string;
      amount: number;
      status: string;
      paidAt?: string | null;
    }>;
  } | null;
}
