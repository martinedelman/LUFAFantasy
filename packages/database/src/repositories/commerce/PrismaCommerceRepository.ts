import type { CommerceAdminDashboardDto, CommerceFulfillmentStatus, CommerceItemDetailsDto, CommerceItemDto, CommerceOrderDto, CommerceOrderFiltersDto, CreateCommerceCheckoutDto, CreateCommerceItemDto, CreateCommerceRefundRequestDto, CreateCommerceSellerDto, UpdateCommerceItemDto } from "@lufa/contracts";
import { CommerceError, type CommerceActor, type CommerceRepository, type ReservedOrder, type VerifiedProviderOrder } from "@lufa/commerce";
import { getPrismaClient } from "../../prisma";

type Db = ReturnType<typeof getPrismaClient>;
type ItemRow = any;
type OrderRow = any;
const PAID = new Set(["processed", "accredited"]);
const CANCELLED = new Set(["cancelled", "canceled", "expired", "rejected"]);
const FULFILLMENT = new Set<CommerceFulfillmentStatus>(["pending_fulfillment", "ready_for_pickup", "delivered", "not_required"]);
const DATE_KEYS = new Set(["startsAt", "endsAt", "registrationDeadline"]);

function assertAdmin(actor: CommerceActor) { if (actor.role !== "admin") throw new CommerceError("No autorizado.", "FORBIDDEN", 403); }
function plainDetails(value: unknown): CommerceItemDetailsDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key, item]) => typeof item === "string" && (DATE_KEYS.has(key) || ["category", "brand", "instructor", "modality", "location", "materials", "divisionId"].includes(key)))) as CommerceItemDetailsDto;
}
function imageUrls(value: unknown, imageUrl: string | null) { return Array.isArray(value) ? value.filter((url): url is string => typeof url === "string") : imageUrl ? [imageUrl] : []; }
function itemDto(item: ItemRow, hasCredential = false): CommerceItemDto {
  const discount = hasCredential ? Math.floor(item.priceMinor * item.credentialDiscountBps / 10_000) : 0;
  return {
    id: item.id, seller: item.seller, slug: item.slug, kind: item.kind, title: item.title, description: item.description,
    imageUrl: item.imageUrl, imageUrls: imageUrls(item.imageUrls, item.imageUrl), sku: item.sku, details: plainDetails(item.details), pickupInstructions: item.pickupInstructions,
    currency: "UYU", priceMinor: item.priceMinor, effectivePriceMinor: item.priceMinor - discount, credentialDiscountBps: item.credentialDiscountBps,
    hasCredentialDiscount: discount > 0, stockQuantity: item.stockQuantity, entitlementMonths: item.entitlementMonths, active: item.active,
    variants: (item.variants || []).map((variant: any) => ({ id: variant.id, sku: variant.sku, label: variant.label, optionName: variant.optionName, optionValue: variant.optionValue, priceMinor: variant.priceMinor, stockQuantity: variant.stockQuantity, active: variant.active })),
  };
}
function orderDto(order: OrderRow): CommerceOrderDto {
  return {
    id: order.id, status: order.status, fulfillmentStatus: order.fulfillmentStatus, currency: "UYU", subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor, totalMinor: order.totalMinor, checkoutUrl: order.checkoutUrl, createdAt: order.createdAt.toISOString(),
    seller: order.seller || { id: order.sellerId, slug: "", name: "Vendedor" }, buyer: order.buyer ? { name: order.buyer.name, email: order.buyer.email } : undefined,
    pickupInstructions: order.pickupInstructions || null,
    items: order.items.map((item: any) => ({ itemId: item.itemId, title: item.title, kind: item.kind, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, unitDiscountMinor: item.unitDiscountMinor, entitlementMonths: item.entitlementMonths, variantId: item.variantId, variantSku: item.variantSku, variantLabel: item.variantLabel })),
  };
}
const orderInclude = { seller: { select: { id: true, slug: true, name: true } }, buyer: { select: { name: true, email: true } }, items: true } as const;

export class PrismaCommerceRepository implements CommerceRepository {
  constructor(private readonly db?: Db) {}
  private get database(): Db { return this.db || getPrismaClient(); }
  private async hasCredential(userId?: string) { return Boolean(userId && await this.database.digitalCredential.findFirst({ where: { userId, status: "active", expiresAt: { gt: new Date() }, }, select: { id: true } })); }
  private async sellerIds(actor: CommerceActor) { return actor.role === "admin" ? null : (await this.database.commerceSellerMember.findMany({ where: { userId: actor.id }, select: { sellerId: true } })).map((row) => row.sellerId); }
  private audit(actor: CommerceActor, action: string, entityType: string, entityId: string, summary: string) { return this.database.adminAuditLog.create({ data: { actorId: actor.id, actorName: actor.name, actorEmail: actor.email, action, entityType, entityId, summary } }); }
  private inventoryStatus(item: any, variant: any, quantity: number) {
    const available = variant ? variant.stockQuantity : item.stockQuantity;
    if (available !== null && available < quantity) throw new CommerceError(`No queda stock suficiente de ${item.title}.`, "OUT_OF_STOCK", 409);
  }

  async listCatalog(userId?: string) {
    const [hasActiveCredential, items] = await Promise.all([this.hasCredential(userId), this.database.commerceItem.findMany({ where: { active: true, seller: { status: "active" } }, include: { seller: { select: { id: true, slug: true, name: true } }, variants: { where: { active: true }, orderBy: { label: "asc" } } }, orderBy: [{ kind: "asc" }, { title: "asc" }] })]);
    return { hasActiveCredential, items: items.map((item) => itemDto(item, hasActiveCredential)) };
  }

  async reserveOrder(input: { buyer: CommerceActor; request: CreateCommerceCheckoutDto; fingerprint: string; liveMode: boolean; reservationMinutes: number }): Promise<ReservedOrder> {
    const existing = await this.database.commerceOrder.findUnique({ where: { idempotencyKey: input.request.idempotencyKey }, include: orderInclude });
    if (existing) {
      if (existing.buyerUserId !== input.buyer.id || existing.payloadFingerprint !== input.fingerprint) throw new CommerceError("La clave de idempotencia ya fue usada para otra compra.", "IDEMPOTENCY_CONFLICT", 409);
      return { ...orderDto(existing), buyerEmail: existing.buyer.email, idempotencyKey: existing.idempotencyKey, providerOrderId: existing.providerOrderId, payloadFingerprint: existing.payloadFingerprint };
    }
    const keys = new Set(input.request.items.map((line) => `${line.itemId}:${line.variantId || ""}`));
    if (keys.size !== input.request.items.length) throw new CommerceError("No repitas la misma variante en el carrito.", "INVALID_CART", 400);
    const hasActiveCredential = await this.hasCredential(input.buyer.id);
    const itemIds = [...new Set(input.request.items.map((item) => item.itemId))];
    const items = await this.database.commerceItem.findMany({ where: { id: { in: itemIds }, active: true }, include: { seller: true, tournament: true, variants: { where: { active: true } } } });
    if (items.length !== itemIds.length) throw new CommerceError("Uno de los productos ya no está disponible.", "ITEM_UNAVAILABLE", 409);
    if (new Set(items.map((item) => item.sellerId)).size !== 1) throw new CommerceError("Cada compra debe contener productos de un único vendedor.", "MULTIPLE_SELLERS", 409);
    const byId = new Map(items.map((item) => [item.id, item]));
    if (items.some((item) => item.kind === "tournament")) {
      const player = await this.database.player.findFirst({ where: { email: { equals: input.buyer.email, mode: "insensitive" } }, select: { id: true } });
      if (!player) throw new CommerceError("Para inscribirte, primero vinculá tu perfil de jugador con tu cuenta LUFA.", "PLAYER_PROFILE_REQUIRED", 409);
    }
    const lines = input.request.items.map((request) => {
      const item = byId.get(request.itemId)!;
      const variant = request.variantId ? item.variants.find((candidate) => candidate.id === request.variantId) : null;
      if (request.variantId && !variant) throw new CommerceError("La variante seleccionada no está disponible.", "VARIANT_UNAVAILABLE", 409);
      if (item.kind === "product" && item.variants.length && !variant) throw new CommerceError("Elegí una variante para este producto.", "VARIANT_REQUIRED", 409);
      if (item.kind !== "product" && variant) throw new CommerceError("Esta publicación no admite variantes.", "INVALID_VARIANT", 400);
      if (item.kind === "tournament" && (!item.tournamentId || !item.entitlementMonths)) throw new CommerceError("La inscripción no está configurada correctamente.", "ITEM_UNAVAILABLE", 409);
      this.inventoryStatus(item, variant, request.quantity);
      const unitPriceMinor = variant?.priceMinor ?? item.priceMinor;
      return { item, variant, quantity: request.quantity, unitPriceMinor, discount: hasActiveCredential ? Math.floor(unitPriceMinor * item.credentialDiscountBps / 10_000) : 0 };
    });
    const subtotalMinor = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
    const discountMinor = lines.reduce((sum, line) => sum + line.discount * line.quantity, 0);
    const totalMinor = subtotalMinor - discountMinor;
    if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) throw new CommerceError("El total de la compra no es válido.", "INVALID_TOTAL", 409);
    const created = await this.database.$transaction(async (tx) => {
      for (const line of lines) {
        if (line.variant) {
          const updated = await tx.commerceItemVariant.updateMany({ where: { id: line.variant.id, active: true, ...(line.variant.stockQuantity === null ? {} : { stockQuantity: { gte: line.quantity } }) }, data: line.variant.stockQuantity === null ? {} : { stockQuantity: { decrement: line.quantity } } });
          if (!updated.count) throw new CommerceError(`No queda stock suficiente de ${line.item.title}.`, "OUT_OF_STOCK", 409);
        } else if (line.item.stockQuantity !== null) {
          const updated = await tx.commerceItem.updateMany({ where: { id: line.item.id, active: true, stockQuantity: { gte: line.quantity } }, data: { stockQuantity: { decrement: line.quantity } } });
          if (!updated.count) throw new CommerceError(`No queda stock suficiente de ${line.item.title}.`, "OUT_OF_STOCK", 409);
        }
      }
      const physical = lines.some((line) => line.item.kind === "product");
      return tx.commerceOrder.create({ data: { buyerUserId: input.buyer.id, sellerId: lines[0]!.item.sellerId, currency: "UYU", subtotalMinor, discountMinor, totalMinor, idempotencyKey: input.request.idempotencyKey, payloadFingerprint: input.fingerprint, liveMode: input.liveMode, reservationExpiresAt: new Date(Date.now() + input.reservationMinutes * 60_000), fulfillmentStatus: physical ? "pending_fulfillment" : "not_required", pickupInstructions: physical ? lines.map((line) => line.item.pickupInstructions).filter(Boolean).join("\n") || null : null, items: { create: lines.map((line) => ({ itemId: line.item.id, variantId: line.variant?.id || null, title: line.item.title, kind: line.item.kind, quantity: line.quantity, unitPriceMinor: line.unitPriceMinor, unitDiscountMinor: line.discount, entitlementMonths: line.item.entitlementMonths, variantSku: line.variant?.sku || null, variantLabel: line.variant?.label || null })) } }, include: orderInclude });
    });
    return { ...orderDto(created), buyerEmail: created.buyer.email, idempotencyKey: created.idempotencyKey, providerOrderId: null, payloadFingerprint: created.payloadFingerprint };
  }

  async attachProviderOrder(orderId: string, provider: VerifiedProviderOrder) {
    const local = await this.database.commerceOrder.findUnique({ where: { id: orderId } });
    if (!local) throw new CommerceError("Orden local inexistente.", "ORDER_NOT_FOUND", 404);
    if (provider.externalReference !== local.id || provider.currency !== local.currency || provider.totalMinor !== local.totalMinor) throw new CommerceError("La orden de Mercado Pago no coincide con la compra local.", "PAYMENT_MISMATCH", 502);
    return orderDto(await this.database.commerceOrder.update({ where: { id: orderId }, data: { providerOrderId: provider.id, providerStatus: provider.status, checkoutUrl: provider.checkoutUrl, status: "payment_pending" }, include: orderInclude }));
  }
  private async releaseInventory(orderId: string, status: string) {
    await this.database.$transaction(async (tx) => {
      const order = await tx.commerceOrder.findUnique({ where: { id: orderId }, include: { items: { include: { item: true } } } });
      if (!order || !["creating", "payment_pending"].includes(order.status)) return;
      for (const line of order.items) {
        if (line.variantId) await tx.commerceItemVariant.updateMany({ where: { id: line.variantId, stockQuantity: { not: null } }, data: { stockQuantity: { increment: line.quantity } } });
        else if (line.item.stockQuantity !== null) await tx.commerceItem.update({ where: { id: line.itemId }, data: { stockQuantity: { increment: line.quantity } } });
      }
      await tx.commerceOrder.update({ where: { id: orderId }, data: { status, cancelledAt: new Date() } });
    });
  }
  async cancelCreation(orderId: string, reason: string) { void reason; await this.releaseInventory(orderId, "cancelled"); }
  async expireOrder(orderId: string) { await this.releaseInventory(orderId, "cancelled"); }
  async listBuyerOrders(buyerId: string) { return (await this.database.commerceOrder.findMany({ where: { buyerUserId: buyerId }, include: orderInclude, orderBy: { createdAt: "desc" } })).map(orderDto); }
  async getOrderForBuyer(orderId: string, buyerId: string) { const order = await this.database.commerceOrder.findFirst({ where: { id: orderId, buyerUserId: buyerId }, include: orderInclude }); return order ? orderDto(order) : null; }
  async getOrderForReconciliation(orderId: string) { const order = await this.database.commerceOrder.findUnique({ where: { id: orderId }, include: orderInclude }); return order ? { ...orderDto(order), buyerEmail: order.buyer.email, idempotencyKey: order.idempotencyKey, providerOrderId: order.providerOrderId, payloadFingerprint: order.payloadFingerprint } : null; }
  async getOrderByProviderId(providerOrderId: string) { const order = await this.database.commerceOrder.findUnique({ where: { providerOrderId }, include: orderInclude }); return order ? { ...orderDto(order), buyerEmail: order.buyer.email, idempotencyKey: order.idempotencyKey, providerOrderId: order.providerOrderId, payloadFingerprint: order.payloadFingerprint } : null; }

  async reconcileOrder(localOrderId: string, provider: VerifiedProviderOrder) {
    return this.database.$transaction(async (tx) => {
      const order = await tx.commerceOrder.findUnique({ where: { id: localOrderId }, include: { buyer: true, seller: { select: { id: true, slug: true, name: true } }, items: { include: { item: true } } } });
      if (!order) throw new CommerceError("Orden local inexistente.", "ORDER_NOT_FOUND", 404);
      if (provider.externalReference !== order.id || provider.currency !== order.currency || provider.totalMinor !== order.totalMinor || provider.id !== order.providerOrderId) throw new CommerceError("El pago verificado no coincide con la compra local.", "PAYMENT_MISMATCH", 409);
      const status = provider.status.toLowerCase();
      if (PAID.has(status) && !order.paidAt) {
        for (const line of order.items) {
          if (line.item.kind === "tournament" && line.item.tournamentId) await tx.commerceTournamentRegistration.upsert({ where: { itemId_userId: { itemId: line.itemId, userId: order.buyerUserId } }, create: { orderId: order.id, itemId: line.itemId, tournamentId: line.item.tournamentId, userId: order.buyerUserId }, update: {} });
          if (line.entitlementMonths) {
            const current = await tx.digitalCredential.findFirst({ where: { userId: order.buyerUserId }, orderBy: { expiresAt: "desc" } });
            const expiresAt = new Date(current && current.expiresAt > new Date() ? current.expiresAt : new Date()); expiresAt.setUTCMonth(expiresAt.getUTCMonth() + line.entitlementMonths);
            if (current) { await tx.digitalCredential.update({ where: { id: current.id }, data: { status: "active", expiresAt, revokedAt: null } }); await tx.digitalCredentialAudit.create({ data: { credentialId: current.id, action: `extended_by_order:${order.id}` } }); }
            else {
              const player = await tx.player.findFirst({ where: { email: { equals: order.buyer.email, mode: "insensitive" } } });
              if (!player) throw new CommerceError("No se encontró el perfil del jugador para emitir su ID.", "PLAYER_PROFILE_REQUIRED", 409);
              const credential = await tx.digitalCredential.create({ data: { userId: order.buyerUserId, playerId: player.id, subjectType: "player", memberNumber: `LUFA-AUTO-${order.buyerUserId.slice(-10).toUpperCase()}`, displayName: `${player.firstName} ${player.lastName}`, profilePicture: player.profilePicture, roleLabel: "Jugador", organizationName: "LUFA", nationalityCode: "UY", dateOfBirth: player.dateOfBirth, expiresAt } });
              await tx.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: `issued_by_order:${order.id}` } });
            }
          }
        }
        const physical = order.items.some((line) => line.kind === "product");
        return orderDto(await tx.commerceOrder.update({ where: { id: order.id }, data: { status: "paid", fulfillmentStatus: physical ? "pending_fulfillment" : "not_required", providerStatus: provider.status, paidAt: provider.paidAt || new Date(), fulfilledAt: physical ? null : new Date() }, include: orderInclude }));
      }
      if (CANCELLED.has(status) && ["creating", "payment_pending"].includes(order.status)) { await this.releaseInventory(order.id, "cancelled"); return orderDto(await tx.commerceOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude })); }
      const mapped = status.includes("charged_back") ? "charged_back" : status.includes("refund") ? "refunded" : order.status;
      return orderDto(await tx.commerceOrder.update({ where: { id: order.id }, data: { status: mapped, providerStatus: provider.status }, include: orderInclude }));
    });
  }
  async recordWebhook(input: { deliveryKey: string; providerResourceId: string; action: string; liveMode: boolean }) { const existing = await this.database.commerceWebhookEvent.findUnique({ where: { deliveryKey: input.deliveryKey } }); if (existing) return { id: existing.id, alreadyProcessed: existing.status === "processed" }; const created = await this.database.commerceWebhookEvent.create({ data: input }); return { id: created.id, alreadyProcessed: false }; }
  async completeWebhook(id: string, error?: string) { await this.database.commerceWebhookEvent.update({ where: { id }, data: error ? { status: "failed", error, attempts: { increment: 1 } } : { status: "processed", error: null, processedAt: new Date(), attempts: { increment: 1 } } }); }
  listReconciliationCandidates(limit: number) { return this.database.commerceOrder.findMany({ where: { status: { in: ["creating", "payment_pending", "payment_review"] } }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true, providerOrderId: true } }); }

  async listActorSellers(actor: CommerceActor) { const sellerIds = await this.sellerIds(actor); return this.database.commerceSeller.findMany({ where: { status: "active", ...(sellerIds ? { id: { in: sellerIds } } : {}) }, select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } }); }
  async listSellerItems(actor: CommerceActor) { const sellerIds = await this.sellerIds(actor); return (await this.database.commerceItem.findMany({ where: sellerIds ? { sellerId: { in: sellerIds } } : {}, include: { seller: { select: { id: true, slug: true, name: true } }, variants: { orderBy: { label: "asc" } } }, orderBy: { updatedAt: "desc" } })).map((item) => itemDto(item)); }
  private validateDetails(input: CreateCommerceItemDto | UpdateCommerceItemDto) {
    if (input.kind !== undefined && !["product", "service", "tournament"].includes(input.kind)) throw new CommerceError("El tipo de publicación no es válido.", "INVALID_ITEM", 400);
    if (input.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new CommerceError("El slug no es válido.", "INVALID_ITEM", 400);
    if (input.title !== undefined && !input.title.trim()) throw new CommerceError("El título es requerido.", "INVALID_ITEM", 400);
    if (input.description !== undefined && !input.description.trim()) throw new CommerceError("La descripción es requerida.", "INVALID_ITEM", 400);
    if (input.priceMinor !== undefined && (!Number.isInteger(input.priceMinor) || input.priceMinor < 1)) throw new CommerceError("El precio no es válido.", "INVALID_ITEM", 400);
    if (input.credentialDiscountBps !== undefined && (!Number.isInteger(input.credentialDiscountBps) || input.credentialDiscountBps < 0 || input.credentialDiscountBps > 9000)) throw new CommerceError("El descuento no es válido.", "INVALID_ITEM", 400);
    if (input.stockQuantity !== undefined && input.stockQuantity !== null && (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0)) throw new CommerceError("El stock no es válido.", "INVALID_ITEM", 400);
    if (input.entitlementMonths !== undefined && input.entitlementMonths !== null && ![6, 12].includes(input.entitlementMonths)) throw new CommerceError("La vigencia del ID debe ser de 6 o 12 meses.", "INVALID_ITEM", 400);
    if (input.imageUrls && (!Array.isArray(input.imageUrls) || input.imageUrls.some((url) => typeof url !== "string" || url.length > 2048))) throw new CommerceError("Las imágenes no son válidas.", "INVALID_ITEM", 400);
    for (const variant of input.variants || []) if (!variant.sku?.trim() || !variant.label?.trim() || !variant.optionName?.trim() || !variant.optionValue?.trim() || (variant.priceMinor != null && (!Number.isInteger(variant.priceMinor) || variant.priceMinor < 1)) || (variant.stockQuantity != null && (!Number.isInteger(variant.stockQuantity) || variant.stockQuantity < 0))) throw new CommerceError("Una variante no es válida.", "INVALID_VARIANT", 400);
  }
  private itemData(input: CreateCommerceItemDto | UpdateCommerceItemDto) { const { variants: _variants, details, imageUrls, ...scalar } = input; return { ...scalar, ...(details !== undefined ? { details } : {}), ...(imageUrls !== undefined ? { imageUrls } : {}) }; }
  async createItem(actor: CommerceActor, input: CreateCommerceItemDto) {
    this.validateDetails(input); const sellerIds = await this.sellerIds(actor); if (sellerIds && !sellerIds.includes(input.sellerId)) throw new CommerceError("No autorizado para ese vendedor.", "FORBIDDEN", 403);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || !input.title.trim() || !input.description.trim()) throw new CommerceError("Completá título, descripción y un slug válido.", "INVALID_ITEM", 400);
    if (input.kind === "tournament" && (!input.tournamentId || !input.entitlementMonths)) throw new CommerceError("Una inscripción requiere torneo y vigencia de ID.", "INVALID_ITEM", 400);
    if (input.kind !== "product" && input.variants?.length) throw new CommerceError("Solo el equipamiento físico admite variantes.", "INVALID_VARIANT", 400);
    const item = await this.database.commerceItem.create({ data: { ...this.itemData(input), title: input.title.trim(), description: input.description.trim(), currency: "UYU", credentialDiscountBps: input.credentialDiscountBps || 0, active: input.active ?? true, variants: input.variants?.length ? { create: input.variants.map((variant) => ({ sku: variant.sku.trim(), label: variant.label.trim(), optionName: variant.optionName.trim(), optionValue: variant.optionValue.trim(), priceMinor: variant.priceMinor ?? null, stockQuantity: variant.stockQuantity ?? null, active: variant.active ?? true })) } : undefined }, include: { seller: { select: { id: true, slug: true, name: true } }, variants: true } } as any) as any;
    await this.audit(actor, "commerce.item.created", "commerce_item", item.id, `Publicó ${item.title} para ${item.seller.name}`); return itemDto(item);
  }
  async updateItem(actor: CommerceActor, itemId: string, input: UpdateCommerceItemDto) {
    this.validateDetails(input); const sellerIds = await this.sellerIds(actor); const current = await this.database.commerceItem.findFirst({ where: { id: itemId, ...(sellerIds ? { sellerId: { in: sellerIds } } : {}) } }); if (!current) throw new CommerceError("Producto no encontrado.", "ITEM_NOT_FOUND", 404);
    const next = { ...current, ...input }; if (next.kind === "tournament" && (!next.tournamentId || !next.entitlementMonths)) throw new CommerceError("Una inscripción requiere torneo y vigencia de ID.", "INVALID_ITEM", 400); if (next.kind !== "product" && input.variants?.length) throw new CommerceError("Solo el equipamiento físico admite variantes.", "INVALID_VARIANT", 400);
    const item = await this.database.$transaction(async (tx) => { if (input.variants) { await tx.commerceItemVariant.deleteMany({ where: { itemId } }); } return tx.commerceItem.update({ where: { id: itemId }, data: { ...this.itemData(input), ...(input.variants ? { variants: { create: input.variants.map((variant) => ({ sku: variant.sku.trim(), label: variant.label.trim(), optionName: variant.optionName.trim(), optionValue: variant.optionValue.trim(), priceMinor: variant.priceMinor ?? null, stockQuantity: variant.stockQuantity ?? null, active: variant.active ?? true })) } } : {}) }, include: { seller: { select: { id: true, slug: true, name: true } }, variants: true } } as any) as any; });
    await this.audit(actor, "commerce.item.updated", "commerce_item", item.id, `Actualizó ${item.title}`); return itemDto(item);
  }
  async createSeller(actor: CommerceActor, input: CreateCommerceSellerDto) { assertAdmin(actor); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || !input.name.trim()) throw new CommerceError("Nombre o slug inválido.", "INVALID_SELLER", 400); const seller = await this.database.commerceSeller.create({ data: { slug: input.slug, name: input.name.trim(), kind: input.kind || "partner" }, select: { id: true, slug: true, name: true } }); await this.audit(actor, "commerce.seller.created", "commerce_seller", seller.id, `Creó el vendedor ${seller.name}`); return seller; }
  async addSellerMember(actor: CommerceActor, sellerId: string, userId: string) { assertAdmin(actor); await this.database.commerceSellerMember.upsert({ where: { sellerId_userId: { sellerId, userId } }, create: { sellerId, userId }, update: {} }); await this.audit(actor, "commerce.seller.member_added", "commerce_seller", sellerId, `Habilitó al usuario ${userId}`); }
  async listSellerOrders(actor: CommerceActor) { const sellerIds = await this.sellerIds(actor); return (await this.database.commerceOrder.findMany({ where: sellerIds ? { sellerId: { in: sellerIds } } : {}, include: orderInclude, orderBy: { createdAt: "desc" }, take: 100 })).map(orderDto); }
  async updateFulfillment(actor: CommerceActor, orderId: string, status: CommerceFulfillmentStatus) {
    if (!FULFILLMENT.has(status)) throw new CommerceError("Estado de entrega inválido.", "INVALID_FULFILLMENT", 400);
    const sellerIds = await this.sellerIds(actor); const order = await this.database.commerceOrder.findFirst({ where: { id: orderId, status: "paid", ...(sellerIds ? { sellerId: { in: sellerIds } } : {}) }, include: { items: true } });
    if (!order) throw new CommerceError("Orden pagada no encontrada.", "ORDER_NOT_FOUND", 404);
    if (!order.items.some((item) => item.kind === "product") || status === "not_required") throw new CommerceError("Esta orden no requiere entrega física.", "INVALID_FULFILLMENT", 409);
    if (actor.role !== "admin" && !((order.fulfillmentStatus === "pending_fulfillment" && status === "ready_for_pickup") || (order.fulfillmentStatus === "ready_for_pickup" && status === "delivered"))) throw new CommerceError("El vendedor solo puede avanzar la entrega de forma secuencial.", "INVALID_FULFILLMENT_TRANSITION", 409);
    const updated = await this.database.commerceOrder.update({ where: { id: orderId }, data: { fulfillmentStatus: status, fulfilledAt: status === "delivered" ? new Date() : null }, include: orderInclude }); await this.audit(actor, "commerce.order.fulfillment_updated", "commerce_order", orderId, `Actualizó entrega a ${status}`); return orderDto(updated);
  }
  async listAdminDashboard(actor: CommerceActor): Promise<CommerceAdminDashboardDto> {
    assertAdmin(actor); const [orders, sellers, requested] = await Promise.all([this.database.commerceOrder.findMany({ include: orderInclude, orderBy: { createdAt: "desc" }, take: 10 }), this.database.commerceSeller.findMany({ where: { status: "active" }, select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } }), this.database.commerceRefundRequest.count({ where: { status: "requested" } })]);
    const counts = await this.database.commerceOrder.groupBy({ by: ["status", "fulfillmentStatus"], _count: { _all: true }, _sum: { totalMinor: true } }); const metric = (status: string, fulfillment?: string) => counts.filter((row) => row.status === status && (!fulfillment || row.fulfillmentStatus === fulfillment));
    return { metrics: { paidRevenueMinor: metric("paid").reduce((sum, row) => sum + (row._sum.totalMinor || 0), 0), paymentPending: metric("payment_pending").reduce((sum, row) => sum + row._count._all, 0), pendingFulfillment: metric("paid", "pending_fulfillment").reduce((sum, row) => sum + row._count._all, 0), readyForPickup: metric("paid", "ready_for_pickup").reduce((sum, row) => sum + row._count._all, 0), delivered: metric("paid", "delivered").reduce((sum, row) => sum + row._count._all, 0), refundRequests: requested }, recentOrders: orders.map(orderDto), sellers };
  }
  async listAdminOrders(actor: CommerceActor, filters: CommerceOrderFiltersDto) { assertAdmin(actor); const from = filters.from ? new Date(filters.from) : undefined; const to = filters.to ? new Date(filters.to) : undefined; return (await this.database.commerceOrder.findMany({ where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.fulfillmentStatus ? { fulfillmentStatus: filters.fulfillmentStatus } : {}), ...(filters.sellerId ? { sellerId: filters.sellerId } : {}), ...(from || to ? { createdAt: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) } } : {}) }, include: orderInclude, orderBy: { createdAt: "desc" }, take: 250 })).map(orderDto); }
  async listCommerceSellers(actor: CommerceActor) { assertAdmin(actor); return this.database.commerceSeller.findMany({ select: { id: true, slug: true, name: true, status: true, kind: true }, orderBy: { name: "asc" } }); }
  async updateSellerStatus(actor: CommerceActor, sellerId: string, status: "active" | "inactive") { assertAdmin(actor); const seller = await this.database.commerceSeller.update({ where: { id: sellerId }, data: { status }, select: { id: true, slug: true, name: true, status: true, kind: true } }); await this.audit(actor, "commerce.seller.status_updated", "commerce_seller", seller.id, `Actualizó estado a ${status}`); return seller; }
  async requestRefund(actor: CommerceActor, orderId: string, input: CreateCommerceRefundRequestDto) { const sellerIds = await this.sellerIds(actor); const order = await this.database.commerceOrder.findFirst({ where: { id: orderId, status: "paid", ...(sellerIds ? { sellerId: { in: sellerIds } } : {}) } }); if (!order) throw new CommerceError("Compra pagada no encontrada.", "ORDER_NOT_FOUND", 404); const remaining = order.totalMinor - order.refundedMinor; if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1 || input.amountMinor > remaining || !input.reason?.trim()) throw new CommerceError("El monto o motivo del reembolso no es válido.", "INVALID_REFUND", 400); return this.database.commerceRefundRequest.create({ data: { orderId, requestedById: actor.id, amountMinor: input.amountMinor, reason: input.reason.trim() }, select: { id: true, status: true } }); }
  async getRefundForExecution(actor: CommerceActor, refundId: string) { assertAdmin(actor); const refund = await this.database.commerceRefundRequest.findFirst({ where: { id: refundId, status: "requested" }, include: { order: true } }); if (!refund?.order.providerOrderId) throw new CommerceError("Solicitud de reembolso no encontrada.", "REFUND_NOT_FOUND", 404); return { id: refund.id, orderId: refund.orderId, providerOrderId: refund.order.providerOrderId, amountMinor: refund.amountMinor }; }
  async completeRefund(refundId: string, providerRefundId: string, reviewedById: string) { await this.database.$transaction(async (tx) => { const refund = await tx.commerceRefundRequest.update({ where: { id: refundId }, data: { status: "completed", providerRefundId, reviewedById, reviewedAt: new Date() } }); const order = await tx.commerceOrder.findUniqueOrThrow({ where: { id: refund.orderId } }); const refundedMinor = order.refundedMinor + refund.amountMinor; await tx.commerceOrder.update({ where: { id: order.id }, data: { refundedMinor, status: refundedMinor >= order.totalMinor ? "refunded" : order.status } }); }); }
}
