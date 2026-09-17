export type CommerceItemKind = "product" | "service" | "tournament";
export type CommerceOrderStatus = "creating" | "payment_pending" | "paid" | "cancelled" | "refunded" | "charged_back" | "payment_review";

export interface CommerceSellerDto {
  id: string;
  slug: string;
  name: string;
}

export interface CommerceItemDto {
  id: string;
  seller: CommerceSellerDto;
  slug: string;
  kind: CommerceItemKind;
  title: string;
  description: string;
  imageUrl: string | null;
  currency: "UYU";
  priceMinor: number;
  effectivePriceMinor: number;
  credentialDiscountBps: number;
  hasCredentialDiscount: boolean;
  stockQuantity: number | null;
  entitlementMonths: 6 | 12 | null;
  active: boolean;
}

export interface CommerceCatalogDto {
  items: CommerceItemDto[];
  hasActiveCredential: boolean;
}

export interface CreateCommerceCheckoutDto {
  items: Array<{ itemId: string; quantity: number }>;
  idempotencyKey: string;
}

export interface CommerceOrderDto {
  id: string;
  status: CommerceOrderStatus;
  fulfillmentStatus: string;
  currency: "UYU";
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  checkoutUrl: string | null;
  createdAt: string;
  items: Array<{
    itemId: string;
    title: string;
    kind: CommerceItemKind;
    quantity: number;
    unitPriceMinor: number;
    unitDiscountMinor: number;
  }>;
}

export interface CreateCommerceItemDto {
  sellerId: string;
  tournamentId?: string | null;
  slug: string;
  kind: CommerceItemKind;
  title: string;
  description: string;
  imageUrl?: string | null;
  priceMinor: number;
  credentialDiscountBps?: number;
  stockQuantity?: number | null;
  entitlementMonths?: 6 | 12 | null;
  active?: boolean;
}

export type UpdateCommerceItemDto = Partial<Omit<CreateCommerceItemDto, "sellerId">>;

export interface CreateCommerceSellerDto {
  slug: string;
  name: string;
  kind?: "lufa" | "partner";
}

export interface CreateCommerceRefundRequestDto {
  amountMinor: number;
  reason: string;
}
