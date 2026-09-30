import { describe, expect, it, vi } from "vitest";
import { MercadoPagoOrdersProvider } from "./MercadoPagoOrdersProvider";

describe("MercadoPagoOrdersProvider", () => {
  it("crea Orders API con dinero exacto y clave idempotente", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => { void url; void init; return new Response(JSON.stringify({
      id: "ORD1", external_reference: "local-1", status: "created", total_amount: "1500.00", currency: "UYU",
      checkout_url: "https://www.mercadopago.com.uy/checkout", user_id: "seller", integration_data: { application_id: "app" },
    }), { status: 201, headers: { "Content-Type": "application/json" } }); });
    const provider = new MercadoPagoOrdersProvider({ accessToken: "secret", collectorId: "seller", applicationId: "app", fetch: fetchMock as typeof fetch });
    const result = await provider.createOrder({ localOrderId: "local-1", idempotencyKey: "idem", payerEmail: "a@b.com", totalMinor: 150000,
      items: [{ title: "Pelota", quantity: 1, unitAmountMinor: 150000 }], successUrl: "https://lufa/s", pendingUrl: "https://lufa/p", failureUrl: "https://lufa/f", expirationMinutes: 30, paymentMode: "cash", maxInstallments: 1 });
    expect(result.totalMinor).toBe(150000);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("idem");
    const payload = JSON.parse(String(init.body));
    expect(payload.total_amount).toBe("1500.00");
    expect(payload.items).toEqual([{ title: "Pelota", quantity: 1, unit_price: "1500.00" }]);
    expect(payload.config.online.success_url).toBe("https://lufa/s");
    expect(payload.config.payment_method.not_allowed_types).toEqual(["ticket"]);
    expect(payload.config.payment_method.max_installments).toBe(1);
    expect(payload.config.payment_method.installments_cost).toBeUndefined();
  });

  it("deja el costo financiero a Mercado Pago al habilitar cuotas", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({
      id: "ORD1", external_reference: "local-1", status: "created", total_amount: "1500.00", currency: "UYU",
      checkout_url: "https://www.mercadopago.com.uy/checkout", user_id: "seller", integration_data: { application_id: "app" },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const provider = new MercadoPagoOrdersProvider({ accessToken: "secret", collectorId: "seller", applicationId: "app", fetch: fetchMock as typeof fetch });
    await provider.createOrder({ localOrderId: "local-1", idempotencyKey: "idem", payerEmail: "a@b.com", totalMinor: 150000, items: [{ title: "Pelota", quantity: 1, unitAmountMinor: 150000 }], successUrl: "https://lufa/s", pendingUrl: "https://lufa/p", failureUrl: "https://lufa/f", expirationMinutes: 30, paymentMode: "installments", maxInstallments: 12 });
    const payload = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(payload.config.payment_method).toMatchObject({ max_installments: 12, not_allowed_types: ["ticket"] });
    expect(payload.config.payment_method.default_type).toBeUndefined();
    expect(payload.config.payment_method.installments_cost).toBeUndefined();
  });
});
