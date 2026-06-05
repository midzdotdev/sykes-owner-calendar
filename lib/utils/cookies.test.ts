import { describe, expect, it } from "vitest";
import { getSetCookiesFromHeaders, serialiseCookies } from "./cookies";

describe("getSetCookiesFromHeaders", () => {
  it("extracts name/value pairs from Set-Cookie headers, ignoring attributes", () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "PHPSESSID=abc123; Path=/; HttpOnly");
    headers.append("Set-Cookie", "session_id=xyz789; Path=/; Secure; SameSite=Lax");

    const cookies = getSetCookiesFromHeaders(headers, ["PHPSESSID", "session_id"]);

    expect(cookies).toEqual({
      PHPSESSID: "abc123",
      session_id: "xyz789",
    });
  });

  it("currently returns all cookies regardless of the keys filter", () => {
    // The `keys` filter is commented out in the implementation; this test pins
    // the actual behaviour so a future change to it is a visible, intentional diff.
    const headers = new Headers();
    headers.append("Set-Cookie", "wanted=1; Path=/");
    headers.append("Set-Cookie", "unwanted=2; Path=/");

    expect(getSetCookiesFromHeaders(headers, ["wanted"])).toEqual({
      wanted: "1",
      unwanted: "2",
    });
  });
});

describe("serialiseCookies", () => {
  it("joins cookies into a Cookie request-header string", () => {
    expect(serialiseCookies({ a: "1", b: "2" })).toBe("a=1; b=2");
  });

  it("round-trips with getSetCookiesFromHeaders", () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "PHPSESSID=abc123; Path=/; HttpOnly");
    const cookies = getSetCookiesFromHeaders(headers, []);
    expect(serialiseCookies(cookies)).toBe("PHPSESSID=abc123");
  });
});
