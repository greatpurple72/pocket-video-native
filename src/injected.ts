export const injectedJavaScript = `
(function() {
  if (window.__codexInstalled) {
    if (window.__codexCollectVideos) window.__codexCollectVideos();
    true;
    return;
  }

  window.__codexInstalled = true;

  const state = {
    activeVideo: null,
    savedStyle: '',
    savedOverflow: '',
    savedControls: false,
    videoMap: {},
    scrollStartX: 0,
    scrollStartY: 0,
    scrollMoved: false,
    blockNextClick: false,
    lastScrollAt: 0,
  };

  const send = (payload) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  const allowedNavigationPattern = /^(https?:|about:blank|blob:|data:|javascript:)/i;

  const getPlayableDuration = (video) => {
    if (!video) return 0;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      return Number(video.duration);
    }
    try {
      if (video.seekable && video.seekable.length > 0) {
        const seekableEnd = Number(video.seekable.end(video.seekable.length - 1));
        if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
          return seekableEnd;
        }
      }
    } catch (error) {}
    return 0;
  };

  const safePlay = (video) => {
    try {
      if ('preservesPitch' in video) {
        video.preservesPitch = true;
      }
      if ('webkitPreservesPitch' in video) {
        video.webkitPreservesPitch = true;
      }
      const result = video && video.play ? video.play() : null;
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch (error) {}
  };

  const actionableTarget = (target) => target && target.closest ? target.closest('a, button, [onclick], [role="button"], input, label, summary') : null;
  const shouldSuppressTap = () => state.blockNextClick || state.scrollMoved || (Date.now() - state.lastScrollAt < 450);

  const isDirectMedia = (url) => /(?:https?:)?\\/\\/[^\\s"'<>]+?\\.(?:m3u8|mp4|m4v|mov|webm)(?:\\?[^\\s"'<>]*)?$/i.test(url || '');

  const absolutize = (url, base) => {
    try {
      return new URL(url, base || location.href).toString();
    } catch (error) {
      if (!url) return '';
      if (/^https?:/i.test(url)) return url;
      if (url.startsWith('//')) return location.protocol + url;
      return url;
    }
  };

  const ensureId = (video, prefix) => {
    if (!video.dataset.codexVideoId) {
      video.dataset.codexVideoId = (prefix || 'video') + '-' + Math.random().toString(36).slice(2, 10);
    }
    return video.dataset.codexVideoId;
  };

  const registerVideo = (video) => {
    const id = ensureId(video, 'video');
    state.videoMap[id] = video;
    return id;
  };

  const guessTitle = (node, rootDocument) => {
    const ownerDocument = rootDocument || document;
    const box = node && node.closest ? node.closest('article, section, div, figure') : null;
    const titleNode = box && box.querySelector ? box.querySelector('h1, h2, h3, .title, [title]') : null;
    return (node && (node.getAttribute('title') || node.getAttribute('aria-label')))
      || (titleNode && titleNode.textContent ? titleNode.textContent.trim() : '')
      || ownerDocument.title
      || 'Web video';
  };

  const extractScriptSources = (rootDocument, kind, baseUrl) => {
    const results = [];
    const seen = {};
    const ownerWindow = rootDocument.defaultView || window;

    const pushUrl = (rawUrl) => {
      const absoluteUrl = absolutize(rawUrl, baseUrl);
      if (!absoluteUrl || seen[absoluteUrl] || !isDirectMedia(absoluteUrl)) return;
      seen[absoluteUrl] = true;
      results.push({
        id: 'script-' + Math.random().toString(36).slice(2, 10),
        url: absoluteUrl,
        title: rootDocument.title || document.title || 'Embedded stream',
        poster: '',
        width: 0,
        height: 0,
        paused: false,
        kind,
      });
    };

    if (typeof ownerWindow.now === 'string') {
      pushUrl(ownerWindow.now);
    }

    Array.from(rootDocument.scripts || []).forEach((script) => {
      const text = script.textContent || '';
      const pattern = /(?:https?:)?\\/\\/[^\\s"'<>]+?\\.(?:m3u8|mp4|m4v|mov|webm)(?:\\?[^\\s"'<>]*)?/ig;
      let match = null;
      while ((match = pattern.exec(text))) {
        pushUrl(match[0]);
      }
    });

    return results;
  };

  const collectTopDocumentVideos = () => (
    Array.from(document.querySelectorAll('video'))
      .map((video) => ({
        id: registerVideo(video),
        url: video.currentSrc || video.src || '',
        title: guessTitle(video, document),
        poster: video.poster || '',
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        paused: !!video.paused,
        kind: 'html5-video',
      }))
      .filter((video) => !!video.url)
  );

  const collectEmbeddedMedia = () => {
    const items = [];

    Array.from(document.querySelectorAll('iframe')).forEach((iframe) => {
      try {
        const frameWindow = iframe.contentWindow;
        const frameDocument = frameWindow && frameWindow.document;
        if (!frameDocument) return;

        Array.from(frameDocument.querySelectorAll('video')).forEach((video) => {
          const url = video.currentSrc || video.src || '';
          if (!url) return;
          items.push({
            id: 'embedded-' + Math.random().toString(36).slice(2, 10),
            url: absolutize(url, frameWindow.location.href),
            title: guessTitle(video, frameDocument),
            poster: video.poster || '',
            width: video.videoWidth || 0,
            height: video.videoHeight || 0,
            paused: !!video.paused,
            kind: 'native-stream',
          });
        });

        items.push.apply(items, extractScriptSources(frameDocument, 'native-stream', frameWindow.location.href));
      } catch (error) {}
    });

    return items;
  };

  const dedupeCandidates = (items) => {
    const byUrl = {};

    items.forEach((item) => {
      if (!item.url) return;
      const key = item.url;
      if (!byUrl[key]) {
        byUrl[key] = item;
        return;
      }

      if (byUrl[key].kind !== 'html5-video' && item.kind === 'html5-video') {
        byUrl[key] = item;
      }
    });

    return Object.keys(byUrl).map((key) => byUrl[key]);
  };

  const getVideos = () => {
    state.videoMap = {};
    const topVideos = collectTopDocumentVideos();
    const pageScripts = extractScriptSources(document, 'native-stream', location.href);
    const embeddedMedia = collectEmbeddedMedia();
    return dedupeCandidates([].concat(topVideos, pageScripts, embeddedMedia));
  };

  const findVideo = (id) => state.videoMap[id] || null;

  const snapshot = (video) => {
    if (!video) return;
    send({
      type: 'playerState',
      state: {
        id: ensureId(video, 'video'),
        url: video.currentSrc || video.src || '',
        title: guessTitle(video, video.ownerDocument || document),
        currentTime: Number(video.currentTime || 0),
        duration: getPlayableDuration(video),
        paused: !!video.paused,
        volume: typeof video.volume === 'number' ? video.volume : 1,
        playbackRate: typeof video.playbackRate === 'number' ? video.playbackRate : 1,
      },
    });
  };

  const collect = () => {
    const videos = getVideos();
    send({
      type: 'videosFound',
      title: document.title || '',
      pageUrl: location.href,
      videos,
    });
    if (state.activeVideo) snapshot(state.activeVideo);
  };

  const enterFocus = (id) => {
    const video = findVideo(id);
    if (!video) {
      send({ type: 'focusError', message: 'No matching HTML5 video element was found on this page.' });
      return;
    }

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
    safePlay(video);
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

  const shouldBlockNavigation = (url) => !!url && !allowedNavigationPattern.test(url);

  const normalizeAnchors = () => {
    Array.from(document.querySelectorAll('a[target="_blank"]')).forEach((anchor) => {
      anchor.setAttribute('target', '_self');
      anchor.setAttribute('rel', 'noopener');
    });
  };

  window.__codexCollectVideos = collect;

  window.__codexHandleCommand = (command) => {
    if (!command || !command.action) return true;

    if (command.action === 'enterFocus') {
      enterFocus(command.id);
      return true;
    }

    if (command.action === 'exitFocus') {
      exitFocus();
      return true;
    }

    const video = (command.id && findVideo(command.id)) || state.activeVideo || document.querySelector('video');
    if (!video) {
      send({ type: 'focusError', message: 'No controllable HTML5 video is active on this page.' });
      return true;
    }

    if (command.action === 'play') safePlay(video);
    if (command.action === 'pause' && video.pause) video.pause();
    if (command.action === 'togglePlay') video.paused ? safePlay(video) : video.pause && video.pause();
    if (command.action === 'setRate') {
      if ('preservesPitch' in video) {
        video.preservesPitch = true;
      }
      if ('webkitPreservesPitch' in video) {
        video.webkitPreservesPitch = true;
      }
      video.playbackRate = Number(command.value || 1);
    }
    if (command.action === 'setVolume') video.volume = Math.max(0, Math.min(1, Number(command.value || 0)));
    if (command.action === 'seekBy') video.currentTime = Math.max(0, Number(video.currentTime || 0) + Number(command.value || 0));
    if (command.action === 'seekTo') video.currentTime = Math.max(0, Number(command.value || 0));

    snapshot(video);
    return true;
  };

  window.open = function(url) {
    if (!url) return null;
    const resolved = absolutize(url, location.href);
    if (shouldBlockNavigation(resolved)) {
      send({ type: 'blockedExternalNavigation', url: resolved });
      return null;
    }
    location.href = resolved;
    return null;
  };

  document.addEventListener('touchstart', (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    state.scrollStartX = touch.clientX;
    state.scrollStartY = touch.clientY;
    state.scrollMoved = false;
  }, true);

  document.addEventListener('touchmove', (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    if (Math.abs(touch.clientX - state.scrollStartX) > 8 || Math.abs(touch.clientY - state.scrollStartY) > 8) {
      state.scrollMoved = true;
      state.blockNextClick = true;
      state.lastScrollAt = Date.now();
    }
  }, true);

  document.addEventListener('touchend', (event) => {
    const target = actionableTarget(event.target);
    if (target && shouldSuppressTap()) {
      event.preventDefault();
      event.stopPropagation();
      state.blockNextClick = false;
      return;
    }

    if (state.scrollMoved) {
      state.lastScrollAt = Date.now();
    }
    setTimeout(() => {
      state.scrollMoved = false;
    }, 0);
  }, true);

  document.addEventListener('touchcancel', () => {
    state.scrollMoved = false;
    state.blockNextClick = false;
  }, true);

  document.addEventListener('click', (event) => {
    const target = actionableTarget(event.target);
    if (!target) return;

    if (shouldSuppressTap()) {
      event.preventDefault();
      event.stopPropagation();
      state.blockNextClick = false;
      return;
    }

    const href = target.href || target.getAttribute('href') || '';
    if (!href) return;

    const resolved = absolutize(href, location.href);
    if (shouldBlockNavigation(resolved)) {
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'blockedExternalNavigation', url: resolved });
      return;
    }

    if (target.tagName === 'A' && target.getAttribute('target') === '_blank') {
      event.preventDefault();
      event.stopPropagation();
      location.href = resolved;
    }
  }, true);

  ['play', 'pause', 'ratechange', 'volumechange', 'loadedmetadata', 'timeupdate'].forEach((name) => {
    document.addEventListener(name, (event) => {
      if (event.target && event.target.tagName === 'VIDEO') {
        collect();
        snapshot(event.target);
      }
    }, true);
  });

  normalizeAnchors();
  new MutationObserver(() => {
    normalizeAnchors();
    collect();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'href', 'poster', 'style', 'target'],
  });

  setInterval(collect, 2000);
  collect();
  true;
})();
`;
