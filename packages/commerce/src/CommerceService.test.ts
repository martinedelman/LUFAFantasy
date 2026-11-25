import { describe, expect, it, vi } from "vitest";
import { CommerceError, CommerceService, taxedMinor, type CommerceRepository, type PaymentProvider, type ProviderNotification } from "./index";

const buyer = { id: "u1", name: "Ana", email: "ana@example.com", role: "user" };
const transactionId = "b4a8e7c3-5d41-4b8f-a23a-9c7d1f31e8f0";
const config = { liveMode: false, returnBaseUrl: "https://test.lufa.uy", callbackBaseUrl: "https://api.test.lufa.uy", callbackSecret: "secret", reservationMinutes: 30 };

function service() {
  const repository = {
    reserveOrder: vi.fn(), quoteCheckout: vi.fn(), attachCheckoutUrl: vi.fn(), cancelCreation: vi.fn(), getOrderForPayment: vi.fn(),
    applyPaymentUpdate: vi.fn(), applyRefundResult: vi.fn(), recordWebhook: vi.fn(), completeWebhook: vi.fn(),
    getRefundForExecution: vi.fn(), markRefundProcessing: vi.fn(), markRefundFailed: vi.fn(), listExpiredReservations: vi.fn(), expireOrder: vi.fn(),
  } as unknown as CommerceRepository;
  const provider = { createPayment: vi.fn(), refundPayment: vi.fn(), parseNotification: vi.fn() } as unknown as PaymentProvider;
  return { repository, provider, subject: new CommerceService(repository, provider, config) };
}

const reserved = {
  id: "order-1", checkoutUrl: null, buyerEmail: "ana@example.com", idempotencyKey: "1234567890123456", providerOrderId: transactionId, invoiceNumber: 7,
  imageUrl: "https://lufa.uy/guantes.jpg", payloadFingerprint: "x", totalMinor: 20000,
  items: [
    { title: "Guantes", quantity: 2, unitPriceMinor: 6100, unitDiscountMinor: 0, vatRateBps: 2200 },
    { title: "Curso", quantity: 1, unitPriceMinor: 9000, unitDiscountMinor: 1200, vatRateBps: 0 },
  ],
};

function paidNotification(overrides: Partial<{ transactionId: string; totalMinor: number; currency: string }> = {}): ProviderNotification {
  return { kind: "payment", deliveryId: "1:2025-10-07", update: { transactionId, status: "paid", providerStatus: "handy:1", currency: "UYU", totalMinor: 20000, occurredAt: null, paymentMethodId: "MasterCard", paymentMethodType: "card", paymentDueAt: null, ...overrides } };
}

describe("CommerceService", () => {
  it("rechaza cantidades manipuladas antes de reservar stock", async () => {
    const { repository, subject } = service();
    await expect(subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "item", quantity: 0 }] }))
      .rejects.toMatchObject({ code: "INVALID_CART" } satisfies Partial<CommerceError>);
    expect(repository.reserveOrder).not.toHaveBeenCalled();
  });

  it("normaliza el carrito para producir la misma huella", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.reserveOrder).mockRejectedValue(new Error("stop"));
    await expect(subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "b", quantity: 1 }, { itemId: "a", quantity: 2 }] })).rejects.toThrow("stop");
    expect(vi.mocked(repository.reserveOrder).mock.calls[0]?.[0].request.items.map((item) => item.itemId)).toEqual(["a", "b"]);
  });

  it("preserva la variante elegida al reservar el checkout", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.reserveOrder).mockRejectedValue(new Error("stop"));
    await expect(subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "guantes", variantId: "talle-m", quantity: 1 }] })).rejects.toThrow("stop");
    expect(vi.mocked(repository.reserveOrder).mock.calls[0]?.[0].request.items).toEqual([{ itemId: "guantes", variantId: "talle-m", quantity: 1 }]);
  });

  it("crea el pago en Handy con IVA por línea, callback firmado y retorno a la tienda", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.reserveOrder).mockResolvedValue(reserved as never);
    vi.mocked(provider.createPayment).mockResolvedValue({ checkoutUrl: "https://pago.arriba.uy?sessionId=M_1" });
    vi.mocked(repository.attachCheckoutUrl).mockResolvedValue({} as never);
    await subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "guantes", quantity: 2 }] });
    const input = vi.mocked(provider.createPayment).mock.calls[0]![0];
    expect(input).toMatchObject({
      transactionId, invoiceNumber: 7, totalMinor: 20000, taxedMinor: 10000, imageUrl: "https://lufa.uy/guantes.jpg",
      items: [{ title: "Guantes", quantity: 2, unitAmountMinor: 6100, unitTaxedMinor: 5000 }, { title: "Curso", quantity: 1, unitAmountMinor: 7800, unitTaxedMinor: 0 }],
      siteUrl: "https://test.lufa.uy/tienda/resultado?order=order-1",
    });
    expect(input.callbackUrl).toBe(`https://api.test.lufa.uy/api/webhooks/handy/order-1?token=${subject.callbackToken("order-1")}`);
    expect(repository.attachCheckoutUrl).toHaveBeenCalledWith("order-1", "https://pago.arriba.uy?sessionId=M_1");
  });

  it("no crea un segundo link si la reserva ya tiene uno", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.reserveOrder).mockResolvedValue({ ...reserved, checkoutUrl: "https://pago.arriba.uy?sessionId=M_1" } as never);
    await subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "guantes", quantity: 2 }] });
    expect(provider.createPayment).not.toHaveBeenCalled();
  });

  it("libera la reserva si Handy rechaza el link", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.reserveOrder).mockResolvedValue(reserved as never);
    vi.mocked(provider.createPayment).mockRejectedValue(new CommerceError("Handy rechazó", "PROVIDER_REJECTED", 422));
    await expect(subject.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "guantes", quantity: 2 }] })).rejects.toMatchObject({ code: "PROVIDER_REJECTED" });
    expect(repository.cancelCreation).toHaveBeenCalledWith("order-1", "Handy rechazó");
  });

  it("no cobra en producción sin callback https", async () => {
    const { repository } = service();
    const live = new CommerceService(repository, {} as PaymentProvider, { ...config, liveMode: true, callbackBaseUrl: "http://api" });
    await expect(live.createCheckout(buyer, { idempotencyKey: "1234567890123456", items: [{ itemId: "a", quantity: 1 }] })).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });

  it("solicita cotización sin aceptar precios enviados por el navegador", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.quoteCheckout).mockResolvedValue({ currency: "UYU", seller: { id: "lufa", slug: "lufa", name: "LUFA" }, subtotalMinor: 10000, discountMinor: 0, totalMinor: 10000, items: [] });
    await subject.quoteCheckout(buyer, { items: [{ itemId: "guantes", variantId: "m", quantity: 1 }] });
    expect(vi.mocked(repository.quoteCheckout)).toHaveBeenCalledWith(expect.objectContaining({ request: { items: [{ itemId: "guantes", variantId: "m", quantity: 1 }] } }));
  });

  it("calcula la parte gravada para 22%, 10% y exento", () => {
    expect(taxedMinor(500, 2200)).toBe(410);
    expect(taxedMinor(11000, 1000)).toBe(10000);
    expect(taxedMinor(5000, 0)).toBe(0);
  });
});

describe("CommerceService.processProviderNotification", () => {
  function ready() {
    const context = service();
    vi.mocked(context.repository.getOrderForPayment).mockResolvedValue(reserved as never);
    vi.mocked(context.repository.recordWebhook).mockResolvedValue({ id: "wh1", alreadyProcessed: false });
    return context;
  }

  it("rechaza callbacks sin el token de la orden sin tocar la base", async () => {
    const { repository, subject } = ready();
    for (const token of [null, "abc", subject.callbackToken("otra-orden")]) {
      await expect(subject.processProviderNotification({ orderId: "order-1", token, body: {} })).rejects.toMatchObject({ code: "INVALID_CALLBACK_TOKEN", status: 401 });
    }
    expect(repository.getOrderForPayment).not.toHaveBeenCalled();
  });

  it("aplica un pago que coincide con la compra local", async () => {
    const { repository, provider, subject } = ready();
    vi.mocked(provider.parseNotification).mockReturnValue(paidNotification({ transactionId: transactionId.toUpperCase() }));
    await subject.processProviderNotification({ orderId: "order-1", token: subject.callbackToken("order-1"), body: {} });
    expect(repository.applyPaymentUpdate).toHaveBeenCalledWith("order-1", expect.objectContaining({ status: "paid" }));
    expect(repository.recordWebhook).toHaveBeenCalledWith(expect.objectContaining({ providerResourceId: transactionId, action: "payment.paid", liveMode: false }));
    expect(repository.completeWebhook).toHaveBeenCalledWith("wh1");
  });

  it("rechaza notificaciones de otra transacción, otro monto u otra moneda", async () => {
    for (const overrides of [{ transactionId: "9f3a1c72-0b4d-4e5a-91c8-52f6e30a0d7e" }, { totalMinor: 19999 }, { currency: "USD" }]) {
      const { repository, provider, subject } = ready();
      vi.mocked(provider.parseNotification).mockReturnValue(paidNotification(overrides));
      await expect(subject.processProviderNotification({ orderId: "order-1", token: subject.callbackToken("order-1"), body: {} })).rejects.toMatchObject({ code: "PAYMENT_MISMATCH" });
      expect(repository.applyPaymentUpdate).not.toHaveBeenCalled();
    }
  });

  it("ignora notificaciones ya procesadas", async () => {
    const { repository, provider, subject } = ready();
    vi.mocked(repository.recordWebhook).mockResolvedValue({ id: "wh1", alreadyProcessed: true });
    vi.mocked(provider.parseNotification).mockReturnValue(paidNotification());
    await subject.processProviderNotification({ orderId: "order-1", token: subject.callbackToken("order-1"), body: {} });
    expect(repository.applyPaymentUpdate).not.toHaveBeenCalled();
  });

  it("registra el resultado de una devolución", async () => {
    const { repository, provider, subject } = ready();
    vi.mocked(provider.parseNotification).mockReturnValue({ kind: "refund", deliveryId: "false:003", transactionId, success: false, message: "003: La operación ya ha sido devuelta" });
    await subject.processProviderNotification({ orderId: "order-1", token: subject.callbackToken("order-1"), body: {} });
    expect(repository.applyRefundResult).toHaveBeenCalledWith("order-1", { success: false, message: "003: La operación ya ha sido devuelta" });
  });
});

describe("CommerceService.executeRefund", () => {
  const admin = { id: "admin", name: "Admin", email: "admin@lufa.uy", role: "admin" };

  it("marca la devolución en curso antes de pedirla a Handy", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.getRefundForExecution).mockResolvedValue({ id: "r1", orderId: "order-1", transactionId, amountMinor: 20000 });
    vi.mocked(provider.refundPayment).mockImplementation(async () => {
      expect(repository.markRefundProcessing).toHaveBeenCalledWith("r1", "admin", expect.any(String));
      return { message: "El proceso de devolución ha sido iniciado" };
    });
    await expect(subject.executeRefund(admin, "r1")).resolves.toMatchObject({ status: "processing" });
    expect(vi.mocked(provider.refundPayment).mock.calls[0]![0]).toEqual({ transactionId, callbackUrl: expect.stringContaining("/api/webhooks/handy/order-1?token=") });
  });

  it("marca como fallida una devolución que Handy rechaza", async () => {
    const { repository, provider, subject } = service();
    vi.mocked(repository.getRefundForExecution).mockResolvedValue({ id: "r1", orderId: "order-1", transactionId, amountMinor: 20000 });
    vi.mocked(provider.refundPayment).mockRejectedValue(new CommerceError("El sello no permite la devolución", "PROVIDER_REJECTED", 422));
    await expect(subject.executeRefund(admin, "r1")).rejects.toMatchObject({ code: "PROVIDER_REJECTED" });
    expect(repository.markRefundFailed).toHaveBeenCalledWith("r1", "admin", "El sello no permite la devolución");
  });
});

describe("CommerceService.reconcilePending", () => {
  it("sólo expira reservas vencidas", async () => {
    const { repository, subject } = service();
    vi.mocked(repository.listExpiredReservations).mockResolvedValue([{ id: "o1" }, { id: "o2" }]);
    vi.mocked(repository.expireOrder).mockResolvedValueOnce().mockRejectedValueOnce(new Error("db"));
    await expect(subject.reconcilePending()).resolves.toEqual({ inspected: 2, reconciled: 1, failed: 1 });
  });
});
