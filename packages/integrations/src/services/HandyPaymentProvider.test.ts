import { describe, expect, it, vi } from "vitest";
import { decimalToMinor, HandyPaymentProvider, parseHandyNotification } from "./HandyPaymentProvider";

const transactionId = "b4a8e7c3-5d41-4b8f-a23a-9c7d1f31e8f0";

/** Handy responde JSON doblemente codificado (comprobado en su ambiente de testing). */
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(JSON.stringify(body)), { status, headers: { "Content-Type": "application/json" } });
}

function provider(fetchMock: (url: string, init?: RequestInit) => Promise<Response>, environment: "testing" | "production" = "testing") {
  return new HandyPaymentProvider({ merchantSecret: "merchant", environment, commerceName: "LUFA", fetch: fetchMock as typeof fetch });
}

const payment = {
  transactionId, invoiceNumber: 42, totalMinor: 244000, taxedMinor: 200000, imageUrl: "https://lufa.uy/pelota.jpg",
  items: [{ title: "Pelota", quantity: 2, unitAmountMinor: 122000, unitTaxedMinor: 100000 }],
  siteUrl: "https://lufa.uy/tienda/resultado?order=o1", callbackUrl: "https://api.lufa.uy/api/webhooks/handy/o1?token=abc",
};

describe("HandyPaymentProvider", () => {
  it("crea el link con montos decimales, moneda 858 y el callback por orden", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => { void url; void init; return jsonResponse({ url: "https://pago.arriba.uy?sessionId=M_1" }); });
    const result = await provider(fetchMock).createPayment(payment);
    expect(result).toEqual({ checkoutUrl: "https://pago.arriba.uy?sessionId=M_1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.payments.arriba.uy/api/v2/payments");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["merchant-secret-key"]).toBe("merchant");
    expect(JSON.parse(String(init?.body))).toEqual({
      CallbackUrl: payment.callbackUrl,
      ResponseType: "Json",
      Cart: {
        InvoiceNumber: 42, Currency: 858, TaxedAmount: 2000, TotalAmount: 2440, LinkImageUrl: "https://lufa.uy/pelota.jpg", TransactionExternalId: transactionId,
        Products: [{ Name: "Pelota x2", Quantity: 2, Amount: 1220, TaxedAmount: 1000 }],
      },
      Client: { CommerceName: "LUFA", SiteUrl: payment.siteUrl },
    });
  });

  it("acepta también JSON con codificación simple", async () => {
    const result = await provider(async () => new Response(JSON.stringify({ url: "https://pago.arriba.uy?sessionId=M_3" }), { status: 200 })).createPayment(payment);
    expect(result.checkoutUrl).toBe("https://pago.arriba.uy?sessionId=M_3");
  });

  it("usa la URL de producción y omite imágenes que no son https", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => { void url; void init; return jsonResponse({ url: "https://pago.handy.uy?sessionId=M_2" }); });
    await provider(fetchMock, "production").createPayment({ ...payment, imageUrl: "http://inseguro/img.jpg" });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.payments.handy.uy/api/v2/payments");
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)).Cart.LinkImageUrl).toBeUndefined();
  });

  it("distingue rechazos definitivos de fallas ambiguas", async () => {
    await expect(provider(async () => jsonResponse({ IsSuccess: false, Message: "La operación ya ha sido devuelta" }, 400)).refundPayment({ transactionId, callbackUrl: "https://x" }))
      .rejects.toMatchObject({ code: "PROVIDER_REJECTED", status: 422, message: expect.stringContaining("ya ha sido devuelta") });
    await expect(provider(async () => jsonResponse({ IsSuccess: false, Message: "No se encontraron datos" }, 404)).refundPayment({ transactionId, callbackUrl: "https://x" }))
      .rejects.toMatchObject({ code: "PROVIDER_REJECTED" });
    await expect(provider(async () => jsonResponse({}, 500)).createPayment(payment)).rejects.toMatchObject({ code: "PROVIDER_AMBIGUOUS", status: 503 });
    await expect(provider(async () => { throw new Error("ECONNRESET"); }).createPayment(payment)).rejects.toMatchObject({ code: "PROVIDER_AMBIGUOUS" });
    await expect(provider(async () => jsonResponse({ url: "javascript:alert(1)" })).createPayment(payment)).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE" });
  });

  it("solicita la devolución con DELETE y el callback", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => { void url; void init; return jsonResponse({ IsSuccess: true, StatusCode: 200, Message: "El proceso de devolución ha sido iniciado", TransactionExternalId: transactionId }); });
    await expect(provider(fetchMock).refundPayment({ transactionId, callbackUrl: "https://api/cb" })).resolves.toEqual({ message: "El proceso de devolución ha sido iniciado" });
    expect(fetchMock.mock.calls[0]![1]?.method).toBe("DELETE");
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ TransactionExternalId: transactionId, CallbackUrl: "https://api/cb" });
  });

  it("no llama a Handy sin merchant secret", async () => {
    const fetchMock = vi.fn();
    await expect(new HandyPaymentProvider({ merchantSecret: "", environment: "testing", commerceName: "LUFA", fetch: fetchMock as unknown as typeof fetch }).createPayment(payment))
      .rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("parseHandyNotification", () => {
  const purchase = { Created: "2025-10-07T12:28:13.0754271Z", Products: [{ Name: "Caramelo", Quantity: 1, Amount: 5, TaxedAmount: 4.1 }], TotalAmount: 5, TaxedAmount: 4.1, Currency: 858 };

  it("interpreta un pago con tarjeta (ejemplo del manual)", () => {
    expect(parseHandyNotification({
      TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 1 },
      InstrumentData: { Name: "520394XXXXXX3450", IssuerName: "MasterCard", IssuerImageUrl: "https://static.plexo.com.uy/issuers/4.svg", Expiration: null, NotACard: false },
    })).toEqual({
      kind: "payment", deliveryId: "1:2025-10-07T12:28:13.0754271Z",
      update: { transactionId, status: "paid", providerStatus: "handy:1", currency: "UYU", totalMinor: 500, occurredAt: new Date("2025-10-07T12:28:13.075Z"), paymentMethodId: "MasterCard", paymentMethodType: "card", paymentDueAt: null },
    });
  });

  it("conserva el vencimiento de un cupón Redpagos pendiente", () => {
    const parsed = parseHandyNotification({
      TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 3 },
      InstrumentData: { Name: "12345678", IssuerName: "Redpagos", Expiration: "2025-10-11T12:48:17", NotACard: true },
    });
    expect(parsed).toMatchObject({ kind: "payment", update: { status: "pending", paymentMethodType: "not_card", paymentMethodId: "Redpagos" } });
    expect(parsed.kind === "payment" && parsed.update.paymentDueAt).toBeInstanceOf(Date);
  });

  it("interpreta transferencias y pagos fallidos", () => {
    expect(parseHandyNotification({ TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 1 }, InstrumentData: { Name: "ITAÚ", IssuerName: "ITAÚ", Expiration: null, NotACard: false } }))
      .toMatchObject({ update: { status: "paid", paymentMethodId: "ITAÚ" } });
    expect(parseHandyNotification({ TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 2 } }))
      .toMatchObject({ update: { status: "failed", paymentMethodId: null, paymentMethodType: null } });
  });

  it("interpreta devoluciones exitosas y fallidas", () => {
    expect(parseHandyNotification({ Success: true, Message: "La devolución se completó correctamente", TransactionExternalId: transactionId }))
      .toMatchObject({ kind: "refund", transactionId, success: true });
    expect(parseHandyNotification({ Success: false, Message: "003: La operación ya ha sido devuelta", TransactionExternalId: transactionId }))
      .toMatchObject({ kind: "refund", success: false, message: "003: La operación ya ha sido devuelta" });
  });

  it("rechaza cuerpos malformados", () => {
    for (const body of [null, [], "x", { TransactionExternalId: "no-guid", Success: true }, { TransactionExternalId: transactionId },
      { TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 9 } },
      { TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 1, Currency: 978 } },
      { TransactionExternalId: transactionId, PurchaseData: { ...purchase, Status: 1, TotalAmount: "5.001" } }]) {
      expect(() => parseHandyNotification(body), JSON.stringify(body)).toThrow(expect.objectContaining({ code: "INVALID_PROVIDER_NOTIFICATION" }));
    }
  });

  it("convierte decimales sin perder centésimos", () => {
    expect(decimalToMinor(4.1)).toBe(410);
    expect(decimalToMinor("1220.50")).toBe(122050);
    expect(decimalToMinor(-1)).toBeNull();
  });
});
