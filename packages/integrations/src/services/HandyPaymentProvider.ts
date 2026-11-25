import type { CreateProviderPaymentInput, PaymentProvider, ProviderNotification, ProviderPaymentStatus } from "@lufa/commerce";
import { CommerceError } from "@lufa/commerce";

/** Botón de Pago Handy, API v2 (manual de integración v2.0, sep-2025). */
export type HandyEnvironment = "testing" | "production";

const BASE_URLS: Record<HandyEnvironment, string> = {
  testing: "https://api.payments.arriba.uy/api/v2",
  production: "https://api.payments.handy.uy/api/v2",
};

/** ISO 4217: 858 = peso uruguayo, 840 = dólar. */
const CURRENCIES: Record<number, string> = { 858: "UYU", 840: "USD" };
const UYU = 858;

const PAYMENT_STATUSES: Record<number, ProviderPaymentStatus> = { 0: "started", 1: "paid", 2: "failed", 3: "pending" };

interface HandyConfig {
  merchantSecret: string;
  environment: HandyEnvironment;
  commerceName: string;
  fetch?: typeof globalThis.fetch;
}

/** Centésimos a número decimal con dos dígitos, como lo espera Handy. */
export function minorToDecimal(minor: number) {
  return Number((minor / 100).toFixed(2));
}

/** Monto decimal de Handy a centésimos, rechazando valores con más de dos decimales. */
export function decimalToMinor(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const minor = Math.round(Number(text) * 100);
  return Math.abs(minor - Number(text) * 100) < 1e-6 ? minor : null;
}

function isGuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Handy responde JSON doblemente codificado (el cuerpo es un string que contiene JSON),
 * verificado contra el ambiente de testing. Se aceptan ambas formas.
 */
function parseBody(text: string): Record<string, unknown> | null {
  let value: unknown = text;
  for (let depth = 0; depth < 2 && typeof value === "string"; depth += 1) {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function invalid(message: string): never {
  throw new CommerceError(message, "INVALID_PROVIDER_NOTIFICATION", 400);
}

/** Valida la forma de una notificación de Handy. No la autentica: Handy no firma sus callbacks. */
export function parseHandyNotification(body: unknown): ProviderNotification {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid("La notificación no es un objeto JSON.");
  const payload = body as Record<string, unknown>;
  if (!isGuid(payload.TransactionExternalId)) invalid("La notificación no trae un TransactionExternalId válido.");
  const transactionId = payload.TransactionExternalId;

  if (typeof payload.Success === "boolean") {
    const message = typeof payload.Message === "string" ? payload.Message.slice(0, 500) : "";
    return { kind: "refund", deliveryId: `${payload.Success}:${message}`, transactionId, success: payload.Success, message };
  }

  const purchase = payload.PurchaseData as Record<string, unknown> | undefined;
  if (!purchase || typeof purchase !== "object") invalid("La notificación no trae PurchaseData.");
  const rawStatus = Number(purchase.Status);
  const status = PAYMENT_STATUSES[rawStatus];
  if (!Number.isInteger(rawStatus) || !status) invalid("La notificación trae un estado de pago desconocido.");
  const currency = CURRENCIES[Number(purchase.Currency)];
  if (!currency) invalid("La notificación trae una moneda desconocida.");
  const totalMinor = decimalToMinor(purchase.TotalAmount);
  if (totalMinor === null) invalid("La notificación trae un monto inválido.");
  const instrument = payload.InstrumentData && typeof payload.InstrumentData === "object" ? payload.InstrumentData as Record<string, unknown> : null;
  const issuerName = typeof instrument?.IssuerName === "string" && instrument.IssuerName ? instrument.IssuerName.slice(0, 80) : null;
  const created = typeof purchase.Created === "string" ? purchase.Created : "";
  return {
    kind: "payment",
    deliveryId: `${rawStatus}:${created}`,
    update: {
      transactionId,
      status,
      providerStatus: `handy:${rawStatus}`,
      currency,
      totalMinor,
      occurredAt: optionalDate(created),
      paymentMethodId: issuerName,
      paymentMethodType: instrument && typeof instrument.NotACard === "boolean" ? (instrument.NotACard ? "not_card" : "card") : null,
      paymentDueAt: status === "pending" ? optionalDate(instrument?.Expiration) : null,
    },
  };
}

export class HandyPaymentProvider implements PaymentProvider {
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly baseUrl: string;

  constructor(private readonly config: HandyConfig) {
    this.fetchImplementation = config.fetch || globalThis.fetch;
    this.baseUrl = BASE_URLS[config.environment];
  }

  private async request<T>(method: "POST" | "DELETE", body: unknown): Promise<T> {
    if (!this.config.merchantSecret) throw new CommerceError("Faltan las credenciales de Handy.", "PROVIDER_NOT_CONFIGURED", 503);
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.baseUrl}/payments`, {
        method,
        headers: { Accept: "application/json", "Content-Type": "application/json", "merchant-secret-key": this.config.merchantSecret },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new CommerceError(`No se pudo confirmar la operación con Handy: ${error instanceof Error ? error.message : "error de red"}`, "PROVIDER_AMBIGUOUS", 503);
    }
    const payload = parseBody(await response.text()) as (T & { Message?: string; message?: string; IsSuccess?: boolean }) | null;
    const rejected = !response.ok || payload?.IsSuccess === false;
    if (rejected) {
      const message = payload?.Message || payload?.message || `HTTP ${response.status}`;
      const ambiguous = response.status >= 500 || response.status === 429;
      throw new CommerceError(`Handy rechazó la operación: ${message}`, ambiguous ? "PROVIDER_AMBIGUOUS" : "PROVIDER_REJECTED", ambiguous ? 503 : 422);
    }
    if (!payload) throw new CommerceError("Handy devolvió una respuesta vacía.", "INVALID_PROVIDER_RESPONSE", 502);
    return payload;
  }

  async createPayment(input: CreateProviderPaymentInput) {
    const result = await this.request<{ url?: string }>("POST", {
      CallbackUrl: input.callbackUrl,
      ResponseType: "Json",
      Cart: {
        InvoiceNumber: input.invoiceNumber,
        Currency: UYU,
        TaxedAmount: minorToDecimal(input.taxedMinor),
        TotalAmount: minorToDecimal(input.totalMinor),
        ...(input.imageUrl?.startsWith("https://") ? { LinkImageUrl: input.imageUrl } : {}),
        TransactionExternalId: input.transactionId,
        // La página de Handy resume los productos en una línea con sus nombres e ignora Quantity:
        // la cantidad va también en el nombre para que el comprador la vea.
        Products: input.items.map((item) => ({
          Name: `${item.title.slice(0, 110)}${item.quantity > 1 ? ` x${item.quantity}` : ""}`,
          Quantity: item.quantity,
          Amount: minorToDecimal(item.unitAmountMinor),
          TaxedAmount: minorToDecimal(item.unitTaxedMinor),
        })),
      },
      Client: { CommerceName: this.config.commerceName, SiteUrl: input.siteUrl },
    });
    if (typeof result.url !== "string" || !result.url.startsWith("https://")) {
      throw new CommerceError("Handy no devolvió un link de pago válido.", "INVALID_PROVIDER_RESPONSE", 502);
    }
    return { checkoutUrl: result.url };
  }

  async refundPayment(input: { transactionId: string; callbackUrl: string }) {
    const result = await this.request<{ Message?: string }>("DELETE", { TransactionExternalId: input.transactionId, CallbackUrl: input.callbackUrl });
    return { message: result.Message || "Devolución iniciada." };
  }

  parseNotification(body: unknown) {
    return parseHandyNotification(body);
  }
}
