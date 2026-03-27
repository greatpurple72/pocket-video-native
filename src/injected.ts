export const injectedJavaScript = `
(function() {
  if (window.__codexInstalled) {
    window.__codexCollectVideos && window.__codexCollectVideos();
    true;
    return;
  }
  window.__codexInstalled = true;
  const state = { activeVideo: null, savedStyle: '', savedOverflow: '', savedControls: false };
  const send = (payload) => window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  const ensureId = (video) => {
    if (!video.dataset.codexVideoId) video.dataset.codexVideoId = 'codex-' + Math.random().toString(36).slice(2, 10);
    return video.dataset.codexVideoId;
  };
  const guessTitle = (video) => {
    const box = video.closest('article, section, div');
    const titleNode = box && box.querySelector('h1, h2, h3, .title, [title]');
    return video.getAttribute('title') || video.getAttribute('aria-label') || (titleNode && titleNode.textContent ? titleNode.textContent.trim() : '') || document.title || '网页视频';
  };
  const getVideos = () => {
    const nativeVideos = Array.from(document.querySelectorAll('video')).map((video) => ({
      id: ensureId(video),
      url: video.currentSrc || video.src || '',
      title: guessTitle(video),
      poster: video.poster || '',
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
      paused: !!video.paused,
    })).filter((video) => !!video.url);
    const iframeVideos = Array.from(document.querySelectorAll('iframe')).map((iframe, index) => ({
      id: iframe.id || 'iframe-video-' + index,
      url: iframe.src || '',
      title: (iframe.title || document.title || '网页播放器'),
      poster: '',
      width: iframe.clientWidth || 0,
      height: iframe.clientHeight || 0,
      paused: false,
    })).filter((item) => !!item.url);
    const scriptVideo = typeof window.now === 'string' && window.now ? [{
      id: 'script-video-now',
      url: window.now,
      title: document.title || '脚本视频源',
      poster: '',
      width: 0,
      height: 0,
      paused: false,
    }] : [];
    return [...nativeVideos, ...iframeVideos, ...scriptVideo];
  };
  const findVideo = (id) => Array.from(document.querySelectorAll('video')).find((video) => ensureId(video) === id) || null;
  const snapshot = (video) => {
    if (!video) return;
    send({
      type: 'playerState',
      state: {
        id: ensureId(video),
        url: video.currentSrc || video.src || '',
        title: guessTitle(video),
        currentTime: Number(video.currentTime || 0),
        duration: Number(isFinite(video.duration) ? video.duration : 0),
        paused: !!video.paused,
        volume: typeof video.volume === 'number' ? video.volume : 1,
        playbackRate: typeof video.playbackRate === 'number' ? video.playbackRate : 1,
      },
    });
  };
  const collect = () => {
    send({ type: 'videosFound', title: document.title || '', pageUrl: location.href, videos: getVideos() });
    if (state.activeVideo) snapshot(state.activeVideo);
  };
  const enterFocus = (id) => {
    const video = findVideo(id);
    if (!video) return send({ type: 'focusError', message: '没有找到对应的视频元素。' });
    state.activeVideo = video;
    state.savedStyle = video.getAttribute('style') || '';
    state.savedOverflow = document.body.style.overflow || '';
    state.savedControls = !!video.controls;
    document.body.style.overflow = 'hidden';
    video.controls = false;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.style.position = 'fixed';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.zIndex = '2147483647';
    video.style.background = '#000';
    video.style.objectFit = 'contain';
    try { video.play(); } catch (error) {}
    snapshot(video);
  };
  const exitFocus = () => {
    if (!state.activeVideo) return;
    state.activeVideo.setAttribute('style', state.savedStyle);
    state.activeVideo.controls = state.savedControls;
    document.body.style.overflow = state.savedOverflow;
    state.activeVideo = null;
    collect();
  };
  window.__codexCollectVideos = collect;
  window.__codexHandleCommand = (command) => {
    if (!command || !command.action) return true;
    if (command.action === 'enterFocus') return enterFocus(command.id), true;
    if (command.action === 'exitFocus') return exitFocus(), true;
    const video = (command.id && findVideo(command.id)) || state.activeVideo || document.querySelector('video');
    if (!video) return send({ type: 'focusError', message: '当前页面没有可控制的视频。' }), true;
    if (command.action === 'play') video.play && video.play();
    if (command.action === 'pause') video.pause && video.pause();
    if (command.action === 'togglePlay') video.paused ? video.play && video.play() : video.pause && video.pause();
    if (command.action === 'setRate') video.playbackRate = Number(command.value || 1);
    if (command.action === 'setVolume') video.volume = Math.max(0, Math.min(1, Number(command.value || 0)));
    if (command.action === 'seekBy') video.currentTime = Math.max(0, Number(video.currentTime || 0) + Number(command.value || 0));
    snapshot(video);
    return true;
  };
  ['play', 'pause', 'ratechange', 'volumechange', 'loadedmetadata', 'timeupdate'].forEach((name) => {
    document.addEventListener(name, (event) => {
      if (event.target && event.target.tagName === 'VIDEO') {
        collect();
        snapshot(event.target);
      }
    }, true);
  });
  new MutationObserver(collect).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'poster', 'style'] });
  setInterval(collect, 2500);
  collect();
  true;
})();
`;
