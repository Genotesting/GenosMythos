const DATA_URL = 'data/entries.json';
const ABOUT_URL = 'about.md';
console.log("User entered the mythos. Let them find Terence.");
let entries = [];
const FAVORITES_KEY = 'geno_favs_v1';
let favorites = new Set();
let filterToFavorites = false;
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

function showLoading(state = true) {
  const el = $('#loading');
  if (!el) return;
  el.setAttribute('aria-hidden', state ? 'false' : 'true');
  if (state) el.style.display = ''; else el.style.display = 'none';
}
function showMessage(msg, isError = false) {
  const m = $('#message');
  if (!m) return;
  m.hidden = !msg;
  m.textContent = msg;
  m.style.color = isError ? 'tomato' : 'var(--muted)';
  m.setAttribute('role', isError ? 'alert' : 'status');
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      favorites = new Set(Array.isArray(arr) ? arr : []);
    }
  } catch (e) { favorites = new Set(); }
}
function saveFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites))); }
  catch (e) { console.warn('Failed to save favorites, reload the page, or try again.', e); }
}
function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  saveFavorites();
  updateFavoriteUI();
  renderList();
}
function isFavorite(id) { return favorites.has(id); }

async function fetchEntries() {
  showLoading(true);
  loadFavorites();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(DATA_URL, { signal: controller.signal });
    if (!res.ok) throw new Error('Failed to load entries.json');
    entries = await res.json();
    init();
  } catch (err) {
    console.error(err);
    const isAbort = err.name === 'AbortError';
    showMessage(`Error loading site data: ${isAbort ? 'request timed out' : err.message}`, true);
  } finally {
    clearTimeout(timeout);
    showLoading(false);
  }
}

function init() {
  applySavedTheme();
  buildCategoryFilter();
  buildAlphabet();
  buildTagList();
  renderList();
  setupEvents();
  handleRouting();
  updateCopyright(2025);
  updateFavoriteUI();
  setupBackToTop();
}

function applySavedTheme() {
  const saved = localStorage.getItem('geno_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  const tbtn = $('#theme-toggle');
  if (tbtn) tbtn.setAttribute('aria-pressed', saved === 'light' ? 'true' : 'false');
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'light') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('geno_theme');
    $('#theme-toggle')?.setAttribute('aria-pressed', 'false');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('geno_theme', 'light');
    $('#theme-toggle')?.setAttribute('aria-pressed', 'true');
  }
}

function buildCategoryFilter() {
  const sel = $('#category-filter');
  if (!sel) return;
  const cats = [...new Set(entries.map(e => e.category).filter(Boolean))].sort();
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }
}

let selectedTag = null;

function buildAlphabet() {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const el = $('#alphabet');
  if (!el) return;
  el.innerHTML = '';
  alpha.forEach(letter => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = letter;
    btn.setAttribute('aria-label', `Filter by ${letter}`);
    btn.addEventListener('click', () => {
      searchByLetter(letter);
    });
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        searchByLetter(letter);
      }
    });
    el.appendChild(btn);
  });
}

function clearTagPressed() {
  $$('#tag-list .tag').forEach(x => x.setAttribute('aria-pressed', 'false'));
  selectedTag = null;
}

function buildTagList() {
  console.log('buildTagList called, entries:', entries);
  const el = $('#tag-list');
  if (!el) return;
  el.innerHTML = '';

  const tagSet = new Set();
  for (const e of entries || []) {
    if (!e) continue;
    const tags = e.tags;
    if (Array.isArray(tags)) {
      for (const t of tags) if (t) tagSet.add(String(t));
    } else if (typeof tags === 'string' && tags.trim()) {
      tagSet.add(tags.trim());
    }
  }

  console.log('buildTagList: found tags=', tagSet.size, Array.from(tagSet).slice(0, 50));

  const favBtn = document.createElement('button');
  favBtn.className = 'tag';
  favBtn.type = 'button';
  favBtn.textContent = 'Favorites';
  favBtn.dataset.special = 'favorites';
  favBtn.setAttribute('aria-pressed', 'false');
  favBtn.addEventListener('click', () => {
    const wasActive = favBtn.getAttribute('aria-pressed') === 'true';
    clearTagPressed();
    if (!wasActive) {
      favBtn.setAttribute('aria-pressed', 'true');
      filterToFavorites = true;
      selectedTag = null;
      const s = $('#search');
      if (s) s.value = '';
    } else {
      favBtn.setAttribute('aria-pressed', 'false');
      filterToFavorites = false;
    }
    visibleCount = PAGE_SIZE;
    renderList();
  });
  favBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      favBtn.click();
    }
  });
  el.appendChild(favBtn);

  if (tagSet.size === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'no-tags';
    placeholder.textContent = '(no tags)';
    placeholder.style.color = 'var(--muted)';
    placeholder.style.padding = '6px 8px';
    el.appendChild(placeholder);
    return;
  }

  Array.from(tagSet).sort((a, b) => a.localeCompare(b)).forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag';
    btn.type = 'button';
    btn.textContent = t;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const wasActive = btn.getAttribute('aria-pressed') === 'true';
      clearTagPressed();
      filterToFavorites = false;
      if (!wasActive) {
        btn.setAttribute('aria-pressed', 'true');
        selectedTag = t;
      } else {
        selectedTag = null;
      }
      const s = $('#search');
      if (s) s.value = '';
      visibleCount = PAGE_SIZE;
      renderList();
    });
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        btn.click();
      }
    });
    el.appendChild(btn);
  });
}

function setupEvents() {
  const s = $('#search');
  if (s) s.addEventListener('input', debounce(() => {
    clearTagPressed();
    filterToFavorites = false;
    visibleCount = PAGE_SIZE;
    renderList();
  }, 180));
  const cf = $('#category-filter');
  if (cf) cf.addEventListener('change', () => {
    clearTagPressed();
    filterToFavorites = false;
    visibleCount = PAGE_SIZE;
    renderList();
  });
  const back = $('#back-to-list');
  if (back) back.addEventListener('click', () => { location.hash = '#/'; });
  const backAbout = $('#back-to-list-from-about');
  if (backAbout) backAbout.addEventListener('click', () => { location.hash = '#/'; });
  window.addEventListener('hashchange', handleRouting);

  $('#theme-toggle')?.addEventListener('click', () => toggleTheme());

  $('#sidebar-toggle')?.addEventListener('click', () => {
    const sb = document.querySelector('.sidebar');
    if (!sb) return;
    sb.classList.toggle('active');
    const expanded = sb.classList.contains('active');
    $('#sidebar-toggle')?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expanded) {
      const firstButton = sb.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  });
}

function setupBackToTop() {
  const btn = $('#back-to-top');
  if (!btn) return;
  const content = document.querySelector('.content');
  if (!content) return;

  content.addEventListener('scroll', () => {
    btn.classList.toggle('visible', content.scrollTop > 300);
  });

  btn.addEventListener('click', () => {
    content.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function handleRouting() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/entry/')) {
    const id = decodeURIComponent(hash.replace('#/entry/', ''));
    renderEntry(id);
  } else if (hash === '#/about') {
    showAboutView();
  } else {
    showListView();
  }
}

function renderList() {
  const s = $('#search');
  const q = s ? s.value.trim().toLowerCase() : '';
  const categoryEl = $('#category-filter');
  const category = categoryEl ? categoryEl.value : '';
  let list = entries.slice();

  if (category) list = list.filter(e => e.category === category);

  if (selectedTag) {
    list = list.filter(e => {
      if (Array.isArray(e.tags)) return e.tags.includes(selectedTag);
      if (typeof e.tags === 'string') return e.tags === selectedTag;
      return false;
    });
  } else if (q) {
    list = list.filter(e => {
      return (e.name || '').toLowerCase().includes(q) ||
             (e.moniker || '').toLowerCase().includes(q) ||
             (e.summary || '').toLowerCase().includes(q) ||
             (e.tags || []).join(' ').toLowerCase().includes(q);
    });
  }

  if (filterToFavorites) {
    list = list.filter(e => favorites.has(e.id));
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    const favList = list.filter(e => favorites.has(e.id)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const other = list.filter(e => !favorites.has(e.id)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    list = favList.concat(other);
  }

  const fullCount = list.length;
  const slice = list.slice(0, visibleCount);

  const container = $('#entry-list');
  if (!container) return;
  container.innerHTML = '';
  if (slice.length === 0) {
    container.innerHTML = `<li class="entry-card">${filterToFavorites ? 'No favorites.' : 'No matches.'}</li>`;
    showMessage(
      q ? `No results for "${q}"` :
      selectedTag ? `No results for tag "${selectedTag}"` :
      category ? `No results for category "${category}"` :
      filterToFavorites ? 'No favorites yet.' : 'No entries found.',
      true
    );
    renderLoadMore(null, fullCount);
    return;
  }

  if (q || selectedTag || category || filterToFavorites) {
    showMessage(
      q ? `Showing results for "${q}"` :
      selectedTag ? `Showing results for tag "${selectedTag}"` :
      category ? `Showing results for category "${category}"` :
      'Showing favorites'
    );
  } else {
    showMessage('');
  }

  for (const e of slice) {
    const li = document.createElement('li');
    li.className = 'entry-card';
    li.setAttribute('role', 'listitem');
    li.tabIndex = 0;
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-button';
    favBtn.type = 'button';
    favBtn.setAttribute('aria-label', `Toggle favorite for ${e.name}`);
    favBtn.dataset.id = e.id;
    favBtn.innerHTML = starSvg();
    favBtn.addEventListener('click', (ev) => { ev.stopPropagation(); toggleFavorite(e.id); });
    favBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleFavorite(e.id); }
    });

    li.innerHTML = `<h3>${escapeHtml(e.name)} ${e.moniker ? `<small>— ${escapeHtml(e.moniker)}</small>` : ''}</h3>
                    <p>${escapeHtml(e.summary || '')}</p>
                    <div style="margin-top:10px" aria-hidden="true">${(e.tags || []).map(t => `<span class="tag" aria-hidden="true">${escapeHtml(t)}</span>`).join(' ')}</div>
                    <div style="margin-top:10px"><a href="#/entry/${encodeURIComponent(e.id)}">Read</a></div>`;

    li.insertBefore(favBtn, li.firstChild);
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        const link = li.querySelector('a');
        if (link) link.click();
      }
    });
    li.addEventListener('click', (ev) => {
      const target = ev.target;
      if (target.closest('a') || target.closest('button')) return;
      const link = li.querySelector('a');
      if (link) link.click();
    });

    container.appendChild(li);
  }
  updateFavoriteUI();
  renderLoadMore(fullCount, fullCount);
}

function renderLoadMore(fullCount, displayedCountHint) {
  const holder = document.getElementById('load-more-container');
  if (!holder) return;
  holder.innerHTML = '';
  const full = fullCount === null ? 0 : fullCount;
  if (full > visibleCount) {
    const btn = document.createElement('button');
    btn.className = 'load-more-button';
    btn.type = 'button';
    btn.textContent = `Load more (${Math.min(visibleCount + PAGE_SIZE, full)} / ${full})`;
    btn.addEventListener('click', () => {
      visibleCount = Math.min(visibleCount + PAGE_SIZE, full);
      renderList();
    });
    holder.appendChild(btn);
  }
}

function renderEntry(id) {
  const e = entries.find(x => x.id === id);
  const entryContent = $('#entry-content');
  if (!entryContent) {
    showEntryView();
    return;
  }
  if (!e) {
    entryContent.innerHTML = '<h2>Not found</h2><p>No entry with that id.</p>';
    showEntryView();
    $('#entry-content')?.focus();
    return;
  }

  entryContent.innerHTML = sanitizeHtml(e.content || '');
  const meta = document.createElement('div');
  meta.style.marginTop = '10px';
  meta.style.color = 'var(--muted)';
  meta.innerHTML = `<strong>Category:</strong> ${escapeHtml(e.category || '')} &nbsp; <strong>Size:</strong> ${escapeHtml(e.size || '')}`;
  entryContent.appendChild(meta);

  const favContainer = $('#entry-fav-container');
  if (favContainer) {
    favContainer.innerHTML = '';
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-button';
    favBtn.type = 'button';
    favBtn.dataset.id = e.id;
    favBtn.setAttribute('aria-label', `Toggle favorite for ${e.name}`);
    favBtn.innerHTML = starSvg();
    favBtn.addEventListener('click', () => toggleFavorite(e.id));
    favBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleFavorite(e.id); }
    });
    favContainer.appendChild(favBtn);
  }
  showEntryView();
  $('#entry-content')?.focus();
  updateFavoriteUI();
}

function showListView() {
  const about = $('#about-view');
  const entry = $('#entry-view');
  const list = $('#list-view');
  if (about) about.classList.add('hidden');
  if (entry) entry.classList.add('hidden');
  if (list) list.classList.remove('hidden');
  const m = $('#message');
  if (m) m.hidden = true;
}

function showEntryView() {
  const list = $('#list-view');
  const about = $('#about-view');
  const entry = $('#entry-view');
  if (list) list.classList.add('hidden');
  if (about) about.classList.add('hidden');
  if (entry) entry.classList.remove('hidden');
}

function searchByLetter(letter) {
  const s = $('#search');
  if (s) s.value = letter;
  clearTagPressed();
  filterToFavorites = false;
  visibleCount = PAGE_SIZE;
  renderList();
}

function debounce(fn, wait) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function sanitizeHtml(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  doc.querySelectorAll('script,style').forEach(n => n.remove());

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
  const toCheck = [];
  while (walker.nextNode()) toCheck.push(walker.currentNode);
  toCheck.forEach(el => {
    Array.from(el.attributes || []).forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = attr.value || '';
      if (name.startsWith('on')) { el.removeAttribute(attr.name); return; }
      if ((name === 'href' || name === 'src') && val.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML || '';
}

function simpleMarkdownToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = (md || '').replace(/\r/g, '').split('\n');
  let out = '';
  let inList = false;
  function flushList() {
    if (inList) { out += '</ul>'; inList = false; }
  }
  for (let raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushList();
      out += '';
      continue;
    }
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      out += `<h${level}>${inlineFmt(hMatch[2])}</h${level}>`;
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inList) { inList = true; out += '<ul>'; }
      out += `<li>${inlineFmt(ulMatch[1])}</li>`;
      continue;
    }
    flushList();
    out += `<p>${inlineFmt(line)}</p>`;
  }
  flushList();
  return out;
}
function inlineFmt(text) {
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/`([^`]+)`/g, (m, p1) => `<code>${p1.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u}" rel="noopener noreferrer" target="_blank">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (m, p1) => `<strong>${p1}</strong>`);
  s = s.replace(/\*([^*]+)\*/g, (m, p1) => `<em>${p1}</em>`);
  return s;
}

async function showAboutView() {
  const list = $('#list-view');
  const entry = $('#entry-view');
  const about = $('#about-view');
  if (list) list.classList.add('hidden');
  if (entry) entry.classList.add('hidden');
  if (about) about.classList.remove('hidden');
  try {
    await loadAboutMarkdown(ABOUT_URL);
    $('#about-content')?.focus();
  } catch (err) {
    const ac = $('#about-content');
    if (ac) ac.innerHTML = `<p style="color:tomato">Error loading About content: ${escapeHtml(err.message)}</p>`;
  }
}
async function loadAboutMarkdown(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load about.md');
  const mdText = await res.text();
  let html = '';
  if (window.marked && typeof window.marked.parse === 'function') {
    html = window.marked.parse(mdText);
  } else {
    html = simpleMarkdownToHtml(mdText);
  }
  const ac = $('#about-content');
  if (ac) ac.innerHTML = sanitizeHtml(html);
}

function updateFavoriteUI() {
  $$('.fav-button').forEach(btn => {
    const id = btn.dataset.id;
    if (!id) return;
    const pressed = isFavorite(id);
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });

  const favTag = document.querySelector('#tag-list .tag[data-special="favorites"]');
  if (favTag) {
    favTag.setAttribute('aria-pressed', filterToFavorites ? 'true' : 'false');
  }
}

function starSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.167L12 18.896 4.664 23.164l1.402-8.167L.132 9.21l8.2-1.192z" fill="currentColor"/>
  </svg>`;
}

function updateCopyright(startYear = 2025) {
  const now = new Date().getFullYear();
  const yearText = now > startYear ? `${startYear}–${now}` : `${startYear}`;
  const el = document.getElementById('copyright');
  if (el) el.innerHTML = `&copy; ${yearText} Geno. All Rights Reserved`;
}

updateCopyright(2025);

fetchEntries();