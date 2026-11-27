const scenes = [...document.querySelectorAll('.scene')];
const nav = [...document.querySelectorAll('.progress a')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Longer shots receive more scroll distance; short shots retain enough room for touch gestures.
const PIXELS_PER_SECOND = 220;
const MIN_SCRUB_VIEWPORTS = 1.25;
const MIN_TRANSITION_PX = 72;
const MAX_TRANSITION_PX = 140;
let scheduled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function layoutScenes() {
  const viewport = window.innerHeight;

  scenes.forEach((scene, index) => {
    const video = scene.querySelector('video');
    const fallbackDuration = Number(scene.dataset.duration);
    const duration = Number.isFinite(video.duration) ? video.duration : fallbackDuration;
    const scrubDistance = Math.round(Math.max(viewport * MIN_SCRUB_VIEWPORTS, duration * PIXELS_PER_SECOND));
    const transitionDistance = index === scenes.length - 1
      ? 0
      : Math.round(clamp(viewport * 0.12, MIN_TRANSITION_PX, MAX_TRANSITION_PX));

    scene.dataset.scrubDistance = String(scrubDistance);
    scene.dataset.transitionDistance = String(transitionDistance);
    scene.style.height = `${scrubDistance + transitionDistance}px`;
  });
}

function requestLoad(video) {
  if (video.dataset.loadRequested) return;
  video.dataset.loadRequested = 'true';
  if (video.preload === 'none') {
    video.preload = 'auto';
    video.load();
  }
}

function seek(video, progress) {
  // Keep the poster visible until the browser has decoded an actual frame.
  // Seeking with metadata only clears the poster and briefly exposes a black stage.
  if (reducedMotion.matches || video.readyState < 2 || !Number.isFinite(video.duration)) return;

  const frame = 1 / 24;
  const target = clamp(progress * video.duration, 0, Math.max(0, video.duration - frame));
  if (Math.abs(video.currentTime - target) > frame / 2) video.currentTime = target;
}

function update() {
  scheduled = false;
  const y = window.scrollY;
  let currentIndex = 0;
  scenes.forEach((scene, index) => {
    if (y >= scene.offsetTop) currentIndex = index;
  });

  const current = scenes[currentIndex];
  const next = scenes[currentIndex + 1];
  const scrubDistance = Math.max(1, Number(current.dataset.scrubDistance));
  const transitionDistance = Number(current.dataset.transitionDistance);
  const localY = y - current.offsetTop;
  const progress = clamp(localY / scrubDistance, 0, 1);
  const transitionProgress = transitionDistance > 0
    ? clamp((localY - scrubDistance) / transitionDistance, 0, 1)
    : 0;

  requestLoad(current.querySelector('video'));
  if (next) requestLoad(next.querySelector('video'));
  seek(current.querySelector('video'), progress);

  scenes.forEach((scene, index) => {
    const isCurrent = index === currentIndex;
    const isNext = index === currentIndex + 1 && transitionProgress > 0;
    const opacity = isCurrent ? 1 - transitionProgress : isNext ? transitionProgress : 0;
    scene.style.setProperty('--scene-opacity', String(opacity));
    scene.classList.toggle('is-visible', isCurrent || isNext);
    scene.classList.toggle('is-active', isCurrent);
  });

  nav.forEach((link) => {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
}

function schedule() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(update);
  }
}

scenes.forEach((scene) => {
  const video = scene.querySelector('video');
  video.pause();
  video.addEventListener('loadedmetadata', () => {
    scene.dataset.duration = String(video.duration);
    layoutScenes();
    schedule();
  });
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('seeked', () => {
    video.classList.add('is-ready');
    scene.querySelector('.scene__poster').classList.add('is-hidden');
  }, { once: true });
});
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', () => {
  layoutScenes();
  schedule();
});
reducedMotion.addEventListener('change', schedule);
layoutScenes();
schedule();
