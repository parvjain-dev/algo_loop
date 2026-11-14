import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for users' API keys. The secret lives only in the server
 * environment (AI_KEY_SECRET), so the ciphertext stored in Supabase is useless
 * on its own. Format: v1.<iv>.<tag>.<ciphertext>, each part base64url.
 */

function secretKey(): Buffer {
  const secret = process.env.AI_KEY_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AI_KEY_SECRET is missing or shorter than 32 characters");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptKey(stored: string): string {
  const [v, iv, tag, body] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised key format");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function keyHint(plain: string): string {
  return plain.length > 8 ? plain.slice(-4) : "";
}
