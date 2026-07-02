import { describe, it, expect } from "vitest";
import { buildRequestCacheKey, createCacheHeaders } from "@/lib/serverCache";

describe("buildRequestCacheKey", () => {
  it("returns namespace when no searchParams", () => {
    expect(buildRequestCacheKey("games")).toBe("games");
  });

  it("returns namespace when searchParams is undefined", () => {
    expect(buildRequestCacheKey("teams", undefined)).toBe("teams");
  });

  it("returns namespace when searchParams is empty", () => {
    const params = new URLSearchParams();
    expect(buildRequestCacheKey("players", params)).toBe("players");
  });

  it("appends sorted params", () => {
    const params = new URLSearchParams();
    params.set("status", "active");
    params.set("division", "abc123");
    const key = buildRequestCacheKey("teams", params);
    expect(key).toBe("teams:division=abc123&status=active");
  });

  it("sorts params alphabetically by key", () => {
    const params = new URLSearchParams();
    params.set("z", "1");
    params.set("a", "2");
    const key = buildRequestCacheKey("ns", params);
    expect(key).toBe("ns:a=2&z=1");
  });

  it("encodes special characters in params", () => {
    const params = new URLSearchParams();
    params.set("name", "hello world");
    const key = buildRequestCacheKey("ns", params);
    expect(key).toContain("hello%20world");
  });

  it("sorts by value when keys are equal", () => {
    const params = new URLSearchParams();
    params.append("tag", "beta");
    params.append("tag", "alpha");
    const key = buildRequestCacheKey("ns", params);
    expect(key).toBe("ns:tag=alpha&tag=beta");
  });
});

describe("createCacheHeaders", () => {
  it("creates correct Cache-Control header", () => {
    const headers = createCacheHeaders(60);
    expect(headers["Cache-Control"]).toBe("private, max-age=60");
  });

  it("includes X-Cache-TTL header", () => {
    const headers = createCacheHeaders(300);
    expect(headers["X-Cache-TTL"]).toBe("300");
  });

  it("handles 0 TTL", () => {
    const headers = createCacheHeaders(0);
    expect(headers["Cache-Control"]).toBe("private, max-age=0");
    expect(headers["X-Cache-TTL"]).toBe("0");
  });
});
