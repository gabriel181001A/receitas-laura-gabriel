/* =========================================================================
   Receitas — Laura & Gabriel
   App de página única, sem build. Roteamento por hash.
   ========================================================================= */

// ---- utilidades -----------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const view = () => $('#view');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Constrói nós a partir de uma string HTML. */
function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content;
}

async function api(path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(path, {
    method,
    headers: body instanceof FormData ? {} : (body ? { 'content-type': 'application/json' } : {}),
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
  });
  if (res.status === 401) { location.href = '/login'; throw new Error('sessão expirada'); }
  if (raw) return res.text();

  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw Object.assign(new Error(data?.error || 'algo deu errado'), { status: res.status, data });
  return data;
}

let toastTimer;
function toast(msg) {
  $('.toast')?.remove();
  const node = html(`<div class="toast" role="status">${esc(msg)}</div>`);
  document.body.append(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('.toast')?.remove(), 2600);
}

/** Modal simples. `render` recebe (body, close). */
function modal(title, render) {
  const frag = html(`
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="btn btn-quiet btn-icon" data-close aria-label="Fechar">${I.x}</button>
        </div>
        <div class="modal-body"></div>
      </div>
    </div>`);
  const backdrop = frag.querySelector('.modal-backdrop');
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  render(backdrop.querySelector('.modal-body'), close);
  document.body.append(frag);
  backdrop.querySelector('input, textarea, button:not([data-close])')?.focus();
  return close;
}

function confirmar(msg, onYes) {
  modal('Confirmar', (body, close) => {
    body.append(html(`
      <p style="margin-bottom:18px;color:var(--ink-2)">${esc(msg)}</p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" data-no>Cancelar</button>
        <button class="btn btn-danger" data-yes>Sim, apagar</button>
      </div>`));
    body.querySelector('[data-no]').onclick = close;
    body.querySelector('[data-yes]').onclick = () => { close(); onYes(); };
  });
}

// ---- ícones ---------------------------------------------------------------

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

const I = {
  book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  cart: svg('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  star: svg('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  users: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  trash: svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  edit: svg('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>'),
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  left: svg('<path d="m15 18-6-6 6-6"/>'),
  right: svg('<path d="m9 18 6-6-6-6"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  camera: svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  chef: svg('<path d="M6 21h12M7 17h10M8.5 3a3.5 3.5 0 0 0-3 5.3A3.5 3.5 0 0 0 7 15h10a3.5 3.5 0 0 0 1.5-6.7A3.5 3.5 0 0 0 12 3.5 3.5 3.5 0 0 0 8.5 3z"/>'),
  play: svg('<polygon points="6 3 20 12 6 21 6 3"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
};

// ---- estado ---------------------------------------------------------------

const S = {
  meta: { categories: [], aisles: [], mealSlots: [], ytdlp: false },
  filters: { q: '', category: 'todas', favorite: false, sort: 'recentes' },
  planWeek: new Date().toISOString().slice(0, 10),
  shoppingCount: 0,
};

const catOf = (id) => S.meta.categories.find((c) => c.id === id) || { label: id, icon: '🍳' };

/** Marcações de ingrediente/passo ficam no aparelho de quem está cozinhando. */
const ticks = {
  key: (id) => `ticks:${id}`,
  get(id) {
    try { return new Set(JSON.parse(localStorage.getItem(this.key(id)) || '[]')); }
    catch { return new Set(); }
  },
  toggle(id, item) {
    const set = this.get(id);
    set.has(item) ? set.delete(item) : set.add(item);
    try { localStorage.setItem(this.key(id), JSON.stringify([...set])); } catch { /* modo privado */ }
    return set.has(item);
  },
  clear(id) { try { localStorage.removeItem(this.key(id)); } catch { /* ignora */ } },
};

// ---- navegação ------------------------------------------------------------

const TABS = [
  { id: 'receitas', label: 'Receitas', icon: I.book, route: '#/' },
  { id: 'planejador', label: 'Planejador', icon: I.calendar, route: '#/planejador' },
  { id: 'lista', label: 'Lista', icon: I.cart, route: '#/lista', badge: () => S.shoppingCount },
  { id: 'adicionar', label: 'Adicionar', icon: I.plus, route: '#/adicionar' },
];

function renderTabs(active) {
  const bar = $('#tabbar');
  bar.querySelectorAll('.tab').forEach((t) => t.remove());
  for (const tab of TABS) {
    const n = tab.badge?.() || 0;
    bar.append(html(`
      <a class="tab" href="${tab.route}" aria-current="${active === tab.id}">
        ${tab.icon}
        <span>${tab.label}</span>
        ${n ? `<span class="tab-badge">${n > 99 ? '99+' : n}</span>` : ''}
      </a>`));
  }
}

function topbar(inner) { $('#topbar').innerHTML = inner; }

/** No celular mostra a marca; no computador (marca já na lateral) o título da seção. */
function brandBar(extra = '', pageTitle = '') {
  return `
    <div class="brand">
      <div class="brand-mark">🍲</div>
      <div class="brand-text">
        <div class="brand-title">Receitas</div>
        <div class="brand-sub">Laura &amp; Gabriel</div>
      </div>
    </div>
    <div class="page-title">${esc(pageTitle)}</div>
    <div class="topbar-actions">${extra}</div>`;
}

function backBar(title, extra = '') {
  return `
    <button class="btn btn-quiet btn-icon" onclick="history.back()" aria-label="Voltar">${I.back}</button>
    <div class="brand-title" style="flex:1;min-width:0">${esc(title)}</div>
    <div class="topbar-actions">${extra}</div>`;
}

const loading = () => `<div class="loading"><span class="spinner"></span><span>Carregando…</span></div>`;

function errorState(err) {
  return `<div class="alert alert-error"><strong>Não deu certo.</strong><br>${esc(err.message)}</div>`;
}

// ---- tela: lista de receitas ---------------------------------------------

async function viewRecipes() {
  renderTabs('receitas');
  topbar(brandBar(`<a class="btn btn-primary btn-sm" href="#/adicionar">${I.plus} Nova</a>`, 'Receitas'));
  view().innerHTML = loading();

  try {
    const params = new URLSearchParams();
    if (S.filters.q) params.set('q', S.filters.q);
    if (S.filters.category !== 'todas') params.set('category', S.filters.category);
    if (S.filters.favorite) params.set('favorite', 'true');
    params.set('sort', S.filters.sort);

    const [recipes, counts] = await Promise.all([
      api(`/api/recipes?${params}`),
      api('/api/recipes/counts'),
    ]);

    const chips = [
      `<button class="chip" aria-pressed="${S.filters.category === 'todas' && !S.filters.favorite}" data-cat="todas">Todas <span class="chip-count">${counts.total}</span></button>`,
      `<button class="chip" aria-pressed="${S.filters.favorite}" data-fav>⭐ Favoritas <span class="chip-count">${counts.favorites}</span></button>`,
      ...S.meta.categories
        .filter((c) => counts.byCategory[c.id])
        .map((c) => `<button class="chip" aria-pressed="${S.filters.category === c.id && !S.filters.favorite}" data-cat="${c.id}">${c.icon} ${esc(c.label)} <span class="chip-count">${counts.byCategory[c.id]}</span></button>`),
    ].join('');

    view().innerHTML = `
      <div style="display:flex;gap:9px;margin-bottom:14px">
        <label class="search">
          ${I.search}
          <input type="search" placeholder="Buscar receita ou ingrediente…"
                 value="${esc(S.filters.q)}" aria-label="Buscar">
        </label>
        <select class="select" style="width:auto;flex:none" aria-label="Ordenar">
          <option value="recentes"${S.filters.sort === 'recentes' ? ' selected' : ''}>Recentes</option>
          <option value="az"${S.filters.sort === 'az' ? ' selected' : ''}>A–Z</option>
          <option value="nota"${S.filters.sort === 'nota' ? ' selected' : ''}>Nota</option>
          <option value="antigas"${S.filters.sort === 'antigas' ? ' selected' : ''}>Antigas</option>
        </select>
      </div>
      <div class="chips">${chips}</div>
      <div id="results"></div>`;

    renderResults(recipes, counts);
    wireFilters();
  } catch (err) {
    view().innerHTML = errorState(err);
  }
}

function renderResults(recipes, counts) {
  const box = $('#results');
  if (!recipes.length) {
    const virgem = counts.total === 0;
    box.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${virgem ? '🍲' : '🔍'}</div>
        <h3>${virgem ? 'O caderno está em branco' : 'Nada encontrado'}</h3>
        <p>${virgem
          ? 'Cole o link de um Reel ou TikTok e a receita se monta sozinha — ingredientes e modo de preparo separados.'
          : 'Tente outra palavra, ou limpe os filtros para ver tudo.'}</p>
        ${virgem
          ? `<a class="btn btn-primary" href="#/adicionar">${I.plus} Adicionar a primeira</a>`
          : `<button class="btn btn-ghost" data-clear>Limpar filtros</button>`}
      </div>`;
    box.querySelector('[data-clear]')?.addEventListener('click', () => {
      S.filters = { q: '', category: 'todas', favorite: false, sort: S.filters.sort };
      viewRecipes();
    });
    return;
  }

  box.innerHTML = `<div class="grid">${recipes.map(cardHtml).join('')}</div>`;

  box.querySelectorAll('.card-fav').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const { favorite } = await api(`/api/recipes/${btn.dataset.id}/favorite`, { method: 'PATCH' });
      btn.dataset.on = String(favorite);
    });
  });
}

function cardHtml(r) {
  const cat = catOf(r.category);
  const cover = r.cover_photo
    ? `<img src="/api/photos/${r.cover_photo}?size=thumb" alt="" loading="lazy">`
    : `<div class="card-media-empty">${cat.icon}</div>`;

  // No card o espaço é curto e o ícone já diz o que é: "25 minutos" vira
  // "25 min", e "6 porções" vira só o número.
  const curto = (t) => String(t).replace(/\bminutos?\b/i, 'min').replace(/\bhoras?\b/i, 'h').trim();
  const soNumero = (t) => (String(t).match(/\d+\s*(?:a\s*\d+)?/) || [String(t)])[0].trim();

  const meta = [
    r.prep_time && `<span>${I.clock}${esc(curto(r.prep_time))}</span>`,
    r.servings && `<span>${I.users}${esc(soNumero(r.servings))}</span>`,
    r.rating > 0 && `<span style="color:var(--accent)">${'★'.repeat(r.rating)}</span>`,
  ].filter(Boolean).slice(0, 3).join('');

  return `
    <a class="card" href="#/receita/${r.id}">
      <div class="card-media">
        <span class="card-badge">${cat.icon} ${esc(cat.label)}</span>
        <button class="card-fav" data-id="${r.id}" data-on="${r.favorite}"
                aria-label="Favoritar ${esc(r.title)}">${I.star}</button>
        ${cover}
        <div class="card-scrim"><div class="card-title">${esc(r.title)}</div></div>
      </div>
      ${meta ? `<div class="card-meta">${meta}</div>` : ''}
    </a>`;
}

function wireFilters() {
  let debounce;
  $('.search input').addEventListener('input', (e) => {
    clearTimeout(debounce);
    const val = e.target.value;
    debounce = setTimeout(() => { S.filters.q = val; viewRecipes(); }, 320);
  });
  $('.select').addEventListener('change', (e) => { S.filters.sort = e.target.value; viewRecipes(); });

  view().querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if ('fav' in chip.dataset) {
        S.filters.favorite = !S.filters.favorite;
        S.filters.category = 'todas';
      } else {
        S.filters.category = chip.dataset.cat;
        S.filters.favorite = false;
      }
      viewRecipes();
    });
  });
}

// ---- tela: detalhe da receita --------------------------------------------

async function viewRecipe(id) {
  renderTabs('receitas');
  topbar(backBar('Receita'));
  view().innerHTML = loading();

  let r;
  try { r = await api(`/api/recipes/${id}`); }
  catch (err) { view().innerHTML = errorState(err); return; }

  topbar(backBar(r.title, `
    <button class="btn btn-quiet btn-icon" data-cook title="Modo cozinha">${I.chef}</button>
    <a class="btn btn-quiet btn-icon" href="#/editar/${r.id}" title="Editar">${I.edit}</a>`));

  const cat = catOf(r.category);
  const done = ticks.get(r.id);

  const meta = [
    r.prep_time && `<span class="meta-pill">${I.clock} ${esc(r.prep_time)}</span>`,
    r.cook_time && `<span class="meta-pill">🔥 ${esc(r.cook_time)}</span>`,
    r.servings && `<span class="meta-pill">${I.users} ${esc(r.servings)}</span>`,
    r.difficulty && `<span class="meta-pill">📊 ${esc(r.difficulty)}</span>`,
    `<span class="meta-pill accent">${cat.icon} ${esc(cat.label)}</span>`,
  ].filter(Boolean).join('');

  view().innerHTML = `
    <div class="detail-hero">
      ${r.cover_photo
        ? `<img src="/api/photos/${r.cover_photo}" alt="${esc(r.title)}">`
        : `<div class="detail-hero-empty">${cat.icon}</div>`}
    </div>

    <div class="detail-cols">
      <div>
        <h1 class="detail-title">${esc(r.title)}</h1>
        ${r.description ? `<p class="detail-desc">${esc(r.description)}</p>` : ''}
        <div class="meta-row">${meta}</div>

        <div class="action-bar">
          <button class="btn btn-primary btn-sm" data-plan>${I.calendar} Agendar</button>
          ${r.video_url ? `<a class="btn btn-ghost btn-sm" href="${esc(r.video_url)}" target="_blank" rel="noopener">${I.play} Ver vídeo</a>` : ''}
          <button class="btn btn-quiet btn-sm" data-del>${I.trash}</button>
        </div>

        <div class="section">
          <div class="section-head"><h2>Sua nota</h2></div>
          <div class="stars" style="display:flex;gap:4px">
            ${[1, 2, 3, 4, 5].map((n) => `
              <button class="btn btn-quiet btn-icon" data-star="${n}"
                      style="color:${n <= r.rating ? 'var(--accent)' : 'var(--ink-3)'};padding:5px"
                      aria-label="${n} de 5">
                <svg viewBox="0 0 24 24" fill="${n <= r.rating ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>
              </button>`).join('')}
          </div>
        </div>
      </div>

      <div>
        <div class="section panel">
          <div class="section-head">
            <h2>Ingredientes</h2>
            <span class="count">${r.ingredients.length}</span>
          </div>
          ${r.ingredients.length ? `
            <ul class="check-list">
              ${r.ingredients.map((ing, i) => `
                <li class="check-item" data-tick="i${i}" data-done="${done.has('i' + i)}">
                  <span class="check-box">${I.check}</span>
                  <span class="check-text">${esc(ing)}</span>
                </li>`).join('')}
            </ul>` : `<p style="color:var(--ink-3);font-size:14.5px">Nenhum ingrediente anotado ainda.</p>`}
        </div>

        <div class="section panel">
          <div class="section-head">
            <h2>Modo de preparo</h2>
            <span class="count">${r.steps.length} ${r.steps.length === 1 ? 'passo' : 'passos'}</span>
          </div>
          ${r.steps.length ? `
            <ol class="check-list" style="counter-reset:none">
              ${r.steps.map((st, i) => `
                <li class="step-item" data-tick="s${i}" data-done="${done.has('s' + i)}">
                  <span class="step-n">${i + 1}</span>
                  <span class="step-text">${esc(st)}</span>
                </li>`).join('')}
            </ol>` : `<p style="color:var(--ink-3);font-size:14.5px">Nenhum passo anotado ainda.</p>`}
        </div>

        <div class="section">
          <div class="section-head"><h2>Fotos</h2></div>
          <div class="gallery">
            ${r.photos.map((p) => `
              <button class="gallery-item" data-photo="${p.id}">
                <img src="/api/photos/${p.id}?size=thumb" alt="" loading="lazy">
              </button>`).join('')}
            <button class="gallery-item gallery-add" data-add-photo>
              ${I.camera}<span>Adicionar</span>
            </button>
          </div>
          <input type="file" accept="image/*" multiple hidden id="photo-input">
        </div>

        ${r.notes ? `
          <div class="section">
            <div class="section-head"><h2>Anotações</h2></div>
            <div class="notes">${esc(r.notes)}</div>
          </div>` : ''}

        ${r.tags.length ? `
          <div class="section">
            <div class="section-head"><h2>Tags</h2></div>
            <div class="tag-row">${r.tags.map((t) => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
          </div>` : ''}

        ${r.source_url ? `
          <div class="section">
            <div class="section-head"><h2>De onde veio</h2></div>
            <a href="${esc(r.source_url)}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:600">
              ${I.link} ${esc(r.source_name || 'Ver post original')}
            </a>
          </div>` : ''}
      </div>
    </div>`;

  wireRecipeDetail(r);
}

function wireRecipeDetail(r) {
  // Marcar ingredientes e passos
  view().querySelectorAll('[data-tick]').forEach((li) => {
    li.addEventListener('click', () => {
      li.dataset.done = String(ticks.toggle(r.id, li.dataset.tick));
    });
  });

  $('[data-cook]')?.addEventListener('click', () => {
    document.body.classList.toggle('cook-mode');
    const on = document.body.classList.contains('cook-mode');
    toast(on ? 'Modo cozinha: texto maior' : 'Modo cozinha desligado');
    // Mantém a tela acesa enquanto cozinha, se o navegador permitir.
    if (on && 'wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => {});
  });

  view().querySelectorAll('[data-star]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rating = Number(btn.dataset.star) === r.rating ? 0 : Number(btn.dataset.star);
      await api(`/api/recipes/${r.id}/rating`, { method: 'PATCH', body: { rating } });
      r.rating = rating;
      viewRecipe(r.id);
    });
  });

  $('[data-plan]')?.addEventListener('click', () => openPlanPicker(r));

  $('[data-del]')?.addEventListener('click', () => {
    confirmar(`Apagar "${r.title}"? As fotos vão junto e não dá pra desfazer.`, async () => {
      await api(`/api/recipes/${r.id}`, { method: 'DELETE' });
      ticks.clear(r.id);
      toast('Receita apagada');
      location.hash = '#/';
    });
  });

  view().querySelectorAll('[data-tag]').forEach((t) => {
    t.addEventListener('click', () => {
      S.filters = { ...S.filters, q: t.dataset.tag, category: 'todas', favorite: false };
      location.hash = '#/';
    });
  });

  // Fotos
  const input = $('#photo-input');
  $('[data-add-photo]')?.addEventListener('click', () => input.click());
  input?.addEventListener('change', async () => {
    if (!input.files?.length) return;
    const fd = new FormData();
    for (const f of input.files) fd.append('photos', f);
    toast('Enviando fotos…');
    try {
      await api(`/api/photos/${r.id}`, { method: 'POST', body: fd });
      viewRecipe(r.id);
      toast('Fotos adicionadas');
    } catch (err) { toast(err.message); }
  });

  view().querySelectorAll('[data-photo]').forEach((btn) => {
    btn.addEventListener('click', () => openPhoto(btn.dataset.photo, r));
  });
}

function openPhoto(photoId, r) {
  modal('Foto', (body, close) => {
    body.append(html(`
      <img src="/api/photos/${photoId}" alt=""
           style="width:100%;border-radius:var(--radius);margin-bottom:14px;display:block">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" data-cover>${I.star} Usar como capa</button>
        <button class="btn btn-danger btn-sm" data-rm>${I.trash} Apagar foto</button>
      </div>`));

    body.querySelector('[data-cover]').onclick = async () => {
      await api(`/api/photos/${photoId}/cover`, { method: 'PATCH' });
      close(); viewRecipe(r.id); toast('Capa atualizada');
    };
    body.querySelector('[data-rm]').onclick = async () => {
      await api(`/api/photos/${photoId}`, { method: 'DELETE' });
      close(); viewRecipe(r.id); toast('Foto apagada');
    };
  });
}

/** Escolhe dia + refeição para agendar a receita. */
function openPlanPicker(r) {
  const hoje = new Date();
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  modal(`Agendar "${r.title}"`, (body, close) => {
    body.append(html(`
      <label class="field">
        <span class="field-label">Dia</span>
        <select class="select" data-date>
          ${dias.map((d, i) => `<option value="${d}">${i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : fmtDate(d, true)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-label">Refeição</span>
        <select class="select" data-slot>
          ${S.meta.mealSlots.map((s) => `<option value="${s.id}">${s.icon} ${esc(s.label)}</option>`).join('')}
        </select>
      </label>
      <button class="btn btn-primary btn-block" data-go>${I.calendar} Agendar</button>`));

    body.querySelector('[data-go]').onclick = async () => {
      await api('/api/plan', {
        method: 'POST',
        body: {
          date: body.querySelector('[data-date]').value,
          slot: body.querySelector('[data-slot]').value,
          recipe_id: r.id,
        },
      });
      close();
      toast('Agendado no planejador');
    };
  });
}

// ---- tela: adicionar ------------------------------------------------------

function viewAdd() {
  renderTabs('adicionar');
  topbar(brandBar('', 'Adicionar receita'));

  view().innerHTML = `
    <h1 style="font-size:26px;margin-bottom:6px">Adicionar receita</h1>
    <p style="color:var(--ink-2);font-size:14.5px;margin-bottom:22px">
      Cole o link de um Reel ou TikTok e eu separo os ingredientes do modo de preparo.
    </p>

    <div class="section">
      <div class="section-head"><h2>De um link</h2></div>
      <label class="field">
        <span class="field-label">Endereço do post</span>
        <input class="input" data-url inputmode="url"
               placeholder="https://www.instagram.com/reel/…">
        <span class="field-hint">Funciona com Instagram, TikTok e YouTube.</span>
      </label>
      <button class="btn btn-primary btn-block" data-import>${I.sparkle} Ler receita do link</button>
      <div data-result style="margin-top:14px"></div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Ou cole a legenda</h2></div>
      <p style="color:var(--ink-2);font-size:14px;margin-bottom:12px">
        Se o link não abrir, copie o texto do post e cole aqui. Sempre funciona.
      </p>
      <label class="field">
        <textarea class="textarea" data-caption rows="7"
                  placeholder="INGREDIENTES:&#10;- 2 ovos&#10;- 1 xícara de farinha&#10;&#10;MODO DE PREPARO:&#10;1. Misture tudo…"></textarea>
      </label>
      <button class="btn btn-ghost btn-block" data-parse>${I.sparkle} Separar ingredientes e preparo</button>
    </div>

    <div class="section">
      <div class="section-head"><h2>Do zero</h2></div>
      <a class="btn btn-ghost btn-block" href="#/nova">${I.edit} Escrever a receita na mão</a>
    </div>`;

  const urlInput = $('[data-url]');
  const result = $('[data-result]');

  $('[data-import]').addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) { toast('Cole um link primeiro'); return; }

    const btn = $('[data-import]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Lendo o post…`;
    result.innerHTML = '';

    try {
      const res = await api('/api/import/link', { method: 'POST', body: { url } });
      sessionStorage.setItem('draft', JSON.stringify({ ...res.draft, thumb_key: res.thumbKey }));
      location.hash = '#/nova?draft=1';
    } catch (err) {
      const d = err.data || {};
      result.innerHTML = `
        <div class="alert alert-warn">
          <strong>Não consegui ler esse link.</strong><br>${esc(d.error || err.message)}
        </div>`;
      $('[data-caption]')?.focus();
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${I.sparkle} Ler receita do link`;
    }
  });

  $('[data-parse]').addEventListener('click', async () => {
    const caption = $('[data-caption]').value.trim();
    if (caption.length < 10) { toast('Cole a legenda da receita'); return; }
    try {
      const res = await api('/api/import/caption', {
        method: 'POST', body: { caption, url: urlInput.value.trim() },
      });
      sessionStorage.setItem('draft', JSON.stringify(res.draft));
      location.hash = '#/nova?draft=1';
    } catch (err) { toast(err.message); }
  });
}

// ---- tela: editor ---------------------------------------------------------

async function viewEditor(id) {
  renderTabs(id ? 'receitas' : 'adicionar');
  topbar(backBar(id ? 'Editar receita' : 'Nova receita'));
  view().innerHTML = loading();

  let r = {
    title: '', description: '', category: 'outros', ingredients: [''], steps: [''],
    tags: [], servings: '', prep_time: '', cook_time: '', difficulty: '', notes: '',
    source_url: '', source_name: '', video_url: '', favorite: false, rating: 0,
  };

  if (id) {
    try { r = await api(`/api/recipes/${id}`); }
    catch (err) { view().innerHTML = errorState(err); return; }
  } else if (location.hash.includes('draft=1')) {
    try {
      const draft = JSON.parse(sessionStorage.getItem('draft') || '{}');
      r = { ...r, ...draft };
      if (!r.ingredients.length) r.ingredients = [''];
      if (!r.steps.length) r.steps = [''];
    } catch { /* rascunho inválido: começa em branco */ }
  }

  view().innerHTML = `
    ${r.raw_caption ? `<div class="alert alert-info">
      ${I.sparkle} <strong>Li o post e separei o que deu.</strong>
      Confira os ingredientes e os passos antes de salvar.
    </div>` : ''}

    <label class="field">
      <span class="field-label">Nome da receita</span>
      <input class="input" data-f="title" value="${esc(r.title)}" placeholder="Bolo de cenoura">
    </label>

    <label class="field">
      <span class="field-label">Categoria</span>
      <select class="select" data-f="category">
        ${S.meta.categories.map((c) => `<option value="${c.id}"${c.id === r.category ? ' selected' : ''}>${c.icon} ${esc(c.label)}</option>`).join('')}
      </select>
    </label>

    <label class="field">
      <span class="field-label">Descrição</span>
      <textarea class="textarea" data-f="description" rows="3"
                placeholder="Uma linha sobre a receita">${esc(r.description)}</textarea>
    </label>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
      <label class="field"><span class="field-label">Preparo</span>
        <input class="input" data-f="prep_time" value="${esc(r.prep_time)}" placeholder="20 min"></label>
      <label class="field"><span class="field-label">Forno / fogo</span>
        <input class="input" data-f="cook_time" value="${esc(r.cook_time)}" placeholder="40 min"></label>
      <label class="field"><span class="field-label">Rende</span>
        <input class="input" data-f="servings" value="${esc(r.servings)}" placeholder="4 porções"></label>
      <label class="field"><span class="field-label">Dificuldade</span>
        <select class="select" data-f="difficulty">
          ${['', 'Fácil', 'Média', 'Difícil'].map((d) => `<option value="${d}"${d === r.difficulty ? ' selected' : ''}>${d || '—'}</option>`).join('')}
        </select></label>
    </div>

    <div class="section">
      <div class="section-head"><h2>Ingredientes</h2></div>
      <div class="line-editor" data-list="ingredients"></div>
      <button class="btn btn-ghost btn-sm" data-add="ingredients" style="margin-top:9px">${I.plus} Ingrediente</button>
    </div>

    <div class="section">
      <div class="section-head"><h2>Modo de preparo</h2></div>
      <div class="line-editor" data-list="steps"></div>
      <button class="btn btn-ghost btn-sm" data-add="steps" style="margin-top:9px">${I.plus} Passo</button>
    </div>

    <label class="field">
      <span class="field-label">Tags</span>
      <input class="input" data-f="tags" value="${esc(r.tags.join(', '))}" placeholder="fit, rápido, sem glúten">
      <span class="field-hint">Separe por vírgula.</span>
    </label>

    <label class="field">
      <span class="field-label">Anotações</span>
      <textarea class="textarea" data-f="notes" rows="3"
                placeholder="Da última vez ficou melhor com metade do açúcar…">${esc(r.notes)}</textarea>
    </label>

    <label class="field">
      <span class="field-label">Link original</span>
      <input class="input" data-f="source_url" value="${esc(r.source_url)}" inputmode="url">
    </label>

    <div style="display:flex;gap:9px;margin:26px 0 12px">
      <button class="btn btn-primary" data-save style="flex:1">${I.check} Salvar receita</button>
      <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
    </div>`;

  const lists = { ingredients: [...r.ingredients], steps: [...r.steps] };

  function renderList(name) {
    const box = view().querySelector(`[data-list="${name}"]`);
    const numbered = name === 'steps';
    box.innerHTML = lists[name].map((val, i) => `
      <div class="line-row">
        ${numbered ? `<span class="line-n">${i + 1}</span>` : ''}
        <input class="input" value="${esc(val)}" data-i="${i}"
               placeholder="${numbered ? 'Descreva o passo' : 'ex: 2 xícaras de farinha'}">
        <button class="line-del" data-rm="${i}" aria-label="Remover">${I.trash}</button>
      </div>`).join('');

    box.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => { lists[name][Number(inp.dataset.i)] = inp.value; });
      // Enter cria a próxima linha, como numa lista de verdade.
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const i = Number(inp.dataset.i);
        lists[name].splice(i + 1, 0, '');
        renderList(name);
        box.querySelector(`input[data-i="${i + 1}"]`)?.focus();
      });
    });
    box.querySelectorAll('[data-rm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lists[name].splice(Number(btn.dataset.rm), 1);
        if (!lists[name].length) lists[name].push('');
        renderList(name);
      });
    });
  }

  renderList('ingredients');
  renderList('steps');

  view().querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.add;
      lists[name].push('');
      renderList(name);
      view().querySelector(`[data-list="${name}"] input[data-i="${lists[name].length - 1}"]`)?.focus();
    });
  });

  $('[data-save]').addEventListener('click', async () => {
    const get = (f) => view().querySelector(`[data-f="${f}"]`)?.value ?? '';
    if (!get('title').trim()) { toast('Dê um nome à receita'); return; }

    const payload = {
      title: get('title'), description: get('description'), category: get('category'),
      prep_time: get('prep_time'), cook_time: get('cook_time'), servings: get('servings'),
      difficulty: get('difficulty'), notes: get('notes'), source_url: get('source_url'),
      source_name: r.source_name, video_url: r.video_url || get('source_url'),
      favorite: r.favorite, rating: r.rating,
      tags: get('tags').split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: lists.ingredients.map((s) => s.trim()).filter(Boolean),
      steps: lists.steps.map((s) => s.trim()).filter(Boolean),
      thumb_key: r.thumb_key,
    };

    const btn = $('[data-save]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Salvando…`;

    try {
      if (id) {
        await api(`/api/recipes/${id}`, { method: 'PUT', body: payload });
        sessionStorage.removeItem('draft');
        toast('Receita salva');
        location.hash = `#/receita/${id}`;
      } else {
        const res = await api('/api/recipes', { method: 'POST', body: payload });
        sessionStorage.removeItem('draft');
        toast('Receita criada');
        location.hash = `#/receita/${res.id}`;
      }
    } catch (err) {
      toast(err.message);
      btn.disabled = false;
      btn.innerHTML = `${I.check} Salvar receita`;
    }
  });
}

// ---- tela: planejador semanal --------------------------------------------

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtDate(iso, withDay = false) {
  const d = new Date(`${iso}T12:00:00`);
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`;
  return withDay ? `${DIAS[d.getDay()]}, ${base}` : base;
}

const shiftWeek = (iso, weeks) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
};

async function viewPlan() {
  renderTabs('planejador');
  topbar(brandBar('', 'Planejador da semana'));
  view().innerHTML = loading();

  let plan;
  try { plan = await api(`/api/plan?date=${S.planWeek}`); }
  catch (err) { view().innerHTML = errorState(err); return; }

  const hoje = new Date().toISOString().slice(0, 10);

  view().innerHTML = `
    <div class="week-nav">
      <button class="btn btn-ghost btn-icon" data-prev aria-label="Semana anterior">${I.left}</button>
      <div class="week-label">${fmtDate(plan.start)} – ${fmtDate(plan.end)}</div>
      <button class="btn btn-ghost btn-icon" data-next aria-label="Próxima semana">${I.right}</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" data-today>Ir para hoje</button>
      <button class="btn btn-quiet btn-sm btn-icon" data-clear
              title="Limpar semana" aria-label="Limpar semana">${I.trash}</button>
    </div>

    ${plan.days.map((day) => {
      // Só as refeições que têm algo. Um dia inteiro vazio vira uma linha,
      // em vez de quatro — a semana cabe na tela sem rolar sem fim.
      const filled = S.meta.mealSlots.filter((s) => (day.slots[s.id] || []).length);
      return `
      <section class="day" data-today="${day.date === hoje}">
        <div class="day-head">
          <span class="day-name">${DIAS[new Date(day.date + 'T12:00:00').getDay()]}</span>
          <span class="day-date">${fmtDate(day.date)}</span>
          ${day.date === hoje ? '<span class="today-pill">HOJE</span>' : ''}
        </div>
        ${filled.map((slot) => `
          <div class="slot">
            <div class="slot-name">${slot.icon} ${esc(slot.short || slot.label)}</div>
            <div class="slot-body">${day.slots[slot.id].map(mealHtml).join('')}</div>
          </div>`).join('')}
        <div class="slot day-add-row">
          <button class="slot-add" data-add="${day.date}">
            ${I.plus} ${filled.length ? 'Outra refeição' : 'Planejar este dia'}
          </button>
        </div>
      </section>`;
    }).join('')}`;

  $('[data-prev]').onclick = () => { S.planWeek = shiftWeek(plan.start, -1); viewPlan(); };
  $('[data-next]').onclick = () => { S.planWeek = shiftWeek(plan.start, 1); viewPlan(); };
  $('[data-today]').onclick = () => { S.planWeek = hoje; viewPlan(); };

  $('[data-clear]').onclick = () => {
    confirmar('Limpar todas as refeições desta semana?', async () => {
      await api(`/api/plan/week/${plan.start}`, { method: 'DELETE' });
      viewPlan(); toast('Semana limpa');
    });
  };

  view().querySelectorAll('[data-add]').forEach((btn) => {
    btn.onclick = () => openMealPicker(btn.dataset.add, null);
  });

  view().querySelectorAll('[data-meal-open]').forEach((el) => {
    el.onclick = () => { location.hash = `#/receita/${el.dataset.mealOpen}`; };
  });

  view().querySelectorAll('[data-meal-rm]').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await api(`/api/plan/${btn.dataset.mealRm}`, { method: 'DELETE' });
      viewPlan();
    };
  });
}

function mealHtml(m) {
  const thumb = m.cover_photo
    ? `<img src="/api/photos/${m.cover_photo}?size=thumb" alt="">`
    : `<span class="meal-emoji">${m.recipe_id ? catOf(m.category).icon : '📝'}</span>`;

  return `
    <span class="meal ${m.recipe_id ? '' : 'note'}">
      ${m.recipe_id ? `<span style="display:flex;align-items:center;gap:7px;min-width:0" data-meal-open="${m.recipe_id}">
        ${thumb}<span class="meal-name">${esc(m.title || 'Receita')}</span>
      </span>` : `<span style="display:flex;align-items:center;gap:7px;min-width:0">
        ${thumb}<span class="meal-name">${esc(m.note)}</span>
      </span>`}
      <button class="meal-x" data-meal-rm="${m.id}" aria-label="Remover">${I.x}</button>
    </span>`;
}

/** `slot` nulo faz o modal perguntar a refeição antes de escolher a receita. */
function openMealPicker(date, slot) {
  modal(fmtDate(date, true), (body, close) => {
    body.append(html(`
      ${slot ? '' : `
      <div class="field">
        <span class="field-label">Qual refeição?</span>
        <div class="slot-choice">
          ${S.meta.mealSlots.map((s, i) => `
            <button class="chip" data-slot="${s.id}" aria-pressed="${i === 1}">
              ${s.icon} ${esc(s.label)}
            </button>`).join('')}
        </div>
      </div>`}
      <label class="search" style="display:block;margin-bottom:12px">
        ${I.search}
        <input type="search" placeholder="Buscar receita…" data-q>
      </label>
      <div data-list style="max-height:44dvh;overflow-y:auto;margin-bottom:14px">
        <div class="loading"><span class="spinner"></span></div>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:13px">
        <label class="field" style="margin-bottom:9px">
          <span class="field-label">Ou escreva algo livre</span>
          <input class="input" data-note placeholder="Sobra de ontem, pedir pizza…">
        </label>
        <button class="btn btn-ghost btn-block btn-sm" data-addnote>Anotar sem receita</button>
      </div>`));

    const list = body.querySelector('[data-list]');

    // Sem slot definido, o almoço vem pré-escolhido e os chips trocam.
    let chosen = slot || S.meta.mealSlots[1]?.id || S.meta.mealSlots[0].id;
    body.querySelectorAll('[data-slot]').forEach((btn) => {
      btn.onclick = () => {
        chosen = btn.dataset.slot;
        body.querySelectorAll('[data-slot]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === btn));
        });
      };
    });

    async function load(q = '') {
      const recipes = await api(`/api/recipes?${new URLSearchParams(q ? { q } : {})}`);
      if (!recipes.length) {
        list.innerHTML = `<p style="color:var(--ink-3);font-size:14px;padding:14px 2px">Nenhuma receita encontrada.</p>`;
        return;
      }
      list.innerHTML = recipes.slice(0, 40).map((r) => `
        <button class="shop-item" data-pick="${r.id}" style="width:100%;text-align:left;cursor:pointer">
          ${r.cover_photo
            ? `<img src="/api/photos/${r.cover_photo}?size=thumb" alt="" style="width:38px;height:38px;border-radius:7px;object-fit:cover;flex:none">`
            : `<span class="meal-emoji" style="width:38px;height:38px;font-size:18px">${catOf(r.category).icon}</span>`}
          <span style="flex:1;min-width:0">
            <span class="shop-label" style="display:block">${esc(r.title)}</span>
            <span class="shop-from">${catOf(r.category).label}${r.prep_time ? ' · ' + esc(r.prep_time) : ''}</span>
          </span>
        </button>`).join('');

      list.querySelectorAll('[data-pick]').forEach((btn) => {
        btn.onclick = async () => {
          await api('/api/plan', { method: 'POST', body: { date, slot: chosen, recipe_id: btn.dataset.pick } });
          close(); viewPlan(); toast('Adicionado ao planejador');
        };
      });
    }

    let t;
    body.querySelector('[data-q]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => load(e.target.value.trim()), 300);
    });

    body.querySelector('[data-addnote]').onclick = async () => {
      const note = body.querySelector('[data-note]').value.trim();
      if (!note) { toast('Escreva alguma coisa'); return; }
      await api('/api/plan', { method: 'POST', body: { date, slot: chosen, note } });
      close(); viewPlan();
    };

    load();
  });
}

// ---- tela: lista de compras ----------------------------------------------

async function viewShopping() {
  renderTabs('lista');
  topbar(brandBar('', 'Lista de compras'));
  view().innerHTML = loading();

  let data;
  try { data = await api('/api/shopping'); }
  catch (err) { view().innerHTML = errorState(err); return; }

  S.shoppingCount = data.total - data.checked;
  renderTabs('lista');

  const pct = data.total ? Math.round((data.checked / data.total) * 100) : 0;

  view().innerHTML = `
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
      <h1 style="font-size:25px">Lista de compras</h1>
      ${data.total ? `<span style="margin-left:auto;font-size:13px;color:var(--ink-3);font-weight:700">${data.checked}/${data.total}</span>` : ''}
    </div>
    ${data.total ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>` : '<div style="height:12px"></div>'}

    <div style="display:flex;gap:7px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" data-additem>${I.plus} Item</button>
      <button class="btn btn-ghost btn-sm" data-copy>${I.copy} Copiar</button>
      ${data.checked ? `<button class="btn btn-quiet btn-sm" data-clearchecked>Limpar comprados</button>` : ''}
      ${data.total ? `<button class="btn btn-quiet btn-sm" data-clearall>${I.trash}</button>` : ''}
    </div>

    ${data.groups.length ? data.groups.map((g) => `
      <section class="aisle">
        <div class="aisle-head">${g.icon} ${esc(g.label)}</div>
        ${g.items.map((i) => `
          <div class="shop-item" data-checked="${i.checked}">
            <div class="shop-main" data-toggle="${i.id}" data-on="${i.checked}">
              <span class="check-box">${I.check}</span>
              <span class="shop-label" style="min-width:0">${esc(i.label)}</span>
            </div>
            <button class="line-del" data-rm="${i.id}" aria-label="Remover">${I.x}</button>
          </div>`).join('')}
      </section>`).join('') : `
      <div class="empty">
        <div class="empty-icon">🛒</div>
        <h3>Lista vazia</h3>
        <p>Toque em <strong>Item</strong> e escreva o que falta comprar. Pode colar vários de uma vez, um por linha.</p>
        <button class="btn btn-primary" data-additem>${I.plus} Adicionar item</button>
      </div>`}`;

  // Marcar/desmarcar
  view().querySelectorAll('[data-toggle]').forEach((el) => {
    el.onclick = async () => {
      const on = el.dataset.on !== 'true';
      el.dataset.on = String(on);
      el.closest('.shop-item').dataset.checked = String(on);
      el.querySelector('.check-box').style.cssText = on
        ? 'background:var(--erva);border-color:var(--erva)' : '';
      el.querySelector('.check-box svg').style.opacity = on ? '1' : '0';
      await api(`/api/shopping/item/${el.dataset.toggle}`, { method: 'PATCH', body: { checked: on } });
      S.shoppingCount += on ? -1 : 1;
      renderTabs('lista');
    };
  });

  // O estado inicial de quem já está marcado
  view().querySelectorAll('[data-toggle][data-on="true"]').forEach((el) => {
    el.querySelector('.check-box').style.cssText = 'background:var(--erva);border-color:var(--erva)';
    el.querySelector('.check-box svg').style.opacity = '1';
  });

  view().querySelectorAll('[data-rm]').forEach((btn) => {
    btn.onclick = async () => {
      await api(`/api/shopping/item/${btn.dataset.rm}`, { method: 'DELETE' });
      viewShopping();
    };
  });

  view().querySelectorAll('[data-additem]').forEach((btn) => btn.addEventListener('click', () => {
    modal('Adicionar à lista', (body, close) => {
      body.append(html(`
        <label class="field">
          <span class="field-label">O que falta comprar?</span>
          <textarea class="textarea" data-text rows="5"
                    placeholder="2 kg de arroz&#10;1 dúzia de ovos&#10;detergente"></textarea>
          <span class="field-hint">
            Um item por linha — dá para colar a lista inteira de uma vez.
            A seção do mercado é escolhida sozinha.
          </span>
        </label>
        <button class="btn btn-primary btn-block" data-go>${I.plus} Adicionar</button>`));

      const go = async () => {
        const text = body.querySelector('[data-text]').value.trim();
        if (!text) { toast('Escreva pelo menos um item'); return; }
        const res = await api('/api/shopping/item', { method: 'POST', body: { text } });
        close();
        viewShopping();
        toast(res.added === 1 ? 'Item adicionado' : `${res.added} itens adicionados`);
      };
      body.querySelector('[data-go]').onclick = go;
      // Ctrl+Enter salva sem precisar mirar no botão.
      body.querySelector('[data-text]').onkeydown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go();
      };
    });
  }));

  $('[data-copy]')?.addEventListener('click', async () => {
    const text = await api('/api/shopping/text', { raw: true });
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('Lista copiada'); }
    } catch { /* usuária cancelou o compartilhamento */ }
  });

  $('[data-clearchecked]')?.addEventListener('click', async () => {
    await api('/api/shopping?only=checked', { method: 'DELETE' });
    viewShopping(); toast('Comprados removidos');
  });

  $('[data-clearall]')?.addEventListener('click', () => {
    confirmar('Apagar a lista inteira?', async () => {
      await api('/api/shopping', { method: 'DELETE' });
      viewShopping();
    });
  });
}

async function refreshShoppingCount() {
  try {
    const d = await api('/api/shopping');
    S.shoppingCount = d.total - d.checked;
  } catch { /* deixa como está */ }
}

// ---- roteador -------------------------------------------------------------

function route() {
  const hash = location.hash.slice(1) || '/';
  const [path] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);
  document.body.classList.remove('cook-mode');

  switch (parts[0]) {
    case undefined:      return viewRecipes();
    case 'receita':      return viewRecipe(parts[1]);
    case 'nova':         return viewEditor(null);
    case 'editar':       return viewEditor(parts[1]);
    case 'adicionar':    return viewAdd();
    case 'planejador':   return viewPlan();
    case 'lista':        return viewShopping();
    default:             location.hash = '#/';
  }
}

async function boot() {
  try {
    S.meta = await api('/api/meta');
  } catch (err) {
    view().innerHTML = errorState(err);
    return;
  }
  await refreshShoppingCount();
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

boot();
