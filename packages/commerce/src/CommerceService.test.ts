import { describe, expect, it, vi } from "vitest";
import { CommerceError, CommerceService, type CommerceRepository, type PaymentProvider } from "./index";

function service() {
  const repository = { reserveOrder: vi.fn() } as unknown as CommerceRepository;
  const provider = {} as PaymentProvider;
  return { repository, subject: new CommerceService(repository, provider, { liveMode: false, returnBaseUrl: "https://test.lufa.uy", reservationMinutes: 30 }) };
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
});
