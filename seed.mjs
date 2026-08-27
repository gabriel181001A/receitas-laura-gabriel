/** Popula o banco com receitas de exemplo. Rode com o servidor no ar. */
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:3000';

const api = async (path, body, method = 'POST') => {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

/** Capa de exemplo: gradiente quente com o motivo de azulejo por cima. */
async function fakePhoto(c1, c2, emoji) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="900" height="1200" fill="url(#g)"/>
    <g fill="none" stroke="#fff" stroke-width="6" opacity="0.14">
      ${[0,1,2,3,4,5,6].flatMap(r=>[0,1,2,3,4].map(c=>{
        const x=c*180+90, y=r*180+90;
        return `<path d="M${x} ${y-64} L${x+64} ${y} L${x} ${y+64} L${x-64} ${y} Z"/>`;
      })).join('')}
    </g>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

const RECEITAS = [
  {
    caption: `STROGONOFF DE FRANGO CREMOSO 🍗

O jantar que salva qualquer terça-feira.

INGREDIENTES:
- 600g de peito de frango em cubos
- 1 cebola picada
- 2 dentes de alho
- 2 colheres de sopa de manteiga
- 1 lata de creme de leite
- 3 colheres de sopa de ketchup
- 1 colher de sopa de mostarda
- 200g de champignon fatiado
- Sal e pimenta a gosto

MODO DE PREPARO:
1. Tempere o frango com sal e pimenta e deixe descansar 10 minutos
2. Doure o frango na manteiga em fogo alto, em duas levas
3. Refogue a cebola e o alho na mesma panela
4. Volte o frango, junte o ketchup, a mostarda e o champignon
5. Desligue o fogo e misture o creme de leite

Rende 4 porcoes
#strogonoff #jantarrapido #frango`,
    photo: ['#A9502C', '#6B2E16'],
    rating: 5, favorite: true,
  },
  {
    caption: `Bolo de cenoura com cobertura de brigadeiro

INGREDIENTES:
- 3 cenouras medias
- 3 ovos
- 1 xicara de oleo
- 2 xicaras de acucar
- 2 e 1/2 xicaras de farinha de trigo
- 1 colher de sopa de fermento

COBERTURA:
- 1 lata de leite condensado
- 4 colheres de achocolatado
- 1 colher de manteiga

MODO DE PREPARO:
1. Bata no liquidificador a cenoura, os ovos e o oleo
2. Adicione o acucar e bata mais um pouco
3. Misture a farinha e o fermento delicadamente com um fuba
4. Asse em forno 180C por 40 minutos
5. Para a cobertura, leve tudo ao fogo ate desgrudar da panela

Rende 12 porcoes
#bolo #bolodecenoura #sobremesa`,
    photo: ['#C68B3A', '#8E5A1C'],
    rating: 5, favorite: true,
  },
  {
    caption: `Macarrao alho e oleo em 10 minutos

500g de espaguete
6 dentes de alho fatiados
1/2 xicara de azeite
Sal a gosto
Salsinha picada
Pimenta calabresa a gosto

Cozinhe o macarrao na agua salgada ate ficar al dente.
Doure o alho no azeite em fogo baixo, com muito cuidado pra nao queimar.
Misture tudo com um pouco da agua do cozimento e finalize com salsinha.

#macarrao #jantarrapido #massas`,
    photo: ['#5F7A46', '#3B4E2A'],
    rating: 4,
  },
  {
    caption: `PANQUECA DE BANANA FIT 🍌

Café da manhã de 5 minutos, sem farinha.

INGREDIENTES:
- 2 bananas maduras
- 2 ovos
- 3 colheres de sopa de aveia
- 1 pitada de canela
- 1 colher de cha de fermento

MODO DE PREPARO:
1. Amasse as bananas com um garfo
2. Misture os ovos, a aveia, a canela e o fermento
3. Frite em frigideira antiaderente em fogo baixo
4. Vire quando aparecerem bolhas na superficie

Rende 6 unidades
#fit #panqueca #cafedamanha #lowcarb`,
    photo: ['#D2A467', '#9A713C'],
    rating: 4,
  },
  {
    caption: `Salada de grão-de-bico com tomate seco

INGREDIENTES:
- 2 latas de grao de bico
- 200g de tomate seco picado
- 1 cebola roxa fatiada fina
- 150g de queijo feta
- Folhas de manjericao
- 4 colheres de sopa de azeite
- Suco de 1 limao
- Sal e pimenta a gosto

MODO DE PREPARO:
1. Escorra e lave bem o grao de bico
2. Misture todos os ingredientes numa tigela grande
3. Tempere com azeite, limao, sal e pimenta
4. Deixe descansar 20 minutos na geladeira antes de servir

Rende 4 porcoes
#salada #vegetariano #almoco`,
    photo: ['#778A4E', '#4A582C'],
    rating: 3,
  },
  {
    caption: `Sopa de abóbora com gengibre

INGREDIENTES:
- 1 kg de abobora cabotia em cubos
- 1 cebola picada
- 3 dentes de alho
- 1 pedaco de gengibre ralado
- 1 litro de caldo de legumes
- 200ml de leite de coco
- Azeite, sal e pimenta

MODO DE PREPARO:
1. Refogue a cebola, o alho e o gengibre no azeite
2. Junte a abobora e o caldo, cozinhe por 25 minutos
3. Bata tudo no liquidificador ate ficar bem lisa
4. Volte a panela, junte o leite de coco e acerte o sal

Rende 6 porcoes
#sopa #jantar #vegano`,
    photo: ['#C67F30', '#84491A'],
  },
];

console.log('Populando…\n');

const ids = [];
for (const item of RECEITAS) {
  const { draft } = await api('/api/import/caption', { caption: item.caption });
  const { id } = await api('/api/recipes', {
    ...draft, rating: item.rating || 0, favorite: item.favorite || false,
  });
  ids.push(id);

  const buf = await fakePhoto(item.photo[0], item.photo[1]);
  const fd = new FormData();
  fd.append('photos', new Blob([buf], { type: 'image/jpeg' }), 'capa.jpg');
  await fetch(`${BASE}/api/photos/${id}`, { method: 'POST', body: fd });

  console.log(`  ✓ ${draft.title}`);
  console.log(`     ${draft.ingredients.length} ingredientes · ${draft.steps.length} passos · ${draft.category}`);
}

// Planeja a semana com as receitas criadas
const hoje = new Date();
const slots = ['almoco', 'jantar', 'cafe', 'jantar', 'almoco', 'jantar'];
for (let i = 0; i < 6; i++) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + i);
  await api('/api/plan', {
    date: d.toISOString().slice(0, 10),
    slot: slots[i],
    recipe_id: ids[i % ids.length],
  });
}
console.log('\n  ✓ Semana planejada');

// A lista de compras é manual — aqui vai só um exemplo do que se escreveria.
const res = await api('/api/shopping/item', {
  text: [
    '2 kg de arroz',
    '1 dúzia de ovos',
    '500g de peito de frango',
    '3 tomates',
    '1 pacote de café',
    'detergente',
    'bananas',
  ].join('\n'),
});
console.log(`  ✓ Lista de compras: ${res.added} itens escritos à mão\n`);
