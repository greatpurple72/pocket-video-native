import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { injectedJavaScript } from './src/injected';
import {
  formatTime,
  guessExtension,
  isHlsUrl,
  isOfflineFriendly,
  makeId,
  normalizeUrl,
  offlineReason,
  resolveUrl,
  sanitizeFileName,
} from './src/utils';
import type { DownloadItem, PlayerSnapshot, VideoCandidate } from './src/types';

const STORAGE_KEY = 'codex-video-browser-downloads';
const DEFAULT_URL = 'https://www.bilibili.com';
const HOLD_DELAY_MS = 260;
const DOUBLE_TAP_MS = 260;
const GESTURE_MOVE_THRESHOLD = 10;
const JUMP_STEP_SECONDS = 60;
const DOUBLE_TAP_SEEK_SECONDS = 30;
const REGULAR_SPEEDS = [1, 1.5, 2, 3, 6, 8];
const SAFE_NAVIGATION_PATTERN = /^(https?:|about:blank|blob:|data:|javascript:)/i;
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

type PlaybackTarget = {
  title: string;
  sourceUri: string;
  mode: 'stream' | 'download';
  candidate?: VideoCandidate | null;
  contentType?: 'auto' | 'hls';
};

type TapSide = 'left' | 'right';
type DoubleTapAction = 'seek-backward' | 'toggle-playback' | 'seek-forward';

type HlsResource = {
  url: string;
  localName: string;
  kind: 'segment' | 'key' | 'map';
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTapSide(pageX: number): TapSide {
  return pageX < Dimensions.get('window').width / 2 ? 'left' : 'right';
}

function getAttributeValue(line: string, attribute: string) {
  const match = line.match(new RegExp(`${attribute}="([^"]+)"`, 'i'));
  return match ? match[1] : null;
}

function replaceAttributeValue(line: string, attribute: string, value: string) {
  return line.replace(new RegExp(`${attribute}="([^"]+)"`, 'i'), `${attribute}="${value}"`);
}

function getBandwidth(line: string) {
  const match = line.match(/BANDWIDTH=(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function guessResourceExtension(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.[a-z0-9]+$/i);
    if (match) return match[0].toLowerCase();
  } catch (error) {}

  const match = url.split('?')[0].match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : '.bin';
}

function getTimelineValue(locationX: number, width: number, duration: number) {
  if (width <= 0 || duration <= 0) return 0;
  return clamp(locationX / width, 0, 1) * duration;
}

function formatRemainingTime(currentTime: number, duration: number) {
  return `-${formatTime(Math.max(duration - currentTime, 0))}`;
}

function getDoubleTapAction(pageX: number): DoubleTapAction {
  const screenWidth = Dimensions.get('window').width;
  const leftBoundary = screenWidth * 0.3;
  const rightBoundary = screenWidth * 0.7;

  if (pageX <= leftBoundary) return 'seek-backward';
  if (pageX >= rightBoundary) return 'seek-forward';
  return 'toggle-playback';
}

function pickHighestBandwidthVariant(text: string, baseUrl: string) {
  const lines = text.replace(/\r/g, '').split('\n');
  let best: { bandwidth: number; url: string } | null = null;

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

function rewriteMediaPlaylist(text: string, baseUrl: string) {
  const resources: HlsResource[] = [];
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
      resources.push({ url: absoluteUrl, localName, kind: 'key' });
      return replaceAttributeValue(line, 'URI', localName);
    }

    if (trimmed.startsWith('#EXT-X-MAP') && trimmed.includes('URI=')) {
      const uri = getAttributeValue(trimmed, 'URI');
      if (!uri) return line;
      const absoluteUrl = resolveUrl(uri, baseUrl);
      const localName = `map-${String((mapIndex += 1)).padStart(3, '0')}${guessResourceExtension(absoluteUrl)}`;
      resources.push({ url: absoluteUrl, localName, kind: 'map' });
      return replaceAttributeValue(line, 'URI', localName);
    }

    if (!trimmed.startsWith('#')) {
      const absoluteUrl = resolveUrl(trimmed, baseUrl);
      const localName = `segment-${String((segmentIndex += 1)).padStart(5, '0')}${guessResourceExtension(absoluteUrl)}`;
      resources.push({ url: absoluteUrl, localName, kind: 'segment' });
      return localName;
    }

    return line;
  });

  return {
    playlistText: rewrittenLines.join('\n'),
    resources,
  };
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const gestureRef = useRef({
    holdTimer: null as ReturnType<typeof setTimeout> | null,
    tapTimer: null as ReturnType<typeof setTimeout> | null,
    hudTimer: null as ReturnType<typeof setTimeout> | null,
    holdActive: false,
    moved: false,
    startBrightness: 0.5,
    startVolume: 1,
    holdRestoreRate: 1,
    activeSide: 'left' as TapSide,
    lastTapAt: 0,
  });
  const timelineRef = useRef({ web: 0, native: 0, webAnchorTime: 0, nativeAnchorTime: 0 });
  const snapshotRef = useRef<PlayerSnapshot | null>(null);
  const offlinePausedRef = useRef(true);

  const [addressInput, setAddressInput] = useState(DEFAULT_URL);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [pageTitle, setPageTitle] = useState('Pocket Video');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [selectedOnline, setSelectedOnline] = useState<VideoCandidate | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [selectedPlayback, setSelectedPlayback] = useState<PlaybackTarget | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);
  const [status, setStatus] = useState('Open a page and detected videos will appear below.');
  const [webFullscreen, setWebFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [brightness, setBrightness] = useState(0.5);
  const [webVolume, setWebVolume] = useState(1);
  const [baseRate, setBaseRate] = useState(1);
  const [offlineTime, setOfflineTime] = useState(0);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [offlinePaused, setOfflinePaused] = useState(true);
  const [offlineVolume, setOfflineVolume] = useState(1);
  const [offlineRate, setOfflineRate] = useState(1);
  const [webTimelineWidth, setWebTimelineWidth] = useState(0);
  const [nativeTimelineWidth, setNativeTimelineWidth] = useState(0);
  const [webScrubTime, setWebScrubTime] = useState<number | null>(null);
  const [nativeScrubTime, setNativeScrubTime] = useState<number | null>(null);
  const [gestureMessage, setGestureMessage] = useState<string | null>(null);

  const offlinePlayer = useVideoPlayer(null, (player) => {
    player.volume = 1;
    player.playbackRate = 1;
    player.loop = false;
    player.preservesPitch = true;
  });

  const webDuration = snapshot?.duration || 0;
  const displayedWebTime = webScrubTime ?? snapshot?.currentTime ?? 0;
  const webProgress = webDuration > 0 ? clamp(displayedWebTime / webDuration, 0, 1) : 0;

  const displayedNativeTime = nativeScrubTime ?? offlineTime;
  const nativeProgress = offlineDuration > 0 ? clamp(displayedNativeTime / offlineDuration, 0, 1) : 0;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!raw) return;

        const storedItems = JSON.parse(raw) as DownloadItem[];
        const validatedItems = (
          await Promise.all(
            storedItems.map(async (item) => {
              if (item.status !== 'completed') return item;
              const target = item.localRootUri || item.fileUri;
              const info = await FileSystem.getInfoAsync(target).catch(() => ({ exists: false }));
              return info.exists ? item : null;
            })
          )
        ).filter(Boolean) as DownloadItem[];

        setDownloads(validatedItems);
      })
      .catch(() => setStatus('Could not read the saved download list, but playback is still available.'));

    Brightness.getBrightnessAsync().then(setBrightness).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(downloads)).catch(() => {});
  }, [downloads]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    offlinePausedRef.current = offlinePaused;
  }, [offlinePaused]);

  useEffect(() => {
    return () => {
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      if (gestureRef.current.tapTimer) clearTimeout(gestureRef.current.tapTimer);
      if (gestureRef.current.hudTimer) clearTimeout(gestureRef.current.hudTimer);
    };
  }, []);

  useEffect(() => {
    if (!selectedPlayback) return;

    let alive = true;
    const currentPlayback = selectedPlayback;

    const load = async () => {
      try {
        await offlinePlayer.replaceAsync(
          currentPlayback.contentType && currentPlayback.contentType !== 'auto'
            ? { uri: currentPlayback.sourceUri, contentType: currentPlayback.contentType }
            : currentPlayback.sourceUri
        );
        if (!alive) return;

        offlinePlayer.volume = offlineVolume;
        offlinePlayer.preservesPitch = true;
        offlinePlayer.playbackRate = offlineRate;
        offlinePlayer.play();
        setOfflinePaused(false);
        setShowControls(true);
        setNativeScrubTime(null);
        setOfflineTime(0);
        setOfflineDuration(0);
        setStatus(
          currentPlayback.mode === 'download'
            ? 'Playing the saved video in native fullscreen.'
            : 'Playing the detected stream in native fullscreen.'
        );
      } catch (error) {
        if (!alive) return;
        Alert.alert(
          'Playback failed',
          currentPlayback.mode === 'download'
            ? 'This saved item could not be opened.'
            : 'This stream could not be opened in the native player.'
        );
        setSelectedPlayback(null);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [offlinePlayer, selectedPlayback?.mode, selectedPlayback?.sourceUri]);

  useEffect(() => {
    if (!selectedPlayback) return;

    const timer = setInterval(() => {
      setOfflineTime(offlinePlayer.currentTime || 0);
      setOfflineDuration(offlinePlayer.duration || 0);
      setOfflinePaused(!offlinePlayer.playing);
      setOfflineVolume(offlinePlayer.volume || 0);
      if (!gestureRef.current.holdActive) {
        setOfflineRate(offlinePlayer.playbackRate || 1);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [offlinePlayer, selectedPlayback]);

  useEffect(() => {
    if (!selectedPlayback) return;
    offlinePlayer.volume = offlineVolume;
  }, [offlinePlayer, offlineVolume, selectedPlayback]);

  useEffect(() => {
    if (!selectedPlayback || gestureRef.current.holdActive) return;
    offlinePlayer.preservesPitch = true;
    offlinePlayer.playbackRate = offlineRate;
  }, [offlinePlayer, offlineRate, selectedPlayback]);

  useEffect(() => {
    if (!(webFullscreen || selectedPlayback) || !showControls) return;
    if (webScrubTime !== null || nativeScrubTime !== null) return;
    const isPlaying = selectedPlayback ? !offlinePaused : !snapshot?.paused;
    if (!isPlaying) return;

    const timer = setTimeout(() => setShowControls(false), 2000);
    return () => clearTimeout(timer);
  }, [nativeScrubTime, offlinePaused, selectedPlayback, showControls, snapshot?.paused, webFullscreen, webScrubTime]);

  function updateDownloadItem(id: string, updater: (item: DownloadItem) => DownloadItem) {
    setDownloads((items) => items.map((item) => (item.id === id ? updater(item) : item)));
  }

  function sendWebCommand(command: Record<string, unknown>) {
    webViewRef.current?.injectJavaScript(`window.__codexHandleCommand(${JSON.stringify(command)}); true;`);
  }

  function showGestureMessage(message: string) {
    setGestureMessage(message);
    if (gestureRef.current.hudTimer) {
      clearTimeout(gestureRef.current.hudTimer);
    }
    gestureRef.current.hudTimer = setTimeout(() => setGestureMessage(null), 700);
  }

  function setBrightnessLevel(value: number) {
    const next = clamp(value, 0.05, 1);
    setBrightness(next);
    Brightness.setBrightnessAsync(next).catch(() => {});
  }

  function submitAddress() {
    const url = normalizeUrl(addressInput);
    setAddressInput(url);
    setCurrentUrl(url);
    setStatus('Loading the page and scanning it for playable video...');
  }

  function onNav(nav: WebViewNavigation) {
    setCurrentUrl(nav.url);
    setAddressInput(nav.url);
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
    if (nav.title) {
      setPageTitle(nav.title);
    }
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'videosFound') {
        const nextCandidates = Array.isArray(data.videos) ? (data.videos as VideoCandidate[]) : [];
        setCandidates(nextCandidates);
        if (data.title) setPageTitle(data.title);
        if (nextCandidates.length > 0) {
          setStatus(`Detected ${nextCandidates.length} playable video source${nextCandidates.length > 1 ? 's' : ''}.`);
        }
      }

      if (data.type === 'playerState') {
        setSnapshot(data.state);
        if (typeof data.state?.volume === 'number') {
          setWebVolume(data.state.volume);
        }
        if (typeof data.state?.playbackRate === 'number' && !gestureRef.current.holdActive) {
          setBaseRate(data.state.playbackRate);
        }
      }

      if (data.type === 'focusError') {
        Alert.alert('Playback failed', data.message || 'The page video could not be opened in fullscreen.');
        setWebFullscreen(false);
        setSelectedOnline(null);
      }

      if (data.type === 'blockedExternalNavigation' || data.type === 'blockedPopup') {
        setStatus('Blocked a popup window or another-app jump.');
      }
    } catch (error) {}
  }

  function blockExternalNavigation(url: string) {
    setStatus(`Blocked a popup or another-app jump: ${url}`);
  }

  function onShouldStartLoad(request: { url?: string }) {
    const url = request.url || '';
    if (!SAFE_NAVIGATION_PATTERN.test(url)) {
      blockExternalNavigation(url);
      return false;
    }
    return true;
  }

  function onOpenWindow(event: any) {
    const url = event?.nativeEvent?.targetUrl || event?.nativeEvent?.url || 'unknown target';
    blockExternalNavigation(url);
  }

  function openOnline(video: VideoCandidate) {
    setShowControls(true);

    if (video.kind === 'native-stream') {
      setOfflineRate(baseRate);
      setSelectedPlayback({
        title: video.title || pageTitle || 'Stream video',
        sourceUri: video.url,
        mode: 'stream',
        candidate: video,
        contentType: isHlsUrl(video.url) ? 'hls' : 'auto',
      });
      return;
    }

    setSelectedPlayback(null);
    setSelectedOnline(video);
    setWebFullscreen(true);
    setWebScrubTime(null);
    sendWebCommand({ action: 'enterFocus', id: video.id });
    setTimeout(() => {
      sendWebCommand({ action: 'setRate', id: video.id, value: baseRate });
    }, 120);
  }

  function closeOnline() {
    sendWebCommand({ action: 'exitFocus' });
    setWebFullscreen(false);
    setSelectedOnline(null);
    setShowControls(true);
    setWebScrubTime(null);
    setStatus('Back in browser mode.');
  }

  function closeOffline() {
    offlinePlayer.pause();
    setSelectedPlayback(null);
    setShowControls(true);
    setOfflineTime(0);
    setOfflineDuration(0);
    setOfflinePaused(true);
    setNativeScrubTime(null);
    setStatus('Back in browser mode.');
  }

  function toggleWebPlayPause() {
    const nextPaused = !(snapshotRef.current?.paused ?? false);
    setSnapshot((current) => (current ? { ...current, paused: nextPaused } : current));
    sendWebCommand({ action: 'togglePlay', id: selectedOnline?.id });
    return nextPaused;
  }

  function toggleNativePlayPause() {
    const nextPaused = !offlinePausedRef.current;
    if (offlinePlayer.playing) {
      offlinePlayer.pause();
    } else {
      offlinePlayer.play();
    }
    setOfflinePaused(nextPaused);
    return nextPaused;
  }

  function seekWebBy(seconds: number) {
    sendWebCommand({ action: 'seekBy', id: selectedOnline?.id, value: seconds });
    setShowControls(true);
  }

  function seekNativeBy(seconds: number) {
    offlinePlayer.currentTime = clamp((offlinePlayer.currentTime || 0) + seconds, 0, offlinePlayer.duration || 0);
    setShowControls(true);
  }

  function seekWebTo(seconds: number) {
    sendWebCommand({ action: 'seekTo', id: selectedOnline?.id, value: seconds });
  }

  function seekNativeTo(seconds: number) {
    offlinePlayer.currentTime = clamp(seconds, 0, offlinePlayer.duration || 0);
  }

  function applyWebRate(rate: number) {
    setBaseRate(rate);
    sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: rate });
  }

  function applyNativeRate(rate: number) {
    setOfflineRate(rate);
    offlinePlayer.playbackRate = rate;
  }

  function openDownloadedVideo(item: DownloadItem) {
    setShowControls(true);
    setSelectedPlayback({
      title: item.title,
      sourceUri: item.fileUri,
      mode: 'download',
      candidate: null,
      contentType: item.mediaKind === 'hls' ? 'hls' : 'auto',
    });
  }

  function openStreamingDownload(item: DownloadItem) {
    setShowControls(true);
    setSelectedPlayback({
      title: `${item.title} (stream)`,
      sourceUri: item.remoteUrl,
      mode: 'stream',
      candidate: {
        id: item.id,
        title: item.title,
        url: item.remoteUrl,
        kind: 'native-stream',
      },
      contentType: isHlsUrl(item.remoteUrl) ? 'hls' : 'auto',
    });
  }

  async function removeDownload(item: DownloadItem) {
    try {
      const target = item.localRootUri || item.fileUri;
      const info = await FileSystem.getInfoAsync(target);
      if (info.exists) {
        await FileSystem.deleteAsync(target, { idempotent: true });
      }
    } catch (error) {}

    setDownloads((items) => items.filter((entry) => entry.id !== item.id));
  }

  async function fetchText(url: string, headers: Record<string, string>) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.text();
  }

  async function resolvePlayablePlaylist(url: string, headers: Record<string, string>) {
    let currentUrlToLoad = url;
    let playlistText = await fetchText(currentUrlToLoad, headers);

    for (let depth = 0; depth < 3; depth += 1) {
      if (!playlistText.includes('#EXT-X-STREAM-INF')) break;

      const variantUrl = pickHighestBandwidthVariant(playlistText, currentUrlToLoad);
      if (!variantUrl || variantUrl === currentUrlToLoad) break;

      currentUrlToLoad = variantUrl;
      playlistText = await fetchText(currentUrlToLoad, headers);
    }

    return {
      playlistUrl: currentUrlToLoad,
      playlistText,
    };
  }

  async function downloadHlsPackage(video: VideoCandidate, downloadId: string, headers: Record<string, string>) {
    const baseDir = `${FileSystem.documentDirectory}video-downloads`;
    const packageDir = `${baseDir}/${sanitizeFileName(video.title || pageTitle)}-${Date.now()}`;
    await FileSystem.makeDirectoryAsync(packageDir, { intermediates: true });

    try {
      const { playlistUrl, playlistText } = await resolvePlayablePlaylist(video.url, headers);
      const { playlistText: localPlaylist, resources } = rewriteMediaPlaylist(playlistText, playlistUrl);

      const totalSteps = Math.max(resources.length + 1, 1);
      let completedSteps = 0;

      for (const resource of resources) {
        const localPath = `${packageDir}/${resource.localName}`;
        const task = FileSystem.createDownloadResumable(resource.url, localPath, { headers });
        const saved = await task.downloadAsync();
        if (!saved) {
          throw new Error('Resource download was interrupted.');
        }

        completedSteps += 1;
        updateDownloadItem(downloadId, (item) => ({
          ...item,
          mediaKind: 'hls',
          localRootUri: packageDir,
          progress: completedSteps / totalSteps,
          bytesWritten: completedSteps,
          bytesExpected: totalSteps,
          status: 'downloading',
        }));
      }

      const entryUri = `${packageDir}/index.m3u8`;
      await FileSystem.writeAsStringAsync(entryUri, localPlaylist, { encoding: FileSystem.EncodingType.UTF8 });
      completedSteps += 1;

      updateDownloadItem(downloadId, (item) => ({
        ...item,
        fileUri: entryUri,
        localRootUri: packageDir,
        mediaKind: 'hls',
        progress: completedSteps / totalSteps,
        bytesWritten: completedSteps,
        bytesExpected: totalSteps,
        status: 'completed',
      }));

      return entryUri;
    } catch (error) {
      await FileSystem.deleteAsync(packageDir, { idempotent: true }).catch(() => {});
      throw error;
    }
  }

  async function downloadDirectFile(video: VideoCandidate, downloadId: string, headers: Record<string, string>) {
    const baseDir = `${FileSystem.documentDirectory}video-downloads`;
    const ext = guessExtension(video.url);
    const fileName = `${sanitizeFileName(video.title || pageTitle)}-${Date.now()}${ext}`;
    const fileUri = `${baseDir}/${fileName}`;

    const task = FileSystem.createDownloadResumable(
      video.url,
      fileUri,
      { headers },
      (progress: FileSystem.DownloadProgressData) => {
        const ratio =
          progress.totalBytesExpectedToWrite > 0
            ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            : 0;

        updateDownloadItem(downloadId, (item) => ({
          ...item,
          status: 'downloading',
          mediaKind: 'file',
          progress: ratio,
          bytesWritten: progress.totalBytesWritten,
          bytesExpected: progress.totalBytesExpectedToWrite,
        }));
      }
    );

    const saved = await task.downloadAsync();
    if (!saved) {
      throw new Error('Download was interrupted.');
    }

    updateDownloadItem(downloadId, (item) => ({
      ...item,
      fileUri: saved.uri,
      mediaKind: 'file',
      status: 'completed',
      progress: 1,
      bytesWritten: item.bytesExpected || item.bytesWritten,
    }));

    return saved.uri;
  }

  async function downloadVideo(video: VideoCandidate) {
    if (!video.url) {
      Alert.alert('Cannot download', 'No media URL was detected for this video.');
      return;
    }

    if (!isOfflineFriendly(video.url)) {
      Alert.alert('Offline download not supported', offlineReason(video.url));
      return;
    }

    setDownloadBusy(video.id);
    setStatus('Saving the video for offline playback...');

    try {
      const baseDir = `${FileSystem.documentDirectory}video-downloads`;
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }

      const downloadId = makeId('download');
      const initialFileUri = `${baseDir}/${sanitizeFileName(video.title || pageTitle)}-${Date.now()}${guessExtension(video.url)}`;
      const origin = (() => {
        try {
          return new URL(currentUrl).origin;
        } catch (error) {
          return currentUrl;
        }
      })();
      const headers = {
        Referer: currentUrl,
        Origin: origin,
        'User-Agent': MOBILE_USER_AGENT,
      };

      setDownloads((items) => [
        {
          id: downloadId,
          title: video.title || pageTitle || 'Offline video',
          remoteUrl: video.url,
          sourcePage: currentUrl,
          fileUri: initialFileUri,
          downloadedAt: new Date().toISOString(),
          status: 'downloading',
          progress: 0,
          bytesWritten: 0,
          bytesExpected: 0,
          mediaKind: isHlsUrl(video.url) ? 'hls' : 'file',
        },
        ...items,
      ]);

      if (isHlsUrl(video.url)) {
        await downloadHlsPackage(video, downloadId, headers);
      } else {
        await downloadDirectFile(video, downloadId, headers);
      }

      setStatus('Download finished. You can open it from the offline list.');
    } catch (error) {
      setDownloads((items) =>
        items.map((item) =>
          item.remoteUrl === video.url && item.status === 'downloading'
            ? {
                ...item,
                status: 'failed',
                errorMessage: 'The site blocked the download or the media package could not be rebuilt.',
              }
            : item
        )
      );

      Alert.alert(
        'Download failed',
        'The source might require site authorization, or the media package could not be rebuilt for offline playback.'
      );
      setStatus('Download failed because the site blocked the request or the media package was incomplete.');
    } finally {
      setDownloadBusy(null);
    }
  }

  function clearHoldTimer() {
    if (gestureRef.current.holdTimer) {
      clearTimeout(gestureRef.current.holdTimer);
      gestureRef.current.holdTimer = null;
    }
  }

  function clearTapTimer() {
    if (gestureRef.current.tapTimer) {
      clearTimeout(gestureRef.current.tapTimer);
      gestureRef.current.tapTimer = null;
    }
  }

  function startHold(mode: 'web' | 'native') {
    clearHoldTimer();

    gestureRef.current.holdTimer = setTimeout(() => {
      gestureRef.current.holdActive = true;
      gestureRef.current.holdRestoreRate = mode === 'web' ? baseRate : offlineRate;
      showGestureMessage('Hold 1x');

      if (mode === 'web') {
        sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: 1 });
      } else {
        offlinePlayer.playbackRate = 1;
      }
    }, HOLD_DELAY_MS);
  }

  function finishHold(mode: 'web' | 'native') {
    clearHoldTimer();

    if (!gestureRef.current.holdActive) return false;

    gestureRef.current.holdActive = false;
    const restoreRate = gestureRef.current.holdRestoreRate;

    if (mode === 'web') {
      sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: restoreRate });
    } else {
      offlinePlayer.playbackRate = restoreRate;
      setOfflineRate(restoreRate);
    }

    showGestureMessage(`${restoreRate.toFixed(2)}x`);

    return true;
  }

  function scheduleSingleTap() {
    clearTapTimer();
    gestureRef.current.tapTimer = setTimeout(() => {
      setShowControls((visible) => !visible);
      gestureRef.current.lastTapAt = 0;
    }, DOUBLE_TAP_MS);
  }

  function handleTap(pageX: number, mode: 'web' | 'native') {
    const now = Date.now();
    const isDoubleTap = now - gestureRef.current.lastTapAt < DOUBLE_TAP_MS;

    if (isDoubleTap) {
      clearTapTimer();
      gestureRef.current.lastTapAt = 0;
      const action = getDoubleTapAction(pageX);

      if (action === 'seek-backward') {
        if (mode === 'web') seekWebBy(-DOUBLE_TAP_SEEK_SECONDS);
        else seekNativeBy(-DOUBLE_TAP_SEEK_SECONDS);
        showGestureMessage(`-${DOUBLE_TAP_SEEK_SECONDS}s`);
        return;
      }

      if (action === 'seek-forward') {
        if (mode === 'web') seekWebBy(DOUBLE_TAP_SEEK_SECONDS);
        else seekNativeBy(DOUBLE_TAP_SEEK_SECONDS);
        showGestureMessage(`+${DOUBLE_TAP_SEEK_SECONDS}s`);
        return;
      }

      const nextPaused = mode === 'web' ? !Boolean(snapshotRef.current?.paused) : !offlinePausedRef.current;
      if (mode === 'web') toggleWebPlayPause();
      else toggleNativePlayPause();
      showGestureMessage(nextPaused ? 'Pause' : 'Play');
      return;
    }

    gestureRef.current.lastTapAt = now;
    scheduleSingleTap();
  }

  function updateEdgeValue(mode: 'web' | 'native', side: TapSide, deltaY: number) {
    const amount = -deltaY / Math.max(Dimensions.get('window').height * 0.35, 1);

    if (side === 'left') {
      const nextBrightness = gestureRef.current.startBrightness + amount;
      setBrightnessLevel(nextBrightness);
      showGestureMessage(`Brightness ${Math.round(clamp(nextBrightness, 0.05, 1) * 100)}%`);
      return;
    }

    const nextVolume = clamp(gestureRef.current.startVolume + amount, 0, 1);
    showGestureMessage(`Volume ${Math.round(nextVolume * 100)}%`);

    if (mode === 'web') {
      setWebVolume(nextVolume);
      sendWebCommand({ action: 'setVolume', id: selectedOnline?.id, value: Number(nextVolume.toFixed(3)) });
      return;
    }

    setOfflineVolume(nextVolume);
    offlinePlayer.volume = nextVolume;
  }

  function beginTimelineScrub(mode: 'web' | 'native') {
    setShowControls(true);
    if (mode === 'web') {
      timelineRef.current.web = displayedWebTime;
      setWebScrubTime(displayedWebTime);
      return;
    }

    timelineRef.current.native = displayedNativeTime;
    setNativeScrubTime(displayedNativeTime);
  }

  function updateTimelineScrub(mode: 'web' | 'native', locationX: number) {
    if (mode === 'web') {
      if (webDuration <= 0 || webTimelineWidth <= 0) return;
      const value = getTimelineValue(locationX, webTimelineWidth, webDuration);
      timelineRef.current.web = value;
      setWebScrubTime(value);
      return;
    }

    if (offlineDuration <= 0 || nativeTimelineWidth <= 0) return;
    const value = getTimelineValue(locationX, nativeTimelineWidth, offlineDuration);
    timelineRef.current.native = value;
    setNativeScrubTime(value);
  }

  function finishTimelineScrub(mode: 'web' | 'native', locationX?: number) {
    if (typeof locationX === 'number') {
      updateTimelineScrub(mode, locationX);
    }

    if (mode === 'web') {
      seekWebTo(timelineRef.current.web);
      setWebScrubTime(null);
      return;
    }

    seekNativeTo(timelineRef.current.native);
    setNativeScrubTime(null);
  }

  const webGestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          gestureRef.current.startBrightness = brightness;
          gestureRef.current.startVolume = webVolume;
          gestureRef.current.moved = false;
          gestureRef.current.activeSide = getTapSide(event.nativeEvent.pageX);
          startHold('web');
          clearTapTimer();
        },
        onPanResponderMove: (event, gesture) => {
          const hasMoved =
            Math.abs(gesture.dy) > GESTURE_MOVE_THRESHOLD || Math.abs(gesture.dx) > GESTURE_MOVE_THRESHOLD;

          if (hasMoved) {
            gestureRef.current.moved = true;
            clearHoldTimer();
          }

          if (!gestureRef.current.moved || gestureRef.current.holdActive) return;
          updateEdgeValue('web', gestureRef.current.activeSide, gesture.dy);
        },
        onPanResponderRelease: (event) => {
          if (finishHold('web')) return;
          clearHoldTimer();
          if (gestureRef.current.moved) return;
          handleTap(event.nativeEvent.pageX, 'web');
        },
        onPanResponderTerminate: () => {
          finishHold('web');
          clearHoldTimer();
        },
      }),
    [baseRate, brightness, offlineRate, selectedOnline?.id, webVolume]
  );

  const nativeGestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          gestureRef.current.startBrightness = brightness;
          gestureRef.current.startVolume = offlineVolume;
          gestureRef.current.moved = false;
          gestureRef.current.activeSide = getTapSide(event.nativeEvent.pageX);
          startHold('native');
          clearTapTimer();
        },
        onPanResponderMove: (event, gesture) => {
          const hasMoved =
            Math.abs(gesture.dy) > GESTURE_MOVE_THRESHOLD || Math.abs(gesture.dx) > GESTURE_MOVE_THRESHOLD;

          if (hasMoved) {
            gestureRef.current.moved = true;
            clearHoldTimer();
          }

          if (!gestureRef.current.moved || gestureRef.current.holdActive) return;
          updateEdgeValue('native', gestureRef.current.activeSide, gesture.dy);
        },
        onPanResponderRelease: (event) => {
          if (finishHold('native')) return;
          clearHoldTimer();
          if (gestureRef.current.moved) return;
          handleTap(event.nativeEvent.pageX, 'native');
        },
        onPanResponderTerminate: () => {
          finishHold('native');
          clearHoldTimer();
        },
      }),
    [brightness, offlineRate, offlineVolume, offlinePlayer, webVolume]
  );

  function renderWebControls() {
    if (!showControls) return null;

    return (
      <>
        <View style={styles.overlayTop}>
          <Pressable style={styles.overlayButton} onPress={closeOnline}>
            <Text style={styles.overlayButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.overlayTitle} numberOfLines={1}>
            {selectedOnline?.title || snapshot?.title || 'Web video'}
          </Text>
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTime}>{formatTime(displayedWebTime)}</Text>
              <Text style={styles.progressMeta}>
                {formatTime(webDuration)} | {formatRemainingTime(displayedWebTime, webDuration)}
              </Text>
            </View>

            <View
              style={styles.timelineTrackWrap}
              onLayout={(event) => setWebTimelineWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => webDuration > 0}
              onMoveShouldSetResponder={() => webDuration > 0}
              onResponderGrant={(event) => {
                beginTimelineScrub('web');
                updateTimelineScrub('web', event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => {
                updateTimelineScrub('web', event.nativeEvent.locationX);
              }}
              onResponderRelease={(event) => {
                finishTimelineScrub('web', event.nativeEvent.locationX);
              }}
              onResponderTerminate={() => {
                setWebScrubTime(null);
              }}
            >
              <View style={styles.timelineTrack} />
              <View style={[styles.timelineFill, { width: `${webProgress * 100}%` }]} />
              <View style={[styles.timelineThumb, { left: `${webProgress * 100}%` }]} />
            </View>

            <Text style={styles.hintText}>
              Left side: brightness | Right side: volume | Hold: temporary 1x | Double tap left/right: -30s / +30s | center: play/pause
            </Text>
          </View>

          <View style={styles.controlsCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
              <Pressable style={styles.rateChip} onPress={toggleWebPlayPause}>
                <Text style={styles.rateChipText}>{snapshot?.paused ? 'Play' : 'Pause'}</Text>
              </Pressable>
              <Pressable style={styles.rateChip} onPress={() => seekWebBy(-JUMP_STEP_SECONDS)}>
                <Text style={styles.rateChipText}>-60s</Text>
              </Pressable>
              <Pressable style={styles.rateChip} onPress={() => seekWebBy(JUMP_STEP_SECONDS)}>
                <Text style={styles.rateChipText}>+60s</Text>
              </Pressable>
              {REGULAR_SPEEDS.map((speed) => (
                <Pressable
                  key={speed}
                  style={[styles.rateChip, Math.abs(baseRate - speed) < 0.01 && styles.rateChipActive]}
                  onPress={() => applyWebRate(speed)}
                >
                  <Text style={[styles.rateChipText, Math.abs(baseRate - speed) < 0.01 && styles.rateChipTextActive]}>
                    {speed}x
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.downloadChip}
                onPress={() => selectedOnline && downloadVideo(selectedOnline)}
                disabled={!selectedOnline || downloadBusy === selectedOnline.id}
              >
                <Text style={styles.downloadChipText}>
                  {downloadBusy === selectedOnline?.id ? 'Saving...' : 'Save offline'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </>
    );
  }

  function renderNativeControls() {
    if (!showControls || !selectedPlayback) return null;

    return (
      <>
        <View style={styles.overlayTop}>
          <Pressable style={styles.overlayButton} onPress={closeOffline}>
            <Text style={styles.overlayButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.overlayTitle} numberOfLines={1}>
            {selectedPlayback.title}
          </Text>
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTime}>{formatTime(displayedNativeTime)}</Text>
              <Text style={styles.progressMeta}>
                {formatTime(offlineDuration)} | {formatRemainingTime(displayedNativeTime, offlineDuration)}
              </Text>
            </View>

            <View
              style={styles.timelineTrackWrap}
              onLayout={(event) => setNativeTimelineWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => offlineDuration > 0}
              onMoveShouldSetResponder={() => offlineDuration > 0}
              onResponderGrant={(event) => {
                beginTimelineScrub('native');
                updateTimelineScrub('native', event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => {
                updateTimelineScrub('native', event.nativeEvent.locationX);
              }}
              onResponderRelease={(event) => {
                finishTimelineScrub('native', event.nativeEvent.locationX);
              }}
              onResponderTerminate={() => {
                setNativeScrubTime(null);
              }}
            >
              <View style={styles.timelineTrack} />
              <View style={[styles.timelineFill, { width: `${nativeProgress * 100}%` }]} />
              <View style={[styles.timelineThumb, { left: `${nativeProgress * 100}%` }]} />
            </View>

            <Text style={styles.hintText}>
              Left side: brightness | Right side: volume | Hold: temporary 1x | Double tap left/right: -30s / +30s | center: play/pause
            </Text>
          </View>

          <View style={styles.controlsCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
              <Pressable style={styles.rateChip} onPress={toggleNativePlayPause}>
                <Text style={styles.rateChipText}>{offlinePaused ? 'Play' : 'Pause'}</Text>
              </Pressable>
              <Pressable style={styles.rateChip} onPress={() => seekNativeBy(-JUMP_STEP_SECONDS)}>
                <Text style={styles.rateChipText}>-60s</Text>
              </Pressable>
              <Pressable style={styles.rateChip} onPress={() => seekNativeBy(JUMP_STEP_SECONDS)}>
                <Text style={styles.rateChipText}>+60s</Text>
              </Pressable>
              {REGULAR_SPEEDS.map((speed) => (
                <Pressable
                  key={speed}
                  style={[styles.rateChip, Math.abs(offlineRate - speed) < 0.01 && styles.rateChipActive]}
                  onPress={() => applyNativeRate(speed)}
                >
                  <Text style={[styles.rateChipText, Math.abs(offlineRate - speed) < 0.01 && styles.rateChipTextActive]}>
                    {speed}x
                  </Text>
                </Pressable>
              ))}
              {selectedPlayback.candidate ? (
                <Pressable
                  style={styles.downloadChip}
                  onPress={() => selectedPlayback.candidate && downloadVideo(selectedPlayback.candidate)}
                  disabled={downloadBusy === selectedPlayback.candidate?.id}
                >
                  <Text style={styles.downloadChipText}>
                    {downloadBusy === selectedPlayback.candidate?.id ? 'Saving...' : 'Save offline'}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={webFullscreen || selectedPlayback ? 'light' : 'dark'} hidden={webFullscreen || !!selectedPlayback} />

      {!webFullscreen && !selectedPlayback ? (
        <View style={styles.header}>
          <Text style={styles.brand}>Pocket Video</Text>
          <Text style={styles.caption}>{pageTitle}</Text>
          <View style={styles.addressRow}>
            <Pressable style={styles.navButton} onPress={() => canGoBack && webViewRef.current?.goBack()}>
              <Text style={styles.navButtonText}>{'<'}</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => canGoForward && webViewRef.current?.goForward()}>
              <Text style={styles.navButtonText}>{'>'}</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={submitAddress}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter a URL or search words"
            />
            <Pressable style={styles.goButton} onPress={submitAddress}>
              <Text style={styles.goButtonText}>Go</Text>
            </Pressable>
          </View>
          <Text style={styles.status}>{status}</Text>
        </View>
      ) : null}

      <View style={[styles.webShell, webFullscreen && styles.webShellFullscreen]}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webView}
          onMessage={onMessage}
          onNavigationStateChange={onNav}
          injectedJavaScript={injectedJavaScript}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          onOpenWindow={onOpenWindow}
          onShouldStartLoadWithRequest={onShouldStartLoad}
        />

        {webFullscreen ? (
          <>
            <View style={styles.gestureLayer} {...webGestures.panHandlers} />
            <View
              pointerEvents="none"
              style={[styles.brightnessMask, { opacity: clamp((1 - brightness) * 0.82, 0, 0.72) }]}
            />
            {gestureMessage ? (
              <View pointerEvents="none" style={styles.gestureMessageWrap}>
                <Text style={styles.gestureMessageText}>{gestureMessage}</Text>
              </View>
            ) : null}
            {renderWebControls()}
          </>
        ) : null}
      </View>

      {!webFullscreen && !selectedPlayback ? (
        <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Detected videos</Text>
            {candidates.length === 0 ? (
              <Text style={styles.muted}>
                Open Bilibili, a search result page, or any normal website. Playable page videos will appear here.
              </Text>
            ) : null}

            {candidates.map((video) => (
              <View key={video.id} style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {video.title || 'Detected video'}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {video.url}
                </Text>
                <Text style={styles.cardTag}>{video.kind === 'html5-video' ? 'Page video' : 'Direct stream'}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={styles.primaryButton} onPress={() => openOnline(video)}>
                    <Text style={styles.primaryButtonText}>Open fullscreen</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={downloadBusy === video.id}
                    onPress={() => downloadVideo(video)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {downloadBusy === video.id ? 'Saving...' : 'Save offline'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Offline library</Text>
            {downloads.length === 0 ? (
              <Text style={styles.muted}>
                Direct MP4 and rebuilt HLS packages will be listed here for offline playback.
              </Text>
            ) : null}

            {downloads.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  {item.status === 'downloading'
                    ? item.mediaKind === 'hls'
                      ? `Packaging stream... ${Math.round((item.progress || 0) * 100)}%`
                      : `Downloading... ${Math.round((item.progress || 0) * 100)}%`
                    : item.status === 'failed'
                      ? item.errorMessage || 'Download failed.'
                      : item.fileUri}
                </Text>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => (item.status === 'completed' ? openDownloadedVideo(item) : openStreamingDownload(item))}
                  >
                    <Text style={styles.primaryButtonText}>
                      {item.status === 'completed' ? 'Play offline' : 'Watch while saving'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => removeDownload(item)}>
                    <Text style={styles.secondaryButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {selectedPlayback ? (
        <View style={styles.offlineScreen}>
          <VideoView player={offlinePlayer} style={styles.webView} contentFit="contain" nativeControls={false} />
          <View style={styles.gestureLayer} {...nativeGestures.panHandlers} />
          <View
            pointerEvents="none"
            style={[styles.brightnessMask, { opacity: clamp((1 - brightness) * 0.82, 0, 0.72) }]}
          />
          {gestureMessage ? (
            <View pointerEvents="none" style={styles.gestureMessageWrap}>
              <Text style={styles.gestureMessageText}>{gestureMessage}</Text>
            </View>
          ) : null}
          {renderNativeControls()}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4efe6',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102a43',
  },
  caption: {
    marginTop: 4,
    color: '#486581',
    fontSize: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9e2ec',
  },
  navButtonText: {
    color: '#102a43',
    fontWeight: '700',
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#bcccdc',
    borderRadius: 21,
    backgroundColor: '#fffaf1',
    paddingHorizontal: 14,
  },
  goButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d6451b',
  },
  goButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  status: {
    marginTop: 10,
    fontSize: 12,
    color: '#7b8794',
  },
  webShell: {
    flex: 1,
    minHeight: 280,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#081521',
  },
  webShellFullscreen: {
    position: 'absolute',
    inset: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    zIndex: 20,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  brightnessMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 11,
  },
  gestureMessageWrap: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    zIndex: 22,
    backgroundColor: 'rgba(0,0,0,0.66)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gestureMessageText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  panel: {
    backgroundColor: '#fffaf1',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9dcc9',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102a43',
    marginBottom: 10,
  },
  muted: {
    color: '#7b8794',
    lineHeight: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e6ecf2',
    padding: 14,
    marginTop: 10,
  },
  cardTitle: {
    color: '#102a43',
    fontWeight: '700',
  },
  cardMeta: {
    color: '#7b8794',
    fontSize: 11,
    marginTop: 6,
  },
  cardTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f0f4f8',
    color: '#486581',
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102a43',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0b429',
  },
  secondaryButtonText: {
    color: '#102a43',
    fontWeight: '700',
  },
  overlayTop: {
    position: 'absolute',
    top: 56,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 20,
  },
  overlayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  overlayTitle: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
  },
  overlayBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
    gap: 12,
    zIndex: 20,
  },
  progressCard: {
    backgroundColor: 'rgba(0,0,0,0.66)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTime: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  progressMeta: {
    color: '#d9e2ec',
    fontSize: 12,
  },
  timelineTrackWrap: {
    height: 40,
    justifyContent: 'center',
  },
  timelineTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  timelineFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f0b429',
  },
  timelineThumb: {
    position: 'absolute',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#f0b429',
  },
  hintText: {
    color: '#d9e2ec',
    fontSize: 11,
    lineHeight: 16,
  },
  controlsCard: {
    backgroundColor: 'rgba(0,0,0,0.66)',
    borderRadius: 24,
    paddingVertical: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 8,
  },
  rateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  rateChipActive: {
    backgroundColor: '#f0b429',
  },
  rateChipText: {
    color: '#fff',
    fontWeight: '700',
  },
  rateChipTextActive: {
    color: '#102a43',
  },
  downloadChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#d6451b',
  },
  downloadChipText: {
    color: '#fff',
    fontWeight: '700',
  },
  offlineScreen: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 30,
  },
});
