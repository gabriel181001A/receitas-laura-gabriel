/**
 * Le um item escrito a mao ("2 kg de arroz") e descobre quantidade, unidade
 * e em que secao do supermercado ele fica -- so para a lista sair na ordem
 * do corredor. Quem escreve os itens e a pessoa, nao o sistema.
 */

const norm = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const AISLES = [
  { id: 'hortifruti', label: 'Hortifrúti', icon: '🥬' },
  { id: 'acougue', label: 'Açougue e Peixaria', icon: '🥩' },
  { id: 'laticinios', label: 'Laticínios e Frios', icon: '🧀' },
  { id: 'padaria', label: 'Padaria', icon: '🥖' },
  { id: 'mercearia', label: 'Mercearia', icon: '🍚' },
  { id: 'temperos', label: 'Temperos e Condimentos', icon: '🧂' },
  { id: 'congelados', label: 'Congelados', icon: '🧊' },
  { id: 'bebidas', label: 'Bebidas', icon: '🧃' },
  { id: 'outros', label: 'Outros', icon: '🛒' },
];

// A ordem importa: o primeiro termo que casar define a secao. Termos mais
// especificos vem antes dos genericos (ex.: "leite de coco" antes de "leite").
const KEYWORDS = [
  ['congelados', ['sorvete', 'congelad', 'polpa de fruta', 'batata palito', 'nugget', 'ervilha congelada', 'acai']],
  ['bebidas', ['refrigerante', 'suco', 'cerveja', 'vinho', 'cachaca', 'vodka', 'rum', 'whisky', 'agua com gas', 'agua mineral', 'cafe em po', 'cha ', 'energetico', 'espumante', 'licor']],
  ['acougue', ['carne', 'frango', 'file', 'bife', 'costela', 'linguica', 'linguiça', 'bacon', 'peixe', 'salmao', 'tilapia', 'camarao', 'porco', 'lombo', 'picanha', 'alcatra', 'patinho', 'coxa', 'sobrecoxa', 'peito de frango', 'moida', 'moido', 'pernil', 'cordeiro', 'polvo', 'lula', 'atum fresco', 'sardinha fresca', 'coracao']],
  ['laticinios', ['leite condensado', 'leite de coco', 'creme de leite', 'leite em po', 'leite', 'queijo', 'mussarela', 'muçarela', 'parmesao', 'requeijao', 'iogurte', 'manteiga', 'margarina', 'nata', 'ricota', 'cream cheese', 'presunto', 'mortadela', 'peito de peru', 'catupiry', 'gorgonzola', 'provolone', 'coalho', 'chantilly', 'ovo', 'ovos']],
  ['padaria', ['pao', 'pães', 'paes', 'baguete', 'brioche', 'croissant', 'torrada', 'bisnaguinha', 'massa de pastel', 'massa folhada', 'massa de lasanha fresca', 'pao de forma', 'bolo pronto']],
  ['hortifruti', ['alho', 'cebola', 'tomate', 'batata', 'cenoura', 'alface', 'rucula', 'espinafre', 'couve', 'brocolis', 'abobrinha', 'abobora', 'berinjela', 'pimentao', 'pepino', 'limao', 'laranja', 'banana', 'maca', 'maçã', 'morango', 'abacaxi', 'manga', 'mamao', 'melancia', 'melao', 'uva', 'abacate', 'coco fresco', 'salsinha', 'cebolinha', 'coentro', 'manjericao', 'hortela', 'alecrim fresco', 'tomilho fresco', 'gengibre', 'mandioca', 'aipim', 'inhame', 'chuchu', 'quiabo', 'vagem', 'repolho', 'beterraba', 'milho verde', 'cogumelo', 'champignon', 'shitake', 'palmito fresco', 'salsao', 'aipo', 'pera', 'pessego', 'kiwi', 'ameixa fresca', 'maracuja', 'goiaba', 'acelga', 'agriao', 'nabo', 'rabanete', 'batata doce', 'batata-doce']],
  ['temperos', ['sal', 'pimenta', 'oregano', 'cominho', 'paprica', 'páprica', 'curry', 'canela', 'noz-moscada', 'noz moscada', 'cravo', 'louro', 'colorau', 'acafrao', 'açafrão', 'curcuma', 'tempero', 'caldo de galinha', 'caldo de carne', 'shoyu', 'molho ingles', 'mostarda', 'ketchup', 'maionese', 'vinagre', 'essencia', 'baunilha', 'fermento', 'bicarbonato', 'gelatina', 'corante']],
  ['mercearia', ['farinha', 'acucar', 'açúcar', 'arroz', 'feijao', 'macarrao', 'espaguete', 'penne', 'parafuso', 'lasanha', 'oleo', 'azeite', 'aveia', 'granola', 'chocolate', 'achocolatado', 'cacau', 'amido', 'maizena', 'polvilho', 'fuba', 'tapioca', 'lentilha', 'grao de bico', 'grão-de-bico', 'ervilha', 'milho', 'extrato de tomate', 'molho de tomate', 'atum', 'sardinha', 'azeitona', 'palmito', 'castanha', 'amendoa', 'amendoim', 'noz', 'passas', 'mel', 'geleia', 'pasta de amendoim', 'leite vegetal', 'biscoito', 'bolacha', 'cafe', 'coco ralado', 'leite de castanha', 'proteina', 'whey', 'linhaca', 'chia', 'quinoa', 'sementes']],
];

/** Descobre em que secao do mercado o ingrediente fica. */
export function classifyAisle(text) {
  const n = norm(text);
  for (const [aisle, terms] of KEYWORDS) {
    for (const term of terms) {
      const t = norm(term);
      // Casa como palavra inteira para "sal" nao pegar "salsinha".
      const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (re.test(n)) return aisle;
    }
  }
  return 'outros';
}

const FRACTIONS = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const WORD_NUMBERS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, meia: 0.5, meio: 0.5,
};

// Formas escritas -> unidade canonica.
const UNIT_ALIASES = [
  [/^(g|gr|grama|gramas)$/i, 'g'],
  [/^(kg|quilo|quilos|kgs)$/i, 'kg'],
  [/^(ml|mls|mililitros?)$/i, 'ml'],
  [/^(l|lt|litro|litros)$/i, 'L'],
  [/^(x[ií]cara|x[ií]caras|cup|cups)$/i, 'xícara'],
  [/^(colher|colheres|tbsp|tsp)$/i, 'colher'],
  [/^(copo|copos)$/i, 'copo'],
  [/^(lata|latas)$/i, 'lata'],
  [/^(pacote|pacotes)$/i, 'pacote'],
  [/^(d[eu]nte|d[eu]ntes)$/i, 'dente'],
  [/^(pitada|pitadas)$/i, 'pitada'],
  [/^(unidade|unidades|un|und)$/i, 'un'],
  [/^(fatia|fatias)$/i, 'fatia'],
  [/^(caixa|caixas)$/i, 'caixa'],
  [/^(pote|potes)$/i, 'pote'],
];

function canonUnit(raw) {
  if (!raw) return '';
  const r = raw.trim();
  for (const [re, canon] of UNIT_ALIASES) if (re.test(r)) return canon;
  return '';
}

/**
 * Quebra "2 xicaras de farinha de trigo" em { qty, unit, name }.
 * Quando nao da pra ler a quantidade, qty vem null e o texto fica inteiro
 * em name -- a lista mostra do jeito que veio.
 */
export function parseIngredient(raw) {
  const original = String(raw).trim();
  // Sub-secao vinda do parser ("Cobertura: 3 colheres de leite").
  let group = '';
  let text = original;
  const groupMatch = text.match(/^([\p{L}\s]{2,20}):\s*(.+)$/u);
  if (groupMatch) {
    group = groupMatch[1].trim();
    text = groupMatch[2].trim();
  }

  let rest = text;
  let qty = null;

  // 1. Quantidade numerica, fracionaria ou por extenso.
  const mixed = rest.match(/^(\d+)\s+e\s+(\d+)\s*\/\s*(\d+)\s*/); // "2 e 1/2"
  const frac = rest.match(/^(\d+)\s*\/\s*(\d+)\s*/); // "1/2"
  const uni = rest.match(/^([½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
  const dec = rest.match(/^(\d+[.,]?\d*)\s*/);
  const word = rest.match(/^(um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|meia|meio)\b\s*/i);

  if (mixed) {
    qty = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    rest = rest.slice(mixed[0].length);
  } else if (frac) {
    qty = Number(frac[1]) / Number(frac[2]);
    rest = rest.slice(frac[0].length);
  } else if (uni) {
    qty = FRACTIONS[uni[1]];
    rest = rest.slice(uni[0].length);
  } else if (dec) {
    qty = Number(dec[1].replace(',', '.'));
    rest = rest.slice(dec[0].length);
  } else if (word) {
    qty = WORD_NUMBERS[norm(word[1])];
    rest = rest.slice(word[0].length);
  }

  // 2. Unidade -- grudada no numero ("200g") ou como palavra seguinte.
  let unit = '';
  const attached = rest.match(/^(g|kg|mg|ml|l|oz|lb|un)\b\s*/i);
  if (qty !== null && attached) {
    unit = canonUnit(attached[1]);
    rest = rest.slice(attached[0].length);
  } else {
    const wordUnit = rest.match(/^([\p{L}]+)\b\s*/u);
    if (qty !== null && wordUnit) {
      const c = canonUnit(wordUnit[1]);
      if (c) {
        unit = c;
        rest = rest.slice(wordUnit[0].length);
        // "colher de sopa", "xicara de cha"
        const spoon = rest.match(/^(de\s+)?(sopa|cha|ch[aá]|sobremesa|caf[eé])\b\s*/i);
        if (spoon && (unit === 'colher' || unit === 'xícara')) {
          unit = `${unit} de ${norm(spoon[2])}`;
          rest = rest.slice(spoon[0].length);
        }
      }
    }
  }

  // 3. Limpa o "de" de ligacao e as observacoes de preparo.
  let name = rest.replace(/^de\s+/i, '').trim();
  name = name.replace(/\s*[,(].*$/, '').trim(); // "cebola, picada" -> "cebola"
  name = name.replace(/\s+(picad[oa]s?|fatiad[oa]s?|ralad[oa]s?|cozid[oa]s?|cru[a]?s?|em cubos|em rodelas|a gosto|opcional)\b.*$/i, '').trim();

  if (!name) { name = text; qty = null; unit = ''; }

  return { qty, unit, name, group, original };
}

const fmtQty = (n) => {
  if (n === null || n === undefined) return '';
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
};

// Unidades de massa/volume grudam no numero: "600g", nao "600 g".
const ATTACHED = new Set(['g', 'kg', 'mg', 'ml', 'L']);

// Plurais irregulares do portugues que aparecem em receita.
const PLURALS = { colher: 'colheres', 'colher de sopa': 'colheres de sopa',
  'colher de cha': 'colheres de chá', 'colher de sobremesa': 'colheres de sobremesa',
  'colher de cafe': 'colheres de café' };

function pluralize(unit, qty) {
  if (qty <= 1 || unit === 'un') return unit;
  if (PLURALS[unit]) return PLURALS[unit];
  // "xícara" -> "xícaras", "dente" -> "dentes"
  const [head, ...rest] = unit.split(' ');
  return [head.endsWith('s') ? head : head + 's', ...rest].join(' ');
}

/** Monta de volta o texto legivel de um item. */
export function formatItem({ qty, unit, name }) {
  if (qty === null || qty === undefined) {
    return unit ? `${unit} de ${name}` : name;
  }
  const q = fmtQty(qty);
  if (!unit) return `${q} ${name}`;                       // "3 ovos"
  if (ATTACHED.has(unit)) return `${q}${unit} de ${name}`; // "600g de frango"
  return `${q} ${pluralize(unit, qty)} de ${name}`;        // "8 dentes de alho"
}

