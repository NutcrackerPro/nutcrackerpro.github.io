'use strict';
(() => {
  const grid = document.getElementById('journal-grid');
  const empty = document.getElementById('journal-empty');
  const dialog = document.getElementById('entry-dialog');
  const status = document.getElementById('journal-status');
  let entries = [];
  let visibleEntries = [];
  let filter = 'all';
  let currentIndex = 0;
  let lastTrigger = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = 'IntersectionObserver' in window && !reducedMotion ? new IntersectionObserver(records => {
    records.forEach(record => { if (record.isIntersecting) { record.target.classList.add('visible'); observer.unobserve(record.target); } });
  }, { threshold: 0.08 }) : null;
  const text = value => typeof value === 'string' ? value.trim() : '';
  function node(tag, className, value) { const n = document.createElement(tag); if (className) n.className = className; if (value !== undefined) n.textContent = value; return n; }
  function imageSource(value) {
    value = text(value); if (!value) return '';
    if (/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return value;
    try { const url = new URL(value, document.baseURI); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  function safeEntry(value, index) {
    return { type: value.type === 'travel' ? 'travel' : 'artwork', title: text(value.title) || 'Untitled', date: text(value.date), location: text(value.location), description: text(value.description), image: imageSource(value.image), imageAlt: text(value.imageAlt), order: index + 1 };
  }
  function render() {
    observer?.disconnect();
    visibleEntries = entries.filter(entry => filter === 'all' || entry.type === filter);
    grid.replaceChildren(); empty.hidden = visibleEntries.length !== 0;
    const label = filter === 'travel' ? 'travel notes' : filter === 'artwork' ? 'artworks' : 'pieces';
    document.getElementById('collection-count').textContent = `${String(visibleEntries.length).padStart(2, '0')} ${label} in the collection`;
    document.getElementById('empty-title').textContent = filter === 'travel' ? 'The next adventure starts here.' : 'A little space for what’s next.';
    document.getElementById('empty-message').textContent = filter === 'travel' ? 'No travel notes yet. New places will find their way into this notebook.' : 'Nothing here yet. Come back for the next addition.';
    visibleEntries.forEach((entry, index) => {
      const card = node('article', 'journal-card');
      const open = node('button', 'card-open'); open.type = 'button'; open.setAttribute('aria-label', `Open ${entry.title}`);
      if (entry.image) {
        const photo = node('div', 'card-photo');
        const img = node('img'); img.src = entry.image; img.alt = entry.imageAlt || entry.title; img.loading = 'lazy'; img.decoding = 'async'; img.width = 600; img.height = 500;
        const bottom = node('div', 'photo-bottom'); bottom.append(node('span', '', entry.location || (entry.type === 'travel' ? 'A place to remember' : 'From my collection')), node('span', '', `No. ${String(entry.order).padStart(2, '0')}`));
        photo.append(img, bottom); open.append(photo);
        img.addEventListener('error', () => { photo.replaceChildren(noteArt(entry)); });
      } else open.append(noteArt(entry));
      const meta = node('p', 'card-meta'); meta.append(node('span', 'card-type', entry.type === 'travel' ? 'Places & travel' : 'Artwork')); if (entry.date) meta.append(node('span', 'meta-date', entry.date));
      open.append(meta, node('h3', 'card-title', entry.title)); if (entry.location) open.append(node('p', 'card-location', entry.location)); if (entry.description) open.append(node('p', 'card-note', entry.description));
      open.addEventListener('click', () => { lastTrigger = open; showEntry(index); if (!dialog.open) dialog.showModal(); document.body.classList.add('dialog-open'); });
      card.append(open); grid.append(card); if (observer) observer.observe(card); else card.classList.add('visible');
    });
  }
  function noteArt(entry) { const art = node('div', 'note-art'); art.append(node('span', '', '✳\uFE0E'), node('p', '', entry.type === 'travel' ? 'Notes from elsewhere.' : 'A little creative note.')); return art; }
  function showEntry(index) {
    currentIndex = index; const entry = visibleEntries[index]; if (!entry) return;
    document.getElementById('entry-number').textContent = `From the collection / No. ${String(entry.order).padStart(2, '0')}`;
    document.getElementById('entry-type').textContent = entry.type === 'travel' ? 'Places & travel' : 'Artwork';
    document.getElementById('entry-title').textContent = entry.title;
    document.getElementById('entry-meta').textContent = [entry.location, entry.date].filter(Boolean).join('\n');
    document.getElementById('entry-description').textContent = entry.description;
    const image = document.getElementById('entry-image'); const noImage = document.getElementById('entry-no-image');
    image.hidden = !entry.image; noImage.hidden = !!entry.image; if (entry.image) { image.src = entry.image; image.alt = entry.imageAlt || entry.title; } else image.removeAttribute('src');
    image.onerror = () => { image.hidden = true; noImage.hidden = false; };
    const link = document.getElementById('open-image'); link.hidden = !entry.image || entry.image.startsWith('data:'); if (entry.image && !entry.image.startsWith('data:')) link.href = entry.image; else link.removeAttribute('href');
    document.getElementById('viewer-position').textContent = `${index + 1} / ${visibleEntries.length}`;
    document.getElementById('previous-entry').disabled = index === 0;
    document.getElementById('next-entry').disabled = index === visibleEntries.length - 1;
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); render();
  }));
  document.getElementById('close-entry').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); lastTrigger?.focus({ preventScroll: true }); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  document.getElementById('previous-entry').addEventListener('click', () => { if (currentIndex > 0) showEntry(currentIndex - 1); });
  document.getElementById('next-entry').addEventListener('click', () => { if (currentIndex < visibleEntries.length - 1) showEntry(currentIndex + 1); });
  dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' && currentIndex > 0) { event.preventDefault(); showEntry(currentIndex - 1); } if (event.key === 'ArrowRight' && currentIndex < visibleEntries.length - 1) { event.preventDefault(); showEntry(currentIndex + 1); } });
  async function load() {
    try {
      const response = await fetch('portfolio.json?v=20261007-refine2', { cache: 'no-cache' }); if (!response.ok) throw new Error('The collection could not be loaded.');
      const data = await response.json(); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The collection has an invalid format.');
      if (text(data.journalTitle)) document.getElementById('journal-title').textContent = text(data.journalTitle);
      if (text(data.journalIntro)) document.getElementById('journal-intro').textContent = text(data.journalIntro);
      const items = Array.isArray(data.journalEntries) ? data.journalEntries.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
      entries = items.map(safeEntry);
      if (!entries.length && imageSource(data.heroImage)) entries = [safeEntry({ type: 'artwork', title: text(data.artCaption) || 'From my collection', image: data.heroImage, imageAlt: data.heroImageAlt }, 0)];
      const cover = document.getElementById('journal-cover'); cover.addEventListener('error', () => { cover.src = 'nutcracker.jpeg?v=2'; }, { once: true }); cover.src = entries.find(entry => entry.image)?.image || 'nutcracker.jpeg?v=2';
      for (const kind of ['all', 'artwork', 'travel']) document.getElementById(`count-${kind}`).textContent = String(kind === 'all' ? entries.length : entries.filter(entry => entry.type === kind).length);
      render();
    } catch (error) { status.textContent = `${error.message || 'The collection could not be loaded.'} Please try reloading this page.`; empty.hidden = false; document.getElementById('journal-cover').src = 'nutcracker.jpeg?v=2'; document.getElementById('collection-count').textContent = 'Collection unavailable'; }
    finally { grid.setAttribute('aria-busy', 'false'); }
  }
  load();
})();
