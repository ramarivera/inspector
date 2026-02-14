import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session-token", () => ({
  authFetch: vi.fn(),
}));

describe("auto OAuth detection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("detects common 401/Unauthorized connection errors", async () => {
    const { isLikelyOAuthRequiredConnectionError } = await import(
      "../auto-oauth-detection"
    );

    expect(isLikelyOAuthRequiredConnectionError("Unauthorized")).toBe(true);
    expect(
      isLikelyOAuthRequiredConnectionError("Non-200 status code (401)"),
    ).toBe(true);
    expect(isLikelyOAuthRequiredConnectionError("HTTP 401: nope")).toBe(true);
    expect(isLikelyOAuthRequiredConnectionError("ECONNREFUSED")).toBe(false);
  });

  it("returns true when protected resource metadata includes authorization_servers", async () => {
    const sessionToken = await import("@/lib/session-token");
    const authFetch = sessionToken.authFetch as ReturnType<typeof vi.fn>;

    authFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          resource: "http://localhost:3000/mcp",
          authorization_servers: ["https://issuer.example.com"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { serverAdvertisesOAuth } = await import("../auto-oauth-detection");
    const ok = await serverAdvertisesOAuth("http://localhost:3000/mcp");
    expect(ok).toBe(true);

    expect(authFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/mcp\/oauth\/metadata\?url=/),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns false when metadata fetch fails", async () => {
    const sessionToken = await import("@/lib/session-token");
    const authFetch = sessionToken.authFetch as ReturnType<typeof vi.fn>;
    authFetch.mockResolvedValue(new Response("nope", { status: 404 }));

    const { serverAdvertisesOAuth } = await import("../auto-oauth-detection");
    const ok = await serverAdvertisesOAuth("http://localhost:3000/mcp");
    expect(ok).toBe(false);
  });
});

