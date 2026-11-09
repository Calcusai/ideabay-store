// Mobile menu
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
if (burger && menu) {
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
}

// Gear filter + search (only on /gear/)
const grid = document.querySelector('[data-filter-grid]');
if (grid) {
  const cards = [...grid.querySelectorAll('.card')];
  const chips = [...document.querySelectorAll('button[data-cat]')];
  const input = document.getElementById('gear-search');
  const empty = document.querySelector('.empty');
  let cat = 'all';
  const apply = () => {
    const q = (input?.value || '').trim().toLowerCase();
    let shown = 0;
    cards.forEach(c => {
      const ok = (cat === 'all' || c.dataset.cat === cat) && (!q || c.dataset.search.includes(q));
      c.hidden = !ok; if (ok) shown++;
    });
    if (empty) { empty.hidden = shown > 0; empty.style.display = shown ? 'none' : 'block'; }
    const count = document.querySelector('.results-count');
    if (count) count.textContent = `${shown} of ${cards.length} items`; 
  };
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    ch.setAttribute('aria-pressed', 'true');
    ch.classList.add('active'); cat = ch.dataset.cat; apply();
  }));
  input?.addEventListener('input', apply);
  const pre = new URLSearchParams(location.search).get('q');
  if (pre && input) input.value = pre;
  apply();
}

// Reveal on scroll
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -60px' }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

// Equipment showcase: every slide keeps its own real product link and enquiry.
const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const dots = [...carousel.querySelectorAll('[data-slide-to]')];
  const pause = carousel.querySelector('[data-pause]');
  const status = carousel.querySelector('[data-slide-status]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = motion.matches;
  let timer;
  const stop = () => { clearInterval(timer); timer = undefined; };
  const show = (index, manual = false) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    status.setAttribute('aria-live', manual ? 'polite' : 'off');
    status.textContent = slides[current].getAttribute('aria-label');
  };
  const start = () => {
    stop();
    if (!paused && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
      timer = setInterval(() => show(current + 1), 6500);
    }
  };
  const pauseUI = () => {
    pause.textContent = paused ? 'Play ▷' : 'Pause Ⅱ';
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pause.setAttribute('aria-pressed', String(paused));
  };
  const navigate = index => { show(index, true); start(); };
  carousel.querySelector('[data-prev]').addEventListener('click', () => navigate(current - 1));
  carousel.querySelector('[data-next]').addEventListener('click', () => navigate(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => navigate(i)));
  pause.addEventListener('click', () => { paused = !paused; pauseUI(); start(); });
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', () => setTimeout(start, 0));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); navigate(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchStart;
  carousel.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; stop(); }, { passive: true });
  carousel.addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 50) show(current + (delta < 0 ? 1 : -1), true);
    start();
  }, { passive: true });
  document.addEventListener('visibilitychange', start);
  motion.addEventListener('change', event => { paused = event.matches; pauseUI(); start(); });
  pauseUI(); start();
}
