import 'server-only';

import crypto from 'crypto';

const AZDO_ALGO = 'aes-256-gcm';

function getAzdoKey(): Buffer {
  const key = process.env.AZDO_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing AZDO_ENCRYPTION_KEY.');
  }

  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  if (key.length === 44 || key.length === 43) {
    return Buffer.from(key, 'base64');
  }

  return crypto.createHash('sha256').update(key).digest();
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function encryptSecret(plainText: string): string {
  const key = getAzdoKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AZDO_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(cipherText: string): string {
  const [ivB64, tagB64, dataB64] = cipherText.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format.');
  }

  const key = getAzdoKey();
  const decipher = crypto.createDecipheriv(AZDO_ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
