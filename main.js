(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 820px)');

  let vw = innerWidth;
  let vh = innerHeight;
  let sy = scrollY;
  let ticking = false;

  /* ───────────── nav ───────────── */
  const nav = $('#nav');
  const toggle = $('.nav__toggle', nav);
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav__links a', nav).forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  /* ───────────── reveal on scroll ───────────── */
  const rvEls = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    // an element that is fully clip-pathed never reports as intersecting,
    // so clip reveals are watched through their parent instead
    const watched = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { watched.get(e.target).classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: .16, rootMargin: '0px 0px -6% 0px' });
    rvEls.forEach((el) => {
      const t = el.dataset.reveal === 'clip' ? el.parentElement : el;
      watched.set(t, el);
      io.observe(t);
    });
  } else {
    rvEls.forEach((el) => el.classList.add('in'));
  }

  /* ───────────── FAQ accordion ───────────── */
  $$('.qa button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.qa');
      const open = !item.classList.contains('is-open');
      $$('.qa.is-open').forEach((o) => {
        o.classList.remove('is-open');
        $('button', o).setAttribute('aria-expanded', 'false');
      });
      if (open) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ───────────── poster viewer ───────────── */
  const dlg = $('#lightbox');
  const dlgImg = $('.lightbox__img', dlg);
  const frames = $$('.flavour__frame');
  const canModal = typeof dlg.showModal === 'function';
  let current = 0;

  const showPoster = (i) => {
    current = (i + frames.length) % frames.length;
    const img = $('img', frames[current]);
    dlgImg.src = img.currentSrc || img.src;
    dlgImg.alt = img.alt;
  };
  frames.forEach((btn, i) => btn.addEventListener('click', () => {
    if (!canModal) { window.open($('img', btn).src, '_blank', 'noopener'); return; }
    showPoster(i);
    dlg.showModal();
    document.documentElement.classList.add('dialog-open');
  }));
  if (canModal) {
    dlg.addEventListener('close', () => {
      document.documentElement.classList.remove('dialog-open');
      frames[current].focus({ preventScroll: true });
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('.lightbox__close', dlg).addEventListener('click', () => dlg.close());
    $('.lightbox__nav--prev', dlg).addEventListener('click', () => showPoster(current - 1));
    $('.lightbox__nav--next', dlg).addEventListener('click', () => showPoster(current + 1));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showPoster(current - 1);
      if (e.key === 'ArrowRight') showPoster(current + 1);
    });
  }

  /* ───────────── floating fruit ───────────── */
  const NS = 'http://www.w3.org/2000/svg';
  const TYPES = ['f-orange', 'f-passion', 'f-lychee', 'f-pineapple', 'f-mint', 'f-petal', 'f-rose'];
  const makeFruit = (id) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('class', 'fruit');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  };

  // seeded so the layout is the same on every load
  const rand = (() => {
    let a = 20261025;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  // page-wide fruit: drifts upward at different speeds and wraps around
  const host = $('#fruitLayer');
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  const floaters = Array.from({ length: 12 }, (_, i) => {
    const el = makeFruit(TYPES[i % TYPES.length]);
    const s = 2 + rand() * 2.8;
    el.style.setProperty('--s', s + 'rem');
    host.appendChild(el);
    return {
      el, size: s,
      x: 2 + rand() * 96,
      y0: rand(),
      k: .1 + rand() * .42,
      r: (rand() - .5) * .14,
      flip: .0025 + rand() * .004,
      phase: i * 1.7,
    };
  });

  /* ───────────── cached elements ───────────── */
  const hero = $('#hero');
  const heroStage = $('#heroStage');
  const heroVideo = $('#heroVideo');
  const heroScroll = $('.hero__scroll');
  const mqStacked = matchMedia('(max-width: 980px)');

  const story = $('#story-art');
  const storyArt = $('.story__art', story);
  const storyL1 = $('.story__line--1', story);
  const storyL2 = $('.story__line--2', story);

  const chapters = $('#chapters');
  const scenes = $$('.scene', chapters);

  const flavoursSec = $('#flavours');

  const sip = $('#sip');
  const sipHead = $('.sip__head', sip);
  const track = $('#sipTrack');
  let sipTotal = 0;

  const cards = $$('.flavour');
  const cardOffsets = [{ y: 2, r: -1.2 }, { y: 5, r: 1.4 }, { y: 8, r: -1.6 }];

  const marquee = $('#marquee');

  /* ───────────── hero video, driven by scroll ─────────────
     aurello-hero-v2.mp4 never plays on its own: its time follows the scroll position, so the pour,
     the cans dropping in and the final lockup happen as you scroll, and scrolling back rewinds them.
       desktop (> 980px)  the hero is pinned for ~1.7 screens; progress through that pin sets the time
       phones / tablets   no pin: progress is how far the video frame has travelled up the screen
     The video runs from HERO_FROM (a first drop of juice) to HERO_TO (the lockup, just before it
     settles), and the displayed time eases toward the target so wheel steps don't stutter.
     Not tied to prefers-reduced-motion: nothing moves unless the visitor scrolls. The only up-front
     opt-out is data-saver (see the head script); if the file can't load the page keeps the still,
     which is the same picture as the video's last frame. */
  const HERO_FROM = 0.9;
  const HERO_TO = 7.8;
  const root = document.documentElement;
  let heroTarget = HERO_FROM;
  let heroShown = HERO_FROM;
  let heroRaf = 0;
  let heroReady = false;
  let heroSpan = 260;           // scroll distance that scrubs the whole video on phones (set in layout)

  const heroFallback = () => {
    cancelAnimationFrame(heroRaf);
    root.classList.remove('hero-scrub');
  };

  const heroStep = () => {
    heroRaf = 0;
    const d = heroTarget - heroShown;
    if (Math.abs(d) < .005) {
      heroShown = heroTarget;
      if (!heroVideo.seeking && Math.abs(heroVideo.currentTime - heroShown) > .008) heroVideo.currentTime = heroShown;
      return;
    }
    heroShown += d * .24;
    if (!heroVideo.seeking) heroVideo.currentTime = heroShown;   // one seek at a time keeps frames flowing
    heroRaf = requestAnimationFrame(heroStep);
  };
  const heroSeek = (t) => {
    heroTarget = t;
    if (heroReady && !heroRaf) heroRaf = requestAnimationFrame(heroStep);
  };

  if (heroVideo && root.classList.contains('hero-scrub')) {
    heroVideo.muted = true;
    const giveUp = setTimeout(heroFallback, 25000);

    const ready = () => {
      if (heroReady) return;
      heroReady = true;
      clearTimeout(giveUp);
      heroShown = heroTarget;
      heroVideo.currentTime = heroShown;
      // touch browsers (iOS) only start decoding frames after a first play(); do it silently once
      if (matchMedia('(pointer: coarse)').matches) {
        const p = heroVideo.play();
        const back = () => { heroVideo.pause(); heroVideo.currentTime = heroShown; };
        if (p && p.then) p.then(back).catch(() => {}); else back();
      }
      heroSeek(heroTarget);
    };
    heroVideo.addEventListener('loadeddata', ready, { once: true });
    heroVideo.addEventListener('error', () => { clearTimeout(giveUp); heroFallback(); }, { once: true });
    // the inline script under the <video> has already started the download (as a blob: URL where it can)
    Promise.resolve(window.__heroSrc || heroVideo.dataset.src).then((url) => {
      if (root.classList.contains('hero-scrub')) heroVideo.src = url;
    });
  }
  /* ───────────── layout ───────────── */
  function layout() {
    vw = innerWidth;
    vh = innerHeight;
    // fewer floating fruit on small screens
    floaters.forEach((f, i) => { f.el.style.display = narrow.matches && i >= 9 ? 'none' : ''; });
    // phones: the video is scrubbed over the scroll it takes for its frame to reach the nav
    if (mqStacked.matches) {
      const r = heroStage.getBoundingClientRect();
      heroSpan = Math.max(180, r.top + scrollY - nav.offsetHeight);
    }
    if (narrow.matches) {
      sip.style.height = '';
      track.style.removeProperty('--tx');
      sipTotal = 0;
    } else {
      sipTotal = Math.max(0, track.offsetWidth - vw);
      sip.style.height = vh + sipTotal + 'px';
    }
  }

  const pinProgress = (el) => {
    const r = el.getBoundingClientRect();
    const span = el.offsetHeight - vh;
    return span > 0 ? clamp(-r.top / span) : 0;
  };

  /* ───────────── per-frame work ───────────── */
  function update() {
    ticking = false;
    sy = scrollY;
    const r1 = rem();

    nav.classList.toggle('is-scrolled', sy > 40);

    /* hero: scroll progress sets the video's time (see "hero video, driven by scroll") */
    const hp = mqStacked.matches ? clamp(sy / heroSpan) : pinProgress(hero);
    if (root.classList.contains('hero-scrub')) heroSeek(lerp(HERO_FROM, HERO_TO, hp));
    heroScroll.style.opacity = String(1 - clamp(hp * 12));

    // the page-wide fruit stays out of the hero entirely: it fades in once the hero has gone,
    // and keeps clear of the story headline, the colour chapters and the posters
    const coverage = (el) => {
      const r = el.getBoundingClientRect();
      return clamp((Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh);
    };
    const quiet = Math.max(coverage(story), coverage(chapters), coverage(flavoursSec), coverage(sip));
    const heroGone = clamp((vh * .3 - hero.getBoundingClientRect().bottom) / (vh * .4) + 1);
    host.style.opacity = String(heroGone * (1 - clamp(quiet * 1.8)));
    if (!reduce) {
      floaters.forEach((f) => {
        const span = vh + f.size * r1 * 2;
        const raw = f.y0 * span - sy * f.k;
        const y = ((raw % span) + span) % span - f.size * r1;
        const flip = Math.sin(sy * f.flip + f.phase) * 52;
        f.el.style.transform = `translate3d(${f.x * vw / 100 - f.size * r1 / 2}px, ${y}px, 0) rotate(${sy * f.r}deg) rotateX(${flip}deg)`;
      });
    }

    /* story: headline slides across while the line art settles in */
    const sp = pinProgress(story);
    const fade = clamp(sp / .12);
    storyArt.style.setProperty('--o', String(fade * lerp(.3, 1, clamp((sp - .5) / .35))));
    storyArt.style.setProperty('--s', String(lerp(.82, 1.1, sp)));
    storyL1.style.setProperty('--x', `${lerp(vw * .96, -vw * .78, clamp(sp * 1.05))}px`);
    storyL2.style.setProperty('--x', `${lerp(vw * 1.25, -vw * .62, clamp(sp * 1.05))}px`);

    /* chapters: orange → lychee rose → pineapple mint */
    const cp = pinProgress(chapters);
    scenes[1].style.setProperty('--wipe', `${(1 - ease(clamp((cp - .26) / .2))) * 100}%`);
    scenes[2].style.setProperty('--wipe', `${(1 - ease(clamp((cp - .62) / .2))) * 100}%`);
    scenes[0].style.setProperty('--fr', `${(cp * 70).toFixed(1)}deg`);
    scenes[1].style.setProperty('--fr', `${((cp - .26) * 70).toFixed(1)}deg`);
    scenes[2].style.setProperty('--fr', `${((cp - .62) * 70).toFixed(1)}deg`);
    scenes[0].classList.toggle('on', cp > .03 && cp < .36);
    scenes[1].classList.toggle('on', cp > .34 && cp < .72);
    scenes[2].classList.toggle('on', cp > .7);

    /* horizontal serving rail */
    if (!narrow.matches) {
      const p = pinProgress(sip);
      track.style.setProperty('--tx', `${-sipTotal * p}px`);
      // the heading steps aside before the cards slide under it
      const hf = clamp(1 - p * 3);
      sipHead.style.opacity = hf.toFixed(3);
      sipHead.style.transform = `translate3d(${((1 - hf) * -2).toFixed(2)}rem, 0, 0)`;
    } else {
      sipHead.style.opacity = '';
      sipHead.style.transform = '';
    }

    /* flavour posters land from a staggered tilt */
    if (!narrow.matches) {
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const e = ease(clamp((vh * 1.02 - r.top) / (vh * .62)));
        const o = cardOffsets[i];
        c.style.setProperty('--fy', `${(1 - e) * o.y * r1 * 2.6}px`);
        c.style.setProperty('--fr', `${(1 - e) * o.r}deg`);
      });
    }

    /* marquee */
    const mr = marquee.getBoundingClientRect();
    const mp = clamp((vh - mr.top) / (vh + mr.height));
    marquee.style.setProperty('--mx', `${lerp(0, -vw * 1.15, mp)}px`);
    marquee.style.setProperty('--cut', `${lerp(100, 52, ease(clamp((mp - .2) / .5)))}%`);
  }

  const request = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  /* ───────────── events ───────────── */
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { layout(); request(); });
  narrow.addEventListener('change', () => { layout(); request(); });
  addEventListener('load', () => { layout(); request(); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); request(); });

  layout();
  update();
})();
