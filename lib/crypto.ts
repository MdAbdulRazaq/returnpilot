import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { getEnv } from "@/lib/env";

/**
 * Authenticated encryption for Shopify access tokens, plus constant-time
 * comparison helpers.
 *
 * WHY THIS FILE EXISTS: Shopify offline access tokens are the highest-value
 * secret we hold — they read a merchant's orders and customer PII. We never
 * store them in plaintext. They are sealed with AES-256-GCM (authenticated
 * encryption: any tampering with ciphertext, IV, or tag fails decryption) and
 * the key lives ONLY in a server-side env var, never in the database. This is
 * `server-only` so it can never be bundled into client code and leak crypto
 * material or key handling into the browser.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce — the standard/recommended size for GCM.
const KEY_BYTES = 32; // AES-256.

export interface SealedToken {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
  keyVersion: number;
}

/** version → raw 32-byte key. Built once from env, then cached. */
let keyringCache: Map<number, Buffer> | null = null;
let activeVersionCache: number | null = null;

function decodeKey(b64: string, label: string): Buffer {
  const key = Buffer.from(b64, "base64");
  if (key.length !== KEY_BYTES) {
    // Never include the key material in the error — only its length.
    throw new Error(
      `${label} must be a base64-encoded 32-byte key (got ${key.length} bytes).`,
    );
  }
  return key;
}

/**
 * Assemble the decrypt keyring: the active key plus any retired keys.
 * WHY: key rotation. New tokens are always sealed with the active key/version,
 * but tokens sealed by a previous key must still open until every shop is
 * re-encrypted — so retired keys remain available for decryption only.
 */
function getKeyring(): { keyring: Map<number, Buffer>; activeVersion: number } {
  if (keyringCache && activeVersionCache !== null) {
    return { keyring: keyringCache, activeVersion: activeVersionCache };
  }

  const env = getEnv();
  const keyring = new Map<number, Buffer>();

  if (env.TOKEN_ENCRYPTION_KEYS_RETIRED) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(env.TOKEN_ENCRYPTION_KEYS_RETIRED) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error("TOKEN_ENCRYPTION_KEYS_RETIRED must be valid JSON.");
    }
    for (const [version, value] of Object.entries(parsed)) {
      if (typeof value !== "string") {
        throw new Error("TOKEN_ENCRYPTION_KEYS_RETIRED values must be strings.");
      }
      keyring.set(Number(version), decodeKey(value, "Retired key"));
    }
  }

  const activeVersion = env.TOKEN_ENCRYPTION_KEY_VERSION;
  // The active key always wins if a version collides with a retired entry.
  keyring.set(activeVersion, decodeKey(env.TOKEN_ENCRYPTION_KEY, "TOKEN_ENCRYPTION_KEY"));

  keyringCache = keyring;
  activeVersionCache = activeVersion;
  return { keyring, activeVersion };
}

/** Encrypt a token with the active key. Returns ciphertext + iv + tag + version. */
export function encryptToken(plaintext: string): SealedToken {
  const { keyring, activeVersion } = getKeyring();
  const key = keyring.get(activeVersion)!;

  // A fresh random IV per encryption is REQUIRED for GCM: reusing an IV with the
  // same key is catastrophic (it breaks confidentiality and forgeability).
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion: activeVersion,
  };
}

/**
 * Decrypt a sealed token using the key named by its version.
 * The GCM auth tag is verified inside `final()`: if the ciphertext, IV, or tag
 * was tampered with, this throws instead of returning forged plaintext.
 */
export function decryptToken(sealed: SealedToken): string {
  const { keyring } = getKeyring();
  const key = keyring.get(sealed.keyVersion);
  if (!key) {
    // Generic: never reveal which versions exist.
    throw new Error("Unable to decrypt token.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Constant-time string comparison.
 * WHY: comparing secrets (HMAC digests, state nonces) with `===` leaks how many
 * leading bytes matched via timing, enabling byte-by-byte forgery. We length-check
 * first (constant-time compare requires equal-length buffers) then use
 * `timingSafeEqual`, whose runtime does not depend on where the mismatch is.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Hex HMAC-SHA256 of a message with the given secret. */
export function hmacSha256Hex(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}
