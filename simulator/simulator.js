const SAMPLE_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const DOUBLE_TAP_MS = 260;
const HOLD_DELAY_MS = 260;
const DOUBLE_TAP_SEEK_SECONDS = 30;

const video = document.getElementById('video');
const statusText = document.getElementById('status-text');
const controls = document.getElementById('controls');
const currentTimeText = document.getElementById('current-time');
const durationTimeText = document.getElementById('duration-time');
const timeline = document.getElementById('timeline');
const timelineFill = document.getElementById('timeline-fill');
const timelineThumb = document.getElementById('timeline-thumb');
const brightnessMask = document.getElementById('brightness-mask');
const gestureLayer = document.getElementById('gesture-layer');
const gestureMessage = document.getElementById('gesture-message');
const playToggle = document.getElementById('play-toggle');
const videoUrlInput = document.getElementById('video-url');
const loadVideoButton = document.getElementById('load-video');
const reloadSampleButton = document.getElementById('reload-sample');
const rateButtons = Array.from(document.querySelectorAll('[data-action="rate"]'));
const seekButtons = Array.from(document.querySelectorAll('[data-action="seek"]'));

const state = {
  brightness: 0.5,
  volume: 1,
  baseRate: 1,
  controlsVisible: true,
  holdTimer: null,
  hudTimer: null,
  holdActive: false,
  holdRestoreRate: 1,
  lastTapAt: 0,
  activeSide: 'left',
  startBrightness: 0.5,
  startVolume: 1,
  touchStartX: 0,
  touchStartY: 0,
  moved: false,
  timelineDragging: false,
  timelineAnchorTime: 0,
  timelineStartTime: 0,
  timelineStartX: 0,
  timelineDuration: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return [hours, minutes, secs].map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0'))).join(':');
  }
  return [minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function getPointerPosition(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (touch) {
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

function getActiveSide(x) {
  const bounds = gestureLayer.getBoundingClientRect();
  return x < bounds.left + bounds.width / 2 ? 'left' : 'right';
}

function getDoubleTapAction(x) {
  const bounds = gestureLayer.getBoundingClientRect();
  const relativeX = x - bounds.left;
  if (relativeX < bounds.width * 0.3) return 'seek-backward';
  if (relativeX > bounds.width * 0.7) return 'seek-forward';
  return 'toggle-playback';
}

function showHud(message) {
  gestureMessage.textContent = message;
  gestureMessage.classList.remove('hidden');
  clearTimeout(state.hudTimer);
  state.hudTimer = setTimeout(() => gestureMessage.classList.add('hidden'), 700);
}

function updateBrightness(nextBrightness) {
  state.brightness = clamp(nextBrightness, 0.05, 1);
  brightnessMask.style.opacity = String(clamp((1 - state.brightness) * 0.82, 0, 0.72));
  showHud(`Brightness ${Math.round(state.brightness * 100)}%`);
}

function updateVolume(nextVolume) {
  state.volume = clamp(nextVolume, 0, 1);
  video.volume = state.volume;
  showHud(`Volume ${Math.round(state.volume * 100)}%`);
}

function updateRate(nextRate) {
  state.baseRate = nextRate;
  video.playbackRate = nextRate;
  rateButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.value) === nextRate);
  });
}

function updateProgress() {
  const currentTime = state.timelineDragging ? state.timelineAnchorTime : video.currentTime || 0;
  const duration = video.duration || 0;
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  currentTimeText.textContent = formatTime(currentTime);
  durationTimeText.textContent = `${formatTime(duration)} | -${formatTime(Math.max(duration - currentTime, 0))}`;
  timelineFill.style.width = `${progress * 100}%`;
  timelineThumb.style.left = `${progress * 100}%`;
  playToggle.textContent = video.paused ? 'Play' : 'Pause';
  statusText.textContent = `${state.baseRate.toFixed(2)}x | Vol ${Math.round(state.volume * 100)}%`;
}

function toggleControls() {
  state.controlsVisible = !state.controlsVisible;
  controls.style.display = state.controlsVisible ? 'block' : 'none';
}

function togglePlayPause() {
  if (video.paused) video.play();
  else video.pause();
  updateProgress();
}

function beginHold() {
  clearTimeout(state.holdTimer);
  state.holdTimer = setTimeout(() => {
    state.holdActive = true;
    state.holdRestoreRate = state.baseRate;
    video.playbackRate = 1;
    showHud('Hold 1x');
  }, HOLD_DELAY_MS);
}

function finishHold() {
  clearTimeout(state.holdTimer);
  if (!state.holdActive) return false;
  state.holdActive = false;
  video.playbackRate = state.holdRestoreRate;
  showHud(`${state.holdRestoreRate.toFixed(2)}x`);
  return true;
}

function handleGestureStart(event) {
  const { x, y } = getPointerPosition(event);
  state.touchStartX = x;
  state.touchStartY = y;
  state.activeSide = getActiveSide(x);
  state.startBrightness = state.brightness;
  state.startVolume = state.volume;
  state.moved = false;
  beginHold();
}

function handleGestureMove(event) {
  const { x, y } = getPointerPosition(event);
  const dx = x - state.touchStartX;
  const dy = y - state.touchStartY;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    state.moved = true;
    clearTimeout(state.holdTimer);
  }

  if (!state.moved || state.holdActive) return;

  const amount = dy * -0.0048;
  if (state.activeSide === 'left') {
    updateBrightness(state.startBrightness + amount);
  } else {
    updateVolume(state.startVolume + amount);
  }
}

function handleGestureEnd(event) {
  const { x } = getPointerPosition(event);
  if (finishHold()) {
    updateProgress();
    return;
  }

  clearTimeout(state.holdTimer);
  if (state.moved) {
    updateProgress();
    return;
  }

  const now = Date.now();
  if (now - state.lastTapAt < DOUBLE_TAP_MS) {
    state.lastTapAt = 0;
    const action = getDoubleTapAction(x);
    if (action === 'seek-backward') {
      video.currentTime = Math.max(0, (video.currentTime || 0) - DOUBLE_TAP_SEEK_SECONDS);
    } else if (action === 'seek-forward') {
      video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + DOUBLE_TAP_SEEK_SECONDS);
    } else {
      togglePlayPause();
    }
    updateProgress();
    return;
  }

  state.lastTapAt = now;
  setTimeout(() => {
    if (state.lastTapAt === now) {
      toggleControls();
      state.lastTapAt = 0;
    }
  }, DOUBLE_TAP_MS);
}

function beginTimelineDrag(event) {
  state.timelineDragging = true;
  state.timelineAnchorTime = video.currentTime || 0;
  state.timelineStartTime = video.currentTime || 0;
  state.timelineStartX = event.clientX;
  state.timelineDuration = video.duration || 0;
  timeline.setPointerCapture?.(event.pointerId);
}

function moveTimelineDrag(event) {
  if (!state.timelineDragging) return;
  const bounds = timeline.getBoundingClientRect();
  const deltaSeconds = ((event.clientX - state.timelineStartX) / bounds.width) * state.timelineDuration;
  const nextTime = clamp(state.timelineStartTime + deltaSeconds, 0, state.timelineDuration || 0);
  state.timelineAnchorTime = nextTime;
  updateProgress();
}

function endTimelineDrag() {
  if (!state.timelineDragging) return;
  state.timelineDragging = false;
  video.currentTime = state.timelineAnchorTime;
  updateProgress();
}

function loadVideo(url) {
  video.src = url;
  video.load();
  video.play().catch(() => {});
  updateRate(state.baseRate);
  statusText.textContent = 'Loaded';
}

gestureLayer.addEventListener('pointerdown', handleGestureStart);
gestureLayer.addEventListener('pointermove', handleGestureMove);
gestureLayer.addEventListener('pointerup', handleGestureEnd);
gestureLayer.addEventListener('pointercancel', handleGestureEnd);

timeline.addEventListener('pointerdown', beginTimelineDrag);
timeline.addEventListener('pointermove', moveTimelineDrag);
timeline.addEventListener('pointerup', endTimelineDrag);
timeline.addEventListener('pointercancel', endTimelineDrag);

playToggle.addEventListener('click', togglePlayPause);
loadVideoButton.addEventListener('click', () => loadVideo(videoUrlInput.value.trim() || SAMPLE_URL));
reloadSampleButton.addEventListener('click', () => {
  videoUrlInput.value = SAMPLE_URL;
  loadVideo(SAMPLE_URL);
});

rateButtons.forEach((button) => {
  button.addEventListener('click', () => updateRate(Number(button.dataset.value)));
});

seekButtons.forEach((button) => {
  button.addEventListener('click', () => {
    video.currentTime = clamp((video.currentTime || 0) + Number(button.dataset.value), 0, video.duration || 0);
    updateProgress();
  });
});

video.addEventListener('timeupdate', updateProgress);
video.addEventListener('loadedmetadata', updateProgress);
video.addEventListener('play', updateProgress);
video.addEventListener('pause', updateProgress);

updateBrightness(0.5);
updateVolume(1);
updateRate(1);
updateProgress();
