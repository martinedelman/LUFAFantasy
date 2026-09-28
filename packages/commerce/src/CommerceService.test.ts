import { describe, expect, it, vi } from "vitest";
import { CommerceError, CommerceService, type CommerceRepository, type PaymentProvider } from "./index";

function service() {
  const repository = { reserveOrder: vi.fn(), quoteCheckout: vi.fn(), attachProviderOrder: vi.fn() } as unknown as CommerceRepository;
  const provider = { createOrder: vi.fn() } as unknown as PaymentProvider;
  return { repository, provider, subject: new CommerceService(repository, provider, { liveMode: false, returnBaseUrl: "https://test.lufa.uy", reservationMinutes: 30, maxInstallments: 12 }) };
}

describe("CommerceService", () => {
  it("rechaza cantidades manipuladas antes de reservar stock", async () => {
    const { repository, subject } = service();
    await expect(subject.createCheckout({ id: "u1", name: "Ana", email: "ana@example.com", role: "user" }, {
      idempotencyKey: "1234567890123456",
      items: [{ itemId: "item", quantity: 0 }],
    })).rejects.toMatchObject({ code: "INVALID_CART" } satisfies Partial<CommerceError>);
    expect(repository.reserveOrder).not.toHaveBeenCalled();
  });

  it("normaliza el carrito para producir la misma huella", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.reserveOrder).mockRejectedValue(new Error("stop"));
    await expect(subject.createCheckout({ id: "u1", name: "Ana", email: "ana@example.com", role: "user" }, {
      idempotencyKey: "1234567890123456",
      items: [{ itemId: "b", quantity: 1 }, { itemId: "a", quantity: 2 }],
    })).rejects.toThrow("stop");
    expect(vi.mocked(repository.reserveOrder).mock.calls[0]?.[0].request.items.map((item) => item.itemId)).toEqual(["a", "b"]);
  });

  it("preserva la variante elegida al reservar el checkout", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.reserveOrder).mockRejectedValue(new Error("stop"));
    await expect(subject.createCheckout({ id: "u1", name: "Ana", email: "ana@example.com", role: "user" }, {
      idempotencyKey: "1234567890123456",
      items: [{ itemId: "guantes", variantId: "talle-m", quantity: 1 }],
    })).rejects.toThrow("stop");
    expect(vi.mocked(repository.reserveOrder).mock.calls[0]?.[0].request.items).toEqual([{ itemId: "guantes", variantId: "talle-m", quantity: 1 }]);
  });

  it("distingue contado y cuotas en la reserva y en la orden de Mercado Pago", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.reserveOrder).mockResolvedValue({ id: "order-1", checkoutUrl: null, buyerEmail: "ana@example.com", idempotencyKey: "1234567890123456", providerOrderId: null, payloadFingerprint: "x", totalMinor: 10000, items: [{ title: "Guantes", quantity: 1, unitPriceMinor: 10000, unitDiscountMinor: 0 }] } as never);
    vi.mocked(provider.createOrder).mockResolvedValue({} as never);
    vi.mocked(repository.attachProviderOrder).mockResolvedValue({} as never);
    await subject.createCheckout({ id: "u1", name: "Ana", email: "ana@example.com", role: "user" }, { idempotencyKey: "1234567890123456", paymentMode: "installments", items: [{ itemId: "guantes", quantity: 1 }] });
    expect(vi.mocked(repository.reserveOrder).mock.calls[0]?.[0]).toMatchObject({ maxInstallments: 12, request: { paymentMode: "installments" } });
    expect(vi.mocked(provider.createOrder).mock.calls[0]?.[0]).toMatchObject({ paymentMode: "installments", maxInstallments: 12 });
  });

  it("solicita cotización sin aceptar precios enviados por el navegador", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.quoteCheckout).mockResolvedValue({ currency: "UYU", seller: { id: "lufa", slug: "lufa", name: "LUFA" }, subtotalMinor: 10000, discountMinor: 0, totalMinor: 10000, items: [] });
    await subject.quoteCheckout({ id: "u1", name: "Ana", email: "ana@example.com", role: "user" }, { items: [{ itemId: "guantes", variantId: "m", quantity: 1 }] });
    expect(vi.mocked(repository.quoteCheckout)).toHaveBeenCalledWith(expect.objectContaining({ request: { items: [{ itemId: "guantes", variantId: "m", quantity: 1 }] } }));
  });
});
