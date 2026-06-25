export function formatRetryTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function generateSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

export function isValidIp(value: string): boolean {
  const ipv4Segments = value.split('.');
  if (ipv4Segments.length === 4) {
    return ipv4Segments.every((s) => {
      const n = Number(s);
      return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === s;
    });
  }
  return false;
}

export function getFirstIp(value: string | null): string {
  if (!value) return 'unknown';
  const candidate = value.split(',')[0].trim();
  if (isValidIp(candidate)) return candidate;
  return 'unknown';
}
