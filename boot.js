/* Startup and the portfolio share one scene and one native scrolling journey. */
export function createBootScreen({ name = 'Nutcracker', onEnter = () => {}, onProgress = () => {}, minimumDuration = 1100 } = {}) {
  const startedAt = performance.now();
  const duration = Math.max(0, Number(minimumDuration) || 0);
  const previousOverflow = document.body.style.overflow;
  const previousOverflowAnchor = document.body.style.overflowAnchor;
  const previousProgress = document.body.style.getPropertyValue('--boot-progress');
  const previousScrollRestoration = history.scrollRestoration;
  const previouslyFocused = document.activeElement;
  const spacer = document.createElement('div');
  spacer.id = 'startup-stage';
  spacer.setAttribute('aria-hidden', 'true');
  document.body.prepend(spacer);
  const screen = document.createElement('dialog');
  screen.className = 'nut-boot';
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-label', 'Portfolio startup');
  screen.tabIndex = -1;
  screen.innerHTML = `
    <div class="boot-grid" aria-hidden="true"></div>
    <header class="boot-topline">
      <div class="boot-signature"><span class="boot-monogram" aria-hidden="true">N<span>·</span></span><span>PERSONAL INTERFACE<small>PORTFOLIO / 01</small></span></div>
      <span class="boot-connection"><span></span> CONNECTION ESTABLISHED</span>
    </header>
    <div class="boot-layout">
      <aside class="boot-telemetry boot-telemetry-left" aria-hidden="true">
        <span class="boot-telemetry-heading">STARTUP SEQUENCE</span>
        <div class="boot-check" data-check="content"><span>01</span><div>Personal archive<small>Loading content</small></div><i></i></div>
        <div class="boot-check" data-check="scene"><span>02</span><div>Spatial interface<small>Preparing models</small></div><i></i></div>
        <div class="boot-check" data-check="ready"><span>03</span><div>Ready to explore<small>Waiting for startup</small></div><i></i></div>
        <div class="boot-coordinate">NC — PERSONAL SPACE<br>BLUE CHANNEL / ACTIVE</div>
      </aside>
      <div class="boot-center">
        <div class="boot-core">
          <svg class="boot-hud" viewBox="0 0 500 500" fill="none" aria-hidden="true">
            <defs><linearGradient id="boot-ring-light" x1="50" y1="50" x2="430" y2="430" gradientUnits="userSpaceOnUse"><stop stop-color="#b4e9ff"/><stop offset=".5" stop-color="#4788b6"/><stop offset="1" stop-color="#a3dbfb"/></linearGradient></defs>
            <circle class="boot-orbit-static" cx="250" cy="250" r="226"/>
            <g class="boot-orbit-a"><circle cx="250" cy="250" r="213" stroke="url(#boot-ring-light)" stroke-width="2" stroke-dasharray="170 35 20 65 280 95 25 30 105 500"/><circle cx="250" cy="37" r="3" fill="#c1eaff"/></g>
            <g class="boot-orbit-b"><circle cx="250" cy="250" r="197" stroke="#90cbec" stroke-width="1" stroke-dasharray="1 12"/><path d="M53 250a197 197 0 0 1 197-197M447 250a197 197 0 0 1-197 197" stroke="#a4d5f2" stroke-width="3"/></g>
            <circle cx="250" cy="250" r="177" stroke="#91bbdc" stroke-opacity=".17"/>
            <path d="M250 8v13M250 479v13M8 250h13M479 250h13" stroke="#bce6ff" stroke-opacity=".7"/>
            <path d="M79 111V79h32M389 79h32v32M421 389v32h-32M111 421H79v-32" stroke="#75b8e9" stroke-opacity=".65"/>
            <path d="M126 141h30M344 141h30M126 359h30M344 359h30" stroke="#81bfe9" stroke-opacity=".25"/>
            <path d="M234 89h32M234 411h32" stroke="#c4e8ff" stroke-width="2"/>
          </svg>
          <div class="boot-core-copy">
            <span class="boot-core-eyebrow">WELCOME TO</span>
            <h1 class="boot-name"></h1>
            <span class="boot-core-subtitle">MY LITTLE UNIVERSE</span>
            <div class="boot-bootline" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          </div>
        </div>
        <p class="boot-status" role="status" aria-live="polite">Starting up<span aria-hidden="true">...</span></p>
        <div class="boot-entry" hidden>
          <button type="button" class="boot-enter" aria-label="Enter portfolio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 6 6 6-6"/><path d="m6 12 6 6 6-6"/></svg><span>Scroll down to enter</span></button>
        </div>
      </div>
      <aside class="boot-telemetry boot-telemetry-right" aria-hidden="true"><span class="boot-telemetry-heading">INTERFACE MAP</span><div class="boot-mini-map"><span></span><span></span><span></span></div><div class="boot-map-labels"><span>01 / INTRODUCTION</span><span>02 / PHOTOS</span><span>03 / MILESTONES</span><span>04 / SIDE QUESTS</span><span>05 / FUN FACTS</span></div></aside>
    </div>
    <footer class="boot-footer"><span><i></i> BUILT TO EXPLORE</span><span class="boot-footer-state">INITIALISING<span aria-hidden="true"> — NC/01</span></span></footer>
  `;
  document.body.append(screen);
  document.body.classList.add('boot-active');
  document.body.style.overflow = 'hidden';
  document.body.style.overflowAnchor = 'none';
  document.body.style.setProperty('--boot-progress', '0');
  history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const nameNode = screen.querySelector('.boot-name');
  const status = screen.querySelector('.boot-status');
  const entry = screen.querySelector('.boot-entry');
  const enterButton = screen.querySelector('.boot-enter');
  const footerState = screen.querySelector('.boot-footer-state');
  let sceneReady = false;
  let contentReady = false;
  let ready = false;
  let entered = false;
  let destroyed = false;
  let readinessTimer = 0;
  let scrollFrame = 0;
  let distance = 0;
  let lastProgress = -1;
  const backgroundInert = new Map();

  function protectBackground() {
    for (const node of document.body.children) {
      if (!(node instanceof HTMLElement) || node === screen || node === spacer ||
          node.matches('.scene-wrap, .world-backdrop, script, style, link, noscript') || backgroundInert.has(node)) continue;
      backgroundInert.set(node, node.inert);
      node.inert = true;
    }
  }
  const backgroundObserver = new MutationObserver(() => {
    if (!destroyed && !entered) protectBackground();
  });
  protectBackground();
  backgroundObserver.observe(document.body, { childList: true });

  function setName(nextName) {
    const cleanName = String(nextName || 'Nutcracker').trim() || 'Nutcracker';
    nameNode.textContent = cleanName;
    nameNode.classList.toggle('boot-name-long', cleanName.length > 13);
  }

  function markCheck(key, text) {
    const check = screen.querySelector(`[data-check="${key}"]`);
    check.classList.add('is-complete');
    check.querySelector('small').textContent = text;
  }

  function maybeReady() {
    if (destroyed || entered || ready) return;
    const completed = Number(contentReady) + Number(sceneReady);
    screen.style.setProperty('--boot-completed', completed);
    if (!sceneReady || !contentReady) {
      status.textContent = contentReady ? 'Preparing the 3D scene...' : sceneReady ? 'Loading your portfolio...' : 'Starting up...';
      return;
    }
    const remaining = duration - (performance.now() - startedAt);
    if (remaining > 0) {
      clearTimeout(readinessTimer);
      status.textContent = 'Bringing everything together...';
      readinessTimer = window.setTimeout(maybeReady, remaining);
      return;
    }
    ready = true;
    screen.dataset.startupMs = String(Math.round(performance.now() - startedAt));
    markCheck('ready', 'All systems ready');
    screen.classList.add('is-ready');
    status.textContent = 'Ready when you are.';
    footerState.textContent = 'SYSTEM ONLINE — NC/01';
    entry.hidden = false;
    // Only the real loading phase is modal. From here the browser owns scrolling.
    screen.close();
    screen.show();
    screen.setAttribute('aria-modal', 'false');
    document.body.style.overflow = previousOverflow;
    screen.removeEventListener('wheel', onLoadingWheel);
    screen.removeEventListener('touchmove', onLoadingTouchMove);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    distance = measureDistance();
    applyProgress(0);
    enterButton.focus({ preventScroll: true });
  }

  function restorePage() {
    document.body.style.overflow = previousOverflow;
    document.body.style.overflowAnchor = previousOverflowAnchor;
    if (previousProgress) document.body.style.setProperty('--boot-progress', previousProgress);
    else document.body.style.removeProperty('--boot-progress');
    history.scrollRestoration = previousScrollRestoration;
    document.body.classList.remove('boot-active', 'boot-exiting');
    document.body.classList.add('boot-done');
    backgroundObserver.disconnect();
    for (const [node, previousInert] of backgroundInert) node.inert = previousInert;
    backgroundInert.clear();
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected && !previouslyFocused.closest('[inert]')) {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('no-motion') || document.body.classList.contains('no-motion');
  }

  function measureDistance() {
    return Math.max(1, spacer.getBoundingClientRect().height || window.innerHeight);
  }

  function applyProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    const value = p.toFixed(5);
    document.body.style.setProperty('--boot-progress', value);
    screen.style.setProperty('--boot-progress', value);
    screen.dataset.progress = value;
    document.body.classList.toggle('boot-exiting', p > 0);
    if (Math.abs(p - lastProgress) > .00001) {
      lastProgress = p;
      onProgress(p);
    }
  }

  function removeListeners() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    window.removeEventListener('scroll', onNativeScroll);
    window.removeEventListener('resize', onResize);
    screen.removeEventListener('wheel', onLoadingWheel);
    screen.removeEventListener('touchmove', onLoadingTouchMove);
    screen.removeEventListener('keydown', onKeyDown);
    screen.removeEventListener('cancel', onCancel);
    enterButton.removeEventListener('click', requestEntry);
  }

  function finish() {
    if (!ready || entered || destroyed) return;
    entered = true;
    const oldScrollY = window.scrollY;
    const removedHeight = distance || measureDistance();
    applyProgress(1);
    removeListeners();
    screen.remove();
    spacer.remove();
    // Keep the portfolio at the same visual position after removing the startup section.
    window.scrollTo({ top: Math.max(0, oldScrollY - removedHeight), left: 0, behavior: 'instant' });
    restorePage();
    onEnter();
  }

  function requestEntry() {
    if (!ready || entered || destroyed) return;
    if (reducedMotion()) {
      finish();
      return;
    }
    distance = measureDistance();
    window.scrollTo({ top: distance, left: 0, behavior: 'smooth' });
  }

  function updateScrollProgress() {
    scrollFrame = 0;
    if (!ready || entered || destroyed) return;
    distance = measureDistance();
    const p = Math.max(0, Math.min(1, window.scrollY / distance));
    applyProgress(p);
    if (p >= 1) finish();
  }

  function onNativeScroll() {
    if (entered || destroyed) return;
    if (!ready) {
      if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollProgress);
  }

  function onResize() {
    if (ready && !entered && !destroyed && !scrollFrame) scrollFrame = requestAnimationFrame(updateScrollProgress);
  }

  function onLoadingWheel(event) {
    if (ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function onLoadingTouchMove(event) {
    if (ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function onKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Enter'].includes(event.key)) {
      event.stopImmediatePropagation();
      if (!ready) event.preventDefault();
      else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        requestEntry();
      }
      // Arrow and page keys retain their native, reversible scrolling behavior.
    } else if (event.key === 'Tab') {
      event.preventDefault();
      if (ready) enterButton.focus({ preventScroll: true });
    }
  }
  function onCancel(event) {
    // Escape must not remove the startup while leaving the page locked.
    event.preventDefault();
  }
  screen.addEventListener('wheel', onLoadingWheel, { passive: false });
  screen.addEventListener('touchmove', onLoadingTouchMove, { passive: false });
  screen.addEventListener('keydown', onKeyDown);
  screen.addEventListener('cancel', onCancel);
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  enterButton.addEventListener('click', requestEntry);
  setName(name);
  screen.showModal();
  screen.focus({ preventScroll: true });

  return {
    get finished() { return entered; },
    markSceneReady() {
      if (destroyed || sceneReady) return;
      sceneReady = true;
      markCheck('scene', 'Models ready');
      maybeReady();
    },
    markContentReady() {
      if (destroyed || contentReady) return;
      contentReady = true;
      markCheck('content', 'Archive ready');
      maybeReady();
    },
    setName,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(readinessTimer);
      removeListeners();
      if (!entered) {
        const oldScrollY = window.scrollY;
        const removedHeight = distance || measureDistance();
        screen.remove();
        spacer.remove();
        window.scrollTo({ top: Math.max(0, oldScrollY - removedHeight), left: 0, behavior: 'instant' });
        restorePage();
      }
    }
  };
}
