// Generates the server's P-256 keypair for credential tokens.
//
//   node scripts/generate-token-key.mjs
//
// Writes the PRIVATE key to .token-key.pem (gitignored) — copy its contents into
// the Vercel project as the TOKEN_PRIVATE_KEY environment variable. Prints the
// PUBLIC key (safe to share) for reference. Rotating the key invalidates every
// existing calendar link.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });

const jwk = createPublicKey(privateKey).export({ format: "jwk" });
const publicRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(jwk.x, "base64url"),
  Buffer.from(jwk.y, "base64url"),
]).toString("base64url");

writeFileSync(".token-key.pem", pem, { mode: 0o600 });
console.log("Private key written to .token-key.pem (gitignored).");
console.log("→ Set its contents as TOKEN_PRIVATE_KEY in Vercel.\n");
console.log("Public key (raw, base64url):\n" + publicRaw);
