/**
 * Cryptographic security utilities for Ledger Flow.
 * Uses native Web Crypto API for secure PBKDF2-SHA512 hashing.
 * Absolutely NO raw passwords are ever stored or transmitted in plain text.
 */

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuffer(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPasswordClient(password: string, customSaltHex?: string): Promise<{ salt: string; hash: string; version: string }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  let saltBuffer: Uint8Array;
  if (customSaltHex) {
    saltBuffer = hexToBuffer(customSaltHex);
  } else {
    saltBuffer = new Uint8Array(16);
    crypto.getRandomValues(saltBuffer);
  }

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-512',
    },
    baseKey,
    512
  );

  const saltHex = customSaltHex || bufferToHex(saltBuffer.buffer);
  const hashHex = bufferToHex(derivedBits);

  return {
    salt: saltHex,
    hash: hashHex,
    version: 'pbkdf2_sha512_v1',
  };
}

export async function verifyPasswordClient(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  try {
    const { hash } = await hashPasswordClient(password, saltHex);
    return hash === expectedHashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
