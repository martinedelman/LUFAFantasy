import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  CommerceCatalogDto,
  CommerceCheckoutQuoteDto,
  CommerceAdminDashboardDto,
  CommerceFulfillmentStatus,
  CommerceItemDto,
  CommerceOrderFiltersDto,
  CommerceOrderDto,
  CommerceVatRateBps,
  CommerceTournamentOptionDto,
  CreateCommerceCheckoutQuoteDto,
  CreateCommerceCheckoutDto,
  CreateCommerceItemDto,
  CreateCommerceRefundRequestDto,
  CreateCommerceSellerDto,
  UpdateCommerceItemDto,
} from "@lufa/contracts";

export interface CommerceActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ReservedOrder extends CommerceOrderDto {
  buyerEmail: string;
  idempotencyKey: string;
  /** GUID enviado al proveedor como identificador externo de la transacción. */
  providerOrderId: string | null;
  invoiceNumber: number;
  /** Imagen representativa de la compra para la pantalla de pago. */
  imageUrl: string | null;
  payloadFingerprint: string;
}

/** Tasas de IVA admitidas por ítem, en puntos básicos. */
export const COMMERCE_VAT_RATES = [0, 1000, 2200] as const satisfies readonly CommerceVatRateBps[];

/** Parte gravada (sin IVA) de un monto con IVA incluido. Las ventas exentas informan 0. */
export function taxedMinor(amountMinor: number, vatRateBps: number) {
  if (!vatRateBps) return 0;
  return Math.round(amountMinor * 10_000 / (10_000 + vatRateBps));
}

export interface CreateProviderPaymentInput {
  transactionId: string;
  invoiceNumber: number;
  totalMinor: number;
  taxedMinor: number;
  items: Array<{ title: string; quantity: number; unitAmountMinor: number; unitTaxedMinor: number }>;
  imageUrl: string | null;
  siteUrl: string;
  callbackUrl: string;
}

export type ProviderPaymentStatus = "started" | "paid" | "failed" | "pending";

export interface ProviderPaymentUpdate {
  transactionId: string;
  status: ProviderPaymentStatus;
  /** Estado crudo del proveedor, para auditoría. */
  providerStatus: string;
  currency: string;
  totalMinor: number;
  occurredAt: Date | null;
  paymentMethodId: string | null;
  paymentMethodType: "card" | "not_card" | null;
  /** Vencimiento de un pago pendiente (p. ej. Redpagos). */
  paymentDueAt: Date | null;
}

export type ProviderNotification =
  | { kind: "payment"; deliveryId: string; update: ProviderPaymentUpdate }
  | { kind: "refund"; deliveryId: string; transactionId: string; success: boolean; message: string };

export interface PaymentProvider {
  createPayment(input: CreateProviderPaymentInput): Promise<{ checkoutUrl: string }>;
  refundPayment(input: { transactionId: string; callbackUrl: string }): Promise<{ message: string }>;
  /** Valida la forma del cuerpo recibido en el callback. No autentica: eso lo hace el token de la URL. */
  parseNotification(body: unknown): ProviderNotification;
}

export interface CommerceRepository {
  listCatalog(userId?: string): Promise<CommerceCatalogDto>;
  quoteCheckout(input: { buyer: CommerceActor; request: CreateCommerceCheckoutQuoteDto }): Promise<CommerceCheckoutQuoteDto>;
  reserveOrder(input: { buyer: CommerceActor; request: CreateCommerceCheckoutDto; fingerprint: string; liveMode: boolean; reservationMinutes: number }): Promise<ReservedOrder>;
  attachCheckoutUrl(orderId: string, checkoutUrl: string): Promise<CommerceOrderDto>;
  cancelCreation(orderId: string, reason: string): Promise<void>;
  getOrderForBuyer(orderId: string, buyerId: string): Promise<CommerceOrderDto | null>;
  listBuyerOrders(buyerId: string): Promise<CommerceOrderDto[]>;
  getOrderForPayment(orderId: string): Promise<ReservedOrder | null>;
  applyPaymentUpdate(orderId: string, update: ProviderPaymentUpdate): Promise<CommerceOrderDto>;
  applyRefundResult(orderId: string, result: { success: boolean; message: string }): Promise<void>;
  recordWebhook(input: { deliveryKey: string; providerResourceId: string; action: string; liveMode: boolean }): Promise<{ id: string; alreadyProcessed: boolean }>;
  completeWebhook(id: string, error?: string): Promise<void>;
  listExpiredReservations(limit: number): Promise<Array<{ id: string }>>;
  expireOrder(orderId: string): Promise<void>;
  listSellerItems(actor: CommerceActor): Promise<CommerceItemDto[]>;
  listActorSellers(actor: CommerceActor): Promise<Array<{ id: string; slug: string; name: string }>>;
  listTournamentOptions(actor: CommerceActor): Promise<CommerceTournamentOptionDto[]>;
  createItem(actor: CommerceActor, input: CreateCommerceItemDto): Promise<CommerceItemDto>;
  updateItem(actor: CommerceActor, itemId: string, input: UpdateCommerceItemDto): Promise<CommerceItemDto>;
  createSeller(actor: CommerceActor, input: CreateCommerceSellerDto): Promise<{ id: string; slug: string; name: string }>;
  addSellerMember(actor: CommerceActor, sellerId: string, userId: string): Promise<void>;
  listSellerOrders(actor: CommerceActor): Promise<CommerceOrderDto[]>;
  listAdminDashboard(actor: CommerceActor): Promise<CommerceAdminDashboardDto>;
  listAdminOrders(actor: CommerceActor, filters: CommerceOrderFiltersDto): Promise<CommerceOrderDto[]>;
  updateFulfillment(actor: CommerceActor, orderId: string, status: CommerceFulfillmentStatus): Promise<CommerceOrderDto>;
  listCommerceSellers(actor: CommerceActor): Promise<Array<{ id: string; slug: string; name: string; status: string; kind: string }>>;
  updateSellerStatus(actor: CommerceActor, sellerId: string, status: "active" | "inactive"): Promise<{ id: string; slug: string; name: string; status: string; kind: string }>;
  requestRefund(actor: CommerceActor, orderId: string, input: CreateCommerceRefundRequestDto): Promise<{ id: string; status: string }>;
  getRefundForExecution(actor: CommerceActor, refundId: string): Promise<{ id: string; orderId: string; transactionId: string; amountMinor: number }>;
  markRefundProcessing(refundId: string, reviewedById: string, message: string): Promise<void>;
  markRefundFailed(refundId: string, reviewedById: string, message: string): Promise<void>;
}

export class CommerceError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

export interface CommerceServiceConfig {
  liveMode: boolean;
  /** Origen público de la tienda (botón "volver al comercio"). */
  returnBaseUrl: string;
  /** Origen público del API que recibe los callbacks del proveedor. */
  callbackBaseUrl: string;
  /** Clave con la que LUFA firma el token de cada callback. */
  callbackSecret: string;
  reservationMinutes: number;
  enabled?: boolean;
  environmentConfigured?: boolean;
}

const PAYMENT_CURRENCY = "UYU";

export class CommerceService {
  constructor(
    private readonly repository: CommerceRepository,
    private readonly provider: PaymentProvider,
    private readonly config: CommerceServiceConfig,
  ) {}

  /** Token por orden incluido en la URL de callback: el proveedor no firma sus notificaciones. */
  callbackToken(orderId: string) {
    return createHmac("sha256", this.config.callbackSecret).update(`commerce-callback:${orderId}`).digest("hex");
  }

  private verifyCallbackToken(orderId: string, token: string | null) {
    if (!this.config.callbackSecret || !token || !/^[a-f0-9]{64}$/i.test(token)) return false;
    return timingSafeEqual(Buffer.from(this.callbackToken(orderId), "hex"), Buffer.from(token, "hex"));
  }

  private callbackUrl(orderId: string) {
    return `${this.config.callbackBaseUrl}/api/webhooks/handy/${encodeURIComponent(orderId)}?token=${this.callbackToken(orderId)}`;
  }

  listCatalog(userId?: string) {
    return this.repository.listCatalog(userId);
  }

  quoteCheckout(buyer: CommerceActor, request: CreateCommerceCheckoutQuoteDto) {
    if (!Array.isArray(request.items) || request.items.length < 1 || request.items.length > 10) {
      throw new CommerceError("El carrito debe tener entre 1 y 10 productos.", "INVALID_CART", 400);
    }
    const items = request.items.map(({ itemId, variantId, quantity }) => ({ itemId: String(itemId), variantId: variantId ? String(variantId) : null, quantity: Number(quantity) }));
    if (items.some((item) => !item.itemId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      throw new CommerceError("Las cantidades del carrito no son válidas.", "INVALID_CART", 400);
    }
    return this.repository.quoteCheckout({ buyer, request: { items } });
  }

  async createCheckout(buyer: CommerceActor, request: CreateCommerceCheckoutDto) {
    if (this.config.enabled === false) throw new CommerceError("La tienda todavía no está habilitada para cobrar.", "COMMERCE_DISABLED", 503);
    const insecure = this.config.liveMode && (!this.config.returnBaseUrl.startsWith("https://") || !this.config.callbackBaseUrl.startsWith("https://"));
    if (this.config.environmentConfigured === false || !this.config.callbackSecret || !this.config.callbackBaseUrl || insecure) {
      throw new CommerceError("La configuración del ambiente de pagos está incompleta.", "PROVIDER_NOT_CONFIGURED", 503);
    }
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(request.idempotencyKey || "")) {
      throw new CommerceError("La clave de idempotencia no es válida.", "INVALID_IDEMPOTENCY_KEY", 400);
    }
    if (!Array.isArray(request.items) || request.items.length < 1 || request.items.length > 10) {
      throw new CommerceError("El carrito debe tener entre 1 y 10 productos.", "INVALID_CART", 400);
    }
    const normalized = request.items.map(({ itemId, variantId, quantity }) => ({ itemId: String(itemId), variantId: variantId ? String(variantId) : null, quantity: Number(quantity) }));
    if (normalized.some((item) => !item.itemId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      throw new CommerceError("Las cantidades del carrito no son válidas.", "INVALID_CART", 400);
    }
    normalized.sort((a, b) => a.itemId.localeCompare(b.itemId) || String(a.variantId || "").localeCompare(String(b.variantId || "")));
    const fingerprint = createHash("sha256").update(JSON.stringify({ items: normalized })).digest("hex");
    const reserved = await this.repository.reserveOrder({
      buyer,
      request: { idempotencyKey: request.idempotencyKey, items: normalized },
      fingerprint,
      liveMode: this.config.liveMode,
      reservationMinutes: this.config.reservationMinutes,
    });
    // Un link de pago es de un solo uso: si ya existe, se devuelve el mismo.
    if (reserved.checkoutUrl) return reserved;
    if (!reserved.providerOrderId) throw new CommerceError("La compra no tiene identificador de transacción.", "INVALID_ORDER", 500);

    const items = reserved.items.map((item) => {
      const unitAmountMinor = item.unitPriceMinor - item.unitDiscountMinor;
      return { title: item.title, quantity: item.quantity, unitAmountMinor, unitTaxedMinor: taxedMinor(unitAmountMinor, item.vatRateBps) };
    });
    try {
      const payment = await this.provider.createPayment({
        transactionId: reserved.providerOrderId,
        invoiceNumber: reserved.invoiceNumber,
        totalMinor: reserved.totalMinor,
        taxedMinor: items.reduce((sum, item) => sum + item.unitTaxedMinor * item.quantity, 0),
        items,
        imageUrl: reserved.imageUrl,
        siteUrl: `${this.config.returnBaseUrl}/tienda/resultado?order=${encodeURIComponent(reserved.id)}`,
        callbackUrl: this.callbackUrl(reserved.id),
      });
      return await this.repository.attachCheckoutUrl(reserved.id, payment.checkoutUrl);
    } catch (error) {
      if (error instanceof CommerceError && error.code === "PROVIDER_REJECTED") {
        await this.repository.cancelCreation(reserved.id, error.message);
      }
      throw error;
    }
  }

  getBuyerOrder(orderId: string, buyerId: string) {
    return this.repository.getOrderForBuyer(orderId, buyerId);
  }

  listBuyerOrders(buyerId: string) { return this.repository.listBuyerOrders(buyerId); }

  /** El proveedor no expone consulta de pagos: el estado local lo actualizan sus callbacks. */
  refreshBuyerOrder(orderId: string, buyerId: string) {
    return this.repository.getOrderForBuyer(orderId, buyerId);
  }

  async processProviderNotification(input: { orderId: string; token: string | null; body: unknown }) {
    if (!this.verifyCallbackToken(input.orderId, input.token)) throw new CommerceError("Callback no autorizado.", "INVALID_CALLBACK_TOKEN", 401);
    const local = await this.repository.getOrderForPayment(input.orderId);
    if (!local) throw new CommerceError("La orden notificada no pertenece a LUFA.", "UNKNOWN_ORDER", 404);
    const notification = this.provider.parseNotification(input.body);
    const transactionId = notification.kind === "payment" ? notification.update.transactionId : notification.transactionId;
    if (!local.providerOrderId || transactionId.toLowerCase() !== local.providerOrderId.toLowerCase()) {
      throw new CommerceError("La notificación no corresponde a esta compra.", "PAYMENT_MISMATCH", 409);
    }
    if (notification.kind === "payment" && (notification.update.currency !== PAYMENT_CURRENCY || notification.update.totalMinor !== local.totalMinor)) {
      throw new CommerceError("El pago notificado no coincide con la compra local.", "PAYMENT_MISMATCH", 409);
    }
    const action = notification.kind === "payment" ? `payment.${notification.update.status}` : `refund.${notification.success ? "succeeded" : "failed"}`;
    const deliveryKey = createHash("sha256").update(`${local.id}:${action}:${notification.deliveryId}`).digest("hex");
    const receipt = await this.repository.recordWebhook({ deliveryKey, providerResourceId: local.providerOrderId, action, liveMode: this.config.liveMode });
    if (receipt.alreadyProcessed) return;
    try {
      if (notification.kind === "payment") await this.repository.applyPaymentUpdate(local.id, notification.update);
      else await this.repository.applyRefundResult(local.id, { success: notification.success, message: notification.message });
      await this.repository.completeWebhook(receipt.id);
    } catch (error) {
      await this.repository.completeWebhook(receipt.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /** Libera el stock de reservas vencidas. Un pago que llegue después queda en revisión manual. */
  async reconcilePending(limit = 50) {
    const candidates = await this.repository.listExpiredReservations(Math.min(Math.max(limit, 1), 100));
    const results = { inspected: candidates.length, reconciled: 0, failed: 0 };
    for (const candidate of candidates) {
      try {
        await this.repository.expireOrder(candidate.id);
        results.reconciled += 1;
      } catch {
        results.failed += 1;
      }
    }
    return results;
  }

  listSellerItems(actor: CommerceActor) { return this.repository.listSellerItems(actor); }
  listActorSellers(actor: CommerceActor) { return this.repository.listActorSellers(actor); }
  listTournamentOptions(actor: CommerceActor) { return this.repository.listTournamentOptions(actor); }
  createItem(actor: CommerceActor, input: CreateCommerceItemDto) { return this.repository.createItem(actor, input); }
  updateItem(actor: CommerceActor, id: string, input: UpdateCommerceItemDto) { return this.repository.updateItem(actor, id, input); }
  createSeller(actor: CommerceActor, input: CreateCommerceSellerDto) { return this.repository.createSeller(actor, input); }
  addSellerMember(actor: CommerceActor, sellerId: string, userId: string) {
    if (!sellerId || !userId) throw new CommerceError("sellerId y userId son requeridos.", "INVALID_SELLER_MEMBER", 400);
    return this.repository.addSellerMember(actor, sellerId, userId);
  }
  listSellerOrders(actor: CommerceActor) { return this.repository.listSellerOrders(actor); }
  listAdminDashboard(actor: CommerceActor) { return this.repository.listAdminDashboard(actor); }
  listAdminOrders(actor: CommerceActor, filters: CommerceOrderFiltersDto) { return this.repository.listAdminOrders(actor, filters); }
  updateFulfillment(actor: CommerceActor, orderId: string, status: CommerceFulfillmentStatus) { return this.repository.updateFulfillment(actor, orderId, status); }
  listCommerceSellers(actor: CommerceActor) { return this.repository.listCommerceSellers(actor); }
  updateSellerStatus(actor: CommerceActor, sellerId: string, status: "active" | "inactive") { return this.repository.updateSellerStatus(actor, sellerId, status); }
  requestRefund(actor: CommerceActor, orderId: string, input: CreateCommerceRefundRequestDto) { return this.repository.requestRefund(actor, orderId, input); }

  /** Handy sólo admite una devolución total por venta; el resultado llega luego por callback. */
  async executeRefund(actor: CommerceActor, refundId: string) {
    const refund = await this.repository.getRefundForExecution(actor, refundId);
    // Se marca antes de llamar a Handy: su callback puede llegar antes de que respondamos.
    await this.repository.markRefundProcessing(refund.id, actor.id, "Solicitud enviada a Handy.");
    try {
      const result = await this.provider.refundPayment({ transactionId: refund.transactionId, callbackUrl: this.callbackUrl(refund.orderId) });
      return { id: refund.id, status: "processing", message: result.message };
    } catch (error) {
      if (error instanceof CommerceError && error.code === "PROVIDER_REJECTED") {
        await this.repository.markRefundFailed(refund.id, actor.id, error.message);
      }
      throw error;
    }
  }
}
