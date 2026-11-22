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
  rentalPlans?: RentalPlan[];
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
  rentalPlans?: RentalPlan[];
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

export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
  priceAtAdd: number;
  purchaseMode?: 'sell' | 'lease';
  tenureMonths?: RentalTenureMonths | null;
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
  tenureMonths?: RentalTenureMonths | null;
  configuration?: 'default' | 'ram-16gb' | string;
  hasWarranty?: boolean;
  warrantyPrice?: number;
  product?: Product;
  warrantyStatus?: string | null;
  warrantyValidUntil?: string | null;
  status?: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  refundAmount?: number | null;
  refundStatus?: string | null;
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_ROLES = ['CUSTOMER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'TECHNICIAN', 'GUEST'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORDER_TRANSITION_MAP: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAnalyticsResponse {
  range: '7d' | '30d' | '90d';
  revenueByDay: Array<{ date: string; amount: number }>;
  ordersByDay: Array<{ date: string; count: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ id: string; name: string; units: number; revenue: number }>;
  newUsersByDay: Array<{ date: string; count: number }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalNewUsers: number;
  };
  revenue?: {
    daily: Array<{ date: string; amount: number }>;
    total: number;
    growth: number;
  };
  orders?: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
  };
  users?: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  products?: {
    total: number;
    lowStock: number;
    bestSellers: Array<{ name: string; sales: number }>;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  revenueCompleted: number;
  revenuePending: number;
  lowStockProducts: number;
  ordersToday: number;
  revenue: {
    completed: number;
    pending: number;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus | string;
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
  rentalSubscription?: RentalSubscriptionSummary | null;
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

export interface OrderCounts {
  ALL: number;
  IN_PROGRESS: number;
  DELIVERED: number;
  CANCELLED: number;
  RETURNS: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  counts?: OrderCounts;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus | string;
  courierName?: string;
  trackingNumber?: string;
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

export interface CreateOrderPayload {
  referralCode?: string;
  discountCode?: string;
  shippingAddress?: any;
  phone?: string;
  notes?: string;
  email?: string;
  paymentMethod?: 'razorpay' | 'cod' | string;
  idempotencyKey?: string;
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

export type CouponType = 'percentage' | 'fixed' | 'free_shipping' | 'free_warranty';
export type CouponStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED' | 'ARCHIVED';
export type CouponVisibility = 'PUBLIC' | 'PRIVATE' | 'TARGETED';

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  title?: string | null;
  description?: string | null;
  internalNote?: string | null;
  type: CouponType | string;
  value: number;
  maxDiscountCap?: number | null;
  maxDiscountValue?: number | null;
  minOrderValue?: number | null;
  maxOrderValue?: number | null;
  maxUses?: number | null;
  uses: number;
  maxUsesPerUser?: number | null;
  dailyLimit?: number | null;
  dailyUses?: number;
  appliesTo?: 'ALL' | 'PRODUCT' | 'CATEGORY' | 'BRAND' | string;
  appliesToIds?: string | null;
  excludedProductIds?: string | null;
  excludedCategoryIds?: string | null;
  allowRentLease?: boolean;
  excludeWarranty?: boolean;
  allowedPaymentMethods?: 'ANY' | 'ONLINE_ONLY' | 'COD_ONLY' | 'PREPAID' | string;
  firstOrderOnly?: boolean;
  targetedUserIds?: string | null;
  targetPincodes?: string | null;
  minQuantity?: number | null;
  canCombineWithReferral?: boolean;
  status: CouponStatus | string;
  visibility: CouponVisibility | string;
  badgeText?: string | null;
  terms?: string | null;
  highlight?: boolean;
  isActive: boolean;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  _count?: {
    redemptions?: number;
  };
}

export interface CouponRedemption {
  id: string;
  discountCodeId: string;
  userId: string;
  orderId: string;
  status: 'REDEEMED' | 'RESTORED';
  discountType: string;
  discountValue: number;
  discountAmount: number | string;
  orderSubtotal: number | string;
  allocatedLines?: any;
  restoredAt?: string | null;
  restorationReason?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    finalAmount: number;
  };
}

export interface AdminSettings {
  storeName: string;
  supportEmail: string;
  contactPhone: string;
  storeAddress: string;
  lowStockThreshold: number;
  freeShippingThreshold: number;
  standardDeliveryDays: string;
  expressDeliveryDays: string;
  gstEnabled: boolean;
  gstRate: number;
  gstAppliesToPurchases: boolean;
  gstAppliesToRentals: boolean;
  gstPriceInclusive: boolean;
}

export type UpdateAdminSettingsDto = Partial<AdminSettings>;

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
  laptopModel?: string | undefined;
  productId?: string | undefined;
  mode?: 'sell' | 'lease' | undefined;
  quantity?: number | undefined;
  city: string;
  expectedTenure?: string | undefined;
  notes?: string | undefined;
  source?: 'web' | 'mobile' | undefined;
  website?: string | undefined;
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

export interface SavePayoutDetailsDto {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface MaskedPayoutDetails {
  configured: boolean;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumberMasked?: string | null;
  ifscCodeMasked?: string | null;
  upiIdMasked?: string | null;
  hasQrCode: boolean;
  updatedAt?: Date | string | null;
}

export interface WithdrawRequestDto {
  amount: number;
}

export interface AffiliateSummary {
  id: string;
  name?: string | null;
  email?: string | null;
  referralCode: string;
  referralTier: string;
  referralEarnings: number;
  referralReserved: number;
  referralWithdrawn: number;
  availableBalance: number;
  clicksCount: number;
  pendingWithdrawalsCount: number;
  totalWithdrawalsCount: number;
  createdAt: Date | string;
}

export interface AffiliateDetailResponse {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  role: string;
  referralCode: string;
  referralTier: string;
  referralEarnings: number;
  referralReserved: number;
  referralWithdrawn: number;
  availableBalance: number;
  referralLinkClickedCount: number;
  payoutDetails?: MaskedPayoutDetails | null;
  ledger: Array<{
    id: string;
    amount: number;
    status: string;
    adminNotes?: string | null;
    processedAt?: Date | string | null;
    createdAt: Date | string;
  }>;
  createdAt: Date | string;
}

export * from './legal-content';

// ==========================================
// Support & Help Center Types
// ==========================================

export const TICKET_STATUSES = [
  'OPEN',
  'PENDING_CUSTOMER',
  'PENDING_STAFF',
  'WAITING_PARTS',
  'SCHEDULED_CALLBACK',
  'RESOLVED',
  'CLOSED',
  'MERGED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'ORDER_INQUIRY',
  'PAYMENT_ISSUE',
  'HARDWARE_DEFECT',
  'SOFTWARE_ISSUE',
  'BATTERY_ISSUE',
  'RETURN_REFUND',
  'WARRANTY_CLAIM',
  'GENERAL_INQUIRY',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number] | string;

export const TICKET_EVENT_TYPES = [
  'CREATED',
  'MESSAGE',
  'AUTO_CLOSE',
  'CATEGORY_CHANGE',
  'ATTACHMENT',
  'RETURN_LINKED',
  'FIRST_RESPONSE',
  'STATUS_CHANGE',
  'ASSIGNED',
  'PRIORITY_CHANGE',
  'NOTE_ADDED',
  'ESCALATED',
  'REOPENED',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  orderId?: string | null;
  orderItemId?: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  firstResponseDueAt?: Date | string | null;
  resolutionDueAt?: Date | string | null;
  firstResponseAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  closedAt?: Date | string | null;
  slaBreached: boolean;
  slaBreachReason?: string | null;
  assigneeId?: string | null;
  mergedIntoId?: string | null;
  customerLastReadAt?: Date | string | null;
  staffLastReadAt?: Date | string | null;
  hasUnread?: boolean;
  csatScore?: number | null;
  csatComment?: string | null;
  callbackSlot?: Date | string | null;
  user?: Partial<User>;
  order?: Partial<Order> | null;
  rating?: { score: number; comment?: string } | null;
  assignee?: Partial<User> | null;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
  events?: TicketEvent[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  isStaff: boolean;
  isInternal: boolean;
  body: string;
  sender?: 'USER' | 'SUPPORT' | 'SYSTEM';
  senderRole?: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  message?: string;
  metadata?: Record<string, any> | null;
  author?: Partial<User>;
  attachments?: TicketAttachment[];
  createdAt: Date | string;
}

export type SupportTicketMessage = TicketMessage;

export interface TicketAttachment {
  id: string;
  ticketId: string;
  messageId?: string | null;
  uploadedBy: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  confirmed: boolean;
  downloadUrl?: string;
  createdAt: Date | string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorUserId?: string | null;
  eventType: TicketEventType;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any> | null;
  actor?: Partial<User> | null;
  createdAt: Date | string;
}

export interface CreateTicketDto {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  orderId?: string;
  orderItemId?: string;
  message: string;
  issueType?: string;
  callbackPhone?: string;
  callbackSlot?: string;
  attachments?: string[];
}

export interface AddTicketMessageDto {
  body?: string;
  content?: string;
  message?: string;
  isInternal?: boolean;
  attachmentIds?: string[];
  attachments?: string[];
}

export interface UpdateTicketDto {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigneeId?: string | null;
  mergedIntoId?: string;
  csatScore?: number;
  csatComment?: string;
}

// Returns & Refunds
export const RETURN_TYPES = ['REFUND', 'REPLACEMENT'] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

export const RETURN_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'INSPECTION_PASSED',
  'INSPECTION_FAILED',
  'REFUNDED',
  'REPLACED',
  'CANCELLED',
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
  reason?: string | null;
  condition?: string | null;
  restocked: boolean;
  orderItem?: Partial<OrderItem>;
  createdAt: Date | string;
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  userId: string;
  ticketId?: string | null;
  type: ReturnType;
  reason: string;
  status: ReturnStatus;
  refundAmount?: number | null;
  hasRefundDetails?: boolean;
  refundDetailsUpdatedAt?: Date | string | null;
  pickupTrackingNumber?: string | null;
  pickupAwb?: string | null;
  pickupCourier?: string | null;
  refundStatus?: string | null;
  refundUtr?: string | null;
  refundMethod?: string | null;
  upiId?: string | null;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
  } | null;
  adminNotes?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  processedBy?: string | null;
  processedAt?: Date | string | null;
  user?: Partial<User>;
  order?: Partial<Order>;
  items: ReturnItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateReturnRequestDto {
  orderId: string;
  ticketId?: string;
  type?: ReturnType;
  reason: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason?: string;
  }>;
  refundDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
  };
}

export interface ProcessReturnDto {
  status: ReturnStatus;
  adminNotes?: string;
  pickupTrackingNumber?: string;
  refundAmount?: number;
}

// Help Center & Knowledge Base
export interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  name?: string;
  icon?: string | null;
  order: number;
  isActive: boolean;
  articles?: HelpArticle[];
  _count?: { articles: number };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface HelpArticle {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  content: string;
  summary?: string | null;
  order: number;
  isPublished: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  locale: string;
  category?: HelpCategory;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SavedReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SupportSettings {
  id: string;
  autoCloseDays: number;
  firstResponseSlaMinutes: number;
  resolutionSlaMinutes: number;
  urgentFirstResponseSlaMinutes: number;
  supportHoursText: string;
  standardWarrantyDays: number;
  returnWindowDays: number;
  updatedAt: Date | string;
}

// ---------------------------------------------------------------------------
// Rental / Lease Duration & Pricing Structure
// ---------------------------------------------------------------------------

export type RentalTenureMonths = 1 | 3 | 6 | 12 | 24;

export interface RentalPlan {
  tenureMonths: RentalTenureMonths;
  monthlyPrice: number;
  totalRent: number;
  securityDeposit?: number;
  deliveryCharge?: number;
  percentage: number;
  approvedAt: Date | string;
}

export interface TaxPolicy {
  enabled: boolean;
  rate: number;
  appliesToPurchases: boolean;
  appliesToRentals: boolean;
  priceInclusive: boolean;
}

export interface RentalSubscriptionSummary {
  id: string;
  orderId: string;
  tenureMonths: RentalTenureMonths;
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
    razorpayPaymentId: string;
    amount: number;
    status: string;
    taxRate: number;
    taxAmount: number;
    taxInclusive: boolean;
    cycleNumber?: number | null;
    createdAt: Date | string;
  }>;
}

export interface PincodeVerificationResult {
  valid: boolean;
  pincode: string;
  city?: string;
  district?: string;
  state?: string;
  postOffice?: string;
  serviceable: boolean;
  isDelhiNcr: boolean;
  codAvailable: boolean;
  message: string;
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
  | 'SERVICE'
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
  'BOOK_FREE_SERVICE',
  'TRACK_SERVICE_JOB',
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
  'BOOK_FREE_SERVICE',
  'TRACK_SERVICE_JOB',
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

export const PHP_BUYBACK_TIERS = [
  { fromMonths: 0, toMonths: 6, percentage: 70 },
  { fromMonths: 6, toMonths: 12, percentage: 60 },
  { fromMonths: 12, toMonths: 18, percentage: 50 },
  { fromMonths: 18, toMonths: 24, percentage: 40 },
  { fromMonths: 24, toMonths: 30, percentage: 30 },
  { fromMonths: 30, toMonths: 36, percentage: 20 },
] as const;

export interface WarrantyCoverageDto {
  id: string;
  soldUnitId: string;
  source: 'BASE' | 'EXTENDED';
  monthsSnapshot: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'VOIDED';
  createdAt: string;
  updatedAt: string;
}

export interface SerialHistoryDto {
  id: string;
  soldUnitId: string;
  previousSerial?: string | null;
  newSerial: string;
  changedBy: string;
  changerName?: string | null;
  reason: string;
  createdAt: string;
}

export interface SoldUnitDto {
  id: string;
  orderItemId: string;
  productId: string;
  userId: string;
  unitIndex: number;
  serialNumber?: string | null;
  brandSnapshot: string;
  modelSnapshot: string;
  status: string;
  isDispatched: boolean;
  dispatchedAt?: string | null;
  dispatchedBy?: string | null;
  overrideReason?: string | null;
  createdAt: string;
  updatedAt: string;
  warrantyCoverage?: WarrantyCoverageDto | null;
  user?: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  product?: { id: string; name: string; slug: string; images?: any[] };
  orderItem?: { id: string; orderId: string; price: number; quantity: number };
  serialHistory?: SerialHistoryDto[];
}

