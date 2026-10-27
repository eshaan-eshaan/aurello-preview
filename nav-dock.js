/* AURELLO — navigation dock
   Vanilla port of ThreeUI <AnimatedTopDock variant="modern" /> (the "Command Bar"),
   source revision 5a736cd3c1f6f19802f61ebb10e1701b9f7aa26e.

   createTopDockController() is topDockController.ts (SHA-256 506ab23d…) with the
   types removed. The spring, the proximity field, the pointer / focus / keyboard
   handling and the measuring are the authored code. The three site changes are
   marked "AURELLO:". The "modern" variant is plain DOM + CSS: the WebGL / Three.js
   r128 code in the package belongs to the "retro" and "glass" variants only, and is
   not used here. */
(() => {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function createTopDockController(root, getOptions) {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const precisionQuery = window.matchMedia('(hover:hover) and (pointer:fine)');
    /* AURELLO: the authored gate is `innerWidth > 600`. The site swaps the dock for a
       menu sheet at 980px, so the spring has to switch off at the same width. */
    const wideQuery = window.matchMedia(`(min-width: ${getOptions().minWidth + 1}px)`);
    const items = Array.from(root.querySelectorAll('[data-dock-item]')).map((element) => ({
      element,
      baseWidth: 0,
      baseHeight: 0,
      value: 0,
      velocity: 0,
      target: 0,
    }));

    let enabled = false;
    let pointerActive = false;
    let dirty = false;
    let frame = 0;

    const canAnimate = () => !reducedQuery.matches && root.clientWidth > 0 && wideQuery.matches && precisionQuery.matches;

    const measure = () => {
      enabled = canAnimate();
      /* released first, so the rest width is measured against the track's own
         content rather than against the width the last measurement pinned.
         AURELLO: released unconditionally, because below the breakpoint the track
         is a menu sheet and must never keep a width pinned on desktop. */
      root.style.width = '';
      for (const state of items) {
        state.element.style.width = '';
        state.element.style.height = '';
        state.element.style.transform = '';
        state.element.dataset.dockNear = 'false';
      }
      for (const state of items) {
        const rect = state.element.getBoundingClientRect();
        state.baseWidth = rect.width;
        state.baseHeight = rect.height;
        state.value = 0;
        state.velocity = 0;
        state.target = 0;
      }
      pointerActive = false;
      dirty = false;
      /* a distributed strip has to fill its track even when the spring never runs
         — reduced motion, a coarse pointer, or a narrow viewport */
      if (getOptions().distribute) applyLayout();
      if (getOptions().lockTrack) root.style.width = `${root.getBoundingClientRect().width.toFixed(2)}px`;
      root.dataset.dockState = enabled ? 'idle' : 'static';
      root.dataset.dockMax = '0.00';
    };

    const setTargets = (clientX, clientY) => {
      if (!enabled) return;
      const options = getOptions();
      const vertical = options.axis === 'y';
      const pointer = vertical ? clientY : clientX;
      const rects = items.map((state) => state.element.getBoundingClientRect());
      for (let index = 0; index < items.length; index += 1) {
        const rect = rects[index];
        const center = vertical ? rect.top + rect.height * 0.5 : rect.left + rect.width * 0.5;
        const proximity = clamp(1 - Math.abs(pointer - center) / Math.max(1, options.proximity), 0, 1);
        const influence = proximity * proximity * (3 - 2 * proximity);
        items[index].target = influence;
        items[index].element.dataset.dockNear = influence > 0.08 ? 'true' : 'false';
      }
      pointerActive = true;
      dirty = true;
      root.dataset.dockState = 'active';
    };

    const focusItem = (item) => {
      if (!enabled) return;
      const index = items.findIndex((state) => state.element === item);
      if (index < 0) return;
      items.forEach((state, itemIndex) => {
        state.target = itemIndex === index ? 1 : Math.abs(itemIndex - index) === 1 ? 0.24 : 0;
        state.element.dataset.dockNear = state.target > 0.08 ? 'true' : 'false';
      });
      pointerActive = false;
      dirty = true;
      root.dataset.dockState = 'focus';
    };

    const reset = () => {
      pointerActive = false;
      dirty = true;
      items.forEach((state) => {
        state.target = 0;
        state.element.dataset.dockNear = 'false';
      });
    };

    /* the only place item geometry is written, so the three fits stay one
       behaviour with three ways of spending the same spring value */
    const applyLayout = () => {
      const options = getOptions();
      if (options.distribute && options.axis !== 'y') {
        const weights = items.map((state) => state.baseWidth + options.widthGrowth * clamp(state.value, 0, 1.08));
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        const natural = items.reduce((sum, state) => sum + state.baseWidth, 0);
        /* squeezed below its own natural width the strip would clip every label,
           so it stops filling the track rather than crushing the cells */
        const track = root.clientWidth >= natural ? root.clientWidth : 0;
        items.forEach((state, index) => {
          state.element.style.width = track ? `${(track * weights[index] / total).toFixed(2)}px` : '';
          state.element.style.height = '';
          state.element.style.transform = '';
        });
        return;
      }
      for (const state of items) {
        const value = clamp(state.value, 0, 1.08);
        if (options.axis === 'y') {
          state.element.style.width = '';
          state.element.style.height = `${(state.baseHeight + options.heightGrowth * value).toFixed(2)}px`;
          state.element.style.transform = `translateX(${(value * options.drop).toFixed(2)}px)`;
          continue;
        }
        const isLogo = state.element.classList.contains('animated-top-dock__logo');
        const extraWidth = isLogo ? options.widthGrowth * (14 / 17) : Math.min(options.widthGrowth, state.baseWidth * 0.24);
        const extraHeight = isLogo ? options.heightGrowth * (14 / 16) : options.heightGrowth;
        state.element.style.width = `${(state.baseWidth + extraWidth * value).toFixed(2)}px`;
        state.element.style.height = `${(state.baseHeight + extraHeight * value).toFixed(2)}px`;
        state.element.style.transform = `translateY(${(value * options.drop).toFixed(2)}px)`;
      }
    };

    const draw = () => {
      if (enabled && dirty) {
        const options = getOptions();
        let moving = false;
        let maxValue = 0;
        for (const state of items) {
          state.velocity += (state.target - state.value) * options.spring;
          state.velocity *= options.damping;
          state.value += state.velocity;
          if (Math.abs(state.target - state.value) < 0.001 && Math.abs(state.velocity) < 0.001) {
            state.value = state.target;
            state.velocity = 0;
          } else {
            moving = true;
          }
          maxValue = Math.max(maxValue, clamp(state.value, 0, 1.08));
        }
        applyLayout();
        root.dataset.dockMax = maxValue.toFixed(2);
        if (!moving) {
          dirty = false;
          if (items.every((state) => state.target === 0)) root.dataset.dockState = 'idle';
        }
      }
      frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => setTargets(event.clientX, event.clientY);
    const onWindowPointerMove = (event) => {
      if (!pointerActive) return;
      const rootRect = root.getBoundingClientRect();
      const itemRects = items.map((state) => state.element.getBoundingClientRect());
      const bottom = Math.max(rootRect.bottom, ...itemRects.map((rect) => rect.bottom));
      const outside = event.clientX < rootRect.left || event.clientX > rootRect.right || event.clientY < rootRect.top || event.clientY > bottom;
      if (outside) reset();
    };
    const onFocusIn = (event) => {
      const item = event.target && event.target.closest ? event.target.closest('[data-dock-item]') : null;
      if (item) focusItem(item);
    };
    const onFocusOut = () => requestAnimationFrame(() => {
      if (!root.contains(document.activeElement)) reset();
    });
    const onKeyDown = (event) => {
      const item = event.target && event.target.closest ? event.target.closest('[data-dock-item]') : null;
      if (item && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        item.click();
      }
    };
    const onClick = () => reset();

    /* the spring writes an explicit pixel width onto every item, so the base
       measurement has to happen after the label font is available — measured
       against a fallback face, a variant with auto-width items locks in a box its
       own text then overflows */
    let released = false;
    const remeasure = () => { if (!released) measure(); };
    if (document.fonts) {
      document.fonts.ready.then(remeasure);
      /* AURELLO: the page's fonts come from Google Fonts and can land after
         `fonts.ready` has already resolved, so measure again whenever a face finishes */
      document.fonts.addEventListener('loadingdone', remeasure);
    }

    /* re-measuring on the parent works for a dock inside a fixed bar, but a rail
       whose height follows its own items would resize its parent as it grows and
       cancel the spring on the next frame. A shell can opt out of that feedback
       loop by marking a box the dock cannot resize. */
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root.closest('[data-dock-frame]') || root.parentElement || root);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', reset);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    root.addEventListener('keydown', onKeyDown);
    root.addEventListener('click', onClick);
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
    reducedQuery.addEventListener('change', measure);
    precisionQuery.addEventListener('change', measure);
    wideQuery.addEventListener('change', measure);
    measure();
    frame = requestAnimationFrame(draw);

    return () => {
      released = true;
      root.style.width = '';
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      if (document.fonts) document.fonts.removeEventListener('loadingdone', remeasure);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', reset);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('click', onClick);
      window.removeEventListener('pointermove', onWindowPointerMove);
      reducedQuery.removeEventListener('change', measure);
      precisionQuery.removeEventListener('change', measure);
      wideQuery.removeEventListener('change', measure);
    };
  }

  /* ───────────── site wiring ───────────── */

  const root = document.getElementById('menu');
  if (!root || !('ResizeObserver' in window)) return;

  /* the site's menu-sheet breakpoint; the CSS uses the same 980px */
  const MENU_BREAKPOINT = 980;
  const wide = window.matchMedia(`(min-width: ${MENU_BREAKPOINT + 1}px)`);

  /* the props from the configured usage:
     <AnimatedTopDock variant="modern" proximity={122} spring={0.19} damping={0.70}
                      widthGrowth={17} heightGrowth={16} drop={3.5} /> */
  createTopDockController(root, () => ({
    proximity: 122,
    spring: 0.19,
    damping: 0.7,
    widthGrowth: 17,
    heightGrowth: 16,
    drop: 3.5,
    axis: 'x',
    distribute: false,
    lockTrack: wide.matches,
    minWidth: MENU_BREAKPOINT,
  }));

  /* The authored dock marks the last item clicked (aria-pressed). These are links,
     so the mark is aria-current and also follows the section on screen. */
  const links = Array.from(root.querySelectorAll('[data-dock-item]'));
  const sections = links.map((link) => document.querySelector(link.getAttribute('href')));
  let current = null;
  let pinned = null;
  let idle = 0;
  let ticking = false;

  const setCurrent = (link) => {
    if (link === current) return;
    current = link;
    links.forEach((item) => {
      if (item === link) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  };

  /* the last section whose top has passed 40% of the screen, while it still covers that line */
  const follow = () => {
    const line = window.innerHeight * 0.4;
    let found = null;
    sections.forEach((section, index) => {
      if (!section) return;
      const box = section.getBoundingClientRect();
      if (box.top <= line && box.bottom > line) found = links[index];
    });
    setCurrent(found);
  };

  /* a click owns the mark until the smooth scroll it started has come to rest */
  const settle = (ms) => {
    clearTimeout(idle);
    idle = setTimeout(() => { pinned = null; follow(); }, ms);
  };

  links.forEach((link) => link.addEventListener('click', () => {
    pinned = link;
    setCurrent(link);
    settle(900);
  }));

  window.addEventListener('scroll', () => {
    if (pinned) { settle(180); return; }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; follow(); });
  }, { passive: true });
  window.addEventListener('resize', follow);
  follow();
})();
