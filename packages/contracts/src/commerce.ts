export type CommerceItemKind = "product" | "service" | "tournament";
export type CommerceOrderStatus = "creating" | "payment_pending" | "paid" | "cancelled" | "refunded" | "charged_back" | "payment_review";
export type CommerceFulfillmentStatus = "pending_fulfillment" | "ready_for_pickup" | "delivered" | "not_required";

export interface CommerceSellerDto { id: string; slug: string; name: string; }
export interface CommerceItemVariantDto {
  id: string; sku: string; label: string; optionName: string; optionValue: string;
  priceMinor: number | null; stockQuantity: number | null; active: boolean;
}
export interface CommerceItemDetailsDto {
  category?: string; brand?: string; instructor?: string;
  modality?: "presencial" | "online" | "hibrido";
  startsAt?: string; endsAt?: string; location?: string; materials?: string;
  registrationDeadline?: string; divisionId?: string;
}
export interface CommerceItemDto {
  id: string; seller: CommerceSellerDto; slug: string; kind: CommerceItemKind;
  title: string; description: string; imageUrl: string | null; imageUrls: string[];
  sku: string | null; details: CommerceItemDetailsDto; pickupInstructions: string | null;
  currency: "UYU"; priceMinor: number; effectivePriceMinor: number;
  credentialDiscountBps: number; hasCredentialDiscount: boolean; stockQuantity: number | null;
  entitlementMonths: 6 | 12 | null; active: boolean; variants: CommerceItemVariantDto[];
}
export interface CommerceCatalogDto { items: CommerceItemDto[]; hasActiveCredential: boolean; }
export interface CreateCommerceCheckoutDto { items: Array<{ itemId: string; variantId?: string | null; quantity: number }>; idempotencyKey: string; }
export interface CommerceOrderDto {
  id: string; status: CommerceOrderStatus; fulfillmentStatus: CommerceFulfillmentStatus;
  currency: "UYU"; subtotalMinor: number; discountMinor: number; totalMinor: number;
  checkoutUrl: string | null; createdAt: string; seller: CommerceSellerDto;
  buyer?: { name: string; email: string }; pickupInstructions: string | null;
  items: Array<{ itemId: string; title: string; kind: CommerceItemKind; quantity: number; unitPriceMinor: number; unitDiscountMinor: number; entitlementMonths: number | null; variantId: string | null; variantSku: string | null; variantLabel: string | null; }>;
}
export interface CreateCommerceItemDto {
  sellerId: string; tournamentId?: string | null; slug: string; kind: CommerceItemKind;
  title: string; description: string; imageUrl?: string | null; imageUrls?: string[];
  sku?: string | null; details?: CommerceItemDetailsDto; pickupInstructions?: string | null;
  priceMinor: number; credentialDiscountBps?: number; stockQuantity?: number | null;
  entitlementMonths?: 6 | 12 | null; active?: boolean;
  variants?: Array<{ id?: string; sku: string; label: string; optionName: string; optionValue: string; priceMinor?: number | null; stockQuantity?: number | null; active?: boolean }>;
}
export type UpdateCommerceItemDto = Partial<Omit<CreateCommerceItemDto, "sellerId">>;
export interface CreateCommerceSellerDto { slug: string; name: string; kind?: "lufa" | "partner"; }
export interface CreateCommerceRefundRequestDto { amountMinor: number; reason: string; }
export interface CommerceAdminDashboardDto {
  metrics: { paidRevenueMinor: number; paymentPending: number; pendingFulfillment: number; readyForPickup: number; delivered: number; refundRequests: number };
  recentOrders: CommerceOrderDto[]; sellers: CommerceSellerDto[];
}
export interface CommerceOrderFiltersDto { status?: CommerceOrderStatus; fulfillmentStatus?: CommerceFulfillmentStatus; sellerId?: string; from?: string; to?: string; }
