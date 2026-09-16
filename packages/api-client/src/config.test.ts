import { afterEach, describe, expect, it, vi } from "vitest";
import { API_PREFIX, DEFAULT_API_URL, apiEndpoint, getApiUrl, resolveApiBaseUrl } from "./config";

describe("api config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("falls back to the local API when API_URL is not set", () => {
    vi.stubEnv("API_URL", "");
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
    expect(getApiUrl("http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001");
  });

  it("reads API_URL and strips trailing slashes", () => {
    vi.stubEnv("API_URL", "https://api.lufa.test///");
    expect(getApiUrl()).toBe("https://api.lufa.test");
    expect(apiEndpoint("/games/game-1")).toBe("https://api.lufa.test/api/games/game-1");
    expect(apiEndpoint(":path*")).toBe("https://api.lufa.test/api/:path*");
    expect(apiEndpoint()).toBe(`https://api.lufa.test${API_PREFIX}`);
  });

  it("targets API_URL on the server and the same-origin rewrite in the browser", () => {
    vi.stubEnv("API_URL", "https://api.lufa.test");
    expect(resolveApiBaseUrl()).toBe("https://api.lufa.test/api");

    vi.stubGlobal("window", {});
    expect(resolveApiBaseUrl()).toBe(API_PREFIX);
  });
});
