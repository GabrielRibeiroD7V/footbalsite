const scenes = [...document.querySelectorAll('.scene')];
const nav = [...document.querySelectorAll('.progress a')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let scheduled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function update() {
  scheduled = false;
  const viewport = window.innerHeight;
  const y = window.scrollY;
  let current = scenes[0];
  scenes.forEach((scene) => {
    if (y >= scene.offsetTop) current = scene;
  });

  scenes.forEach((scene) => {
    const top = scene.offsetTop;
    const range = Math.max(1, scene.offsetHeight);
    const video = scene.querySelector('video');
    const progress = clamp((y - top) / range, 0, 1);

    if (reducedMotion.matches) return;

    // Scroll owns the playhead. Scrolling back reverses the shot.
    if (y + viewport * 2 >= top && y < top + scene.offsetHeight && (scene === current || scene === scenes[scenes.indexOf(current) + 1])) {
      if (video.preload === 'none') video.preload = 'auto';
      if (!video.dataset.loadRequested) {
        video.dataset.loadRequested = 'true';
        video.load();
      }
    }
    if (scene === current && video.readyState >= 1 && Number.isFinite(video.duration)) {
      const frame = 1 / 24;
      const target = clamp(progress * video.duration, 0, Math.max(0, video.duration - frame));
      if (Math.abs(video.currentTime - target) > frame / 2) video.currentTime = target;
    }
  });

  scenes.forEach((scene) => scene.classList.toggle('is-active', scene === current));
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
  video.addEventListener('loadedmetadata', schedule);
});
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
reducedMotion.addEventListener('change', schedule);
schedule();
