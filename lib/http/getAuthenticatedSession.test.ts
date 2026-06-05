import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getAuthenticatedSession } from "./getAuthenticatedSession";

// Real public login form (contains the ticket input the flow reads).
const loginHtml = readFileSync(new URL("./__fixtures__/login-page.html", import.meta.url), "utf8");

// Build a Response with a controllable final URL — what fetch exposes after
// following redirects, which is how login success/failure is detected.
const respWithUrl = (body: string, url: string) => {
  const res = new Response(body, { status: 200 });
  Object.defineProperty(res, "url", { value: url });
  return res;
};

// Stub fetch: GET serves the login page; POST returns a response whose final
// URL is `postUrl` (owner area = success, /account/login = failure).
const stubLogin = (postUrl: string) =>
  vi.fn(async (_url: string, init?: { method?: string }) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "POST") return respWithUrl("ok", postUrl);
    return new Response(loginHtml, { status: 200 });
  });

describe("getAuthenticatedSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a session when the login redirects into the owner area", async () => {
    vi.stubGlobal("fetch", stubLogin("https://www.sykescottages.co.uk/owner/dashboard"));
    const session = await getAuthenticatedSession({ email: "a@b.com", password: "pw" });
    expect(session.cookies).toBeDefined();
  });

  it("throws a clear auth error when the login lands back on /account/login", async () => {
    vi.stubGlobal("fetch", stubLogin("https://www.sykescottages.co.uk/account/login"));
    await expect(
      getAuthenticatedSession({ email: "a@b.com", password: "wrong" })
    ).rejects.toThrow(/authentication failed/i);
  });
});
