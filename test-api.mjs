/** Teste de fumaça: exercita o fluxo inteiro contra o servidor rodando. */
const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;

const api = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
};

function check(label, cond, extra = '') {
  if (cond) { pass++; console.log('  OK  ', label); }
  else { fail++; console.log('  FALHA', label, extra); }
}

const CAPTION = `PANQUECA DE BANANA FIT

INGREDIENTES:
- 2 bananas maduras
- 2 ovos
- 3 colheres de aveia
- 1 pitada de canela

MODO DE PREPARO:
1. Amasse as bananas com um garfo
2. Misture os ovos e a aveia
3. Frite em frigideira antiaderente

Rende 4 porcoes
#fit #panqueca`;

console.log('\n=== 1. metadados ===');
{
  const { status, data } = await api('GET', '/api/meta');
  check('GET /api/meta responde 200', status === 200);
  check('traz categorias', Array.isArray(data.categories) && data.categories.length > 5);
  check('traz seções de mercado', Array.isArray(data.aisles));
  check('traz refeições', Array.isArray(data.mealSlots) && data.mealSlots.length === 4);
  console.log('       yt-dlp disponivel:', data.ytdlp);
}

console.log('\n=== 2. importar colando legenda ===');
let draft;
{
  const { status, data } = await api('POST', '/api/import/caption', { caption: CAPTION });
  check('POST /api/import/caption responde 200', status === 200, JSON.stringify(data).slice(0, 200));
  draft = data.draft;
  check('extraiu titulo', draft?.title?.includes('Panqueca'), draft?.title);
  check('extraiu 4 ingredientes', draft?.ingredients?.length === 4, JSON.stringify(draft?.ingredients));
  check('extraiu 3 passos', draft?.steps?.length === 3, JSON.stringify(draft?.steps));
  // "PANQUECA ... FIT" com #fit: fitness e café da manhã são ambos defensáveis.
  check('adivinhou categoria plausível',
    ['fitness', 'cafe-da-manha'].includes(draft?.category), draft?.category);
  check('extraiu rendimento', draft?.servings?.includes('4'), draft?.servings);
  check('extraiu tags', draft?.tags?.includes('fit'), JSON.stringify(draft?.tags));
  check('legenda curta é rejeitada', (await api('POST', '/api/import/caption', { caption: 'oi' })).status === 400);
}

console.log('\n=== 3. CRUD de receita ===');
let recipeId;
{
  const { status, data } = await api('POST', '/api/recipes', draft);
  check('POST /api/recipes responde 201', status === 201, JSON.stringify(data));
  recipeId = data.id;

  const got = await api('GET', `/api/recipes/${recipeId}`);
  check('GET receita traz ingredientes', got.data.ingredients?.length === 4);
  check('GET receita traz array de fotos', Array.isArray(got.data.photos));

  const fav = await api('PATCH', `/api/recipes/${recipeId}/favorite`);
  check('favoritar funciona', fav.data.favorite === true);

  const list = await api('GET', '/api/recipes?q=panqueca');
  check('busca encontra a receita', list.data.some((r) => r.id === recipeId));

  const byCat = await api('GET', `/api/recipes?category=${draft.category}`);
  check('filtro por categoria funciona', byCat.data.some((r) => r.id === recipeId));

  const counts = await api('GET', '/api/recipes/counts');
  check('contagem por categoria', counts.data.total >= 1, JSON.stringify(counts.data));

  const tags = await api('GET', '/api/recipes/tags');
  check('lista de tags', tags.data.some((t) => t.tag === 'fit'));

  check('receita inexistente da 404', (await api('GET', '/api/recipes/nao-existe')).status === 404);
}

console.log('\n=== 4. lista de compras (manual) ===');
{
  await api('DELETE', '/api/shopping');

  const um = await api('POST', '/api/shopping/item', { text: '2 kg de arroz' });
  check('item avulso responde 201', um.status === 201 && um.data.added === 1, JSON.stringify(um.data));

  // Uma linha por item; marcador de lista e linha em branco são tolerados.
  const varios = await api('POST', '/api/shopping/item', {
    text: '1 duzia de ovos\n- detergente\n500g de peito de frango\n\n3 tomates',
  });
  check('aceita várias linhas de uma vez', varios.data.added === 4, JSON.stringify(varios.data));

  const list = await api('GET', '/api/shopping');
  check('total bate', list.data.total === 5, String(list.data.total));
  check('agrupa por seção do mercado', list.data.groups.length >= 3);
  console.log('       seções:', list.data.groups.map((g) => `${g.label}(${g.items.length})`).join(', '));

  const todos = list.data.groups.flatMap((g) => g.items);
  const frango = todos.find((i) => i.name.toLowerCase().includes('frango'));
  check('frango vai pro açougue', frango?.aisle === 'acougue', JSON.stringify(frango));
  const arroz = todos.find((i) => i.name.toLowerCase().includes('arroz'));
  check('arroz vai pra mercearia', arroz?.aisle === 'mercearia', JSON.stringify(arroz));
  check('nenhum item traz receita de origem', todos.every((i) => i.recipes.length === 0));

  check('texto vazio é rejeitado', (await api('POST', '/api/shopping/item', { text: '   ' })).status === 400);
  check('marcar como comprado',
    (await api('PATCH', `/api/shopping/item/${todos[0].id}`, { checked: true })).status === 200);
  check('renomear item',
    (await api('PATCH', `/api/shopping/item/${todos[1].id}`, { label: '2 kg de arroz integral' })).status === 200);

  const txt = await api('GET', '/api/shopping/text');
  check('exporta texto pro WhatsApp', typeof txt.data === 'string' && txt.data.includes('Lista de compras'));

  check('limpar só os comprados', (await api('DELETE', '/api/shopping?only=checked')).data.removed === 1);
  check('apagar item', (await api('DELETE', `/api/shopping/item/${todos[1].id}`)).status === 200);

  // A lista é manual: as rotas que puxavam de receita não existem mais.
  check('rota from-recipes removida',
    (await api('POST', '/api/shopping/from-recipes', { recipe_ids: [recipeId] })).status === 404);
  check('rota from-plan removida',
    (await api('POST', '/api/shopping/from-plan', { start: '2030-01-01', end: '2030-01-07' })).status === 404);
}

console.log('\n=== 5. planejador semanal ===');
{
  // Semana bem no futuro: o teste não pode esbarrar em dados já existentes.
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 400);
  const dia = futuro.toISOString().slice(0, 10);

  const add = await api('POST', '/api/plan', { date: dia, slot: 'jantar', recipe_id: recipeId });
  check('agendar receita responde 201', add.status === 201, JSON.stringify(add.data));
  const planId = add.data.id;

  check('data inválida é rejeitada',
    (await api('POST', '/api/plan', { date: '31/12', slot: 'jantar', recipe_id: recipeId })).status === 400);
  check('refeição inválida é rejeitada',
    (await api('POST', '/api/plan', { date: dia, slot: 'ceia', recipe_id: recipeId })).status === 400);

  const week = await api('GET', `/api/plan?date=${dia}`);
  check('semana tem 7 dias', week.data.days?.length === 7);
  check('semana começa na segunda', new Date(week.data.start + 'T12:00:00').getDay() === 1, week.data.start);
  const d = week.data.days.find((x) => x.date === dia);
  check('receita aparece no jantar', d?.slots.jantar?.[0]?.title?.includes('Panqueca'), JSON.stringify(d?.slots.jantar));

  check('anotação livre sem receita',
    (await api('POST', '/api/plan', { date: dia, slot: 'lanche', note: 'sobra de ontem' })).status === 201);
  check('mover para outro dia', (await api('PATCH', `/api/plan/${planId}`, { slot: 'almoco' })).status === 200);
  check('remover do planejador', (await api('DELETE', `/api/plan/${planId}`)).status === 200);
  await api('DELETE', `/api/plan/week/${dia}`);
}

console.log('\n=== 6. limpeza ===');
{
  check('apagar receita', (await api('DELETE', `/api/recipes/${recipeId}`)).status === 200);
  check('receita sumiu', (await api('GET', `/api/recipes/${recipeId}`)).status === 404);
  await api('DELETE', '/api/shopping');
}

console.log(`\n${'='.repeat(46)}`);
console.log(`  ${pass} passaram, ${fail} falharam`);
console.log('='.repeat(46));
process.exit(fail ? 1 : 0);
