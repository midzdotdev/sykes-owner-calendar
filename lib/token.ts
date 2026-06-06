// Server-side credential token decoding — the counterpart to public/crypto.js.
//
// ECIES: P-256 ECDH + HKDF-SHA256 + AES-256-GCM, using only Node's built-in
// `crypto` (no dependency). The browser encrypts with the server's public key;
// only the server, holding the private key, can recover the credentials.

import {
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  hkdfSync,
  type KeyObject,
} from "node:crypto";

const HKDF_INFO = new TextEncoder().encode("sykes-owner-calendar/v1");

export type Credentials = {
  email: string;
  password: string;
  /** A fixed set of property ids, or "all" to resolve the owner's current properties live. */
  propertyIds: string[] | "all";
};

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const toB64url = (b: Buffer): string =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Rebuild a P-256 public KeyObject from a raw 65-byte point (0x04 || X || Y).
const importRawPublicKey = (raw: Buffer): KeyObject => {
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error("invalid ephemeral public key");
  }
  return createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: toB64url(raw.subarray(1, 33)),
      y: toB64url(raw.subarray(33, 65)),
    },
    format: "jwk",
  });
};

export const createTokenCodec = (privateKeyPem: string) => {
  const privateKey = createPrivateKey(privateKeyPem);

  /** The server's public key as a raw base64url point, for the browser to encrypt against. */
  const publicKeyRaw = (): string => {
    const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as { x: string; y: string };
    return toB64url(Buffer.concat([Buffer.from([0x04]), fromB64url(jwk.x), fromB64url(jwk.y)]));
  };

  const decode = (token: string): Credentials => {
    const bytes = fromB64url(token);
    if (bytes.length < 65 + 16) throw new Error("malformed token");

    const ephPub = importRawPublicKey(bytes.subarray(0, 65));
    const ctTag = bytes.subarray(65);

    const shared = diffieHellman({ privateKey, publicKey: ephPub });
    const okm = Buffer.from(hkdfSync("sha256", shared, Buffer.alloc(0), HKDF_INFO, 44));
    const key = okm.subarray(0, 32);
    const nonce = okm.subarray(32, 44);

    const tag = ctTag.subarray(ctTag.length - 16);
    const ciphertext = ctTag.subarray(0, ctTag.length - 16);

    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

    const [email = "", password = "", ids = ""] = plain.split("\n");
    return {
      email,
      password,
      propertyIds: ids === "*" ? "all" : ids ? ids.split(",").filter(Boolean) : [],
    };
  };

  return { decode, publicKeyRaw };
};

export const loadCodecFromEnv = () => {
  const raw = process.env.TOKEN_PRIVATE_KEY;
  if (!raw) throw new Error("TOKEN_PRIVATE_KEY is not set");
  // Accept a PEM with real newlines, or one stored single-line with escaped \n,
  // so the key can live in a .env file or any one-line secret store.
  return createTokenCodec(raw.replace(/\\n/g, "\n"));
};
