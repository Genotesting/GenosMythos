const DATA_URL = '/data/entries.json';

let entries = [];

// Small helpers
function $(sel){ return document.querySelector(sel); }
function $$(sel){ return Array.from(document.querySelectorAll(sel)); }

async function fetchEntries(){
  const res = await fetch(DATA_URL);
  if(!res.ok) throw new Error('Failed to load entries.json');
  entries = await res.json();
  init();
}

function init(){
  buildCategoryFilter();
  buildAlphabet();
  buildTagList();
  renderList();
  setupEvents();
  handleRouting();
  // Ensure copyright reflects current year
  updateCopyright(2025);
}

function buildCategoryFilter(){
  const sel = $('#category-filter');
  const cats = [...new Set(entries.map(e=>e.category).filter(Boolean))].sort();
  for(const c of cats){
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  }
}

function buildAlphabet(){
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const el = $('#alphabet');
  el.innerHTML = '';
  alpha.forEach(letter=>{
    const btn = document.createElement('button');
    btn.textContent = letter;
    btn.addEventListener('click', ()=> {
      searchByLetter(letter);
    });
    el.appendChild(btn);
  });
}

function buildTagList(){
  const tagSet = new Set(entries.flatMap(e => e.tags || []));
  const el = $('#tag-list');
  el.innerHTML = '';
  tagSet.forEach(t=>{
    const span = document.createElement('button');
    span.className = 'tag';
    span.textContent = t;
    span.addEventListener('click', ()=> {
      $('#search').value = t;
      renderList();
    });
    el.appendChild(span);
  });
}

function setupEvents(){
  $('#search').addEventListener('input', debounce(renderList, 180));
  $('#category-filter').addEventListener('change', renderList);
  const back = $('#back-to-list');
  if(back) back.addEventListener('click', ()=> { location.hash = '#/'; });

  const backAbout = $('#back-to-list-from-about');
  if(backAbout) backAbout.addEventListener('click', ()=> { location.hash = '#/'; });

  window.addEventListener('hashchange', handleRouting);
}

function handleRouting(){
  const hash = location.hash || '#/';
  if(hash.startsWith('#/entry/')){
    const id = decodeURIComponent(hash.replace('#/entry/',''));
    renderEntry(id);
  } else if(hash === '#/about'){
    showAboutView();
  } else {
    showListView();
  }
}

function renderList(filtered = null){
  const q = $('#search').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  let list = entries.slice();

  if(category) list = list.filter(e => e.category === category);
  if(q){
    list = list.filter(e => {
      return e.name.toLowerCase().includes(q) ||
             (e.moniker||'').toLowerCase().includes(q) ||
             (e.summary||'').toLowerCase().includes(q) ||
             (e.tags||[]).join(' ').toLowerCase().includes(q);
    });
  }

  list.sort((a,b)=> a.name.localeCompare(b.name));

  const container = $('#entry-list');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = '<li class="entry-card">No matches.</li>';
    return;
  }

  for(const e of list){
    const li = document.createElement('li');
    li.className = 'entry-card';
    li.innerHTML = `<h3>${escapeHtml(e.name)} ${e.moniker ? `<small>— ${escapeHtml(e.moniker)}</small>` : ''}</h3>
                    <p>${escapeHtml(e.summary || '')}</p>
                    <div style="margin-top:10px">${(e.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</div>
                    <div style="margin-top:10px"><a href="#/entry/${encodeURIComponent(e.id)}">Read</a></div>`;
    container.appendChild(li);
  }
}

function renderEntry(id){
  const e = entries.find(x => x.id === id);
  if(!e){
    $('#entry-content').innerHTML = '<h2>Not found</h2><p>No entry with that id.</p>';
    showEntryView();
    return;
  }
  // NOTE: e.content assumed safe (same as your original site behavior)
  $('#entry-content').innerHTML = e.content;
  const meta = document.createElement('div');
  meta.style.marginTop = '10px';
  meta.style.color = 'var(--muted)';
  meta.innerHTML = `<strong>Category:</strong> ${escapeHtml(e.category || '')} &nbsp; <strong>Size:</strong> ${escapeHtml(e.size || '')}`;
  $('#entry-content').appendChild(meta);

  showEntryView();
}

function showListView(){
  $('#about-view').classList.add('hidden');
  $('#entry-view').classList.add('hidden');
  $('#list-view').classList.remove('hidden');
}

function showEntryView(){
  $('#list-view').classList.add('hidden');
  $('#about-view').classList.add('hidden');
  $('#entry-view').classList.remove('hidden');
}

function searchByLetter(letter){
  $('#search').value = letter;
  renderList();
}

function debounce(fn, wait){
  let t;
  return (...a)=> {
    clearTimeout(t);
    t = setTimeout(()=> fn(...a), wait);
  };
}

function escapeHtml(str){
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ------------------------------
   About page: load markdown & render
   ------------------------------ */

async function showAboutView(){
  $('#list-view').classList.add('hidden');
  $('#entry-view').classList.add('hidden');
  $('#about-view').classList.remove('hidden');

  try {
    await loadAboutMarkdown('/about.md');
  } catch(err){
    $('#about-content').innerHTML = `<p style="color:tomato">Error loading About content: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadAboutMarkdown(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Failed to load about.md');
  const mdText = await res.text();

  // Prefer marked (if available from CDN). If not, fall back to a tiny parser.
  let html = '';
  if(window.marked && typeof window.marked.parse === 'function'){
    html = window.marked.parse(mdText);
  } else {
    html = simpleMarkdownToHtml(mdText);
  }

  // Insert into page
  $('#about-content').innerHTML = html;
}

/* Very small, conservative Markdown -> HTML fallback.
   Supports: headings (#..######), unordered lists (-/*), paragraphs,
   bold (**text**), italic (*text*), inline code (`code`), links [text](url).
   This is purposely simple — the real marked parser will be richer if available.
*/
function simpleMarkdownToHtml(md){
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const lines = md.replace(/\r/g, '').split('\n');

  let out = '';
  let inList = false;

  function flushList(){
    if(inList){ out += '</ul>'; inList = false; }
  }

  for(let raw of lines){
    const line = raw.trim();

    if(line === ''){
      flushList();
      out += ''; // blank line -> paragraph break handled by spacing below
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if(hMatch){
      flushList();
      const level = hMatch[1].length;
      out += `<h${level}>${inlineFmt(hMatch[2])}</h${level}>`;
      continue;
    }

    // Unordered lists (- or *)
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if(ulMatch){
      if(!inList){ inList = true; out += '<ul>'; }
      out += `<li>${inlineFmt(ulMatch[1])}</li>`;
      continue;
    }

    // Normal paragraph
    flushList();
    out += `<p>${inlineFmt(line)}</p>`;
  }
  flushList();
  return out;
}

function inlineFmt(text){
  // escape HTML first
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // inline code: `code`
  s = s.replace(/`([^`]+)`/g, (m, p1) => `<code>${p1.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>`);

  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u}" rel="noopener noreferrer">${t}</a>`);

  // bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, (m, p1) => `<strong>${p1}</strong>`);

  // italic: *text* (naive; doesn't handle nested well)
  s = s.replace(/\*([^*]+)\*/g, (m, p1) => `<em>${p1}</em>`);

  return s;
}

/* ------------------------------
   Small utility: copyright
   ------------------------------ */
function updateCopyright(startYear = 2025) {
  const now = new Date().getFullYear();
  const yearText = now > startYear ? `${startYear}–${now}` : `${startYear}`;
  const el = document.getElementById('copyright');
  el.innerHTML = `&copy; ${yearText} Geno. All Rights Reserved`;
}

/* ------------------------------
   Kick off
   ------------------------------ */
updateCopyright(2025);

fetchEntries().catch(err=>{
  console.error(err);
  document.body.innerHTML = `<pre style="color:tomato">Error loading site data: ${escapeHtml(err.message)}</pre>`;
});
