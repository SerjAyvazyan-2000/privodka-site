/* =========================================================
   Приводка — main.js (vanilla, без зависимостей)
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => reduceMotion.matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Open every page from the top ---------- */
  const root = document.documentElement;
  const pageTop = document.getElementById('page-top');
  const toTop = () => {
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';                // no smooth scrolling for this jump
    window.scrollTo(0, 0);
    root.scrollTop = 0; document.body.scrollTop = 0;
    // also scrolls the outer page when the site is shown inside a frame (preview windows, builders)
    try { pageTop && pageTop.scrollIntoView({ block: 'start', inline: 'nearest' }); } catch (_) { /* ignore */ }
    root.style.scrollBehavior = prev;
  };
  if (!location.hash) {
    toTop();
    document.addEventListener('DOMContentLoaded', toTop, { once: true });
    let touched = false;
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { touched = true; }, { once: true, passive: true }));
    window.addEventListener('load', () => { if (!touched) toTop(); }, { once: true });
    setTimeout(() => { if (!touched) toTop(); }, 150);
  }

  /* ---------- Ready: intro → veil → first-screen entrance ---------- */
  const readyQueue = [];
  const whenReady = (fn) => (root.classList.contains('is-ready') ? fn() : readyQueue.push(fn));
  const goReady = () => {
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    readyQueue.splice(0).forEach((fn) => fn());
  };

  const intro = $('[data-intro-screen]');
  if (root.classList.contains('intro-on') && intro) {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem('pv-intro', '1'); } catch (_) { /* ignore */ }
      root.classList.add('intro-leave');
      setTimeout(goReady, 380);
      setTimeout(() => root.classList.remove('intro-on', 'intro-leave'), 950);
    };
    const t = setTimeout(finish, 2300);
    intro.addEventListener('click', () => { clearTimeout(t); finish(); });
    window.addEventListener('keydown', () => { clearTimeout(t); finish(); }, { once: true });
  } else if (root.classList.contains('veil-in')) {
    setTimeout(goReady, 520);
    setTimeout(() => root.classList.remove('veil-in'), 1150);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(goReady));
  }

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    $$('.veil').forEach((v) => v.remove());
    if (!location.hash) toTop();
  });

  /* ---------- Page change: a soft veil grows from the click ---------- */
  const PAGES = {
    'index.html': ['Главная', 'var(--c-soft)'],
    'services.html': ['Услуги', 'var(--m-soft)'],
    'portfolio.html': ['Портфолио', 'var(--y-soft)'],
    'about.html': ['О компании', 'var(--g-soft)'],
    'privacy.html': ['Политика конфиденциальности', 'var(--b-soft)'],
    'consent.html': ['Согласие на обработку данных', 'var(--b-soft)'],
    'cookies.html': ['Политика cookie', 'var(--b-soft)'],
  };
  const MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="4.5" fill="currentColor"/><path d="M20 2v36M2 20h36" stroke="currentColor" stroke-width="2"/></svg>';

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    const href = a.getAttribute('href');
    if (!/^[\w-]+\.html(#.*)?$/.test(href)) return;
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname) {
      if (!url.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: isReduced() ? 'auto' : 'smooth' }); }
      return;
    }
    if (isReduced()) { if (!url.hash) toTop(); return; }
    e.preventDefault();
    const file = url.pathname.split('/').pop() || 'index.html';
    const [title, bg] = PAGES[file] || ['Приводка', 'var(--paper)'];
    try { sessionStorage.setItem('pv-veil', JSON.stringify({ t: title, bg })); } catch (_) { /* ignore */ }
    const veil = document.createElement('div');
    veil.className = 'veil';
    veil.setAttribute('aria-hidden', 'true');
    veil.style.setProperty('--veil-bg', bg);
    veil.style.setProperty('--vx', e.clientX + 'px');
    veil.style.setProperty('--vy', e.clientY + 'px');
    veil.innerHTML = MARK + '<span></span>';
    veil.querySelector('span').textContent = title;
    document.body.appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('is-on')));
    setTimeout(() => { if (!url.hash) toTop(); location.href = url.href; }, 760);
  });

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Header state ---------- */
  const header = $('[data-header]');
  const onScrollHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const burgerLabel = $('[data-burger-label]');
  const main = $('#main');
  const footer = $('.site-footer');
  let lastFocus = null;
  let closeTimer = null;

  const focusables = () => $$('a[href], button:not([disabled])', menu).concat(burger);

  function openMenu() {
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    menu.classList.remove('is-closing');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burgerLabel.textContent = 'Закрыть меню';
    document.documentElement.classList.add('menu-open');
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sbw ? sbw + 'px' : '';
    document.body.classList.add('is-locked');
    [main, footer].forEach((el) => el && el.setAttribute('inert', ''));
    const first = $('a', menu);
    first && setTimeout(() => first.focus({ preventScroll: true }), 80);
  }
  function closeMenu(returnFocus = true) {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.classList.add('is-closing');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burgerLabel.textContent = 'Открыть меню';
    document.documentElement.classList.remove('menu-open');
    document.body.classList.remove('is-locked');
    document.body.style.paddingRight = '';
    [main, footer].forEach((el) => el && el.removeAttribute('inert'));
    closeTimer = setTimeout(() => menu.classList.remove('is-closing'), 650);
    if (returnFocus) (lastFocus && lastFocus.focus ? lastFocus : burger).focus({ preventScroll: true });
  }
  if (burger && menu) {
    burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    menu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) closeMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      if (e.key === 'Tab') {
        const f = focusables();
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) closeMenu(false); });
  }

  /* ---------- Button light follows pointer ---------- */
  document.addEventListener('pointermove', (e) => {
    const btn = e.target.closest && e.target.closest('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- Hero: plates come into register ---------- */
  const reg = $('[data-register]');
  const plates = reg ? {
    c: $('.plate-c', reg), m: $('.plate-m', reg), y: $('.plate-y', reg), k: $('.register-key', reg)
  } : null;
  // misregistration direction per ink, in em
  const BASE = { c: [-0.03, -0.02], m: [0.028, 0.016], y: [-0.012, 0.032] };
  const state = { mis: 1, px: 0, py: 0, tpx: 0, tpy: 0, scroll: 0 };

  const stack = $('[data-plate-stack]');
  const stackImgs = stack ? {
    c: $('[data-ink="c"]', stack), m: $('[data-ink="m"]', stack), y: $('[data-ink="y"]', stack)
  } : null;
  const IMG_BASE = { c: [-0.035, -0.02], m: [0.03, 0.025], y: [-0.015, 0.04] };

  function renderRegister() {
    if (stackImgs) {
      const w = stack.offsetWidth || 500;
      const amt = 0.08 + state.mis * 1.6 + state.scroll * 1.2;
      Object.keys(IMG_BASE).forEach((ink, i) => {
        const [bx, by] = IMG_BASE[ink];
        const f = (i + 1) * 1.4;
        const x = bx * w * amt - state.px * f * 4;
        const y = by * w * amt - state.py * f * 3 + state.scroll * (i + 1) * 14;
        stackImgs[ink].style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });
      stack.style.transform = `translate3d(0, ${(state.scroll * -40).toFixed(2)}px, 0)`;
    }
    if (!plates) return;
    const fs = parseFloat(getComputedStyle(reg).fontSize) || 64;
    const amt = 0.06 + state.mis * 0.94 + state.scroll * 0.6; // a hint of misregistration stays, like on a real proof
    Object.keys(BASE).forEach((ink, i) => {
      const [bx, by] = BASE[ink];
      const f = (i + 1) * 0.6;
      const x = bx * fs * amt + state.px * f * 3;
      const y = by * fs * amt + state.py * f * 2;
      plates[ink].style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
  }

  if (reg && !isReduced()) whenReady(() => {
    const start = performance.now();
    const DURATION = 2200;
    const pointerFine = window.matchMedia('(pointer: fine)').matches;

    if (pointerFine) {
      const hero = reg.closest('.hero, .page-hero') || document.body;
      hero.addEventListener('pointermove', (e) => {
        state.tpx = (e.clientX / window.innerWidth - 0.5) * 2;
        state.tpy = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { state.tpx = 0; state.tpy = 0; });
    }

    const loop = (now) => {
      const t = clamp((now - start) / DURATION, 0, 1);
      state.mis = 1 - (1 - Math.pow(2, -10 * t)); // expo ease-out → 0
      if (t === 1) state.mis = 0;
      state.px = lerp(state.px, state.tpx, 0.06);
      state.py = lerp(state.py, state.tpy, 0.06);
      const rect = reg.getBoundingClientRect();
      state.scroll = clamp(-rect.top / (window.innerHeight * 0.9), 0, 1);
      if (rect.bottom > -200) renderRegister();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  /* ---------- Why: circles overprint when in view ---------- */
  const why = $('[data-why]');
  if (why) {
    if ('IntersectionObserver' in window && !isReduced()) {
      const wio = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { why.classList.add('is-in'); wio.disconnect(); }
      }, { threshold: 0.35 });
      wio.observe(why);
    } else why.classList.add('is-in');
    $$('[data-why-item]', why).forEach((li) => {
      const on = () => why.setAttribute('data-focus', li.dataset.whyItem);
      const off = () => why.removeAttribute('data-focus');
      li.addEventListener('pointerenter', on); li.addEventListener('pointerleave', off);
    });
  }

  /* ---------- Services: picture follows the cursor ---------- */
  const preview = $('[data-svc-preview]');
  if (preview && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const pimg = $('img', preview);
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const tick = () => {
      pos.x = lerp(pos.x, pos.tx, 0.18); pos.y = lerp(pos.y, pos.ty, 0.18);
      preview.style.setProperty('--px', pos.x.toFixed(1) + 'px');
      preview.style.setProperty('--py', pos.y.toFixed(1) + 'px');
      raf = Math.abs(pos.x - pos.tx) + Math.abs(pos.y - pos.ty) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    $$('[data-preview]').forEach((head) => {
      head.addEventListener('pointerenter', (e) => {
        if (head.getAttribute('aria-expanded') === 'true') return;
        pimg.src = head.dataset.preview;
        pos.tx = e.clientX + 28; pos.ty = e.clientY - 120;
        if (!preview.classList.contains('is-on')) { pos.x = pos.tx; pos.y = pos.ty; }
        preview.classList.add('is-on');
        if (!raf) raf = requestAnimationFrame(tick);
      });
      head.addEventListener('pointermove', (e) => {
        pos.tx = e.clientX + 28; pos.ty = e.clientY - 120;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      head.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
      head.addEventListener('click', () => preview.classList.remove('is-on'));
    });
  }

  /* ---------- Services page: ink nav scroll-spy ---------- */
  const inkNav = $('[data-ink-nav]');
  if (inkNav) {
    const links = $$('a[href^="#"]', inkNav);
    const targets = links.map((l) => document.getElementById(l.getAttribute('href').slice(1))).filter(Boolean);
    let current = null;
    const spy = () => {
      const line = window.innerHeight * 0.35;
      let idx = -1;
      targets.forEach((t, i) => { if (t.getBoundingClientRect().top < line) idx = i; });
      const last = targets[targets.length - 1];
      if (last && last.getBoundingClientRect().bottom < line * 0.5) idx = -1;
      if (idx === current) return;
      current = idx;
      links.forEach((l, i) => l.classList.toggle('is-active', i === idx));
      if (idx >= 0) {
        const a = links[idx], ul = a.closest('ul');
        ul.scrollTo({ left: a.offsetLeft - 16, behavior: isReduced() ? 'auto' : 'smooth' });
      }
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  /* ---------- "Обсудить" buttons pre-select the need in the brief form ---------- */
  $$('[data-need]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chip = document.querySelector(`#brief input[name="need"][value="${btn.dataset.need}"]`);
      if (chip) chip.checked = true;
    });
  });

  /* ---------- Portfolio: filters ---------- */
  const worksGrid = $('[data-works]');
  if (worksGrid) {
    const works = $$('.work', worksGrid);
    const btns = $$('.filters [data-filter]');
    const count = $('[data-filter-count]');
    const empty = $('[data-works-empty]');
    let busy = null;
    const apply = (key) => {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
      const match = (w) => key === 'all' || w.dataset.tags.split(' ').includes(key);
      const shown = works.filter(match);
      const swap = () => {
        works.forEach((w) => { w.hidden = !match(w); w.classList.remove('is-fading'); });
        worksGrid.classList.toggle('is-filtered', key !== 'all');
        shown.forEach((w, i) => {
          w.classList.remove('is-entering'); void w.offsetWidth;
          w.style.animationDelay = (i * 60) + 'ms'; w.classList.add('is-entering');
        });
        if (count) count.textContent = 'Показано проектов: ' + shown.length;
        if (empty) empty.hidden = shown.length > 0;
      };
      clearTimeout(busy);
      if (isReduced()) { swap(); return; }
      works.forEach((w) => { if (!w.hidden) w.classList.add('is-fading'); });
      busy = setTimeout(swap, 260);
    };
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
  }

  /* ---------- Portfolio: case dialog ---------- */
  const dialog = $('[data-case-dialog]');
  if (dialog && typeof dialog.showModal === 'function') {
    const content = $('[data-case-content]', dialog);
    let opener = null;
    const close = () => {
      if (!dialog.open) return;
      if (isReduced()) { dialog.close(); return; }
      dialog.classList.add('is-closing');
      setTimeout(() => { dialog.classList.remove('is-closing'); dialog.close(); }, 280);
    };
    dialog.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
      if (opener) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    $('[data-case-close]', dialog).addEventListener('click', close);
    $('[data-case-cta]', dialog).addEventListener('click', (e) => {
      e.preventDefault(); close();
      setTimeout(() => { const b = $('#brief'); b && b.scrollIntoView({ behavior: isReduced() ? 'auto' : 'smooth' }); }, 320);
    });
    $$('[data-case-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = btn.closest('.work').querySelector('template[data-case]');
        content.replaceChildren(tpl.content.cloneNode(true));
        opener = btn;
        dialog.showModal();
        document.body.classList.add('is-locked');
        $('.cd-sheet', dialog).scrollTop = 0;
      });
    });
  }

  /* ---------- Portfolio: before / after ---------- */
  $$('[data-compare]').forEach((box) => {
    const range = $('[data-compare-range]', box);
    const set = (v) => box.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    set(range.value);
  });

  /* ---------- Hero: rotating word ---------- */
  const rot = $('[data-rotator] .rotator-word');
  if (rot) {
    const words = rot.dataset.words.split('|');
    const box = rot.parentElement;
    let i = 0;
    const paint = (w) => {
      rot.innerHTML = '';
      Array.from(w).forEach((c, n) => {
        const span = document.createElement('span');
        span.className = 'ch'; span.style.setProperty('--i', n);
        span.textContent = c;
        rot.appendChild(span);
      });
    };
    const fitBox = () => { box.style.width = ''; const w = box.getBoundingClientRect().width; box.style.width = w + 'px'; };
    paint(words[0]); fitBox();
    if (!isReduced()) {
      setInterval(() => {
        if (document.hidden) return;
        rot.classList.add('is-out');
        setTimeout(() => {
          i = (i + 1) % words.length;
          rot.classList.remove('is-out');
          const old = box.getBoundingClientRect().width;
          box.style.width = 'auto'; paint(words[i]);
          const nw = box.getBoundingClientRect().width;
          box.style.width = old + 'px'; void box.offsetWidth; box.style.width = nw + 'px';
        }, 420);
      }, 2600);
      window.addEventListener('resize', fitBox);
    }
  }

  /* ---------- About: drag to scroll the timeline ---------- */
  $$('[data-drag-scroll]').forEach((el) => {
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = el.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; el.classList.add('is-dragging'); }
      el.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { down = false; el.classList.remove('is-dragging'); });
    el.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { el.scrollBy({ left: 300, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { el.scrollBy({ left: -300, behavior: 'smooth' }); e.preventDefault(); }
    });
  });

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach((b) => {
    b.addEventListener('click', async () => {
      const label = b.textContent;
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Скопировано'; }
      catch (_) { b.textContent = 'Не удалось, выделите вручную'; }
      b.classList.add('is-done');
      setTimeout(() => { b.textContent = label; b.classList.remove('is-done'); }, 1800);
    });
  });

  /* ---------- Documents: table of contents scroll-spy ---------- */
  const toc = $('[data-toc]');
  if (toc) {
    const tl = $$('a', toc);
    const secs = tl.map((l) => document.getElementById(l.getAttribute('href').slice(1)));
    const spyDoc = () => {
      let idx = 0;
      secs.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top < window.innerHeight * 0.3) idx = i; });
      tl.forEach((l, i) => l.classList.toggle('is-active', i === idx));
    };
    window.addEventListener('scroll', spyDoc, { passive: true });
    spyDoc();
  }

  /* ---------- Heading reveal ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !isReduced()) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Accordions (services, FAQ) ---------- */
  $$('[data-accordion]').forEach((group) => {
    $$('button[aria-controls]', group).forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const item = btn.parentElement;
      if (!panel) return;

      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        if (open) {
          panel.style.height = panel.scrollHeight + 'px';
          requestAnimationFrame(() => { panel.style.height = '0px'; });
          btn.setAttribute('aria-expanded', 'false');
          item.classList.remove('is-open');
          const done = () => { panel.hidden = true; panel.style.height = ''; };
          isReduced() ? done() : panel.addEventListener('transitionend', done, { once: true });
        } else {
          panel.hidden = false;
          panel.style.height = '0px';
          const h = panel.scrollHeight;
          requestAnimationFrame(() => { panel.style.height = h + 'px'; });
          btn.setAttribute('aria-expanded', 'true');
          item.classList.add('is-open');
          const done = () => { panel.style.height = ''; };
          isReduced() ? done() : panel.addEventListener('transitionend', done, { once: true });
        }
      });
    });
  });

  /* ---------- Process: each step adds an ink ---------- */
  const process = $('[data-process]');
  if (process) {
    const steps = $$('.step', process);
    const seps = $$('[data-sep]', process);
    const label = $('[data-proof-label]', process);
    const names = ['Плёнка Y: разбор', 'Плёнка M: стратегия', 'Плёнка C: запуск', 'Плёнка K: рост. Оттиск готов'];
    let active = -1;

    const setActive = (idx) => {
      if (idx === active) return;
      active = idx;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      seps.forEach((g, i) => g.classList.toggle('is-on', i <= idx));
      if (label) label.textContent = names[idx];
    };
    setActive(0);

    const update = () => {
      const line = window.innerHeight * (window.innerWidth > 960 ? 0.55 : 0.72);
      let idx = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < line) idx = i; });
      setActive(idx);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Cases: layers drift out of register, align at center ---------- */
  const cases = $$('[data-register-scroll]');
  if (cases.length && !isReduced()) {
    const layers = cases.map((c) => ({ el: c, ls: $$('[data-depth]', c).map((l) => ({ l, d: parseFloat(l.dataset.depth) })) }));
    let ticking = false;
    const run = () => {
      const vh = window.innerHeight;
      layers.forEach(({ el, ls }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const d = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1); // 0 = centered
        ls.forEach(({ l, d: depth }) => {
          l.style.transform = `translate3d(${(d * depth * 24).toFixed(2)}px, ${(d * depth * 50).toFixed(2)}px, 0)`;
        });
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    window.addEventListener('resize', run);
    run();
  }

  /* ---------- Forms: validation + success state ---------- */
  const ticketNo = $('[data-ticket-no]');
  if (ticketNo) ticketNo.textContent = String(Math.floor(Math.random() * 9000) + 1000);

  $$('[data-phone]').forEach((input) => {
    input.addEventListener('input', () => {
      let d = input.value.replace(/\D/g, '');
      if (!d) { input.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      let out = '+7';
      if (d.length > 1) out += ' ' + d.slice(1, 4);
      if (d.length > 4) out += ' ' + d.slice(4, 7);
      if (d.length > 7) out += '-' + d.slice(7, 9);
      if (d.length > 9) out += '-' + d.slice(9, 11);
      input.value = out;
    });
  });

  $$('[data-form]').forEach((form) => {
    const setError = (el, on) => {
      const wrap = el.closest('.field') || el.closest('.check');
      if (!wrap) return;
      wrap.classList.toggle('has-error', on);
      el.setAttribute('aria-invalid', on ? 'true' : 'false');
      const err = wrap.classList.contains('check') ? $('.consent-error', form) : $('.field-error', wrap);
      if (err) {
        err.hidden = !on;
        if (!err.id) err.id = 'err-' + Math.random().toString(36).slice(2, 8);
        on ? el.setAttribute('aria-describedby', err.id) : el.removeAttribute('aria-describedby');
      }
    };
    const valid = (el) => {
      if (el.type === 'checkbox') return el.checked;
      const v = el.value.trim();
      if (!v) return false;
      if (el.hasAttribute('data-phone')) return v.replace(/\D/g, '').length === 11;
      return true;
    };

    $$('[required]', form).forEach((el) => {
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => { if (el.dataset.touched) setError(el, !valid(el)); });
      el.addEventListener('input', () => { if (el.dataset.touched && valid(el)) setError(el, false); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      $$('[required]', form).forEach((el) => {
        el.dataset.touched = '1';
        const ok = valid(el);
        setError(el, !ok);
        if (!ok && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      const btn = $('button[type="submit"]', form);
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Отправляем…';

      /* Подключите отправку: fetch('/send.php', { method: 'POST', body: new FormData(form) })
         или бота Telegram / Google Sheets / CRM. Сейчас — демо-ответ. */
      setTimeout(() => {
        $$('.field, .field-pair, .check, .chips, .slip-head .slip-note', form).forEach((el) => { el.hidden = true; });
        btn.hidden = true; btn.disabled = false; btn.textContent = label;
        const ok = $('.form-success', form);
        ok.hidden = false;
        ok.setAttribute('tabindex', '-1'); ok.focus();
      }, 700);
    });
  });

  /* ---------- Cookie consent (152-ФЗ) ---------- */
  const KEY = 'privodka_cookie_consent';
  const banner = $('[data-cookie]');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) { /* storage blocked */ } }
  };

  function loadAnalytics() {
    if (window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;
    /* Вставьте сюда код Яндекс Метрики — он запустится только после согласия.
       (function(m,e,t,r,i,k,a){...})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
       ym(XXXXXXXX, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true }); */
  }
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
  }
  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    setTimeout(() => { banner.hidden = true; }, 700);
  }
  function decide(analytics) {
    store.set({ necessary: true, analytics, date: new Date().toISOString() });
    if (analytics) loadAnalytics();
    hideBanner();
  }

  const saved = store.get();
  if (saved) { if (saved.analytics) loadAnalytics(); }
  else setTimeout(showBanner, 1200);

  if (banner) {
    $('[data-cookie-accept]', banner).addEventListener('click', () => decide(true));
    $('[data-cookie-necessary]', banner).addEventListener('click', () => decide(false));
  }
  $$('[data-cookie-settings]').forEach((b) => b.addEventListener('click', showBanner));
})();
