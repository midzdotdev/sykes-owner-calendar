// Client-side credential encryption (ECIES: P-256 ECDH + HKDF-SHA256 + AES-256-GCM).
//
// Runs in the browser (and in Node, for tests) using only the Web Crypto API, so
// it has no dependencies. It encrypts with the server's *public* key, which means
// the plaintext email/password never leave the device — only the opaque token does.
// The matching decryption lives in lib/token.ts (Node `crypto`); the two must stay
// byte-for-byte compatible (see lib/token.test.ts).

const HKDF_INFO = new TextEncoder().encode("sykes-owner-calendar/v1");

const toB64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/**
 * Encrypt credentials into a URL-safe token.
 * @param {string} publicKeyB64url - server's raw P-256 public key (65 bytes), base64url
 * @param {{email: string, password: string, propertyIds?: string[]}} payload
 * @returns {Promise<string>} base64url token
 */
export async function encryptCredentials(publicKeyB64url, payload) {
  const subtle = globalThis.crypto.subtle;

  const serverPub = await subtle.importKey(
    "raw",
    fromB64url(publicKeyB64url),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Fresh ephemeral keypair per token → the derived AES key is unique, so the
  // nonce can be derived (not transmitted) without reuse risk.
  const eph = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const shared = await subtle.deriveBits({ name: "ECDH", public: serverPub }, eph.privateKey, 256);

  const hkdf = await subtle.importKey("raw", shared, "HKDF", false, ["deriveBits"]);
  const okm = new Uint8Array(
    await subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: HKDF_INFO },
      hkdf,
      (32 + 12) * 8
    )
  );

  const aesKey = await subtle.importKey("raw", okm.slice(0, 32), { name: "AES-GCM" }, false, ["encrypt"]);
  const nonce = okm.slice(32, 44);

  const plaintext = new TextEncoder().encode(
    [payload.email, payload.password, (payload.propertyIds ?? []).join(",")].join("\n")
  );
  const ctTag = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  const ephRaw = new Uint8Array(await subtle.exportKey("raw", eph.publicKey)); // 65 bytes
  const token = new Uint8Array(ephRaw.length + ctTag.length);
  token.set(ephRaw, 0);
  token.set(ctTag, ephRaw.length);
  return toB64url(token);
}
