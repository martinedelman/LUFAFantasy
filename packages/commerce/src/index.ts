import { createHash } from "node:crypto";
import type {
  CommerceCatalogDto,
  CommerceItemDto,
  CommerceOrderDto,
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
  providerOrderId: string | null;
  payloadFingerprint: string;
}

export interface VerifiedProviderOrder {
  id: string;
  externalReference: string;
  status: string;
  currency: string;
  totalMinor: number;
  collectorId: string;
  applicationId: string;
  checkoutUrl: string | null;
  paidAt: Date | null;
}

export interface CreateProviderOrderInput {
  localOrderId: string;
  idempotencyKey: string;
  payerEmail: string;
  totalMinor: number;
  items: Array<{ title: string; quantity: number; unitAmountMinor: number }>;
  successUrl: string;
  pendingUrl: string;
  failureUrl: string;
  expirationMinutes: number;
}

export interface PaymentProvider {
  createOrder(input: CreateProviderOrderInput): Promise<VerifiedProviderOrder>;
  getOrder(id: string): Promise<VerifiedProviderOrder>;
  findOrderByExternalReference(reference: string): Promise<VerifiedProviderOrder | null>;
  refundOrder(providerOrderId: string, amountMinor: number, idempotencyKey: string): Promise<{ id: string }>;
}

export interface CommerceRepository {
  listCatalog(userId?: string): Promise<CommerceCatalogDto>;
  reserveOrder(input: { buyer: CommerceActor; request: CreateCommerceCheckoutDto; fingerprint: string; liveMode: boolean; reservationMinutes: number }): Promise<ReservedOrder>;
  attachProviderOrder(orderId: string, provider: VerifiedProviderOrder): Promise<CommerceOrderDto>;
  cancelCreation(orderId: string, reason: string): Promise<void>;
  getOrderForBuyer(orderId: string, buyerId: string): Promise<CommerceOrderDto | null>;
  getOrderForReconciliation(orderId: string): Promise<ReservedOrder | null>;
  getOrderByProviderId(providerOrderId: string): Promise<ReservedOrder | null>;
  reconcileOrder(localOrderId: string, provider: VerifiedProviderOrder): Promise<CommerceOrderDto>;
  recordWebhook(input: { deliveryKey: string; providerResourceId: string; action: string; liveMode: boolean }): Promise<{ id: string; alreadyProcessed: boolean }>;
  completeWebhook(id: string, error?: string): Promise<void>;
  listReconciliationCandidates(limit: number): Promise<Array<{ id: string; providerOrderId: string | null }>>;
  expireOrder(orderId: string): Promise<void>;
  listSellerItems(actor: CommerceActor): Promise<CommerceItemDto[]>;
  listActorSellers(actor: CommerceActor): Promise<Array<{ id: string; slug: string; name: string }>>;
  createItem(actor: CommerceActor, input: CreateCommerceItemDto): Promise<CommerceItemDto>;
  updateItem(actor: CommerceActor, itemId: string, input: UpdateCommerceItemDto): Promise<CommerceItemDto>;
  createSeller(actor: CommerceActor, input: CreateCommerceSellerDto): Promise<{ id: string; slug: string; name: string }>;
  addSellerMember(actor: CommerceActor, sellerId: string, userId: string): Promise<void>;
  listSellerOrders(actor: CommerceActor): Promise<CommerceOrderDto[]>;
  requestRefund(actor: CommerceActor, orderId: string, input: CreateCommerceRefundRequestDto): Promise<{ id: string; status: string }>;
  getRefundForExecution(actor: CommerceActor, refundId: string): Promise<{ id: string; orderId: string; providerOrderId: string; amountMinor: number }>;
  completeRefund(refundId: string, providerRefundId: string, reviewedById: string): Promise<void>;
}

export class CommerceError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

export class CommerceService {
  constructor(
    private readonly repository: CommerceRepository,
    private readonly provider: PaymentProvider,
    private readonly config: { liveMode: boolean; returnBaseUrl: string; reservationMinutes: number; enabled?: boolean; environmentConfigured?: boolean },
  ) {}

  listCatalog(userId?: string) {
    return this.repository.listCatalog(userId);
  }

  async createCheckout(buyer: CommerceActor, request: CreateCommerceCheckoutDto) {
    if (this.config.enabled === false) throw new CommerceError("La tienda todavía no está habilitada para cobrar.", "COMMERCE_DISABLED", 503);
    if (this.config.environmentConfigured === false || (this.config.liveMode && !this.config.returnBaseUrl.startsWith("https://"))) {
      throw new CommerceError("La configuración del ambiente de pagos está incompleta.", "PROVIDER_NOT_CONFIGURED", 503);
    }
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(request.idempotencyKey || "")) {
      throw new CommerceError("La clave de idempotencia no es válida.", "INVALID_IDEMPOTENCY_KEY", 400);
    }
    if (!Array.isArray(request.items) || request.items.length < 1 || request.items.length > 10) {
      throw new CommerceError("El carrito debe tener entre 1 y 10 productos.", "INVALID_CART", 400);
    }
    const normalized = request.items.map(({ itemId, quantity }) => ({ itemId: String(itemId), quantity: Number(quantity) }));
    if (normalized.some((item) => !item.itemId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      throw new CommerceError("Las cantidades del carrito no son válidas.", "INVALID_CART", 400);
    }
    normalized.sort((a, b) => a.itemId.localeCompare(b.itemId));
    const fingerprint = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
    const reserved = await this.repository.reserveOrder({
      buyer,
      request: { ...request, items: normalized },
      fingerprint,
      liveMode: this.config.liveMode,
      reservationMinutes: this.config.reservationMinutes,
    });
    if (reserved.checkoutUrl) return reserved;

    try {
      const provider = await this.provider.createOrder({
        localOrderId: reserved.id,
        idempotencyKey: reserved.idempotencyKey,
        payerEmail: reserved.buyerEmail,
        totalMinor: reserved.totalMinor,
        items: reserved.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unitAmountMinor: item.unitPriceMinor - item.unitDiscountMinor,
        })),
        successUrl: `${this.config.returnBaseUrl}/tienda/resultado?order=${encodeURIComponent(reserved.id)}`,
        pendingUrl: `${this.config.returnBaseUrl}/tienda/resultado?order=${encodeURIComponent(reserved.id)}`,
        failureUrl: `${this.config.returnBaseUrl}/tienda/resultado?order=${encodeURIComponent(reserved.id)}`,
        expirationMinutes: this.config.reservationMinutes,
      });
      return await this.repository.attachProviderOrder(reserved.id, provider);
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

  async refreshBuyerOrder(orderId: string, buyerId: string) {
    const owned = await this.repository.getOrderForBuyer(orderId, buyerId);
    if (!owned) return null;
    const local = await this.repository.getOrderForReconciliation(orderId);
    if (local && ["creating", "payment_pending", "payment_review"].includes(local.status)) {
      const provider = local.providerOrderId ? await this.provider.getOrder(local.providerOrderId) : await this.provider.findOrderByExternalReference(local.id);
      if (provider) {
        if (!local.providerOrderId) await this.repository.attachProviderOrder(local.id, provider);
        return this.repository.reconcileOrder(local.id, provider);
      }
    }
    return owned;
  }

  async processWebhook(input: { deliveryKey: string; providerResourceId: string; action: string; liveMode: boolean }) {
    if (input.liveMode !== this.config.liveMode) throw new CommerceError("El ambiente del webhook no coincide.", "ENVIRONMENT_MISMATCH", 400);
    const receipt = await this.repository.recordWebhook(input);
    if (receipt.alreadyProcessed) return;
    try {
      const provider = await this.provider.getOrder(input.providerResourceId);
      const local = await this.repository.getOrderByProviderId(provider.id);
      if (!local) throw new CommerceError("La orden notificada no pertenece a LUFA.", "UNKNOWN_ORDER", 404);
      await this.repository.reconcileOrder(local.id, provider);
      await this.repository.completeWebhook(receipt.id);
    } catch (error) {
      await this.repository.completeWebhook(receipt.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async reconcilePending(limit = 50) {
    const candidates = await this.repository.listReconciliationCandidates(Math.min(Math.max(limit, 1), 100));
    const results = { inspected: candidates.length, reconciled: 0, failed: 0 };
    for (const candidate of candidates) {
      try {
        const provider = candidate.providerOrderId
          ? await this.provider.getOrder(candidate.providerOrderId)
          : await this.provider.findOrderByExternalReference(candidate.id);
        if (provider) {
          if (!candidate.providerOrderId) await this.repository.attachProviderOrder(candidate.id, provider);
          await this.repository.reconcileOrder(candidate.id, provider);
          results.reconciled += 1;
        } else if (!candidate.providerOrderId) {
          await this.repository.expireOrder(candidate.id);
          results.reconciled += 1;
        }
      } catch {
        results.failed += 1;
      }
    }
    return results;
  }

  listSellerItems(actor: CommerceActor) { return this.repository.listSellerItems(actor); }
  listActorSellers(actor: CommerceActor) { return this.repository.listActorSellers(actor); }
  createItem(actor: CommerceActor, input: CreateCommerceItemDto) { return this.repository.createItem(actor, input); }
  updateItem(actor: CommerceActor, id: string, input: UpdateCommerceItemDto) { return this.repository.updateItem(actor, id, input); }
  createSeller(actor: CommerceActor, input: CreateCommerceSellerDto) { return this.repository.createSeller(actor, input); }
  addSellerMember(actor: CommerceActor, sellerId: string, userId: string) {
    if (!sellerId || !userId) throw new CommerceError("sellerId y userId son requeridos.", "INVALID_SELLER_MEMBER", 400);
    return this.repository.addSellerMember(actor, sellerId, userId);
  }
  listSellerOrders(actor: CommerceActor) { return this.repository.listSellerOrders(actor); }
  requestRefund(actor: CommerceActor, orderId: string, input: CreateCommerceRefundRequestDto) { return this.repository.requestRefund(actor, orderId, input); }

  async executeRefund(actor: CommerceActor, refundId: string) {
    const refund = await this.repository.getRefundForExecution(actor, refundId);
    const provider = await this.provider.refundOrder(refund.providerOrderId, refund.amountMinor, `refund_${refund.id}`);
    await this.repository.completeRefund(refund.id, provider.id, actor.id);
    return { id: refund.id, status: "completed" };
  }
}
