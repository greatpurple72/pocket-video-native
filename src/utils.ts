const DEFAULT_URL = 'https://www.bilibili.com';

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
  return guessExtension(url) !== '.m3u8';
}

export function offlineReason(url: string) {
  if (guessExtension(url) === '.m3u8') {
    return '当前抓到的是 m3u8 流媒体地址，先不做离线下载，避免保存后不能直接播放。';
  }
  return '这个媒体源暂时不适合直接离线。';
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
