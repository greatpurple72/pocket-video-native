(function () {
  if (window.__codexInstalled) {
    if (window.__codexCollectVideos) window.__codexCollectVideos();
    return true;
  }

  window.__codexInstalled = true;

  const state = {
    activeVideo: null,
    savedStyle: '',
    savedOverflow: '',
    savedControls: false,
    videoMap: {},
    pendingFocusId: null,
    pendingRate: 1,
    pendingVolume: 1,
    pendingSeekId: null,
    pendingSeekTarget: null,
    pendingSeekUntil: 0,
    pendingSeekTimer: null,
    scrollStartX: 0,
    scrollStartY: 0,
    scrollMoved: false,
    blockNextClick: false,
    lastScrollAt: 0,
  };

  const send = (payload) => {
    if (window.__desktopHostSend) window.__desktopHostSend(payload);
  };
  const allowedNavigationPattern = /^(https?:|about:blank|blob:|data:|javascript:)/i;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const getPlayableDuration = (video) => {
    if (!video) return 0;
    if (Number.isFinite(video.duration) && video.duration > 0) return Number(video.duration);
    try {
      if (video.seekable && video.seekable.length > 0) {
        const seekableEnd = Number(video.seekable.end(video.seekable.length - 1));
        if (Number.isFinite(seekableEnd) && seekableEnd > 0) return seekableEnd;
      }
    } catch (error) {}
    return 0;
  };

  const safePlay = (video) => {
    try {
      if ('preservesPitch' in video) video.preservesPitch = true;
      if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = true;
      const result = video && video.play ? video.play() : null;
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (error) {}
  };

  const actionableTarget = (target) =>
    target && target.closest ? target.closest('a, button, [onclick], [role="button"], input, label, summary') : null;

  const shouldSuppressTap = () =>
    state.blockNextClick || state.scrollMoved || Date.now() - state.lastScrollAt < 450;

  const isDirectMedia = (url) =>
    /(?:https?:)?\/\/[^\s"'<>]+?\.(?:m3u8|mp4|m4v|mov|webm)(?:\?[^\s"'<>]*)?$/i.test(url || '');

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
      video.dataset.codexVideoId = `${prefix || 'video'}-${Math.random().toString(36).slice(2, 10)}`;
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
    return (
      (node && (node.getAttribute('title') || node.getAttribute('aria-label'))) ||
      (titleNode && titleNode.textContent ? titleNode.textContent.trim() : '') ||
      ownerDocument.title ||
      'Web video'
    );
  };

  const collectVideosFromContainer = (container, ownerDocument, baseUrl, kind) =>
    Array.from((container && container.querySelectorAll ? container.querySelectorAll('video') : []) || [])
      .map((video) => ({
        id: registerVideo(video),
        url: video.currentSrc || video.src || '',
        title: guessTitle(video, ownerDocument || document),
        poster: video.poster || '',
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        paused: !!video.paused,
        kind: kind || 'html5-video',
      }))
      .filter((video) => !!video.url || !!video.id);

  const collectVideoElementsFromContainer = (container) => Array.from((container && container.querySelectorAll ? container.querySelectorAll('video') : []) || []);

  const collectShadowMedia = (rootNode, ownerDocument, baseUrl) => {
    const items = [];
    const container = rootNode || document;

    Array.from((container.querySelectorAll ? container.querySelectorAll('*') : []) || []).forEach((element) => {
      if (!element.shadowRoot) return;
      items.push.apply(items, collectVideosFromContainer(element.shadowRoot, ownerDocument || document, baseUrl || location.href, 'html5-video'));
      items.push.apply(items, collectShadowMedia(element.shadowRoot, ownerDocument || document, baseUrl || location.href));
    });

    return items;
  };

  const collectShadowVideoElements = (rootNode) => {
    const videos = [];
    const container = rootNode || document;

    Array.from((container.querySelectorAll ? container.querySelectorAll('*') : []) || []).forEach((element) => {
      if (!element.shadowRoot) return;
      videos.push.apply(videos, collectVideoElementsFromContainer(element.shadowRoot));
      videos.push.apply(videos, collectShadowVideoElements(element.shadowRoot));
    });

    return videos;
  };

  const isDeferredPlayerPage = () =>
    /(^|\.)(bilibili\.com)$/i.test(location.hostname)
    && /\/(bangumi\/play|video\/|medialist\/play)/i.test(location.pathname);

  const hasDeferredPlayerShell = () =>
    !!document.querySelector(
      '.Player_biliPlayer__4_LXT, .Player_videoWrap__bfoAo, .Player_container__2S_4e, .bpx-player-container, #bilibili-player, #bilibiliPlayer, [class*="bpx-player"], [class*="Player_biliPlayer"]'
    );

  const collectDeferredCandidates = (hasResolvedVideo) => {
    if (hasResolvedVideo || !isDeferredPlayerPage() || !hasDeferredPlayerShell()) return [];
    return [
      {
        id: 'deferred-page-player',
        url: location.href,
        title: document.title || 'Bilibili page player',
        poster: '',
        width: 0,
        height: 0,
        paused: false,
        kind: 'html5-video',
      },
    ];
  };

  const findAnyRegisteredVideo = () => {
    const videos = []
      .concat(collectVideoElementsFromContainer(document))
      .concat(collectShadowVideoElements(document))
      .filter(Boolean);

    if (state.activeVideo && state.activeVideo.isConnected && videos.includes(state.activeVideo)) {
      return state.activeVideo;
    }

    const scored = videos
      .map((video) => ({
        video,
        score:
          (video.currentSrc || video.src ? 1000 : 0)
          + (!video.paused ? 400 : 0)
          + ((video.readyState || 0) * 20)
          + (Math.min(getPlayableDuration(video), 36000) / 10)
          + (video.clientWidth || 0)
          + (video.clientHeight || 0)
          + Math.min(Number(video.currentTime || 0), 600),
      }))
      .sort((left, right) => right.score - left.score);

    if (scored.length > 0) {
      registerVideo(scored[0].video);
      return scored[0].video;
    }

    const ids = Object.keys(state.videoMap);
    return ids.length > 0 ? state.videoMap[ids[0]] : null;
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
        id: `script-${Math.random().toString(36).slice(2, 10)}`,
        url: absoluteUrl,
        title: rootDocument.title || document.title || 'Embedded stream',
        poster: '',
        width: 0,
        height: 0,
        paused: false,
        kind,
      });
    };

    if (typeof ownerWindow.now === 'string') pushUrl(ownerWindow.now);

    Array.from(rootDocument.scripts || []).forEach((script) => {
      const text = script.textContent || '';
      const pattern = /(?:https?:)?\/\/[^\s"'<>]+?\.(?:m3u8|mp4|m4v|mov|webm)(?:\?[^\s"'<>]*)?/gi;
      let match = null;
      while ((match = pattern.exec(text))) {
        pushUrl(match[0]);
      }
    });

    return results;
  };

  const collectTopDocumentVideos = () => collectVideosFromContainer(document, document, location.href, 'html5-video');

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
            id: `embedded-${Math.random().toString(36).slice(2, 10)}`,
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
      if (!byUrl[item.url] || (byUrl[item.url].kind !== 'html5-video' && item.kind === 'html5-video')) {
        byUrl[item.url] = item;
      }
    });
    return Object.keys(byUrl).map((key) => byUrl[key]);
  };

  const getVideos = () => {
    state.videoMap = {};
    const topVideos = collectTopDocumentVideos();
    const shadowVideos = collectShadowMedia(document, document, location.href);
    const scriptSources = extractScriptSources(document, 'native-stream', location.href);
    const embeddedMedia = collectEmbeddedMedia();
    const deferredCandidates = collectDeferredCandidates(topVideos.length > 0 || shadowVideos.length > 0);
    return dedupeCandidates([].concat(topVideos, shadowVideos, scriptSources, embeddedMedia, deferredCandidates));
  };

  const findVideo = (id) => state.videoMap[id] || null;

  const applyFocus = (video) => {
    if (!video) return false;
    state.activeVideo = video;
    state.pendingFocusId = null;
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
    if (typeof state.pendingVolume === 'number') {
      video.volume = Math.max(0, Math.min(1, state.pendingVolume));
    }
    if (typeof state.pendingRate === 'number') {
      if ('preservesPitch' in video) video.preservesPitch = true;
      if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = true;
      video.playbackRate = state.pendingRate;
    }
    safePlay(video);
    ensurePendingSeek();
    snapshot(video);
    return true;
  };

  const clearPendingSeek = () => {
    state.pendingSeekId = null;
    state.pendingSeekTarget = null;
    state.pendingSeekUntil = 0;
    if (state.pendingSeekTimer) clearTimeout(state.pendingSeekTimer);
    state.pendingSeekTimer = null;
  };

  const getSeekVideo = () => {
    if (state.pendingSeekId) {
      const exact = findVideo(state.pendingSeekId);
      if (exact) return exact;
    }
    return state.activeVideo || findAnyRegisteredVideo() || document.querySelector('video');
  };

  const applySeekToVideo = (video, target) => {
    if (!video) return;
    if (typeof video.fastSeek === 'function') {
      try {
        video.fastSeek(target);
      } catch (error) {}
    }
    try {
      video.currentTime = target;
    } catch (error) {}
  };

  const ensurePendingSeek = () => {
    if (state.pendingSeekTimer) clearTimeout(state.pendingSeekTimer);
    if (state.pendingSeekTarget === null) return;

    state.pendingSeekTimer = setTimeout(() => {
      const video = getSeekVideo();
      if (!video) {
        if (Date.now() >= state.pendingSeekUntil) clearPendingSeek();
        else ensurePendingSeek();
        return;
      }

      const target = clamp(
        Number(state.pendingSeekTarget || 0),
        0,
        getPlayableDuration(video) || Math.max(Number(video.currentTime || 0), Number(state.pendingSeekTarget || 0))
      );

      if (Math.abs(Number(video.currentTime || 0) - target) <= 0.35) {
        clearPendingSeek();
        snapshot(video);
        return;
      }

      if (Date.now() >= state.pendingSeekUntil) {
        clearPendingSeek();
        snapshot(video);
        return;
      }

      applySeekToVideo(video, target);
      snapshot(video);
      ensurePendingSeek();
    }, 90);
  };

  const requestSeek = (video, target) => {
    if (!video) return;
    const boundedTarget = clamp(
      Number(target || 0),
      0,
      getPlayableDuration(video) || Math.max(Number(video.currentTime || 0), Number(target || 0))
    );
    state.pendingSeekId = ensureId(video, 'video');
    state.pendingSeekTarget = boundedTarget;
    state.pendingSeekUntil = Date.now() + 2200;
    applySeekToVideo(video, boundedTarget);
    ensurePendingSeek();
  };

  const tryActivatePendingFocus = () => {
    if (!state.pendingFocusId) return false;
    const video = findAnyRegisteredVideo();
    return applyFocus(video);
  };

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
    send({ type: 'videosFound', title: document.title || '', pageUrl: location.href, videos: getVideos() });
    if (state.activeVideo && !state.activeVideo.isConnected) {
      state.activeVideo = findAnyRegisteredVideo();
    }
    if (state.pendingFocusId) {
      tryActivatePendingFocus();
    }
    if (state.activeVideo) snapshot(state.activeVideo);
  };

  const enterFocus = (id) => {
    const video = findVideo(id) || findAnyRegisteredVideo();
    if (!video) {
      if (id === 'deferred-page-player' || isDeferredPlayerPage()) {
        state.pendingFocusId = id || 'deferred-page-player';
        send({ type: 'focusPending', message: 'Waiting for the page player to initialize.' });
        return;
      }
      send({ type: 'focusError', message: 'No matching HTML5 video element was found on this page.' });
      return;
    }
    applyFocus(video);
  };

  const exitFocus = () => {
    state.pendingFocusId = null;
    clearPendingSeek();
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
    if (command.action === 'enterFocus') return void enterFocus(command.id);
    if (command.action === 'exitFocus') return void exitFocus();

    const video = (command.id && findVideo(command.id)) || state.activeVideo || findAnyRegisteredVideo() || document.querySelector('video');
    if (!video) {
      if (state.pendingFocusId) {
        if (command.action === 'setRate') state.pendingRate = Number(command.value || 1);
        if (command.action === 'setVolume') state.pendingVolume = Math.max(0, Math.min(1, Number(command.value || 0)));
        return true;
      }
      send({ type: 'focusError', message: 'No controllable HTML5 video is active on this page.' });
      return true;
    }

    if (command.action === 'play') safePlay(video);
    if (command.action === 'pause' && video.pause) video.pause();
    if (command.action === 'togglePlay') (video.paused ? safePlay(video) : video.pause && video.pause());
    if (command.action === 'setRate') {
      if ('preservesPitch' in video) video.preservesPitch = true;
      if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = true;
      video.playbackRate = Number(command.value || 1);
    }
    if (command.action === 'setVolume') video.volume = Math.max(0, Math.min(1, Number(command.value || 0)));
    if (command.action === 'seekBy') {
      const baseTime = state.pendingSeekTarget !== null ? Number(state.pendingSeekTarget || 0) : Number(video.currentTime || 0);
      requestSeek(video, baseTime + Number(command.value || 0));
    }
    if (command.action === 'seekTo') requestSeek(video, Number(command.value || 0));
    snapshot(video);
    return true;
  };

  window.open = function () {
    send({ type: 'blockedPopup' });
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
    if (state.scrollMoved) state.lastScrollAt = Date.now();
    setTimeout(() => { state.scrollMoved = false; }, 0);
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
  }, true);

  ['play', 'pause', 'ratechange', 'volumechange', 'loadedmetadata', 'timeupdate'].forEach((name) => {
    document.addEventListener(name, (event) => {
      if (!event.target || event.target.tagName !== 'VIDEO') return;
      registerVideo(event.target);
      collect();
      if (state.activeVideo && event.target !== state.activeVideo) return;
      ensurePendingSeek();
      snapshot(state.activeVideo || event.target);
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
  return true;
})();
