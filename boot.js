/* A short, lightweight startup. The portfolio controls when its content and scene are ready. */
export function createBootScreen({ name = 'Nutcracker', onEnter = () => {}, minimumDuration = 1100 } = {}) {
  const startedAt = performance.now();
  const duration = Math.max(0, Number(minimumDuration) || 0);
  const previousOverflow = document.body.style.overflow;
  const previouslyFocused = document.activeElement;
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
          <span class="boot-scroll-prompt"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Scroll down to enter</span>
          <button type="button" class="boot-enter">Enter portfolio<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </div>
      <aside class="boot-telemetry boot-telemetry-right" aria-hidden="true"><span class="boot-telemetry-heading">INTERFACE MAP</span><div class="boot-mini-map"><span></span><span></span><span></span></div><div class="boot-map-labels"><span>01 / INTRODUCTION</span><span>02 / PHOTOS</span><span>03 / MILESTONES</span><span>04 / SIDE QUESTS</span><span>05 / FUN FACTS</span></div></aside>
    </div>
    <footer class="boot-footer"><span><i></i> BUILT TO EXPLORE</span><span class="boot-footer-state">INITIALISING<span aria-hidden="true"> — NC/01</span></span></footer>
  `;
  document.body.append(screen);
  document.body.classList.add('boot-active');
  document.body.style.overflow = 'hidden';
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
  let exitTimer = 0;
  let touchStartY = null;

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
    enterButton.focus({ preventScroll: true });
  }

  function releaseScreen() {
    document.body.style.overflow = previousOverflow;
    document.body.classList.remove('boot-active');
    document.body.classList.add('boot-done');
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected && !previouslyFocused.closest('[inert]')) {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function enter() {
    if (!ready || entered || destroyed) return;
    entered = true;
    screen.classList.add('is-leaving');
    // Restore the page and resume its scene together, after the short fade.
    exitTimer = window.setTimeout(() => {
      if (destroyed) return;
      screen.remove();
      releaseScreen();
      onEnter();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
  }

  function onWheel(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (ready && event.deltaY > 8) enter();
  }
  function onTouchStart(event) {
    touchStartY = event.touches[0]?.clientY ?? null;
  }
  function onTouchMove(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (ready && touchStartY !== null && event.touches[0] && touchStartY - event.touches[0].clientY > 28) enter();
  }
  function onKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Enter'].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (ready && ['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) enter();
    } else if (event.key === 'Tab' && !ready) {
      event.preventDefault();
    } else if (event.key === 'Tab' && ready) {
      // The startup is a dialog with one action; keep focus inside until entered.
      event.preventDefault();
      enterButton.focus();
    }
  }
  function onCancel(event) {
    // Escape must not remove the startup while leaving the page locked.
    event.preventDefault();
  }
  screen.addEventListener('wheel', onWheel, { passive: false });
  screen.addEventListener('touchstart', onTouchStart, { passive: true });
  screen.addEventListener('touchmove', onTouchMove, { passive: false });
  screen.addEventListener('keydown', onKeyDown);
  screen.addEventListener('cancel', onCancel);
  enterButton.addEventListener('click', enter);
  setName(name);
  screen.showModal();
  screen.focus({ preventScroll: true });

  return {
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
      clearTimeout(exitTimer);
      screen.removeEventListener('wheel', onWheel);
      screen.removeEventListener('touchstart', onTouchStart);
      screen.removeEventListener('touchmove', onTouchMove);
      screen.removeEventListener('keydown', onKeyDown);
      screen.removeEventListener('cancel', onCancel);
      enterButton.removeEventListener('click', enter);
      if (screen.isConnected) {
        screen.remove();
        releaseScreen();
      }
    }
  };
}
