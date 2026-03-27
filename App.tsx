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
import { formatTime, guessExtension, isOfflineFriendly, makeId, normalizeUrl, offlineReason, sanitizeFileName } from './src/utils';
import type { DownloadItem, PlayerSnapshot, VideoCandidate } from './src/types';

const STORAGE_KEY = 'codex-video-browser-downloads';
const DEFAULT_URL = 'https://www.bilibili.com';
const HOLD_DELAY_MS = 260;
const REGULAR_SPEEDS = [1, 1.5, 2, 3, 6, 8];
const SCREEN_MID_X = Dimensions.get('window').width / 2;

type PlaybackTarget = {
  title: string;
  sourceUri: string;
  mode: 'stream' | 'download';
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const gestureRef = useRef({
    holdTimer: null as ReturnType<typeof setTimeout> | null,
    holdActive: false,
    moved: false,
    lastTapAt: 0,
    startBrightness: 0.5,
    startVolume: 1,
    startRate: 2,
  });
  const [addressInput, setAddressInput] = useState(DEFAULT_URL);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [pageTitle, setPageTitle] = useState('视频浏览器');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [candidates, setCandidates] = useState<VideoCandidate[]>([]);
  const [selectedOnline, setSelectedOnline] = useState<VideoCandidate | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [selectedPlayback, setSelectedPlayback] = useState<PlaybackTarget | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);
  const [status, setStatus] = useState('网页里发现视频后，会出现在下面。');
  const [webFullscreen, setWebFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [brightness, setBrightness] = useState(0.5);
  const [webVolume, setWebVolume] = useState(1);
  const [baseRate, setBaseRate] = useState(1);
  const [holdRate, setHoldRate] = useState(2);
  const [offlineTime, setOfflineTime] = useState(0);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [offlinePaused, setOfflinePaused] = useState(true);
  const [offlineVolume, setOfflineVolume] = useState(1);
  const [offlineRate, setOfflineRate] = useState(1);

  const offlinePlayer = useVideoPlayer(null, (player) => {
    player.volume = 1;
    player.playbackRate = 1;
    player.loop = false;
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => (raw ? setDownloads(JSON.parse(raw) as DownloadItem[]) : null))
      .catch(() => setStatus('下载列表读取失败，但其他功能不受影响。'));
    Brightness.getBrightnessAsync().then(setBrightness).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(downloads)).catch(() => {});
  }, [downloads]);

  useEffect(() => {
    if (!selectedPlayback) return;
    offlinePlayer.replaceAsync(selectedPlayback.sourceUri).then(() => {
      offlinePlayer.volume = offlineVolume;
      offlinePlayer.playbackRate = offlineRate;
      offlinePlayer.play();
      setOfflinePaused(false);
    }).catch(() => {
      Alert.alert('无法播放', selectedPlayback.mode === 'download' ? '这个离线文件现在打不开，可能下载到的并不是可直接离线播放的媒体文件。' : '当前边看边下的流地址没能打开。');
      setSelectedPlayback(null);
    });
  }, [selectedPlayback, offlinePlayer, offlineRate, offlineVolume]);

  useEffect(() => {
    if (!selectedPlayback) return;
    const timer = setInterval(() => {
      setOfflineTime(offlinePlayer.currentTime || 0);
      setOfflineDuration(offlinePlayer.duration || 0);
      setOfflinePaused(!offlinePlayer.playing);
      setOfflineVolume(offlinePlayer.volume || 0);
      setOfflineRate(offlinePlayer.playbackRate || 1);
    }, 250);
    return () => clearInterval(timer);
  }, [selectedPlayback, offlinePlayer]);

  useEffect(() => {
    if (!(webFullscreen || selectedPlayback) || !showControls) return;
    const isPlaying = selectedPlayback ? !offlinePaused : !snapshot?.paused;
    if (!isPlaying) return;
    const timer = setTimeout(() => setShowControls(false), 1000);
    return () => clearTimeout(timer);
  }, [offlinePaused, selectedPlayback, showControls, snapshot?.paused, webFullscreen]);

  function sendWebCommand(command: Record<string, unknown>) {
    webViewRef.current?.injectJavaScript(`window.__codexHandleCommand(${JSON.stringify(command)}); true;`);
  }

  async function setBrightnessLevel(value: number) {
    const next = Math.max(0.05, Math.min(1, value));
    setBrightness(next);
    await Brightness.setBrightnessAsync(next).catch(() => {});
  }

  function submitAddress() {
    const url = normalizeUrl(addressInput);
    setAddressInput(url);
    setCurrentUrl(url);
    setStatus('正在打开网页并扫描视频...');
  }

  function onNav(nav: WebViewNavigation) {
    setCurrentUrl(nav.url);
    setAddressInput(nav.url);
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'videosFound') {
        setCandidates(data.videos || []);
        if (data.title) setPageTitle(data.title);
        if ((data.videos || []).length > 0) setStatus(`发现 ${data.videos.length} 个视频，可以直接全屏播放。`);
      }
      if (data.type === 'playerState') {
        setSnapshot(data.state);
        if (typeof data.state?.volume === 'number') setWebVolume(data.state.volume);
        if (typeof data.state?.playbackRate === 'number' && !gestureRef.current.holdActive) setBaseRate(data.state.playbackRate);
      }
      if (data.type === 'focusError') {
        Alert.alert('播放失败', data.message || '网页视频没有成功切到全屏模式。');
        setWebFullscreen(false);
        setSelectedOnline(null);
      }
    } catch (error) {}
  }

  function openOnline(video: VideoCandidate) {
    setSelectedOnline(video);
    setWebFullscreen(true);
    setShowControls(true);
    sendWebCommand({ action: 'enterFocus', id: video.id });
    setTimeout(() => sendWebCommand({ action: 'setRate', id: video.id, value: baseRate }), 120);
  }

  function closeOnline() {
    sendWebCommand({ action: 'exitFocus' });
    setWebFullscreen(false);
    setSelectedOnline(null);
  }

  async function downloadVideo(video: VideoCandidate) {
    if (!video.url) return Alert.alert('不能下载', '当前没有拿到视频直链。');
    if (!isOfflineFriendly(video.url)) return Alert.alert('暂不支持离线', offlineReason(video.url));

    setDownloadBusy(video.id);
    setStatus('正在下载视频到本地...');
    try {
      const baseDir = `${FileSystem.documentDirectory}video-downloads`;
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }
      const ext = guessExtension(video.url);
      const fileName = `${sanitizeFileName(video.title || pageTitle)}-${Date.now()}${ext}`;
      const downloadId = makeId('download');
      const fileUri = `${baseDir}/${fileName}`;
      const headers = {
        Referer: currentUrl,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      };

      setDownloads((items) => [{
        id: downloadId,
        title: video.title || pageTitle || '离线视频',
        remoteUrl: video.url,
        sourcePage: currentUrl,
        fileUri,
        downloadedAt: new Date().toISOString(),
        status: 'downloading',
        progress: 0,
        bytesWritten: 0,
        bytesExpected: 0,
      }, ...items]);

      const task = FileSystem.createDownloadResumable(
        video.url,
        fileUri,
        { headers },
        (progress: FileSystem.DownloadProgressData) => {
          const ratio = progress.totalBytesExpectedToWrite > 0
            ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            : 0;
          setDownloads((items) => items.map((item) => item.id === downloadId ? {
            ...item,
            status: 'downloading',
            progress: ratio,
            bytesWritten: progress.totalBytesWritten,
            bytesExpected: progress.totalBytesExpectedToWrite,
          } : item));
        }
      );

      const saved = await task.downloadAsync();
      if (!saved) {
        throw new Error('download cancelled');
      }

      setDownloads((items) => items.map((item) => item.id === downloadId ? {
        ...item,
        fileUri: saved.uri,
        status: 'completed',
        progress: 1,
        bytesWritten: item.bytesExpected || item.bytesWritten,
      } : item));
      setStatus('下载完成，可以在离线列表里打开。');
    } catch (error) {
      setDownloads((items) => items.map((item) => item.remoteUrl === video.url && item.status === 'downloading' ? {
        ...item,
        status: 'failed',
        errorMessage: '下载失败，可能是鉴权或源地址限制。',
      } : item));
      Alert.alert('下载失败', '这个视频地址可能需要站点鉴权，或者并不是适合直接离线保存的媒体流。');
      setStatus('下载没有成功，通常是站点鉴权或媒体类型限制导致。');
    } finally {
      setDownloadBusy(null);
    }
  }

  function closeOffline() {
    offlinePlayer.pause();
    setSelectedPlayback(null);
    setShowControls(true);
    setOfflineTime(0);
    setOfflineDuration(0);
    setOfflinePaused(true);
  }

  function openDownloadedVideo(item: DownloadItem) {
    setShowControls(true);
    setSelectedPlayback({
      title: item.title,
      sourceUri: item.fileUri,
      mode: 'download',
    });
  }

  function openStreamingDownload(item: DownloadItem) {
    setShowControls(true);
    setSelectedPlayback({
      title: `${item.title} · 边看边下`,
      sourceUri: item.remoteUrl,
      mode: 'stream',
    });
  }

  async function removeDownload(item: DownloadItem) {
    try {
      const info = await FileSystem.getInfoAsync(item.fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(item.fileUri, { idempotent: true });
      }
    } catch (error) {}
    setDownloads((items) => items.filter((entry) => entry.id !== item.id));
  }

  const webGestures = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gestureRef.current.startBrightness = brightness;
      gestureRef.current.startVolume = webVolume;
      gestureRef.current.startRate = holdRate;
      gestureRef.current.moved = false;
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      gestureRef.current.holdTimer = setTimeout(() => {
        gestureRef.current.holdActive = true;
        sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: holdRate });
      }, HOLD_DELAY_MS);
    },
    onPanResponderMove: async (event, gesture) => {
      if (Math.abs(gesture.dy) > 6 || Math.abs(gesture.dx) > 6) gestureRef.current.moved = true;
      const onLeft = event.nativeEvent.pageX < SCREEN_MID_X;
      if (gestureRef.current.holdActive) {
        const nextRate = Math.max(1, Math.min(5, gestureRef.current.startRate + gesture.dy * -0.02));
        setHoldRate(Number(nextRate.toFixed(2)));
        sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: Number(nextRate.toFixed(2)) });
      } else if (onLeft) {
        await setBrightnessLevel(gestureRef.current.startBrightness + gesture.dy * -0.0025);
      } else {
        const nextVolume = Math.max(0, Math.min(1, gestureRef.current.startVolume + gesture.dy * -0.0025));
        setWebVolume(nextVolume);
        sendWebCommand({ action: 'setVolume', id: selectedOnline?.id, value: Number(nextVolume.toFixed(3)) });
      }
    },
    onPanResponderRelease: () => {
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      const now = Date.now();
      if (!gestureRef.current.moved && now - gestureRef.current.lastTapAt < 280) sendWebCommand({ action: 'togglePlay', id: selectedOnline?.id });
      else if (!gestureRef.current.moved) setShowControls(true);
      gestureRef.current.lastTapAt = now;
      if (gestureRef.current.holdActive) {
        gestureRef.current.holdActive = false;
        setBaseRate(holdRate);
        sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: holdRate });
      }
    },
    onPanResponderTerminate: () => {
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      if (gestureRef.current.holdActive) {
        gestureRef.current.holdActive = false;
        sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: baseRate });
      }
    },
  }), [baseRate, brightness, holdRate, selectedOnline?.id, webVolume]);

  const offlineGestures = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gestureRef.current.startBrightness = brightness;
      gestureRef.current.startVolume = offlineVolume;
      gestureRef.current.startRate = holdRate;
      gestureRef.current.moved = false;
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      gestureRef.current.holdTimer = setTimeout(() => {
        gestureRef.current.holdActive = true;
        offlinePlayer.playbackRate = holdRate;
      }, HOLD_DELAY_MS);
    },
    onPanResponderMove: async (event, gesture) => {
      if (Math.abs(gesture.dy) > 6 || Math.abs(gesture.dx) > 6) gestureRef.current.moved = true;
      const onLeft = event.nativeEvent.pageX < SCREEN_MID_X;
      if (gestureRef.current.holdActive) {
        const nextRate = Math.max(1, Math.min(5, gestureRef.current.startRate + gesture.dy * -0.02));
        setHoldRate(Number(nextRate.toFixed(2)));
        offlinePlayer.playbackRate = Number(nextRate.toFixed(2));
      } else if (onLeft) {
        await setBrightnessLevel(gestureRef.current.startBrightness + gesture.dy * -0.0025);
      } else {
        const nextVolume = Math.max(0, Math.min(1, gestureRef.current.startVolume + gesture.dy * -0.0025));
        setOfflineVolume(nextVolume);
        offlinePlayer.volume = nextVolume;
      }
    },
    onPanResponderRelease: () => {
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      const now = Date.now();
      if (!gestureRef.current.moved && now - gestureRef.current.lastTapAt < 280) offlinePlayer.playing ? offlinePlayer.pause() : offlinePlayer.play();
      else if (!gestureRef.current.moved) setShowControls(true);
      gestureRef.current.lastTapAt = now;
      if (gestureRef.current.holdActive) {
        gestureRef.current.holdActive = false;
        setOfflineRate(holdRate);
        offlinePlayer.playbackRate = holdRate;
      }
    },
    onPanResponderTerminate: () => {
      if (gestureRef.current.holdTimer) clearTimeout(gestureRef.current.holdTimer);
      if (gestureRef.current.holdActive) {
        gestureRef.current.holdActive = false;
        offlinePlayer.playbackRate = offlineRate;
      }
    },
  }), [brightness, holdRate, offlinePlayer, offlineRate, offlineVolume]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={webFullscreen || selectedPlayback ? 'light' : 'dark'} hidden={webFullscreen || !!selectedPlayback} />
      {!webFullscreen && !selectedPlayback ? (
        <View style={styles.header}>
          <Text style={styles.brand}>Pocket Video</Text>
          <Text style={styles.caption}>{pageTitle}</Text>
          <View style={styles.addressRow}>
            <Pressable style={styles.navButton} onPress={() => canGoBack && webViewRef.current?.goBack()}><Text>{'<'}</Text></Pressable>
            <Pressable style={styles.navButton} onPress={() => canGoForward && webViewRef.current?.goForward()}><Text>{'>'}</Text></Pressable>
            <TextInput
              style={styles.input}
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={submitAddress}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="输入网址或关键词"
            />
            <Pressable style={styles.goButton} onPress={submitAddress}><Text style={styles.goButtonText}>打开</Text></Pressable>
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
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url || '';
            const blockedSchemes = ['bilibili://', 'bili://', 'bstar://', 'itms-apps://', 'itmss://', 'app://'];
            if (blockedSchemes.some((scheme) => url.startsWith(scheme))) {
              return false;
            }
            return true;
          }}
        />
        {webFullscreen ? (
          <View style={styles.overlay} {...webGestures.panHandlers}>
            {showControls ? <View style={styles.overlayTop}>
              <Pressable style={styles.overlayButton} onPress={closeOnline}><Text style={styles.overlayButtonText}>返回</Text></Pressable>
              <Text style={styles.overlayTitle} numberOfLines={1}>{selectedOnline?.title || snapshot?.title || '网页视频'}</Text>
            </View> : <View />}
            {showControls ? <View style={styles.overlayBottom}>
              <Text style={styles.overlayText}>左侧亮度，右侧音量，双击暂停/播放，长按临时倍速</Text>
              <Text style={styles.overlayText}>
                {formatTime(snapshot?.currentTime || 0)} / {formatTime(snapshot?.duration || 0)} · 音量 {Math.round(webVolume * 100)}% · 亮度 {Math.round(brightness * 100)}% · {gestureRef.current.holdActive ? `${holdRate.toFixed(2)}x` : `${baseRate.toFixed(2)}x`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rateRow}>
                <Pressable style={styles.rateChip} onPress={() => sendWebCommand({ action: 'seekBy', id: selectedOnline?.id, value: -60 })}>
                  <Text style={styles.rateChipText}>-60s</Text>
                </Pressable>
                <Pressable style={styles.rateChip} onPress={() => sendWebCommand({ action: 'seekBy', id: selectedOnline?.id, value: 60 })}>
                  <Text style={styles.rateChipText}>+60s</Text>
                </Pressable>
                {REGULAR_SPEEDS.map((speed) => (
                  <Pressable key={speed} style={[styles.rateChip, Math.abs(baseRate - speed) < 0.01 && styles.rateChipActive]} onPress={() => {
                    setBaseRate(speed);
                    sendWebCommand({ action: 'setRate', id: selectedOnline?.id, value: speed });
                  }}>
                    <Text style={[styles.rateChipText, Math.abs(baseRate - speed) < 0.01 && styles.rateChipTextActive]}>{speed}x</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.downloadChip} onPress={() => selectedOnline && downloadVideo(selectedOnline)}>
                  <Text style={styles.downloadChipText}>预下载</Text>
                </Pressable>
              </ScrollView>
            </View> : <View />}
          </View>
        ) : null}
      </View>
      {!webFullscreen && !selectedPlayback ? (
        <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>网页视频</Text>
            {candidates.length === 0 ? <Text style={styles.muted}>打开 B 站、百度搜索结果页或普通网页后，只要页面里有 HTML5 视频，这里就会列出来。</Text> : null}
            {candidates.map((video) => (
              <View key={video.id} style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={2}>{video.title || '网页视频'}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{video.url}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={styles.primaryButton} onPress={() => openOnline(video)}><Text style={styles.primaryButtonText}>全屏播放</Text></Pressable>
                  <Pressable style={styles.secondaryButton} disabled={downloadBusy === video.id} onPress={() => downloadVideo(video)}>
                    <Text style={styles.secondaryButtonText}>{downloadBusy === video.id ? '下载中' : '预下载'}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>离线下载</Text>
            {downloads.length === 0 ? <Text style={styles.muted}>目前只对直链视频下载更可靠，像 `.m3u8` 这类流媒体先不强制离线。</Text> : null}
            {downloads.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.status === 'downloading'
                    ? `下载中 ${Math.round((item.progress || 0) * 100)}% · ${(item.bytesWritten || 0) / 1024 / 1024 >= 1 ? `${((item.bytesWritten || 0) / 1024 / 1024).toFixed(1)}MB` : `${Math.round((item.bytesWritten || 0) / 1024)}KB`}`
                    : item.status === 'failed'
                      ? (item.errorMessage || '下载失败')
                      : item.fileUri}
                </Text>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => item.status === 'completed' ? openDownloadedVideo(item) : openStreamingDownload(item)}
                  >
                    <Text style={styles.primaryButtonText}>{item.status === 'completed' ? '离线播放' : '边看边下'}</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => removeDownload(item)}><Text style={styles.secondaryButtonText}>删除</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {selectedPlayback ? (
        <View style={styles.offlineScreen}>
          <VideoView player={offlinePlayer} style={styles.webView} contentFit="contain" nativeControls={false} />
          <View style={styles.overlay} {...offlineGestures.panHandlers}>
            {showControls ? <View style={styles.overlayTop}>
              <Pressable style={styles.overlayButton} onPress={closeOffline}><Text style={styles.overlayButtonText}>返回</Text></Pressable>
              <Text style={styles.overlayTitle} numberOfLines={1}>{selectedPlayback.title}</Text>
            </View> : <View />}
            {showControls ? <View style={styles.overlayBottom}>
              <Text style={styles.overlayText}>左侧亮度，右侧音量，双击暂停/播放，长按临时倍速</Text>
              <Text style={styles.overlayText}>
                {formatTime(offlineTime)} / {formatTime(offlineDuration)} · 音量 {Math.round(offlineVolume * 100)}% · 亮度 {Math.round(brightness * 100)}% · {offlinePaused ? '暂停' : `${offlineRate.toFixed(2)}x`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rateRow}>
                <Pressable style={styles.rateChip} onPress={() => { offlinePlayer.currentTime = Math.max(0, (offlinePlayer.currentTime || 0) - 60); }}>
                  <Text style={styles.rateChipText}>-60s</Text>
                </Pressable>
                <Pressable style={styles.rateChip} onPress={() => { offlinePlayer.currentTime = (offlinePlayer.currentTime || 0) + 60; }}>
                  <Text style={styles.rateChipText}>+60s</Text>
                </Pressable>
                {REGULAR_SPEEDS.map((speed) => (
                  <Pressable key={speed} style={[styles.rateChip, Math.abs(offlineRate - speed) < 0.01 && styles.rateChipActive]} onPress={() => {
                    setOfflineRate(speed);
                    offlinePlayer.playbackRate = speed;
                  }}>
                    <Text style={[styles.rateChipText, Math.abs(offlineRate - speed) < 0.01 && styles.rateChipTextActive]}>{speed}x</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View> : <View />}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4efe6' },
  header: { padding: 16, paddingBottom: 12 },
  brand: { fontSize: 24, fontWeight: '800', color: '#102a43' },
  caption: { marginTop: 4, color: '#486581', fontSize: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  navButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9e2ec' },
  input: { flex: 1, height: 42, borderWidth: 1, borderColor: '#bcccdc', borderRadius: 21, backgroundColor: '#fffaf1', paddingHorizontal: 14 },
  goButton: { height: 42, paddingHorizontal: 16, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d6451b' },
  goButtonText: { color: '#fff', fontWeight: '700' },
  status: { marginTop: 10, fontSize: 12, color: '#7b8794' },
  webShell: { flex: 1, minHeight: 280, marginHorizontal: 16, marginBottom: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: '#081521' },
  webShellFullscreen: { position: 'absolute', inset: 0, marginHorizontal: 0, marginBottom: 0, borderRadius: 0, zIndex: 20 },
  webView: { flex: 1, backgroundColor: '#000' },
  listArea: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  panel: { backgroundColor: '#fffaf1', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#e9dcc9' },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#102a43', marginBottom: 10 },
  muted: { color: '#7b8794', lineHeight: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e6ecf2', padding: 14, marginTop: 10 },
  cardTitle: { color: '#102a43', fontWeight: '700' },
  cardMeta: { color: '#7b8794', fontSize: 11, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryButton: { flex: 1, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102a43' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { flex: 1, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0b429' },
  secondaryButtonText: { color: '#102a43', fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 36 },
  overlayTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overlayButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayButtonText: { color: '#fff', fontWeight: '700' },
  overlayTitle: { flex: 1, color: '#fff', fontWeight: '700' },
  overlayBottom: { gap: 8 },
  overlayText: { color: '#e6ecf2', fontSize: 12 },
  rateRow: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  rateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  rateChipActive: { backgroundColor: '#f0b429' },
  rateChipText: { color: '#fff', fontWeight: '700' },
  rateChipTextActive: { color: '#102a43' },
  downloadChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#d6451b' },
  downloadChipText: { color: '#fff', fontWeight: '700' },
  offlineScreen: { position: 'absolute', inset: 0, backgroundColor: '#000', zIndex: 30 },
});
