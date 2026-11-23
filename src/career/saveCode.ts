import type { CareerSaveFile } from './types';

const CODE_PREFIX = 'MY11';
const CODE_VERSION = 1;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return padded + '='.repeat((4 - (padded.length % 4)) % 4);
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot unpack compressed save codes.');
  }
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Encodes a career save into a copy/paste code for moving between devices.
 * Uses gzip when the browser supports Compression Streams.
 */
export async function encodeCareerSaveCode(save: CareerSaveFile): Promise<string> {
  const json = JSON.stringify(save);
  const raw = new TextEncoder().encode(json);
  const compressed = await gzip(raw);
  const payload = compressed || raw;
  const format = compressed ? '1' : '0';
  return `${CODE_PREFIX}-${CODE_VERSION}-${format}-${toBase64Url(bytesToBase64(payload))}`;
}

export async function decodeCareerSaveCode(
  code: string
): Promise<{ success: boolean; json?: string; error?: string }> {
  const cleaned = code.trim().replace(/\s+/g, '');
  if (!cleaned) return { success: false, error: 'Paste a save code first.' };

  // Accept a raw JSON backup too, so the box is forgiving.
  if (cleaned.startsWith('{')) {
    return { success: true, json: code };
  }

  const match = /^MY11-(\d+)-([01])-([A-Za-z0-9\-_]+)$/.exec(cleaned);
  if (!match) {
    return { success: false, error: 'That does not look like a MY-11 save code.' };
  }
  const version = Number(match[1]);
  if (version > CODE_VERSION) {
    return { success: false, error: 'This save code was made by a newer version of MY-11.' };
  }

  const format = match[2];
  const payload = match[3];

  try {
    const bytes = base64ToBytes(fromBase64Url(payload));
    const raw = format === '1' ? await gunzip(bytes) : bytes;
    const json = new TextDecoder().decode(raw);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.manager || !parsed.club) {
      return { success: false, error: 'The save code is missing career data.' };
    }
    return { success: true, json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not read that save code.',
    };
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
