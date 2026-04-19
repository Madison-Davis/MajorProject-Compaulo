/* ═══════════════════════════════════════════════════════════
   COMPAULO — Anime.js Animation Suite
   ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════
   ① HERO ENTRANCE — Anime.js master timeline
   ═══════════════════════════════════════════════════════ */
(function heroTimeline() {
  const tl = anime.timeline({ easing: 'easeOutExpo', autoplay: true });

  // 1. Badge tag drops in with spring overshoot
  tl.add({
    targets: '#heroTag',
    translateY: [-40, 0],
    opacity: [0, 1],
    duration: 700,
    easing: 'spring(1, 80, 12, 6)'
  })

  // 2. H1 lines wipe UP through overflow:hidden mask — one after another
  .add({
    targets: '.h1-li',
    translateY: ['104%', '0%'],
    opacity: [0, 1],
    duration: 950,
    delay: anime.stagger(130, { easing: 'easeOutQuad' }),
    easing: 'easeOutExpo'
  }, '-=300')

  // 3. Subtitle fades + rises
  .add({
    targets: '#heroSub',
    translateY: [28, 0],
    opacity: [0, 1],
    duration: 700,
    easing: 'easeOutExpo'
  }, '-=550')

  // 4. CTA buttons cascade in
  .add({
    targets: '#heroCtas a',
    translateY: [20, 0],
    opacity: [0, 1],
    scale: [0.92, 1],
    duration: 550,
    delay: anime.stagger(90),
    easing: 'easeOutExpo'
  }, '-=450')

  // 5. Dashboard image glides up
  .add({
    targets: '#heroImg',
    translateY: [52, 0],
    opacity: [0, 1],
    duration: 1100,
    easing: 'easeOutExpo'
  }, '-=420');
})();

/* ═══════════════════════════════════════════════════════
   ② SECTION H2 — word-mask reveal on scroll
   ═══════════════════════════════════════════════════════ */
function wrapWordsInMask(h2) {
  // Don't double-wrap
  if (h2.dataset.masked) return;
  h2.dataset.masked = '1';

  // Walk child nodes to preserve any HTML (em, etc.)
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(chunk => {
        if (/^\s+$/.test(chunk)) {
          frag.appendChild(document.createTextNode(chunk));
        } else {
          const wm = document.createElement('span');
          wm.className = 'wm';
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = chunk;
          wm.appendChild(wi);
          frag.appendChild(wm);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SPAN') {
      [...node.childNodes].forEach(processNode);
    }
  }
  [...h2.childNodes].forEach(processNode);
}

function revealH2(h2) {
  wrapWordsInMask(h2);
  anime({
    targets: h2.querySelectorAll('.wi'),
    translateY: ['110%', '0%'],
    opacity:    [0, 1],
    duration:   900,
    delay:      anime.stagger(55, { easing: 'easeOutSine' }),
    easing:     'easeOutExpo'
  });
}

function resetH2(h2) {
  anime.remove(h2.querySelectorAll('.wi'));
  h2.querySelectorAll('.wi').forEach(w => {
    w.style.opacity = '0';
    w.style.transform = 'translateY(110%)';
  });
}

const h2Obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      revealH2(e.target);
    } else {
      resetH2(e.target);
    }
  });
}, { threshold: 0.25 });

document.querySelectorAll('.section-header h2').forEach(h2 => {
  wrapWordsInMask(h2);
  h2.querySelectorAll('.wi').forEach(w => {
    w.style.opacity = '0';
    w.style.transform = 'translateY(110%)';
  });
  h2Obs.observe(h2);
});

/* ═══════════════════════════════════════════════════════
   ③ EYEBROW — character scramble on scroll
   ═══════════════════════════════════════════════════════ */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/\\';
const scrambleTimers = new Map();

function scramble(el) {
  if (el.dataset.scrambled) return;
  el.dataset.scrambled = '1';
  if (!el.dataset.finalText) el.dataset.finalText = el.textContent.trim();
  const final = el.dataset.finalText;
  let frame = 0;
  const total = final.length * 3;
  const id = setInterval(() => {
    el.textContent = final.split('').map((ch, i) => {
      if (ch === ' ') return ' ';
      if (frame / 3 > i) return ch;
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }).join('');
    frame++;
    if (frame >= total) { el.textContent = final; clearInterval(id); scrambleTimers.delete(el); }
  }, 28);
  scrambleTimers.set(el, id);
}

function resetEyebrow(el) {
  const id = scrambleTimers.get(el);
  if (id) { clearInterval(id); scrambleTimers.delete(el); }
  if (el.dataset.finalText) el.textContent = el.dataset.finalText;
  delete el.dataset.scrambled;
}

const eyebrowObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { scramble(e.target); }
    else { resetEyebrow(e.target); }
  });
}, { threshold: 0.6 });

document.querySelectorAll('.eyebrow').forEach(el => eyebrowObs.observe(el));

/* ═══════════════════════════════════════════════════════
   ④ ANALYZE QUOTE — word-by-word with Anime.js stagger
   ═══════════════════════════════════════════════════════ */
(function analyzeQuote() {
  const q = document.getElementById('analyzeQuote');
  if (!q) return;

  // Split into word spans
  const raw = q.textContent.trim();
  const words = raw.split(/(\s+)/);
  q.innerHTML = words.map(chunk => {
    if (/^\s+$/.test(chunk)) return ' ';
    return `<span class="aq-word">${chunk}</span>`;
  }).join('');

  const wordEls = q.querySelectorAll('.aq-word');
  wordEls.forEach(w => { w.style.opacity = '0'; w.style.transform = 'translateY(12px)'; });

  const quoteObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      anime({
        targets: wordEls,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 600,
        delay: anime.stagger(35, { easing: 'easeOutSine' }),
        easing: 'easeOutExpo'
      });
    } else {
      anime.remove(wordEls);
      wordEls.forEach(w => { w.style.opacity = '0'; w.style.transform = 'translateY(12px)'; });
    }
  }, { threshold: 0.25 });
  quoteObs.observe(q);
})();

/* ═══════════════════════════════════════════════════════
   ⑤ SCROLL ANIMATIONS — sa-child system (enhanced stagger)
   ═══════════════════════════════════════════════════════ */
const saObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('sa-in');
    else e.target.classList.remove('sa-in');
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.sa-child').forEach(el => saObs.observe(el));

/* ═══════════════════════════════════════════════════════
   ⑥ COUNTERS — Anime.js property animation
   ═══════════════════════════════════════════════════════ */
function animCount(el) {
  const target = +el.dataset.target;
  const obj = { val: 0 };
  anime({
    targets: obj,
    val: target,
    round: 1,
    duration: 1600,
    easing: 'easeOutExpo',
    update() { el.textContent = obj.val; }
  });
}

const cntObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { animCount(e.target); }
    else { anime.remove(e.target); e.target.textContent = '0'; }
  });
}, { threshold: 0.6 });
document.querySelectorAll('.cstat-num[data-target]').forEach(el => cntObs.observe(el));

/* ═══════════════════════════════════════════════════════
   ⑦ SECTION HEADER — eyebrow + p animate after h2
   ═══════════════════════════════════════════════════════ */
const headerObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    const hdr = e.target;
    const p = hdr.querySelector('p');
    if (!p) return;
    if (e.isIntersecting) {
      anime({ targets: p, translateY: [18, 0], opacity: [0, 1], duration: 700, delay: 300, easing: 'easeOutExpo' });
    } else {
      anime.remove(p);
      p.style.opacity = '0';
      p.style.transform = 'translateY(18px)';
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.section-header').forEach(hdr => {
  const p = hdr.querySelector('p');
  if (p) { p.style.opacity = '0'; p.style.transform = 'translateY(18px)'; headerObs.observe(hdr); }
});

/* ═══════════════════════════════════════════════════════
   ⑧ BENEFIT / FEATURE CARDS — stagger on section enter
   ═══════════════════════════════════════════════════════ */
function staggerGroup(selector, parentSelector) {
  const parents = document.querySelectorAll(parentSelector);
  const grpObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const cards = e.target.querySelectorAll(selector);
      if (e.isIntersecting) {
        anime({
          targets: cards,
          translateY: [36, 0],
          opacity: [0, 1],
          scale: [0.96, 1],
          duration: 700,
          delay: anime.stagger(80, { easing: 'easeOutSine' }),
          easing: 'easeOutExpo'
        });
      } else {
        anime.remove(cards);
        cards.forEach(c => {
          c.style.opacity = '0';
          c.style.transform = 'translateY(36px) scale(0.96)';
        });
      }
    });
  }, { threshold: 0.12 });
  parents.forEach(p => {
    p.querySelectorAll(selector).forEach(c => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(36px) scale(0.96)';
    });
    grpObs.observe(p);
  });
}

staggerGroup('.benefit-card',  '.benefits-grid');
staggerGroup('.feature-card',  '.features-grid');
staggerGroup('.review-card',   '.reviews-grid');
staggerGroup('.team-card',     '.team-grid');
staggerGroup('.svc-box',       '.services-bento');

/* ═══════════════════════════════════════════════════════
   ⑨ PROCESS TABS — auto-cycle + manual
   ═══════════════════════════════════════════════════════ */
const procTabs   = document.querySelectorAll('.proc-tab');
const procPanels = document.querySelectorAll('.proc-panel');
function setProc(idx) {
  procTabs.forEach((t, i) => t.classList.toggle('active', i === idx));
  procPanels.forEach((p, i) => {
    if (i === idx) {
      p.classList.add('active');
      anime({ targets: p, opacity: [0, 1], translateY: [16, 0], duration: 500, easing: 'easeOutExpo' });
    } else {
      p.classList.remove('active');
    }
  });
}
let procIdx = 0;
const procTimer = setInterval(() => { procIdx = (procIdx + 1) % procTabs.length; setProc(procIdx); }, 4000);
procTabs.forEach((tab, i) => tab.addEventListener('click', () => { setProc(i); clearInterval(procTimer); }));

/* ═══════════════════════════════════════════════════════
   ⑩ CARD STACK — success stories
   ═══════════════════════════════════════════════════════ */
(function initStack() {
  const stack = document.getElementById('storyStack');
  if (!stack) return;
  const cards = [...stack.querySelectorAll('.story-card')];
  const dots  = [...document.querySelectorAll('.sd')];
  let front = 0, animating = false;

  function calibrate() {
    const fc = cards.find(c => +c.dataset.pos === 0);
    if (fc) stack.style.height = fc.scrollHeight + 'px';
  }

  function applyPositions(skipAnim) {
    cards.forEach((card, i) => {
      const pos = (i - front + cards.length) % cards.length;
      card.dataset.pos = pos;
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === front));
    setTimeout(calibrate, skipAnim ? 0 : 520);
  }

  function advance(dir) {
    if (animating) return;
    animating = true;
    front = (front + dir + cards.length) % cards.length;
    applyPositions();
    const fc = cards.find(c => +c.dataset.pos === 0);
    if (fc) {
      fc.querySelectorAll('.cstat-num[data-target]').forEach(el => {
        el.textContent = '0';
        animCount(el);
      });
    }
    setTimeout(() => { animating = false; }, 550);
  }

  document.getElementById('stackNext').addEventListener('click', () => advance(1));
  document.getElementById('stackPrev').addEventListener('click', () => advance(-1));
  stack.addEventListener('click', e => {
    const card = e.target.closest('.story-card');
    if (!card || +card.dataset.pos === 0) return;
    advance(+card.dataset.pos);
  });

  applyPositions(true);
  window.addEventListener('resize', calibrate);
})();

/* ═══════════════════════════════════════════════════════
   ⑪ FAQ ACCORDION
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   ⑫ PRICING TOGGLE
   ═══════════════════════════════════════════════════════ */
const pBtn = document.getElementById('pricingToggle');
let yearly = false;
pBtn.addEventListener('click', () => {
  yearly = !yearly;
  pBtn.classList.toggle('on', yearly);
  document.querySelectorAll('.plan-amount[data-monthly]').forEach(el => {
    anime({
      targets: el,
      opacity: [1, 0],
      translateY: [0, -10],
      duration: 180,
      easing: 'easeInExpo',
      complete() {
        el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly;
        anime({ targets: el, opacity: [0, 1], translateY: [10, 0], duration: 280, easing: 'easeOutExpo' });
      }
    });
  });
  document.getElementById('labelMonthly').style.color = yearly ? 'rgba(255,255,255,.3)' : '';
  document.getElementById('labelYearly').style.color  = yearly ? 'rgba(255,255,255,.85)' : '';
});

/* ═══════════════════════════════════════════════════════
   ⑬ PARALLAX — subtle Y shift on section h2s
   ═══════════════════════════════════════════════════════ */
(function parallax() {
  const els = document.querySelectorAll('.section-header h2');
  let ticking = false;
  function tick() {
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      const rel  = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      el.style.transform = `translateY(${rel * -18}px)`;
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(tick); ticking = true; }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════
   ⑭ NAV LINK HOVER — underline slide with Anime.js
   ═══════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-pill ul li a').forEach(link => {
  link.addEventListener('mouseenter', () => {
    anime({ targets: link, scale: [1, 1.04], duration: 200, easing: 'easeOutQuad' });
  });
  link.addEventListener('mouseleave', () => {
    anime({ targets: link, scale: [1.04, 1], duration: 200, easing: 'easeOutQuad' });
  });
});

/* ═══════════════════════════════════════════════════════
   ⑮ CTA BOX — glow pulse on hover
   ═══════════════════════════════════════════════════════ */
const ctaBox = document.querySelector('.cta-box');
if (ctaBox) {
  ctaBox.addEventListener('mouseenter', () => {
    anime({ targets: ctaBox, boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 60px rgba(255,255,255,0.06)'], duration: 500, easing: 'easeOutExpo' });
  });
  ctaBox.addEventListener('mouseleave', () => {
    anime({ targets: ctaBox, boxShadow: ['0 0 60px rgba(255,255,255,0.06)', '0 0 0px rgba(255,255,255,0)'], duration: 500, easing: 'easeOutExpo' });
  });
}
