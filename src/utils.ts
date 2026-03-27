const DEFAULT_URL = 'https://www.bilibili.com';
const DIRECT_MEDIA_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.m3u8'];

export function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) return DEFAULT_URL;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) return `https://${value}`;
  return `https://www.baidu.com/s?wd=${encodeURIComponent(value)}`;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? [hours, minutes, secs].map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0'))).join(':')
    : [minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

export function sanitizeFileName(input: string) {
  return input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').slice(0, 48) || 'video';
}

export function guessExtension(url: string) {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.mp4')) return '.mp4';
  if (clean.endsWith('.mov')) return '.mov';
  if (clean.endsWith('.m4v')) return '.m4v';
  if (clean.endsWith('.webm')) return '.webm';
  if (clean.endsWith('.m3u8')) return '.m3u8';
  return '.mp4';
}

export function isOfflineFriendly(url: string) {
  return DIRECT_MEDIA_EXTENSIONS.includes(guessExtension(url));
}

export function offlineReason(url: string) {
  const extension = guessExtension(url);
  if (!DIRECT_MEDIA_EXTENSIONS.includes(extension)) {
    return 'This source does not look like a direct MP4, WEBM, MOV, M4V, or M3U8 media URL.';
  }
  return 'This media source could not be downloaded with the current offline flow.';
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isHlsUrl(url: string) {
  return guessExtension(url) === '.m3u8';
}

export function resolveUrl(value: string, base: string) {
  try {
    return new URL(value, base).toString();
  } catch (error) {
    return value;
  }
}
