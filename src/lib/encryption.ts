//src/lib/encryption.ts
import crypto from "crypto";

// We use an environment variable for the encryption key, 
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "syntra-default-secret-key-32chars";
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a string using AES-256-CBC.
 */
export function encryptData(text: string): string {
  // We hash the key to ensure it is exactly 32 bytes long as required by aes-256-cbc
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return the IV and the encrypted data joined by a colon
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a string previously encrypted by encryptData.
 */
export function decryptData(text: string): string {
  const textParts = text.split(':');
  const ivStr = textParts.shift();
  
  if (!ivStr) throw new Error("Invalid encrypted data format");

  const iv = Buffer.from(ivStr, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}
