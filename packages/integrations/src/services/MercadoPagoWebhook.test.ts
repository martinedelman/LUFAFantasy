import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhook } from "./MercadoPagoOrdersProvider";

describe("verifyMercadoPagoWebhook", () => {
  it("valida la firma canónica y rechaza replays antiguos", () => {
    const now = 1_800_000_000_000;
    const ts = String(now);
    const manifest = `id:ord1;request-id:req-1;ts:${ts};`;
    const signature = createHmac("sha256", "secret").update(manifest).digest("hex");
    expect(verifyMercadoPagoWebhook({ signature: `ts=${ts},v1=${signature}`, requestId: "req-1", dataId: "ORD1", secret: "secret", now })).toBe(true);
    expect(verifyMercadoPagoWebhook({ signature: `ts=${ts},v1=${signature}`, requestId: "req-1", dataId: "ORD1", secret: "secret", now: now + 301_000 })).toBe(false);
  });
});
