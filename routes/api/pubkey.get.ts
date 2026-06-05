import { loadCodecFromEnv } from "../../lib/token";

// The server's public key, for the browser to encrypt credentials against.
export default defineEventHandler(() => ({
  publicKey: loadCodecFromEnv().publicKeyRaw(),
}));
