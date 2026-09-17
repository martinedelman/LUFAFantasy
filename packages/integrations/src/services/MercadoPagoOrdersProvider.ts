import type { CreateProviderOrderInput, PaymentProvider, VerifiedProviderOrder } from "@lufa/commerce";
import { CommerceError } from "@lufa/commerce";
import { createHmac, timingSafeEqual } from "node:crypto";

interface MercadoPagoOrder {
  id?: string;
  external_reference?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string | number;
  currency?: string;
  checkout_url?: string;
  user_id?: string | number;
  collector_id?: string | number;
  created_date?: string;
  last_updated_date?: string;
  transactions?: Array<{ id?: string; amount?: string | number; status?: string }>;
  integration_data?: { application_id?: string | number };
}

interface ProviderConfig {
  accessToken: string;
  collectorId: string;
  applicationId: string;
  apiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

function minorToDecimal(minor: number) {
  return (minor / 100).toFixed(2);
}

function decimalToMinor(value: string | number | undefined) {
  if (value === undefined || value === null || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) {
    throw new CommerceError("Mercado Pago devolvió un monto inválido.", "INVALID_PROVIDER_RESPONSE", 502);
  }
  const [whole, fraction = ""] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export class MercadoPagoOrdersProvider implements PaymentProvider {
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: ProviderConfig) {
    this.fetchImplementation = config.fetch || globalThis.fetch;
    this.apiBaseUrl = (config.apiBaseUrl || "https://api.mercadopago.com").replace(/\/$/, "");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.config.accessToken || !this.config.collectorId || !this.config.applicationId) throw new CommerceError("Faltan credenciales de Mercado Pago.", "PROVIDER_NOT_CONFIGURED", 503);
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.accessToken}`,
          ...init.headers,
        },
      });
    } catch (error) {
      throw new CommerceError(`No se pudo confirmar la operación con Mercado Pago: ${error instanceof Error ? error.message : "error de red"}`, "PROVIDER_AMBIGUOUS", 503);
    }
    const payload = await response.json().catch(() => null) as T | { message?: string } | null;
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "message" in payload ? String(payload.message) : `HTTP ${response.status}`;
      const code = response.status >= 500 || response.status === 429 ? "PROVIDER_AMBIGUOUS" : "PROVIDER_REJECTED";
      throw new CommerceError(`Mercado Pago rechazó la operación: ${message}`, code, code === "PROVIDER_REJECTED" ? 422 : 503);
    }
    return payload as T;
  }

  private normalize(order: MercadoPagoOrder): VerifiedProviderOrder {
    const collectorId = String(order.user_id ?? order.collector_id ?? "");
    const applicationId = String(order.integration_data?.application_id ?? "");
    if (!order.id || !order.external_reference || !order.status || !order.currency) {
      throw new CommerceError("Mercado Pago devolvió una orden incompleta.", "INVALID_PROVIDER_RESPONSE", 502);
    }
    if (collectorId !== this.config.collectorId || applicationId !== this.config.applicationId) {
      throw new CommerceError("La orden no pertenece a la cuenta configurada de LUFA.", "MERCHANT_MISMATCH", 502);
    }
    return {
      id: order.id,
      externalReference: order.external_reference,
      status: order.status_detail || order.status,
      currency: order.currency,
      totalMinor: decimalToMinor(order.total_amount),
      collectorId,
      applicationId,
      checkoutUrl: order.checkout_url || null,
      paidAt: order.status === "processed" ? new Date(order.last_updated_date || order.created_date || Date.now()) : null,
    };
  }

  async createOrder(input: CreateProviderOrderInput) {
    const total = minorToDecimal(input.totalMinor);
    const order = await this.request<MercadoPagoOrder>("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({
        type: "online",
        processing_mode: "manual",
        capture_mode: "automatic_async",
        external_reference: input.localOrderId,
        expiration_time: `PT${input.expirationMinutes}M`,
        total_amount: total,
        payer: { email: input.payerEmail },
        items: input.items.map((item) => ({
          title: item.title.slice(0, 120),
          quantity: item.quantity,
          unit_price: minorToDecimal(item.unitAmountMinor),
          unit_measure: "unit",
          total_amount: minorToDecimal(item.unitAmountMinor * item.quantity),
        })),
        config: {
          online: {
            success_url: input.successUrl,
            pending_url: input.pendingUrl,
            failure_url: input.failureUrl,
            auto_return: "all",
          },
          payment_method: { not_allowed_types: ["ticket"] },
        },
      }),
    });
    return this.normalize(order);
  }

  async getOrder(id: string) {
    return this.normalize(await this.request<MercadoPagoOrder>(`/v1/orders/${encodeURIComponent(id)}`));
  }

  async findOrderByExternalReference(reference: string) {
    const end = new Date();
    const begin = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const query = new URLSearchParams({
      begin_date: begin.toISOString(),
      end_date: end.toISOString(),
      external_reference: reference,
      limit: "1",
    });
    const result = await this.request<{ data?: MercadoPagoOrder[] }>(`/v1/orders?${query.toString()}`);
    return result.data?.[0] ? this.normalize(result.data[0]) : null;
  }

  async refundOrder(providerOrderId: string, amountMinor: number, idempotencyKey: string) {
    const current = await this.request<MercadoPagoOrder>(`/v1/orders/${encodeURIComponent(providerOrderId)}`);
    const totalMinor = decimalToMinor(current.total_amount);
    const transactionId = current.transactions?.find((transaction) => transaction.status === "processed" || transaction.status === "approved")?.id
      || current.transactions?.[0]?.id;
    const partial = amountMinor < totalMinor;
    if (partial && !transactionId) throw new CommerceError("No se encontró la transacción para el reembolso parcial.", "INVALID_PROVIDER_RESPONSE", 502);
    const body = partial ? { transactions: [{ id: transactionId, amount: minorToDecimal(amountMinor) }] } : undefined;
    const result = await this.request<{ id?: string }>(`/v1/orders/${encodeURIComponent(providerOrderId)}/refund`, {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { id: result.id || providerOrderId };
  }
}

export function verifyMercadoPagoWebhook(input: { signature: string | null; requestId: string | null; dataId: string; secret: string; now?: number }) {
  if (!input.signature || !input.requestId || !input.dataId || !input.secret) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((part) => part.trim().split("=", 2)));
  const timestamp = parts.ts;
  const received = parts.v1;
  if (!timestamp || !received || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const now = input.now ?? Date.now();
  const timestampMs = Number(timestamp) > 10_000_000_000 ? Number(timestamp) : Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > 5 * 60_000) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}
