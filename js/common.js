/* ============================================================
   TORNADOTOOLS — COMMON.JS
   Shared across ALL tool pages
   Handles: starfield background, mobile nav, toast notifications
   ============================================================ */

/* ============================================================
   STAR FIELD BACKGROUND
   ============================================================ */
(function initStarField() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, stars = [], animId, running = false;
  const MOBILE_STARS = 72;
  const DESKTOP_STARS = 160;
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  function Star() {
    this.reset();
  }

  Star.prototype.reset = function () {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 1.2 + 0.2;
    this.vy = Math.random() * 0.18 + 0.04;
    this.vx = (Math.random() - 0.5) * 0.06;
    this.alpha = Math.random() * 0.6 + 0.2;
    this.flicker = Math.random() * 0.015;
    this.flickerDir = 1;
    this.color = Math.random() > 0.7
      ? `rgba(0,245,255,`
      : Math.random() > 0.5
        ? `rgba(191,0,255,`
        : `rgba(180,180,255,`;
  };

  Star.prototype.update = function () {
    this.y += this.vy;
    this.x += this.vx;
    this.alpha += this.flicker * this.flickerDir;
    if (this.alpha > 0.85 || this.alpha < 0.1) this.flickerDir *= -1;
    if (this.y > H + 2 || this.x < -2 || this.x > W + 2) this.reset(), this.y = -2;
  };

  Star.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.alpha.toFixed(2) + ')';
    ctx.fill();
  };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function getStarCount() {
    return mobileQuery.matches ? MOBILE_STARS : DESKTOP_STARS;
  }

  function init() {
    resize();
    stars = Array.from({ length: getStarCount() }, () => {
      const s = new Star();
      s.y = Math.random() * H; // spread initial positions
      return s;
    });
  }

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => { s.update(); s.draw(); });
    animId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
  }

  window.addEventListener('resize', () => {
    const nextCount = getStarCount();
    if (stars.length !== nextCount) {
      stop();
      init();
      start();
      return;
    }
    resize();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', () => {
      stop();
      init();
      start();
    });
  }

  init();
  start();
})();

/* ============================================================
   MOBILE NAV
   ============================================================ */
(function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    const open = links.classList.toggle('open');
    const spans = this.querySelectorAll('span');
    if (open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
      toggle.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity   = '';
      });
    }
  });
})();

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
window.TornadoToast = (function () {
  let toastEl = null;
  let timer   = null;

  function getEl() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'copy-toast';
      document.body.appendChild(toastEl);
    }
    return toastEl;
  }

  return {
    show(msg = 'Copied!', duration = 2200) {
      const el = getEl();
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), duration);
    }
  };
})();

/* ============================================================
   SCROLL REVEAL (tool pages)
   ============================================================ */
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => obs.observe(el));
})();