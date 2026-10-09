/**
 * VibePair E2EE Cryptographic Engine
 * Uses Web Crypto API (SubtleCrypto) for AES-256-GCM encryption & PBKDF2 key derivation.
 * Messages, positions, and interactions are fully encrypted client-side.
 */

// Generate a random room pairing code e.g. "NEON-7788-SOUL"
export function generatePairCode(): string {
  const adjectives = ['NEON', 'COSMIC', 'SWEET', 'LUNA', 'SOLAR', 'VELVET', 'HONEY', 'STARRY'];
  const nouns = ['SOUL', 'HEART', 'VIBE', 'MOON', 'PARK', 'OASIS', 'HAVEN', 'SPARK'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}-${noun}`;
}

// Generate a secure random encryption passphrase
export function generateSecretKey(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Convert string to Uint8Array
function str2ab(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to string
function ab2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Convert ArrayBuffer to Base64
function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function b642ab(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive a CryptoKey from a passphrase and salt using PBKDF2 -> AES-GCM
export async function deriveKey(passphrase: string, salt: string = 'vibepair-couple-salt-v1'): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(passphrase) as any,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab(salt) as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Compute SHA-256 fingerprint for partner safety verification
export async function computeFingerprint(roomCode: string, secretKey: string): Promise<string> {
  const raw = str2ab(`${roomCode}:${secretKey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', raw as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  // Formatted like: 4C8A 9E21 B37D 108F
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)} ${hex.slice(12, 16)}`;
}

// Encrypt plaintext payload
export async function encryptPayload(data: unknown, key: CryptoKey): Promise<string> {
  const jsonStr = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = str2ab(jsonStr);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    encoded as any
  );

  // Return composite JSON string with iv + payload in base64
  return JSON.stringify({
    iv: ab2b64(iv.buffer),
    data: ab2b64(ciphertext),
    t: Date.now(),
  });
}

// Decrypt encrypted payload
export async function decryptPayload<T = unknown>(encryptedStr: string, key: CryptoKey): Promise<T | null> {
  try {
    const parsed = JSON.parse(encryptedStr);
    if (!parsed.iv || !parsed.data) return null;

    const iv = b642ab(parsed.iv);
    const ciphertext = b642ab(parsed.data);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      ciphertext as any
    );

    const str = ab2str(decrypted);
    return JSON.parse(str) as T;
  } catch (err) {
    console.warn('Decryption failed (mismatched key or corrupted packet):', err);
    return null;
  }
}
