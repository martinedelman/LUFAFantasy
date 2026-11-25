export type CommerceItemKind = "product" | "service" | "tournament";
export type CommerceOrderStatus = "creating" | "payment_pending" | "paid" | "cancelled" | "refunded" | "charged_back" | "payment_review";
export type CommerceFulfillmentStatus = "pending_fulfillment" | "ready_for_pickup" | "delivered" | "not_required";
/** IVA incluido en el precio, en puntos básicos: 22% básico, 10% mínimo o exento. */
export type CommerceVatRateBps = 0 | 1000 | 2200;

export interface CommerceSellerDto { id: string; slug: string; name: string; }
export interface CommerceTournamentOptionDto {
  id: string; name: string; season: string; year: number; modality: string;
  divisions: Array<{ id: string; name: string; category: string }>;
}
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
  entitlementMonths: 6 | 12 | null; active: boolean; vatRateBps: CommerceVatRateBps; variants: CommerceItemVariantDto[];
}
export interface CommerceCatalogDto { items: CommerceItemDto[]; hasActiveCredential: boolean; }
export interface CommerceCheckoutLineDto {
  itemId: string; title: string; kind: CommerceItemKind; quantity: number;
  unitPriceMinor: number; unitDiscountMinor: number; entitlementMonths: number | null;
  variantId: string | null; variantSku: string | null; variantLabel: string | null;
  vatRateBps: CommerceVatRateBps;
}
export interface CreateCommerceCheckoutQuoteDto { items: Array<{ itemId: string; variantId?: string | null; quantity: number }>; }
export interface CommerceCheckoutQuoteDto {
  currency: "UYU"; seller: CommerceSellerDto; subtotalMinor: number; discountMinor: number; totalMinor: number;
  items: CommerceCheckoutLineDto[];
}
export interface CreateCommerceCheckoutDto extends CreateCommerceCheckoutQuoteDto {
  idempotencyKey: string;
}
export interface CommerceOrderDto {
  id: string; status: CommerceOrderStatus; fulfillmentStatus: CommerceFulfillmentStatus;
  currency: "UYU"; subtotalMinor: number; discountMinor: number; totalMinor: number;
  /** Medio usado (p. ej. "MasterCard", "Redpagos") y si fue tarjeta ("card") o no ("not_card"). */
  paymentMethodId: string | null; paymentMethodType: string | null;
  /** Vencimiento de un pago pendiente en redes de cobranza. */
  paymentDueAt: string | null;
  checkoutUrl: string | null; createdAt: string; seller: CommerceSellerDto;
  buyer?: { name: string; email: string }; pickupInstructions: string | null;
  items: CommerceCheckoutLineDto[];
}
export interface CreateCommerceItemDto {
  sellerId: string; tournamentId?: string | null; slug: string; kind: CommerceItemKind;
  title: string; description: string; imageUrl?: string | null; imageUrls?: string[];
  sku?: string | null; details?: CommerceItemDetailsDto; pickupInstructions?: string | null;
  priceMinor: number; credentialDiscountBps?: number; stockQuantity?: number | null;
  entitlementMonths?: 6 | 12 | null; active?: boolean; vatRateBps?: CommerceVatRateBps;
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
