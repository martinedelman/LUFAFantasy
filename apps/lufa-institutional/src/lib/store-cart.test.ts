import { describe, expect, it } from "vitest";
import { cartSignature, normalizeCart } from "./store-cart";

describe("store cart", () => {
  it("descarta entradas corruptas y repetidas", () => {
    expect(normalizeCart([{ itemId: "guantes", variantId: "m", quantity: 1 }, { itemId: "guantes", variantId: "m", quantity: 2 }, { itemId: "", quantity: 1 }, { itemId: "balon", quantity: 0 }])).toEqual([{ itemId: "guantes", variantId: "m", quantity: 1 }]);
  });

  it("produce una firma estable aunque el navegador cambie el orden", () => {
    expect(cartSignature([{ itemId: "b", variantId: null, quantity: 1 }, { itemId: "a", variantId: "m", quantity: 2 }])).toBe(cartSignature([{ itemId: "a", variantId: "m", quantity: 2 }, { itemId: "b", variantId: null, quantity: 1 }]));
  });
});
