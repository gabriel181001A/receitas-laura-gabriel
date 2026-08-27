/**
 * Converte a legenda crua de um post (Instagram / TikTok / YouTube) em uma
 * receita estruturada. Tudo aqui e heuristica: o objetivo e acertar a maior
 * parte e deixar o resto facil de corrigir na tela de edicao.
 */

const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Cabecalhos que abrem uma lista de ingredientes.
const ING_HEADERS = [
  'ingredientes', 'ingrediente', 'ingredients', 'lista de compras',
  'voce vai precisar', 'vc vai precisar', 'vai precisar de', 'materiais',
];

// Sub-secoes que ainda sao ingredientes, mas de uma parte da receita.
const ING_SUBSECTIONS = [
  'massa', 'recheio', 'cobertura', 'calda', 'molho', 'creme', 'glace',
  'ganache', 'farofa', 'marinada', 'tempero', 'caramelo', 'mousse',
  'base', 'topping', 'crocante', 'brigadeiro', 'merengue', 'purê', 'pure',
];

// Cabecalhos que abrem o modo de preparo.
const STEP_HEADERS = [
  'modo de preparo', 'modo de fazer', 'preparo', 'como fazer', 'passo a passo',
  'instrucoes', 'instructions', 'directions', 'method', 'metodo', 'execucao',
  'como preparar', 'preparacao', 'steps', 'modo',
];

// Rodape de engajamento que nao faz parte da receita.
const NOISE = [
  'salva esse', 'salve esse', 'salva ai', 'salvar esse', 'me segue', 'siga',
  'comenta', 'compartilha', 'link na bio', 'clique no link', 'marca alguem',
  'marque alguem', 'deixa o like', 'ative o sininho', 'receita completa no',
  'segue a gente', 'todos os direitos', 'follow me', 'link in bio',
];

const BULLET = /^\s*(?:[-–—•·*▪◦‣>»]+|\d{1,2}\s*[.)\]-]|[a-z]\s*[.)])\s+/i;
const LEADING_EMOJI = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}️‍\s]+/u;

// Linha que so informa rendimento/tempo -- vira campo, nao vira passo.
const META_LINE = /^\s*(rende|rendimento|serve|por[çc][õo]es|tempo|prepar[oa] em|yields?|serves?|servings?|total time|prep time)\b/i;

// Comeca com quantidade: "2 ovos", "1/2 xicara", "meia colher"
const QUANTITY = /^\s*(?:\d+[.,]?\d*\s*(?:\/\s*\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞]|uma?|dois|duas|tr[eê]s|quatro|cinco|seis|meia|meio)/i;

// Unidades como palavra isolada. "dente" sozinho casava com "al dente".
const UNIT = /\b(x[ií]caras?|colheres?|colher|copos?|gramas?|kgs?|quilos?|ml|mls|litros?|latas?|pacotes?|pitadas?|unidades?|f[ai]tias?|caixas?|potes?|cups?|tbsp|tsp|oz|lb|d[eu]ntes? de)\b/i;

// Unidade grudada no numero: 200g, 1kg, 500ml, 1.5L
const ATTACHED_UNIT = /^\s*\d+[.,]?\d*\s*(g|kg|mg|ml|l|oz|lb|un)\b/i;

// "sal a gosto", "azeite q.b."
const TO_TASTE = /\b(a gosto|a vontade|q\.?\s?b\.?|to taste|se necess[aá]rio)\b/i;

// Verbos imperativos que marcam o inicio do modo de preparo.
const COOK_VERB = new RegExp(
  '^(bata|misture|adicione|acrescente|coloque|leve|asse|frite|refogue|cozinhe|' +
  'corte|pique|mexa|despeje|reserve|deixe|aque[cç]a|sirva|retire|unte|polvilhe|' +
  'dissolva|junte|incorpore|transfira|forre|decore|finalize|tempere|doure|ferva|' +
  'escorra|amasse|sove|abra|enrole|recheie|monte|cubra|regue|derreta|separe|lave|' +
  'descasque|rale|esprema|combine|hidrate|preaque[cç]a|bater|misturar|levar|' +
  'heat|mix|add|stir|bake|cook|pour|whisk|preheat)\\b',
  'i',
);

function headerMatch(line, list) {
  const n = norm(line)
    .replace(LEADING_EMOJI, '')
    .replace(/^[^\p{L}]+/u, '')
    .replace(/[:：.\-–—!*_#\s]+$/g, '')
    .trim();
  if (!n || n.length > 42) return false;
  return list.some(
    (h) => n === h || n === h + 's' || n.startsWith(h + ' ') || n.startsWith(h + ':'),
  );
}

const isNoise = (line) => NOISE.some((p) => norm(line).includes(p));

const stripBullet = (line) =>
  line.replace(BULLET, '').replace(LEADING_EMOJI, '').trim();

function looksLikeIngredient(line) {
  const t = stripBullet(line);
  if (!t || t.length > 110) return false;
  const words = t.split(/\s+/).length;
  if (ATTACHED_UNIT.test(t)) return true;
  if (QUANTITY.test(t) && words <= 14) return true;
  if (UNIT.test(t) && words <= 12) return true;
  if (TO_TASTE.test(t) && words <= 10) return true;
  return false;
}

function looksLikeStep(line) {
  const t = stripBullet(line);
  if (!t) return false;
  if (COOK_VERB.test(t)) return true;
  return t.split(/\s+/).length >= 8 && /[.!?]$/.test(t);
}

/** Extrai "45 minutos" / "1h30" de um texto livre. */
function findTime(text) {
  const m = text.match(
    /(\d+\s*h(?:oras?)?(?:\s*\d+\s*(?:min|minutos?)?)?|\d+\s*(?:min\b|minutos?))/i,
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** Extrai "rende 12 porcoes" / "serve 4 pessoas". */
function findServings(text) {
  const m = text.match(
    /(?:rende|serve|rendimento|yields?|serves?)[:\s]*(?:cerca de\s*|aproximadamente\s*)?(\d+\s*(?:a\s*\d+\s*)?(?:por[çc][õo]es?|pessoas?|unidades?|fatias?|servings?|bolinhos?|p[aã]es?)?)/i,
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

export function parseCaption(raw = '') {
  const text = String(raw).replace(/\r\n?/g, '\n').replace(/ /g, ' ');

  // 1. Hashtags viram tags e saem do corpo.
  const tags = [];
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)) {
    const tag = m[1].toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  const body = text.replace(/#[\p{L}\p{N}_]{2,30}/gu, ' ');
  const lines = body.split('\n').map((l) => l.trim());

  // 2. Varre linha a linha, alternando entre secoes marcadas por cabecalho.
  let mode = 'head';
  let group = '';
  let sawHeader = false;
  const head = [];
  const ingredients = [];
  const steps = [];

  for (const line of lines) {
    if (!line) continue;

    if (headerMatch(line, ING_HEADERS)) { mode = 'ing'; group = ''; sawHeader = true; continue; }
    if (headerMatch(line, STEP_HEADERS)) { mode = 'step'; group = ''; sawHeader = true; continue; }
    if (mode !== 'head' && headerMatch(line, ING_SUBSECTIONS)) {
      mode = 'ing';
      group = stripBullet(line).replace(/[:：]+$/, '').trim();
      continue;
    }
    if (isNoise(line)) continue;

    const t = stripBullet(line);

    if (mode === 'ing') {
      if (!t || META_LINE.test(t)) continue;
      ingredients.push(group ? `${group}: ${t}` : t);
    } else if (mode === 'step') {
      if (!t || META_LINE.test(t)) continue;
      steps.push(t);
    } else {
      head.push(line);
    }
  }

  // 3. Sem cabecalho nenhum? Assume a ordem natural (ingredientes e depois
  //    passos) e troca de modo no primeiro passo de verdade, sem voltar.
  if (!sawHeader && !ingredients.length && !steps.length) {
    let inSteps = false;
    for (const line of head.slice(1)) {
      const t = stripBullet(line);
      if (!t || isNoise(line) || META_LINE.test(t)) continue;
      if (!inSteps && looksLikeStep(line) && !looksLikeIngredient(line)) inSteps = true;
      if (inSteps) steps.push(t);
      else if (looksLikeIngredient(line) || t.split(/\s+/).length <= 6) ingredients.push(t);
    }
    if (ingredients.length || steps.length) head.length = Math.min(head.length, 1);
  }

  // 4. Titulo: primeira linha util, curta, sem emoji.
  let title = '';
  for (const line of head) {
    const t = stripBullet(line)
      .replace(/[\p{Extended_Pictographic}️]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length >= 3 && t.split(/\s+/).length <= 12) { title = t; break; }
  }
  if (!title && head.length) title = stripBullet(head[0]).slice(0, 80);
  title = title.replace(/[:：\-–—,]+$/, '').trim();
  // TITULO GRITADO vira Titulo Normal.
  if (title && title === title.toUpperCase()) {
    title = title.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase());
  }

  // Compara sem acento/emoji/caixa para nao repetir o titulo na descricao.
  const titleKey = norm(title).replace(/[\p{Extended_Pictographic}️]/gu, '').trim();
  const description = head
    .map((l) => stripBullet(l))
    .filter((l) => {
      if (!l || isNoise(l) || META_LINE.test(l)) return false;
      const key = norm(l).replace(/[\p{Extended_Pictographic}️]/gu, '').trim();
      return key !== titleKey;
    })
    .join('\n')
    .trim();

  return {
    title,
    description,
    ingredients,
    steps,
    tags,
    prep_time: findTime(body),
    servings: findServings(body),
  };
}
