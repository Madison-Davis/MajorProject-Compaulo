/* ─── Nav scroll ─── */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ─── Mobile menu ─── */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});
document.querySelectorAll('.mobile-menu a').forEach(a =>
  a.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'))
);

/* ─── ⑨ Scroll animations (sa-child / data-anim) ─── */
const saObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('sa-in'); });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.sa-child').forEach(el => saObs.observe(el));

/* ─── ③ Analyze quote — word-by-word flow on scroll ─── */
(function splitAnalyzeQuote() {
  const q = document.getElementById('analyzeQuote');
  if (!q) return;
  const html = q.innerHTML;
  // split on spaces, keep punctuation
  const words = html.trim().split(/(\s+)/);
  let delay = 0;
  q.innerHTML = words.map(chunk => {
    if (/^\s+$/.test(chunk)) return ' ';
    const span = `<span class="aq-word" style="transition-delay:${delay}ms">${chunk}</span>`;
    delay += 30;
    return span;
  }).join('');

  const wordEls = q.querySelectorAll('.aq-word');
  const quoteObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        wordEls.forEach(w => w.classList.add('aw-in'));
        quoteObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  quoteObs.observe(q);
})();

/* ─── Counter animation ─── */
function animCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const dur = 1400;
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}
const cntObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { animCount(e.target); cntObs.unobserve(e.target); }
  });
}, { threshold: 0.6 });
document.querySelectorAll('.cstat-num[data-target]').forEach(el => cntObs.observe(el));

/* ─── Process tabs + auto-cycle ─── */
const procTabs = document.querySelectorAll('.proc-tab');
const procPanels = document.querySelectorAll('.proc-panel');
function setProc(idx) {
  procTabs.forEach((t, i) => t.classList.toggle('active', i === idx));
  procPanels.forEach((p, i) => p.classList.toggle('active', i === idx));
}
procTabs.forEach((tab, i) => tab.addEventListener('click', () => { setProc(i); clearInterval(procTimer); }));
let procIdx = 0;
const procTimer = setInterval(() => { procIdx = (procIdx + 1) % procTabs.length; setProc(procIdx); }, 4000);

/* ─── ⑦ Card stack — success stories ─── */
(function initStack() {
  const stack = document.getElementById('storyStack');
  if (!stack) return;
  const cards = [...stack.querySelectorAll('.story-card')];
  const dots  = [...document.querySelectorAll('.sd')];
  let front = 0;

  function applyPositions() {
    cards.forEach((card, i) => {
      const pos = (i - front + cards.length) % cards.length;
      card.dataset.pos = pos;
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === front));
  }

  function advance(dir) {
    front = (front + dir + cards.length) % cards.length;
    applyPositions();
    // re-trigger counters on newly visible card
    const frontCard = cards.find(c => c.dataset.pos === '0');
    if (frontCard) {
      frontCard.querySelectorAll('.cstat-num[data-target]').forEach(el => {
        el.textContent = '0';
        animCount(el);
      });
    }
  }

  document.getElementById('stackNext').addEventListener('click', () => advance(1));
  document.getElementById('stackPrev').addEventListener('click', () => advance(-1));

  // click on back cards brings them forward
  stack.addEventListener('click', e => {
    const card = e.target.closest('.story-card');
    if (!card || card.dataset.pos === '0') return;
    advance(parseInt(card.dataset.pos));
  });

  // set container height to match front card
  function calibrateHeight() {
    const frontCard = cards[front];
    stack.style.height = frontCard.scrollHeight + 'px';
  }

  applyPositions();
  setTimeout(calibrateHeight, 100);
  window.addEventListener('resize', calibrateHeight);

  // recalibrate height after each advance
  ['stackNext','stackPrev'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => setTimeout(calibrateHeight, 520));
  });
})();

/* ─── FAQ accordion ─── */
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-a').classList.remove('open');
    });
    if (!open) { item.classList.add('open'); item.querySelector('.faq-a').classList.add('open'); }
  });
});

/* ─── Pricing toggle ─── */
const pBtn = document.getElementById('pricingToggle');
let yearly = false;
pBtn.addEventListener('click', () => {
  yearly = !yearly;
  pBtn.classList.toggle('on', yearly);
  document.querySelectorAll('.plan-amount[data-monthly]').forEach(el => {
    el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly;
  });
  document.getElementById('labelMonthly').style.color = yearly ? 'rgba(255,255,255,.3)' : '';
  document.getElementById('labelYearly').style.color  = yearly ? 'rgba(255,255,255,.85)' : '';
});

/* ─── ⑨ Subtle parallax on section headings ─── */
(function initParallax() {
  const layers = document.querySelectorAll('.section-header h2');
  let ticking = false;
  function update() {
    layers.forEach(el => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const vhCenter = window.innerHeight / 2;
      const dist = (center - vhCenter) / window.innerHeight;
      el.style.transform = `translateY(${dist * -16}px)`;
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
})();
