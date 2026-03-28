const { ipcRenderer } = require('electron');
const fs = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');
const { pathToFileURL } = require('url');
const Hls = require('hls.js');

const DEFAULT_URL = 'https://www.baidu.com';
const HOLD_DELAY_MS = 260;
const DOUBLE_TAP_MS = 260;
const DOUBLE_TAP_SEEK_SECONDS = 30;
const JUMP_STEP_SECONDS = 60;
const CONTROL_HIDE_DELAY_MS = 2000;
const REGULAR_SPEEDS = [1, 1.5, 2, 3, 6, 8];
const GESTURE_MOVE_THRESHOLD = 10;
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const elements = {
  addressInput: document.getElementById('address-input'),
  goButton: document.getElementById('go-button'),
  goBack: document.getElementById('go-back'),
  goForward: document.getElementById('go-forward'),
  playerShell: document.getElementById('player-shell'),
  browserView: document.getElementById('browser-view'),
  statusText: document.getElementById('status-text'),
  detectedList: document.getElementById('detected-list'),
  downloadList: document.getElementById('download-list'),
  nativePlayerLayer: document.getElementById('native-player-layer'),
  nativePlayer: document.getElementById('native-player'),
  brightnessMask: document.getElementById('brightness-mask'),
  gestureLayer: document.getElementById('gesture-layer'),
  gestureMessage: document.getElementById('gesture-message'),
  fullscreenControls: document.getElementById('fullscreen-controls'),
  fullscreenTitle: document.getElementById('fullscreen-title'),
  closeFullscreen: document.getElementById('close-fullscreen'),
  currentTime: document.getElementById('current-time'),
  durationTime: document.getElementById('duration-time'),
  timeline: document.getElementById('timeline'),
  timelineInput: document.getElementById('timeline-input'),
  timelineFill: document.getElementById('timeline-fill'),
  timelineThumb: document.getElementById('timeline-thumb'),
  playToggle: document.getElementById('play-toggle'),
  downloadCurrent: document.getElementById('download-current'),
  chipRow: document.getElementById('chip-row'),
};

const state = {
  currentUrl: DEFAULT_URL,
  pageTitle: 'Pocket Video',
  candidates: [],
  downloads: [],
  selectedOnline: null,
  selectedPlayback: null,
  snapshot: null,
  brightness: 0.5,
  webVolume: 1,
  nativeVolume: 1,
  baseRate: 1,
  nativeRate: 1,
  controlsVisible: false,
  controlsHoldUntil: 0,
  gestureHudTimer: null,
  holdTimer: null,
  tapTimer: null,
  holdActive: false,
  holdRestoreRate: 1,
  gestureMoved: false,
  gestureSide: 'left',
  gesturePointerId: null,
  gestureStartX: 0,
  gestureStartY: 0,
  gestureStartBrightness: 0.5,
  gestureStartVolume: 1,
  desktopControlsPrimed: false,
  lastTapAt: 0,
  autoplayHideTimer: null,
  timelineDragging: false,
  timelinePointerId: null,
  timelineMouseDragging: false,
  timelinePreviewTime: null,
  timelineStartTime: 0,
  timelineStartX: 0,
  webSeekLockUntil: 0,
  webSeekLockTime: null,
  browserReady: false,
  userDataPath: '',
};

let injectedScript = '';
let hlsInstance = null;
let playbackPoller = null;

function isBilibiliDeferredPage(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)bilibili\.com$/i.test(parsed.hostname) && /\/bangumi\/play\//i.test(parsed.pathname);
  } catch (error) {
    return false;
  }
}

function getFallbackCandidates(url, title) {
  if (!isBilibiliDeferredPage(url)) return [];
  return [
    {
      id: 'deferred-page-player',
      url,
      title: title || 'Bilibili page player',
      poster: '',
      width: 0,
      height: 0,
      paused: false,
      kind: 'html5-video',
    },
  ];
}

function mergeCandidates(primary, fallback) {
  const byKey = new Map();
  [...(fallback || []), ...(primary || [])].forEach((item) => {
    if (!item || !item.url) return;
    const key = `${item.kind}:${item.url}`;
    byKey.set(key, item);
  });
  return Array.from(byKey.values());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? [hours, minutes, secs].map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0'))).join(':')
    : [minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function sanitizeFileName(input) {
  return (input || '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').slice(0, 48) || 'video';
}

function guessExtension(url) {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.m3u8')) return '.m3u8';
  if (clean.endsWith('.mov')) return '.mov';
  if (clean.endsWith('.m4v')) return '.m4v';
  if (clean.endsWith('.webm')) return '.webm';
  return '.mp4';
}

function isHlsUrl(url) {
  return guessExtension(url) === '.m3u8';
}

function resolveUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch (error) {
    return value;
  }
}

function getAttributeValue(line, attribute) {
  const match = line.match(new RegExp(`${attribute}="([^"]+)"`, 'i'));
  return match ? match[1] : null;
}

function replaceAttributeValue(line, attribute, value) {
  return line.replace(new RegExp(`${attribute}="([^"]+)"`, 'i'), `${attribute}="${value}"`);
}

function getBandwidth(line) {
  const match = line.match(/BANDWIDTH=(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function guessResourceExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.[a-z0-9]+$/i);
    if (match) return match[0].toLowerCase();
  } catch (error) {}

  const match = String(url).split('?')[0].match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : '.bin';
}

function buildRequestHeaders() {
  let origin = '';
  try {
    origin = new URL(state.currentUrl).origin;
  } catch (error) {}

  return {
    'User-Agent': MOBILE_USER_AGENT,
    Accept: '*/*',
    ...(state.currentUrl ? { Referer: state.currentUrl } : {}),
    ...(origin ? { Origin: origin } : {}),
  };
}

function readRemote(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const request = transport.get(
      url,
      {
        headers: buildRequestHeaders(),
      },
      (response) => {
        const statusCode = response.statusCode || 0;

        if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location && redirects > 0) {
          response.resume();
          resolve(readRemote(resolveUrl(response.headers.location, url), redirects - 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Unexpected status ${statusCode} for ${url}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers['content-type'] || '',
          })
        );
      }
    );

    request.on('error', reject);
  });
}

async function fetchText(url) {
  const result = await readRemote(url);
  return result.buffer.toString('utf8');
}

async function fetchBuffer(url) {
  const result = await readRemote(url);
  return result.buffer;
}

function pickHighestBandwidthVariant(text, baseUrl) {
  const lines = text.replace(/\r/g, '').split('\n');
  let best = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;

    const nextLine = lines.slice(index + 1).find((entry) => entry.trim() && !entry.trim().startsWith('#'));
    if (!nextLine) continue;

    const candidate = {
      bandwidth: getBandwidth(line),
      url: resolveUrl(nextLine.trim(), baseUrl),
    };

    if (!best || candidate.bandwidth >= best.bandwidth) {
      best = candidate;
    }
  }

  return best ? best.url : null;
}

function rewriteMediaPlaylist(text, baseUrl) {
  const resources = [];
  let segmentIndex = 0;
  let keyIndex = 0;
  let mapIndex = 0;

  const rewrittenLines = text.replace(/\r/g, '').split('\n').map((line) => {
    const trimmed = line.trim();

    if (!trimmed) return line;

    if (trimmed.startsWith('#EXT-X-KEY') && trimmed.includes('URI=')) {
      const uri = getAttributeValue(trimmed, 'URI');
      if (!uri) return line;
      const absoluteUrl = resolveUrl(uri, baseUrl);
      const localName = `key-${String((keyIndex += 1)).padStart(3, '0')}${guessResourceExtension(absoluteUrl)}`;
      resources.push({ url: absoluteUrl, localName });
      return replaceAttributeValue(line, 'URI', localName);
    }

    if (trimmed.startsWith('#EXT-X-MAP') && trimmed.includes('URI=')) {
      const uri = getAttributeValue(trimmed, 'URI');
      if (!uri) return line;
      const absoluteUrl = resolveUrl(uri, baseUrl);
      const localName = `map-${String((mapIndex += 1)).padStart(3, '0')}${guessResourceExtension(absoluteUrl)}`;
      resources.push({ url: absoluteUrl, localName });
      return replaceAttributeValue(line, 'URI', localName);
    }

    if (!trimmed.startsWith('#')) {
      const absoluteUrl = resolveUrl(trimmed, baseUrl);
      const localName = `segment-${String((segmentIndex += 1)).padStart(5, '0')}${guessResourceExtension(absoluteUrl)}`;
      resources.push({ url: absoluteUrl, localName });
      return localName;
    }

    return line;
  });

  return {
    playlistText: rewrittenLines.join('\n'),
    resources,
  };
}

async function resolvePlayablePlaylist(playlistUrl) {
  let currentUrlToLoad = playlistUrl;
  let playlistText = await fetchText(currentUrlToLoad);

  for (let index = 0; index < 4; index += 1) {
    const variantUrl = pickHighestBandwidthVariant(playlistText, currentUrlToLoad);
    if (!variantUrl || variantUrl === currentUrlToLoad) break;
    currentUrlToLoad = variantUrl;
    playlistText = await fetchText(currentUrlToLoad);
  }

  return {
    playlistUrl: currentUrlToLoad,
    playlistText,
  };
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function downloadsFilePath() {
  return path.join(state.userDataPath, 'pocket-video-desktop-downloads.json');
}

function downloadsRoot() {
  return path.join(state.userDataPath, 'pocket-video-desktop-files');
}

async function persistDownloads() {
  if (!state.userDataPath) return;
  await fs.writeFile(downloadsFilePath(), JSON.stringify(state.downloads, null, 2), 'utf8');
}

function syncNavButtons() {
  if (typeof elements.browserView.canGoBack === 'function') {
    elements.goBack.disabled = !elements.browserView.canGoBack();
  }
  if (typeof elements.browserView.canGoForward === 'function') {
    elements.goForward.disabled = !elements.browserView.canGoForward();
  }
}

async function loadDownloads() {
  try {
    const raw = await fs.readFile(downloadsFilePath(), 'utf8');
    const items = JSON.parse(raw);
    const validated = [];
    for (const item of items) {
      if (item.status !== 'completed') {
        validated.push(item);
        continue;
      }

      const target = item.localRootPath || item.filePath;
      try {
        await fs.access(target);
        validated.push(item);
      } catch (error) {}
    }

    state.downloads = validated;
    renderDownloads();
    await persistDownloads();
  } catch (error) {
    state.downloads = [];
    renderDownloads();
  }
}

function setBrightness(value) {
  state.brightness = clamp(value, 0.05, 1);
  elements.brightnessMask.style.opacity = String(clamp((1 - state.brightness) * 0.82, 0, 0.72));
}

function clearTapTimer() {
  if (state.tapTimer) clearTimeout(state.tapTimer);
  state.tapTimer = null;
}

function showGestureMessage(message) {
  elements.gestureMessage.textContent = message;
  elements.gestureMessage.classList.remove('hidden');
  clearTimeout(state.gestureHudTimer);
  state.gestureHudTimer = setTimeout(() => elements.gestureMessage.classList.add('hidden'), 700);
}

function activePlaybackMode() {
  return state.selectedPlayback ? 'native' : state.selectedOnline ? 'web' : null;
}

function activeDuration() {
  if (state.selectedPlayback) return state.selectedPlayback.duration || 0;
  return state.snapshot?.duration || 0;
}

function activeCurrentTime() {
  if (state.timelineDragging && Number.isFinite(state.timelinePreviewTime)) {
    return state.timelinePreviewTime;
  }
  if (state.selectedOnline && state.webSeekLockTime !== null) {
    return state.webSeekLockTime;
  }
  if (state.selectedPlayback) return state.selectedPlayback.currentTime || 0;
  return state.snapshot?.currentTime || 0;
}

function activePaused() {
  if (state.selectedPlayback) return !!state.selectedPlayback.paused;
  return !!state.snapshot?.paused;
}

function getWebCommandTargetId() {
  return state.snapshot?.id || state.selectedOnline?.id || undefined;
}

function updateProgressUi(currentTime = activeCurrentTime(), duration = activeDuration()) {
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  elements.currentTime.textContent = formatTime(currentTime);
  elements.durationTime.textContent = `${formatTime(duration)} | -${formatTime(Math.max(duration - currentTime, 0))}`;
  elements.timelineFill.style.width = `${progress * 100}%`;
  elements.timelineThumb.style.left = `${progress * 100}%`;
  elements.timelineInput.value = String(Math.round(progress * 1000));
  elements.timelineInput.disabled = duration <= 0;
  elements.playToggle.textContent = activePaused() ? 'Play' : 'Pause';

  Array.from(elements.chipRow.querySelectorAll('[data-action="rate"]')).forEach((button) => {
    const currentRate = activePlaybackMode() === 'native' ? state.nativeRate : state.baseRate;
    button.classList.toggle('active', Number(button.dataset.value) === currentRate);
  });
}

function keepControlsVisible(durationMs = CONTROL_HIDE_DELAY_MS) {
  if (!activePlaybackMode()) return;
  clearTapTimer();
  state.lastTapAt = 0;
  state.controlsVisible = true;
  state.controlsHoldUntil = Math.max(state.controlsHoldUntil, Date.now() + durationMs);
  clearTimeout(state.autoplayHideTimer);
  syncFullscreenChrome();
}

function scheduleAutoHide() {
  clearTimeout(state.autoplayHideTimer);
  if (!state.controlsVisible || activePaused() || state.timelineDragging) return;
  const delay = Math.max(state.controlsHoldUntil - Date.now(), 0);
  state.autoplayHideTimer = setTimeout(() => {
    state.controlsVisible = false;
    syncFullscreenChrome();
  }, delay);
}

function syncFullscreenChrome() {
  const visible = !!activePlaybackMode();
  const canDownloadCurrent = !!state.selectedOnline || !!state.selectedPlayback?.candidate;
  elements.browserView.style.pointerEvents = state.selectedOnline ? 'none' : 'auto';
  elements.nativePlayer.style.pointerEvents = state.selectedPlayback ? 'none' : 'auto';
  elements.gestureLayer.classList.toggle('hidden', !visible);
  elements.fullscreenControls.classList.toggle('hidden', !visible || !state.controlsVisible);
  elements.downloadCurrent.style.display = visible && canDownloadCurrent ? 'inline-flex' : 'none';
  updateProgressUi();
  if (visible) scheduleAutoHide();
}

function destroyNativePlayback() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  elements.nativePlayer.pause();
  elements.nativePlayer.removeAttribute('src');
  elements.nativePlayer.load();
  elements.nativePlayerLayer.classList.add('hidden');
  if (playbackPoller) clearInterval(playbackPoller);
  playbackPoller = null;
}

function closeFullscreen() {
  clearTapTimer();
  clearTimeout(state.holdTimer);
  clearTimeout(state.autoplayHideTimer);
  state.holdActive = false;
  state.gesturePointerId = null;
  state.timelineDragging = false;
  state.timelinePointerId = null;
  state.timelinePreviewTime = null;

  if (state.selectedOnline) {
    sendWebCommand({ action: 'exitFocus' });
  }

  state.selectedOnline = null;
  state.selectedPlayback = null;
  state.webSeekLockTime = null;
  state.webSeekLockUntil = 0;
  state.controlsVisible = false;
  elements.fullscreenTitle.textContent = 'Fullscreen video';
  destroyNativePlayback();
  syncFullscreenChrome();
}

async function loadNativeSource(playback) {
  if (state.selectedOnline) {
    sendWebCommand({ action: 'exitFocus' });
    state.selectedOnline = null;
  }

  destroyNativePlayback();
  state.selectedPlayback = {
    ...playback,
    currentTime: 0,
    duration: 0,
    paused: false,
  };
  state.controlsVisible = true;
  elements.fullscreenTitle.textContent = playback.title;
  elements.nativePlayerLayer.classList.remove('hidden');
  elements.nativePlayer.preservesPitch = true;
  elements.nativePlayer.volume = state.nativeVolume;
  elements.nativePlayer.playbackRate = state.nativeRate;

  const isHls = playback.contentType === 'hls' || isHlsUrl(playback.sourceUri);
  if (isHls && Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      elements.nativePlayer.play().catch(() => {});
    });
    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      if (!data?.fatal) return;
      setStatus('The stream could not be opened in the native player.');
    });
    hlsInstance.loadSource(playback.sourceUri);
    hlsInstance.attachMedia(elements.nativePlayer);
  } else {
    elements.nativePlayer.src = playback.sourceUri;
    elements.nativePlayer.play().catch(() => {});
  }

  playbackPoller = setInterval(() => {
    if (!state.selectedPlayback || state.timelineDragging) return;
    state.selectedPlayback.currentTime = elements.nativePlayer.currentTime || 0;
    state.selectedPlayback.duration = Number.isFinite(elements.nativePlayer.duration) ? elements.nativePlayer.duration : 0;
    state.selectedPlayback.paused = elements.nativePlayer.paused;
    state.nativeVolume = elements.nativePlayer.volume || 0;
    state.nativeRate = elements.nativePlayer.playbackRate || 1;
    updateProgressUi();
  }, 250);

  syncFullscreenChrome();
}

function sendWebCommand(command) {
  if (!state.browserReady) return;
  elements.browserView.executeJavaScript(`window.__codexHandleCommand(${JSON.stringify(command)}); true;`).catch(() => {});
}

async function injectIntoPage() {
  if (!injectedScript || !state.browserReady) return;
  await elements.browserView.executeJavaScript(injectedScript).catch(() => {});
}

function openDownloadItem(item) {
  if (item.status === 'completed') {
    loadNativeSource({
      title: item.title,
      sourceUri: pathToFileURL(item.filePath).toString(),
      mode: 'download',
      contentType: item.mediaKind === 'hls' ? 'hls' : 'auto',
      candidate: null,
    });
    return;
  }

  loadNativeSource({
    title: `${item.title} (stream)`,
    sourceUri: item.remoteUrl,
    mode: 'stream',
    contentType: isHlsUrl(item.remoteUrl) ? 'hls' : 'auto',
    candidate: { id: item.id, title: item.title, url: item.remoteUrl, kind: 'native-stream' },
  });
}

function renderDetectedVideos() {
  elements.detectedList.innerHTML = '';
  if (state.candidates.length === 0) {
    elements.detectedList.innerHTML = '<div class="meta">Open a site and detected page videos will appear here.</div>';
    return;
  }

  state.candidates.forEach((video) => {
    const card = document.createElement('div');
    card.className = 'card-item';
    card.innerHTML = `
      <h3>${video.title || 'Detected video'}</h3>
      <div class="meta">${video.url}</div>
      <div class="tag">${video.kind === 'html5-video' ? 'Page video' : 'Direct stream'}</div>
      <div class="actions">
        <button class="primary">Open fullscreen</button>
        <button class="secondary">Save offline</button>
      </div>
    `;

    const [openButton, saveButton] = card.querySelectorAll('button');
    openButton.addEventListener('click', () => openVideo(video));
    saveButton.addEventListener('click', () => downloadVideo(video));
    elements.detectedList.appendChild(card);
  });
}

function applyFallbackCandidates(url = state.currentUrl, title = state.pageTitle) {
  const fallback = getFallbackCandidates(url, title);
  if (fallback.length === 0) return;
  state.candidates = mergeCandidates(state.candidates, fallback);
  renderDetectedVideos();
  if (state.candidates.length > 0) {
    setStatus('Detected a page player shell. Open fullscreen to wait for the real video node.');
  }
}

function renderDownloads() {
  elements.downloadList.innerHTML = '';
  if (state.downloads.length === 0) {
    elements.downloadList.innerHTML = '<div class="meta">Downloaded and in-progress items will appear here.</div>';
    return;
  }

  state.downloads.forEach((item) => {
    const card = document.createElement('div');
    const statusText =
      item.status === 'downloading'
        ? `${item.mediaKind === 'hls' ? 'Packaging stream' : 'Downloading'}... ${Math.round((item.progress || 0) * 100)}%`
        : item.status === 'failed'
          ? item.errorMessage || 'Download failed.'
          : item.filePath;

    card.className = 'card-item';
    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="meta">${statusText}</div>
      <div class="actions">
        <button class="primary">${item.status === 'completed' ? 'Play offline' : 'Watch while saving'}</button>
        <button class="secondary">Delete</button>
      </div>
    `;

    const [openButton, deleteButton] = card.querySelectorAll('button');
    openButton.addEventListener('click', () => openDownloadItem(item));
    deleteButton.addEventListener('click', () => removeDownload(item.id));
    elements.downloadList.appendChild(card);
  });
}

function normalizeUrl(input) {
  const value = String(input || '').trim();
  if (!value) return DEFAULT_URL;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) return `https://${value}`;
  return `https://www.baidu.com/s?wd=${encodeURIComponent(value)}`;
}

function updateCurrentUrl(url) {
  state.currentUrl = url;
  elements.addressInput.value = url;
}

function navigate(url) {
  const normalized = normalizeUrl(url);
  updateCurrentUrl(normalized);
  setStatus('Loading page...');
  elements.browserView.setAttribute('src', normalized);
}

function openVideo(video) {
  clearTapTimer();
  clearTimeout(state.holdTimer);

  if (state.selectedOnline) {
    sendWebCommand({ action: 'exitFocus' });
  }

  state.selectedOnline = null;
  state.selectedPlayback = null;
  destroyNativePlayback();
  state.controlsVisible = true;
  state.controlsHoldUntil = Date.now() + CONTROL_HIDE_DELAY_MS;
  elements.fullscreenTitle.textContent = video.title || 'Fullscreen video';

  if (video.kind === 'native-stream') {
    loadNativeSource({
      title: video.title || 'Stream video',
      sourceUri: video.url,
      mode: 'stream',
      contentType: isHlsUrl(video.url) ? 'hls' : 'auto',
      candidate: video,
    });
    return;
  }

  state.selectedOnline = video;
  sendWebCommand({ action: 'enterFocus', id: video.id });
  setTimeout(() => {
    sendWebCommand({ action: 'setRate', id: getWebCommandTargetId() || video.id, value: state.baseRate });
  }, 120);
  syncFullscreenChrome();
}

async function removeDownload(id) {
  const item = state.downloads.find((entry) => entry.id === id);
  if (!item) return;

  try {
    const removalTarget = item.localRootPath || item.filePath;
    if (removalTarget) {
      await fs.rm(removalTarget, { recursive: true, force: true });
    }
  } catch (error) {}

  state.downloads = state.downloads.filter((entry) => entry.id !== id);
  renderDownloads();
  await persistDownloads();
}

function updateDownloadRecord(id, patch) {
  const item = state.downloads.find((entry) => entry.id === id);
  if (!item) return;
  Object.assign(item, patch);
  renderDownloads();
  persistDownloads().catch(() => {});
}

function createDownloadRecord(video) {
  const id = `download-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    title: video.title || state.pageTitle || 'Offline video',
    remoteUrl: video.url,
    filePath: '',
    localRootPath: '',
    mediaKind: isHlsUrl(video.url) ? 'hls' : 'file',
    status: 'downloading',
    progress: 0,
    errorMessage: '',
  };
  state.downloads.unshift(record);
  renderDownloads();
  persistDownloads().catch(() => {});
  return record;
}

async function downloadHlsPackage(video, record, rootDir) {
  const packageDir = path.join(rootDir, `${sanitizeFileName(video.title || state.pageTitle)}-${Date.now()}`);
  await fs.mkdir(packageDir, { recursive: true });

  const { playlistUrl, playlistText } = await resolvePlayablePlaylist(video.url);
  const { playlistText: localPlaylist, resources } = rewriteMediaPlaylist(playlistText, playlistUrl);

  const totalSteps = Math.max(resources.length + 1, 1);
  let completedSteps = 0;

  for (const resource of resources) {
    const localPath = path.join(packageDir, resource.localName);
    const buffer = await fetchBuffer(resource.url);
    await fs.writeFile(localPath, buffer);
    completedSteps += 1;
    updateDownloadRecord(record.id, {
      mediaKind: 'hls',
      localRootPath: packageDir,
      progress: completedSteps / totalSteps,
      status: 'downloading',
    });
  }

  const localPlaylistPath = path.join(packageDir, 'index.m3u8');
  await fs.writeFile(localPlaylistPath, localPlaylist, 'utf8');
  updateDownloadRecord(record.id, {
    filePath: localPlaylistPath,
    localRootPath: packageDir,
    mediaKind: 'hls',
    progress: 1,
    status: 'completed',
    errorMessage: '',
  });
}

async function downloadDirectFile(video, record, rootDir) {
  const fileBase = `${sanitizeFileName(video.title || state.pageTitle)}-${Date.now()}`;
  const filePath = path.join(rootDir, `${fileBase}${guessExtension(video.url)}`);
  const buffer = await fetchBuffer(video.url);
  await fs.writeFile(filePath, buffer);
  updateDownloadRecord(record.id, {
    filePath,
    mediaKind: 'file',
    progress: 1,
    status: 'completed',
    errorMessage: '',
  });
}

async function downloadVideo(video) {
  if (!video?.url) return;
  const record = createDownloadRecord(video);
  const rootDir = downloadsRoot();
  await fs.mkdir(rootDir, { recursive: true });

  try {
    setStatus('Saving the video for offline playback...');
    if (isHlsUrl(video.url)) {
      await downloadHlsPackage(video, record, rootDir);
    } else {
      await downloadDirectFile(video, record, rootDir);
    }
    setStatus('Download finished.');
  } catch (error) {
    updateDownloadRecord(record.id, {
      status: 'failed',
      errorMessage: 'The site blocked the download or the media package could not be rebuilt.',
    });
    setStatus('Download failed.');
  }
}

function toggleWebPlayback() {
  const nextPaused = !activePaused();
  if (state.snapshot) {
    state.snapshot = {
      ...state.snapshot,
      paused: nextPaused,
    };
  }
  sendWebCommand({ action: 'togglePlay', id: getWebCommandTargetId() });
  updateProgressUi();
  return nextPaused;
}

function toggleNativePlayback() {
  const nextPaused = !elements.nativePlayer.paused;
  if (elements.nativePlayer.paused) {
    elements.nativePlayer.play().catch(() => {});
  } else {
    elements.nativePlayer.pause();
  }
  if (state.selectedPlayback) {
    state.selectedPlayback.paused = nextPaused;
  }
  updateProgressUi();
  return nextPaused;
}

function seekActiveTo(seconds) {
  const duration = activeDuration();
  const maxDuration = duration > 0 ? duration : Math.max(activeCurrentTime(), seconds, 0);
  const nextTime = clamp(seconds, 0, maxDuration);
  keepControlsVisible();

  if (state.selectedPlayback) {
    elements.nativePlayer.currentTime = nextTime;
    state.selectedPlayback.currentTime = nextTime;
  } else {
    state.webSeekLockUntil = Date.now() + 2200;
    state.webSeekLockTime = nextTime;
    state.snapshot = {
      ...(state.snapshot || {}),
      currentTime: nextTime,
      duration: duration || state.snapshot?.duration || 0,
    };
    sendWebCommand({ action: 'seekTo', id: getWebCommandTargetId(), value: nextTime });
  }

  updateProgressUi(nextTime, duration);
}

function seekActiveBy(seconds) {
  const duration = activeDuration();
  const nextTime = clamp(activeCurrentTime() + seconds, 0, duration || Math.max(activeCurrentTime() + seconds, 0));
  seekActiveTo(nextTime);
}

function setActiveRate(rate) {
  const safeRate = REGULAR_SPEEDS.includes(rate) ? rate : 1;
  if (state.selectedPlayback) {
    state.nativeRate = safeRate;
    elements.nativePlayer.preservesPitch = true;
    elements.nativePlayer.playbackRate = safeRate;
  } else {
    state.baseRate = safeRate;
    sendWebCommand({ action: 'setRate', id: getWebCommandTargetId(), value: safeRate });
  }

  updateProgressUi();
}

function handleDesktopMessage(payload) {
  if (payload.type === 'videosFound') {
    state.pageTitle = payload.title || state.pageTitle;
    state.candidates = mergeCandidates(payload.videos || [], getFallbackCandidates(state.currentUrl, state.pageTitle));
    renderDetectedVideos();
    setStatus(state.candidates.length > 0 ? `Detected ${state.candidates.length} video source(s).` : 'Ready');
  }

  if (payload.type === 'playerState') {
    const nextState = { ...(payload.state || {}) };

    if (state.selectedOnline && nextState.id) {
      state.selectedOnline = {
        ...state.selectedOnline,
        id: nextState.id,
        url: nextState.url || state.selectedOnline.url,
        title: nextState.title || state.selectedOnline.title,
      };
    }

    if (
      state.webSeekLockTime !== null &&
      Date.now() < state.webSeekLockUntil &&
      typeof nextState.currentTime === 'number' &&
      Math.abs(nextState.currentTime - state.webSeekLockTime) > 1.2
    ) {
      nextState.currentTime = state.webSeekLockTime;
    } else if (
      state.webSeekLockTime !== null &&
      typeof nextState.currentTime === 'number' &&
      Math.abs(nextState.currentTime - state.webSeekLockTime) <= 1.2
    ) {
      state.webSeekLockTime = null;
      state.webSeekLockUntil = 0;
    }

    state.snapshot = nextState;
    state.webVolume = nextState.volume;
    if (!state.holdActive) state.baseRate = nextState.playbackRate;
    updateProgressUi();
    scheduleAutoHide();
  }

  if (payload.type === 'blockedExternalNavigation' || payload.type === 'blockedPopup') {
    setStatus('Blocked a popup window or another-app jump.');
  }

  if (payload.type === 'focusPending') {
    setStatus(payload.message || 'Waiting for the page video to become controllable.');
  }

  if (payload.type === 'focusError') {
    setStatus(payload.message || 'Could not control the active page video.');
  }
}

function getPointerPosition(event) {
  return { x: event.clientX, y: event.clientY };
}

function getGestureSide(x) {
  const bounds = elements.gestureLayer.getBoundingClientRect();
  return x < bounds.left + bounds.width / 2 ? 'left' : 'right';
}

function getDoubleTapAction(x) {
  const bounds = elements.gestureLayer.getBoundingClientRect();
  const relativeX = x - bounds.left;
  if (relativeX < bounds.width / 3) return 'seek-backward';
  if (relativeX > (bounds.width * 2) / 3) return 'seek-forward';
  return 'toggle-playback';
}

function beginHold() {
  clearTimeout(state.holdTimer);
  state.holdTimer = setTimeout(() => {
    state.holdActive = true;
    state.holdRestoreRate = state.selectedPlayback ? state.nativeRate : state.baseRate;
    showGestureMessage('Hold 1x');
    if (state.selectedPlayback) {
      elements.nativePlayer.playbackRate = 1;
    } else {
      sendWebCommand({ action: 'setRate', id: getWebCommandTargetId(), value: 1 });
    }
  }, HOLD_DELAY_MS);
}

function finishHold() {
  clearTimeout(state.holdTimer);
  if (!state.holdActive) return false;
  state.holdActive = false;
  setActiveRate(state.holdRestoreRate);
  keepControlsVisible();
  showGestureMessage(`${state.holdRestoreRate.toFixed(2)}x`);
  return true;
}

function updateGestureValue(dy) {
  const amount = dy * -0.0048;
  if (state.gestureSide === 'left') {
    setBrightness(state.gestureStartBrightness + amount);
    showGestureMessage(`Brightness ${Math.round(state.brightness * 100)}%`);
    return;
  }

  const nextVolume = clamp(state.gestureStartVolume + amount, 0, 1);
  if (state.selectedPlayback) {
    state.nativeVolume = nextVolume;
    elements.nativePlayer.volume = nextVolume;
  } else {
    state.webVolume = nextVolume;
    sendWebCommand({ action: 'setVolume', id: getWebCommandTargetId(), value: Number(nextVolume.toFixed(3)) });
  }
  showGestureMessage(`Volume ${Math.round(nextVolume * 100)}%`);
}

function toggleControls() {
  if (!activePlaybackMode()) return;
  state.controlsVisible = !state.controlsVisible;
  if (state.controlsVisible) {
    state.controlsHoldUntil = Date.now() + CONTROL_HIDE_DELAY_MS;
  }
  syncFullscreenChrome();
}

function performDoubleTapAction(action) {
  keepControlsVisible();

  if (action === 'seek-backward') {
    seekActiveBy(-DOUBLE_TAP_SEEK_SECONDS);
    showGestureMessage(`-${DOUBLE_TAP_SEEK_SECONDS}s`);
    return;
  }

  if (action === 'seek-forward') {
    seekActiveBy(DOUBLE_TAP_SEEK_SECONDS);
    showGestureMessage(`+${DOUBLE_TAP_SEEK_SECONDS}s`);
    return;
  }

  const nextPaused = state.selectedPlayback ? toggleNativePlayback() : toggleWebPlayback();
  showGestureMessage(nextPaused ? 'Pause' : 'Play');
}

function beginTimelineDrag(clientX) {
  if (!activePlaybackMode()) return;
  state.timelineDragging = true;
  state.controlsVisible = true;
  state.timelineStartTime = activeCurrentTime();
  state.timelinePreviewTime = state.timelineStartTime;
  state.timelineStartX = clientX;
  state.controlsHoldUntil = Date.now() + CONTROL_HIDE_DELAY_MS;
  syncFullscreenChrome();
}

function previewTimelineDrag(clientX) {
  if (!state.timelineDragging) return;
  const duration = activeDuration();
  if (duration <= 0) return;
  const width = elements.timeline.getBoundingClientRect().width;
  const delta = clientX - state.timelineStartX;
  const nextTime = clamp(state.timelineStartTime + (delta / width) * duration, 0, duration);
  state.timelinePreviewTime = nextTime;
  updateProgressUi(nextTime, duration);
}

function endTimelineDrag(clientX) {
  if (!state.timelineDragging) return;
  const duration = activeDuration();
  let nextTime = activeCurrentTime();
  if (duration > 0) {
    const width = elements.timeline.getBoundingClientRect().width;
    const delta = clientX - state.timelineStartX;
    nextTime = clamp(state.timelineStartTime + (delta / width) * duration, 0, duration);
  }
  state.timelineDragging = false;
  state.timelinePreviewTime = null;
  if (duration > 0) seekActiveTo(nextTime);
  scheduleAutoHide();
}

function bindGestureEvents() {
  const handlePointerMove = (event) => {
    if (!activePlaybackMode()) return;
    if (state.gesturePointerId !== event.pointerId) return;
    const position = getPointerPosition(event);
    const dx = position.x - state.gestureStartX;
    const dy = position.y - state.gestureStartY;
    if (Math.abs(dx) < GESTURE_MOVE_THRESHOLD && Math.abs(dy) < GESTURE_MOVE_THRESHOLD) return;
    state.gestureMoved = true;
    clearTimeout(state.holdTimer);
    updateGestureValue(dy);
  };

  const handlePointerFinish = (event) => {
    if (state.gesturePointerId !== event.pointerId) return;
    state.gesturePointerId = null;

    const held = finishHold();
    if (held) {
      state.gestureMoved = false;
      return;
    }

    if (state.gestureMoved) {
      state.gestureMoved = false;
      keepControlsVisible();
      scheduleAutoHide();
      return;
    }

    if (event.pointerType === 'mouse') {
      return;
    }

    const now = Date.now();
    const action = getDoubleTapAction(event.clientX);
    if (!state.controlsVisible) {
      keepControlsVisible();
      if (now - state.lastTapAt <= DOUBLE_TAP_MS) {
        clearTapTimer();
        state.lastTapAt = 0;
        performDoubleTapAction(action);
        return;
      }
      state.lastTapAt = now;
      return;
    }

    if (now - state.lastTapAt <= DOUBLE_TAP_MS) {
      clearTapTimer();
      state.lastTapAt = 0;
      performDoubleTapAction(action);
      return;
    }

    state.lastTapAt = now;
    clearTapTimer();
    state.tapTimer = setTimeout(() => {
      toggleControls();
      state.lastTapAt = 0;
    }, DOUBLE_TAP_MS + 20);
  };

  elements.gestureLayer.addEventListener('pointerdown', (event) => {
    if (!activePlaybackMode()) return;
    if (event.target !== elements.gestureLayer) return;
    const position = getPointerPosition(event);
    state.gesturePointerId = event.pointerId;
    state.gestureMoved = false;
    state.gestureSide = getGestureSide(position.x);
    state.gestureStartX = position.x;
    state.gestureStartY = position.y;
    state.gestureStartBrightness = state.brightness;
    state.gestureStartVolume = state.selectedPlayback ? state.nativeVolume : state.webVolume;
    keepControlsVisible();
    beginHold();
    elements.gestureLayer.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  elements.gestureLayer.addEventListener('pointermove', (event) => {
    if (!activePlaybackMode()) return;
    if (state.gesturePointerId !== null) return;
    if (event.pointerType !== 'mouse') return;
    keepControlsVisible();
  });
  elements.gestureLayer.addEventListener('click', (event) => {
    if (!activePlaybackMode()) return;
    if (event.target !== elements.gestureLayer) return;
    event.preventDefault();
    event.stopPropagation();
    keepControlsVisible();
    state.desktopControlsPrimed = true;
  });
  elements.gestureLayer.addEventListener('dblclick', (event) => {
    if (!activePlaybackMode()) return;
    if (event.target !== elements.gestureLayer) return;
    event.preventDefault();
    event.stopPropagation();
    keepControlsVisible();
    performDoubleTapAction(getDoubleTapAction(event.clientX));
  });
  window.addEventListener('pointermove', handlePointerMove, true);
  window.addEventListener('pointerup', (event) => {
    if (elements.gestureLayer.hasPointerCapture(event.pointerId)) {
      elements.gestureLayer.releasePointerCapture(event.pointerId);
    }
    handlePointerFinish(event);
  }, true);
  window.addEventListener('pointercancel', (event) => {
    if (elements.gestureLayer.hasPointerCapture(event.pointerId)) {
      elements.gestureLayer.releasePointerCapture(event.pointerId);
    }
    if (state.gesturePointerId !== event.pointerId) return;
    state.gesturePointerId = null;
    clearTimeout(state.holdTimer);
    state.gestureMoved = false;
    finishHold();
  }, true);
}

function bindTimelineEvents() {
  elements.timeline.addEventListener('pointerdown', (event) => {
    if (event.target === elements.timelineInput) return;
    if (event.pointerType === 'mouse') return;
    keepControlsVisible();
    event.stopPropagation();
    event.preventDefault();
    state.timelinePointerId = event.pointerId;
    elements.timeline.setPointerCapture(event.pointerId);
    beginTimelineDrag(event.clientX);
    previewTimelineDrag(event.clientX);
  });

  window.addEventListener('pointermove', (event) => {
    if (state.timelinePointerId !== null && state.timelinePointerId !== event.pointerId) return;
    previewTimelineDrag(event.clientX);
  }, true);

  window.addEventListener('pointerup', (event) => {
    if (state.timelinePointerId !== null && state.timelinePointerId !== event.pointerId) return;
    if (elements.timeline.hasPointerCapture(event.pointerId)) {
      elements.timeline.releasePointerCapture(event.pointerId);
    }
    state.timelinePointerId = null;
    endTimelineDrag(event.clientX);
  }, true);

  window.addEventListener('pointercancel', (event) => {
    if (state.timelinePointerId !== null && state.timelinePointerId !== event.pointerId) return;
    if (elements.timeline.hasPointerCapture(event.pointerId)) {
      elements.timeline.releasePointerCapture(event.pointerId);
    }
    state.timelinePointerId = null;
    state.timelineDragging = false;
    state.timelinePreviewTime = null;
    updateProgressUi();
  }, true);

  elements.timeline.addEventListener('mousedown', (event) => {
    if (event.target === elements.timelineInput) return;
    keepControlsVisible();
    event.stopPropagation();
    event.preventDefault();
    state.timelineMouseDragging = true;
    beginTimelineDrag(event.clientX);
    previewTimelineDrag(event.clientX);
  });

  window.addEventListener('mousemove', (event) => {
    if (!state.timelineMouseDragging) return;
    previewTimelineDrag(event.clientX);
  }, true);

  window.addEventListener('mouseup', (event) => {
    if (!state.timelineMouseDragging) return;
    state.timelineMouseDragging = false;
    endTimelineDrag(event.clientX);
  }, true);

  const commitRangeSeek = () => {
    const duration = activeDuration();
    if (duration <= 0) return;
    const nextTime = (Number(elements.timelineInput.value || 0) / 1000) * duration;
    state.timelineDragging = false;
    state.timelinePreviewTime = null;
    seekActiveTo(nextTime);
  };

  elements.timelineInput.addEventListener('input', (event) => {
    if (!activePlaybackMode()) return;
    keepControlsVisible();
    event.stopPropagation();
    const duration = activeDuration();
    if (duration <= 0) return;
    state.timelineDragging = true;
    const nextTime = (Number(event.target.value || 0) / 1000) * duration;
    state.timelinePreviewTime = nextTime;
    updateProgressUi(nextTime, duration);
    seekActiveTo(nextTime);
    state.timelineDragging = true;
    state.timelinePreviewTime = nextTime;
  });

  elements.timelineInput.addEventListener('change', (event) => {
    if (!activePlaybackMode()) return;
    keepControlsVisible();
    event.stopPropagation();
    commitRangeSeek();
  });

  elements.timelineInput.addEventListener('mousedown', (event) => {
    if (!activePlaybackMode()) return;
    keepControlsVisible();
    event.stopPropagation();
    state.timelineDragging = true;
    const duration = activeDuration();
    if (duration <= 0) return;
    const nextTime = (Number(elements.timelineInput.value || 0) / 1000) * duration;
    state.timelinePreviewTime = nextTime;
    updateProgressUi(nextTime, duration);
  });

  elements.timelineInput.addEventListener('mouseup', (event) => {
    if (!activePlaybackMode()) return;
    keepControlsVisible();
    event.stopPropagation();
    commitRangeSeek();
  });
}

function bindControlEvents() {
  elements.playerShell.addEventListener('mousemove', (event) => {
    if (!activePlaybackMode()) return;
    if (state.gesturePointerId !== null || state.timelineMouseDragging || state.timelinePointerId !== null) return;
    if (event.buttons) return;
    keepControlsVisible();
  });

  elements.fullscreenControls.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button, .timeline') : null;
    if (!target) return;
    keepControlsVisible();
    event.stopPropagation();
  }, true);

  elements.goButton.addEventListener('click', () => navigate(elements.addressInput.value));
  elements.addressInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') navigate(elements.addressInput.value);
  });
  elements.goBack.addEventListener('click', () => {
    if (elements.browserView.canGoBack()) elements.browserView.goBack();
  });
  elements.goForward.addEventListener('click', () => {
    if (elements.browserView.canGoForward()) elements.browserView.goForward();
  });
  elements.closeFullscreen.addEventListener('click', closeFullscreen);
  elements.playToggle.addEventListener('click', () => {
    keepControlsVisible();
    if (state.selectedPlayback) toggleNativePlayback();
    else if (state.selectedOnline) toggleWebPlayback();
  });
  elements.downloadCurrent.addEventListener('click', () => {
    keepControlsVisible();
    if (state.selectedOnline) {
      downloadVideo(state.selectedOnline);
      return;
    }
    if (state.selectedPlayback?.candidate) {
      downloadVideo(state.selectedPlayback.candidate);
    }
  });

  elements.chipRow.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || !button.dataset.action) return;
    keepControlsVisible();

    if (button.dataset.action === 'seek') {
      seekActiveBy(Number(button.dataset.value || 0));
      return;
    }

    if (button.dataset.action === 'rate') {
      setActiveRate(Number(button.dataset.value || 1));
    }
  });

  bindGestureEvents();
  bindTimelineEvents();
}

function bindNativePlayerEvents() {
  ['play', 'pause', 'loadedmetadata', 'timeupdate', 'ratechange', 'volumechange', 'seeked'].forEach((eventName) => {
    elements.nativePlayer.addEventListener(eventName, () => {
      if (!state.selectedPlayback || state.timelineDragging) return;
      state.selectedPlayback.currentTime = elements.nativePlayer.currentTime || 0;
      state.selectedPlayback.duration = Number.isFinite(elements.nativePlayer.duration) ? elements.nativePlayer.duration : 0;
      state.selectedPlayback.paused = elements.nativePlayer.paused;
      state.nativeVolume = elements.nativePlayer.volume || 0;
      state.nativeRate = elements.nativePlayer.playbackRate || 1;
      updateProgressUi();
      scheduleAutoHide();
    });
  });
}

function bindWebviewEvents() {
  elements.browserView.addEventListener('did-start-loading', () => {
    state.browserReady = false;
    state.candidates = [];
    renderDetectedVideos();
    setStatus('Loading page...');
    syncNavButtons();
  });

  elements.browserView.addEventListener('dom-ready', async () => {
    state.browserReady = true;
    setStatus('Page connected. Scanning for videos...');
    await injectIntoPage();
    syncNavButtons();
  });

  const refreshLocation = () => {
    const url = elements.browserView.getURL();
    if (url) updateCurrentUrl(url);
    syncNavButtons();
  };

  elements.browserView.addEventListener('did-navigate', refreshLocation);
  elements.browserView.addEventListener('did-navigate-in-page', refreshLocation);
  elements.browserView.addEventListener('did-stop-loading', () => {
    refreshLocation();
    setStatus('Page loaded. Scanning for videos...');
    applyFallbackCandidates();
    injectIntoPage().catch(() => {});
  });
  elements.browserView.addEventListener('page-title-updated', (event) => {
    state.pageTitle = event.title || state.pageTitle;
  });
  elements.browserView.addEventListener('ipc-message', (event) => {
    if (event.channel === 'desktop-message') {
      handleDesktopMessage(event.args[0] || {});
    }
  });
  elements.browserView.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3) return;
    setStatus(`Load failed: ${event.errorDescription}`);
  });
}

async function initialize() {
  state.userDataPath = await ipcRenderer.invoke('desktop-user-data-path');
  injectedScript = await fs.readFile(path.join(__dirname, 'injected.js'), 'utf8');

  elements.browserView.setAttribute('preload', pathToFileURL(path.join(__dirname, 'webview-preload.cjs')).toString());
  elements.browserView.setAttribute('useragent', MOBILE_USER_AGENT);
  elements.browserView.style.background = '#ffffff';

  bindControlEvents();
  bindNativePlayerEvents();
  bindWebviewEvents();
  setBrightness(state.brightness);
  renderDetectedVideos();
  renderDownloads();
  updateProgressUi(0, 0);
  await loadDownloads();
  navigate(DEFAULT_URL);
}

initialize().catch((error) => {
  console.error(error);
  setStatus('The desktop simulator could not start.');
});
