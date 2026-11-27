const scenes = [...document.querySelectorAll('.scene')];
const nav = [...document.querySelectorAll('.progress a')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function activate(scene) {
  scenes.forEach((item) => {
    const active = item === scene;
    item.classList.toggle('is-active', active);
    const video = item.querySelector('video');
    if (active && !reducedMotion.matches) {
      if (video.readyState === 0) video.load();
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => {});
    } else video.pause();
  });
  nav.forEach((link) => {
    if (link.hash === `#${scene.id}`) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
  if (visible[0]) activate(visible[0].target);
}, { threshold: [0, .25, .5, .75, 1] });
scenes.forEach((scene) => observer.observe(scene));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) scenes.forEach((scene) => scene.querySelector('video').pause());
  else {
    const current = scenes.find((scene) => scene.classList.contains('is-active'));
    if (current && !reducedMotion.matches) current.querySelector('video').play().catch(() => {});
  }
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) scenes.forEach((scene) => scene.querySelector('video').pause());
  else {
    const current = scenes.find((scene) => scene.classList.contains('is-active'));
    if (current) current.querySelector('video').play().catch(() => {});
  }
});
