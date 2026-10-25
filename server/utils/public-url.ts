import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b, c] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0)
  );
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:') || normalized === '::1' || normalized === '::') return false;
  const first = Number.parseInt(normalized.split(':')[0] || '0', 16);
  const second = Number.parseInt(normalized.split(':')[1] || '0', 16);
  const isSpecial2001Range = first === 0x2001 && second <= 0x01ff;
  return (
    first >= 0x2000 &&
    first <= 0x3fff &&
    !isSpecial2001Range &&
    first !== 0x2002 &&
    !normalized.startsWith('2001:db8:')
  );
}

export async function validatePublicHttpUrl(raw: string): Promise<string> {
  if (typeof raw !== 'string' || raw.length > 2048) {
    throw new Error('Enter a valid product URL (maximum 2,048 characters).');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Enter a valid product URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only public HTTP or HTTPS product URLs are supported.');
  }
  if (parsed.port && parsed.port !== (parsed.protocol === 'https:' ? '443' : '80')) {
    throw new Error('Product URLs cannot use a custom network port.');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    hostname === 'localhost' || hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') || hostname.endsWith('.internal')
  ) {
    throw new Error('Private and local network URLs are not allowed.');
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Only publicly reachable product URLs are allowed.');
  }
  parsed.hash = '';
  return parsed.toString();
}
