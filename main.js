const scenes = [...document.querySelectorAll('.scene')];
const nav = [...document.querySelectorAll('.progress a')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Longer shots receive more scroll distance; short shots retain enough room for touch gestures.
const PIXELS_PER_SECOND = 220;
const MIN_SCRUB_VIEWPORTS = 0.65;
const MIN_TRANSITION_PX = 48;
const MAX_TRANSITION_PX = 80;
let scheduled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ramp = (progress, start, end) => {
  const t = clamp((progress - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

// Art-directed blocks: x, y, depth, rotation, exit x/y. No per-letter randomness.
const choreography = [
  [[-130,0,-100,-5,-65,-12],[90,-65,-180,4,80,-24],[-70,45,60,-3,-90,20],[145,0,-80,5,100,15]],
  [[0,-110,-160,-4,-35,-60],[-110,25,80,6,-90,20],[150,0,-220,-3,120,0]],
  [[-100,-55,-120,-4,-70,-40],[125,0,50,4,90,-20],[0,-100,-200,-5,-40,55],[100,45,-100,3,100,30]],
  [[0,-95,-200,-5,-40,-65],[115,0,60,5,95,-25],[-125,35,-100,-4,-100,30],[65,-65,-160,4,70,50]],
];
const titleLines = [
  [['Tudo','começa'],['nos','detalhes.']],
  [['Agora','é'],['gramado.']],
  [['Cada','toque'],['cria o','próximo.']],
  [['É','agora'],['ou','nunca.']],
];
scenes.forEach((scene, sceneIndex) => {
  const heading = scene.querySelector('h1, h2');
  heading.setAttribute('aria-label', heading.textContent);
  heading.replaceChildren();
  titleLines[sceneIndex].forEach((words, lineIndex) => {
    const line = document.createElement(lineIndex ? 'em' : 'span');
    line.className = 'title-line';
    line.setAttribute('aria-hidden', 'true');
    words.forEach((word) => {
      const block = document.createElement('span');
      block.className = 'title-part';
      block.textContent = word;
      line.append(block);
    });
    heading.append(line);
  });
});

function updateText(scene, progress, closingProgress) {
  const still = reducedMotion.matches;
  const exit = still ? (progress >= 0.94 ? 0 : 1) : 1 - ramp(progress, 0.76, 0.94);
  const sceneIndex = scenes.indexOf(scene);
  const mobileScale = window.innerWidth <= 700 ? 0.48 : 1;
  scene.querySelectorAll('.title-part').forEach((part, index) => {
    const [x,y,z,rotation,outX,outY] = choreography[sceneIndex][index];
    const start = index * 0.025 + (sceneIndex === 2 ? 0.015 : 0);
    const enter = still ? 1 : ramp(progress, start, 0.19 + start);
    const leaving = still ? 0 : 1 - exit;
    part.style.opacity = String(enter * exit);
    part.style.transform = `translate3d(${((1-enter)*x + leaving*outX)*mobileScale}px, ${((1-enter)*y + leaving*outY)*mobileScale}px, ${(1-enter)*z}px) rotate(${((1-enter)*rotation + leaving*rotation*.5)}deg) scale(${1-(1-enter)*.12})`;
    part.style.clipPath = still ? 'none' : `inset(0 ${index % 2 ? 0 : (1-enter)*35}% ${(1-enter)*18}% ${index % 2 ? (1-enter)*35 : 0}%)`;
  });
  const caption = scene.querySelector('.scene__content p');
  const captionEnter = still ? 1 : ramp(progress, 0.29, 0.38);
  caption.style.opacity = String(captionEnter * exit);
  caption.style.transform = `translateY(${still ? 0 : (1 - captionEnter) * 10 - (1 - exit) * 8}px)`;
  scene.querySelectorAll('.scene__eyebrow, .scroll-cue, .replay').forEach((item) => {
    item.style.opacity = String(exit);
    item.style.visibility = exit === 0 ? 'hidden' : 'visible';
  });
  const credit = scene.querySelector('.creator-credit');
  if (credit) {
    const reveal = still ? (closingProgress > 0 ? 1 : 0) : ramp(closingProgress, 0, 1);
    credit.style.opacity = String(reveal);
    credit.style.transform = `translateY(${still ? 0 : (1 - reveal) * 12}px)`;
    credit.style.visibility = reveal > 0 ? 'visible' : 'hidden';
    credit.tabIndex = reveal > 0 ? 0 : -1;
  }
}

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
    // A short closing scroll reveals the credit after the final video frame.
    scene.style.height = `${scrubDistance + transitionDistance + (index === scenes.length - 1 ? 180 : 0)}px`;
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
  if (reducedMotion.matches || !Number.isFinite(video.duration)) return;

  const frame = 1 / 24;
  const target = clamp(progress * video.duration, 0, Math.max(0, video.duration - frame));
  videoTargets.set(video, target);
  flushSeek(video);
}

const videoTargets = new WeakMap();
function flushSeek(video) {
  const target = videoTargets.get(video);
  // Let each decoder request finish; collapse pending input to the latest scroll position.
  if (reducedMotion.matches || target === undefined || video.seeking || video.readyState < 2) return;
  if (Math.abs(video.currentTime-target) > 0.001) video.currentTime = target;
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
  if (next) seek(next.querySelector('video'), 0);
  if (currentIndex > 0) seek(scenes[currentIndex - 1].querySelector('video'), 1);

  scenes.forEach((scene, index) => {
    const isCurrent = index === currentIndex;
    const isNext = index === currentIndex + 1 && transitionProgress > 0;
    // Incoming opaque stage fades over the outgoing stage, avoiding a dark dip.
    const opacity = isCurrent ? 1 : isNext ? transitionProgress : 0;
    scene.style.setProperty('--scene-opacity', String(opacity));
    scene.classList.toggle('is-visible', isCurrent || isNext);
    scene.classList.toggle('is-active', isCurrent);
    const sceneProgress = clamp((y - scene.offsetTop) / Number(scene.dataset.scrubDistance), 0, 1);
    const closingProgress = clamp((y - scene.offsetTop - Number(scene.dataset.scrubDistance)) / 180, 0, 1);
    updateText(scene, sceneProgress, closingProgress);
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
  video.addEventListener('loadeddata', () => { flushSeek(video); schedule(); });
  video.addEventListener('seeked', () => flushSeek(video));
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
