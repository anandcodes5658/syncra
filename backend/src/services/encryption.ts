import crypto from 'crypto';
import { config } from '../config/env.js';

// Algorithm: AES-256-GCM (Authenticated Encryption)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  let keyHex = config.encryptionKey;
  if (!keyHex || keyHex.length !== 64) {
    // If not a 64-char hex (32 bytes), derive via sha256
    return crypto.createHash('sha256').update(keyHex || 'syncra-secret-salt').digest();
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt sensitive OAuth tokens before persisting to database
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt tokens securely
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // Return as-is if unencrypted legacy
    return encryptedData;
  }

  const [ivHex, tagHex, encryptedText] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
