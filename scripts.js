const DATA_URL = 'data/entries.json';
const ABOUT_URL = 'about.md';

let entries = [];

function $(sel){ return document.querySelector(sel); }
function $$(sel){ return Array.from(document.querySelectorAll(sel)); }

async function fetchEntries(){
  try {
    const res = await fetch(DATA_URL);
    if(!res.ok) throw new Error('Failed to load entries.json');
    entries = await res.json();
    init();
  } catch(err){
    console.error(err);
    document.body.innerHTML = `<pre style="color:tomato">Error loading site data: ${escapeHtml(err.message)}</pre>`;
  }
}

function init(){
  buildCategoryFilter();
  buildAlphabet();
  buildTagList();
  renderList();
  setupEvents();
  handleRouting();
  updateCopyright(2025);
}

function buildCategoryFilter(){
  const sel = $('#category-filter');
  if(!sel) return;
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
  if(!el) return;
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
  if(!el) return;
  el.innerHTML = '';
  tagSet.forEach(t=>{
    const span = document.createElement('button');
    span.className = 'tag';
    span.textContent = t;
    span.addEventListener('click', ()=> {
      const s = $('#search');
      if(s) s.value = t;
      renderList();
    });
    el.appendChild(span);
  });
}

function setupEvents(){
  const s = $('#search');
  if(s) s.addEventListener('input', debounce(renderList, 180));
  const cf = $('#category-filter');
  if(cf) cf.addEventListener('change', renderList);
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
  const qel = $('#search');
  const q = qel ? qel.value.trim().toLowerCase() : '';
  const categoryEl = $('#category-filter');
  const category = categoryEl ? categoryEl.value : '';
  let list = entries.slice();

  if(category) list = list.filter(e => e.category === category);
  if(q){
    list = list.filter(e => {
      return (e.name || '').toLowerCase().includes(q) ||
             (e.moniker||'').toLowerCase().includes(q) ||
             (e.summary||'').toLowerCase().includes(q) ||
             (e.tags||[]).join(' ').toLowerCase().includes(q);
    });
  }

  list.sort((a,b)=> (a.name||'').localeCompare(b.name||''));

  const container = $('#entry-list');
  if(!container) return;
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
  const entryContent = $('#entry-content');
  if(!entryContent){
    showEntryView();
    return;
  }
  if(!e){
    entryContent.innerHTML = '<h2>Not found</h2><p>No entry with that id.</p>';
    showEntryView();
    return;
  }
  entryContent.innerHTML = e.content || '';
  const meta = document.createElement('div');
  meta.style.marginTop = '10px';
  meta.style.color = 'var(--muted)';
  meta.innerHTML = `<strong>Category:</strong> ${escapeHtml(e.category || '')} &nbsp; <strong>Size:</strong> ${escapeHtml(e.size || '')}`;
  entryContent.appendChild(meta);
  showEntryView();
}

function showListView(){
  const about = $('#about-view');
  const entry = $('#entry-view');
  const list = $('#list-view');
  if(about) about.classList.add('hidden');
  if(entry) entry.classList.add('hidden');
  if(list) list.classList.remove('hidden');
}

function showEntryView(){
  const list = $('#list-view');
  const about = $('#about-view');
  const entry = $('#entry-view');
  if(list) list.classList.add('hidden');
  if(about) about.classList.add('hidden');
  if(entry) entry.classList.remove('hidden');
}

function searchByLetter(letter){
  const s = $('#search');
  if(s) s.value = letter;
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

async function showAboutView(){
  const list = $('#list-view');
  const entry = $('#entry-view');
  const about = $('#about-view');
  if(list) list.classList.add('hidden');
  if(entry) entry.classList.add('hidden');
  if(about) about.classList.remove('hidden');
  try {
    await loadAboutMarkdown(ABOUT_URL);
  } catch(err){
    const ac = $('#about-content');
    if(ac) ac.innerHTML = `<p style="color:tomato">Error loading About content: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadAboutMarkdown(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Failed to load about.md');
  const mdText = await res.text();
  let html = '';
  if(window.marked && typeof window.marked.parse === 'function'){
    html = window.marked.parse(mdText);
  } else {
    html = simpleMarkdownToHtml(mdText);
  }
  const ac = $('#about-content');
  if(ac) ac.innerHTML = html;
}

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
      out += '';
      continue;
    }
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if(hMatch){
      flushList();
      const level = hMatch[1].length;
      out += `<h${level}>${inlineFmt(hMatch[2])}</h${level}>`;
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if(ulMatch){
      if(!inList){ inList = true; out += '<ul>'; }
      out += `<li>${inlineFmt(ulMatch[1])}</li>`;
      continue;
    }
    flushList();
    out += `<p>${inlineFmt(line)}</p>`;
  }
  flushList();
  return out;
}

function inlineFmt(text){
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/`([^`]+)`/g, (m, p1) => `<code>${p1.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u}" rel="noopener noreferrer">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (m, p1) => `<strong>${p1}</strong>`);
  s = s.replace(/\*([^*]+)\*/g, (m, p1) => `<em>${p1}</em>`);
  return s;
}

function updateCopyright(startYear = 2025) {
  const now = new Date().getFullYear();
  const yearText = now > startYear ? `${startYear}–${now}` : `${startYear}`;
  const el = document.getElementById('copyright');
  if(el) el.innerHTML = `&copy; ${yearText} Geno. All Rights Reserved`;
}

updateCopyright(2025);

fetchEntries();
