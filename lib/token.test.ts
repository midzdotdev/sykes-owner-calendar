import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { createTokenCodec } from "./token";
// The browser's encryptor — exercised here in Node (same Web Crypto API) to
// prove it stays byte-for-byte compatible with the server's decoder.
import { encryptCredentials } from "../public/crypto.js";

const newKeypairPem = () =>
  generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;

describe("token codec (WebCrypto encrypt ↔ node decrypt)", () => {
  it("round-trips credentials through a token", async () => {
    const codec = createTokenCodec(newKeypairPem());
    const creds = {
      email: "jane@example.com",
      password: "p@ss w0rd & special",
      propertyIds: ["21953", "1146011"],
    };

    const token = await encryptCredentials(codec.publicKeyRaw(), creds);
    expect(codec.decode(token)).toEqual(creds);
  });

  it('round-trips the "all properties" sentinel', async () => {
    const codec = createTokenCodec(newKeypairPem());
    const creds = { email: "jane@example.com", password: "pw", propertyIds: "all" as const };

    const token = await encryptCredentials(codec.publicKeyRaw(), creds);
    expect(codec.decode(token)).toEqual(creds);
  });

  it("produces a compact, URL-safe token", async () => {
    const codec = createTokenCodec(newKeypairPem());
    const token = await encryptCredentials(codec.publicKeyRaw(), {
      email: "jane@example.com",
      password: "Sharonh2209",
      propertyIds: ["21953"],
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeLessThan(260);
  });

  it("rejects a tampered token", async () => {
    const codec = createTokenCodec(newKeypairPem());
    const token = await encryptCredentials(codec.publicKeyRaw(), {
      email: "a@b.com",
      password: "pw",
      propertyIds: ["1"],
    });
    const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(() => codec.decode(tampered)).toThrow();
  });

  it("cannot be decoded with a different private key", async () => {
    const codecA = createTokenCodec(newKeypairPem());
    const codecB = createTokenCodec(newKeypairPem());
    const token = await encryptCredentials(codecA.publicKeyRaw(), {
      email: "a@b.com",
      password: "pw",
      propertyIds: ["1"],
    });
    expect(() => codecB.decode(token)).toThrow();
  });
});
