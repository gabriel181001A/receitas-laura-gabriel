import { Router } from 'express';
import crypto from 'node:crypto';
import { extractFromUrl, isValidUrl, detectPlatform, hasYtDlp } from '../lib/extract.js';
import { parseCaption } from '../lib/parse.js';

const router = Router();

// Guarda a capa baixada por alguns minutos: a tela primeiro faz o preview,
// e so depois (quando a usuaria confirma) cria a receita e anexa a imagem.
const pendingThumbs = new Map();
const THUMB_TTL_MS = 15 * 60 * 1000;

function stashThumb(buffer) {
  if (!buffer) return null;
  const key = crypto.randomUUID();
  pendingThumbs.set(key, { buffer, at: Date.now() });
  return key;
}

export function takeThumb(key) {
  if (!key) return null;
  const entry = pendingThumbs.get(key);
  if (!entry) return null;
  pendingThumbs.delete(key);
  return entry.buffer;
}

setInterval(() => {
  const cutoff = Date.now() - THUMB_TTL_MS;
  for (const [k, v] of pendingThumbs) if (v.at < cutoff) pendingThumbs.delete(k);
}, 5 * 60 * 1000).unref();

const SOURCE_NAMES = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube',
  facebook: 'Facebook', pinterest: 'Pinterest', web: 'Web',
};

/** Sugere uma categoria a partir das tags e do titulo. */
function guessCategory({ title, tags }) {
  const hay = `${title} ${tags.join(' ')}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rules = [
    ['sobremesa', ['sobremesa', 'doce', 'pudim', 'mousse', 'brigadeiro', 'torta doce', 'mousse', 'mousse', 'mousse', 'pavê', 'pave', 'sorvete', 'brownie', 'cookie']],
    ['paes-bolos', ['bolo', 'pao', 'paes', 'brioche', 'focaccia', 'muffin', 'panetone', 'rosca']],
    // Café da manhã e fitness vêm antes de "massas": uma panqueca fit é
    // café da manhã, e o sinal específico deve ganhar do genérico.
    ['cafe-da-manha', ['cafe da manha', 'cafedamanha', 'breakfast', 'tapioca', 'ovo mexido', 'crepioca', 'granola', 'panqueca americana']],
    ['fitness', ['fit', 'fitness', 'low carb', 'lowcarb', 'proteico', 'saudavel', 'light']],
    ['massas', ['macarrao', 'massa', 'espaguete', 'lasanha', 'nhoque', 'panqueca', 'ravioli', 'penne', 'talharim']],
    ['carnes', ['carne', 'frango', 'file', 'bife', 'costela', 'picanha', 'churrasco', 'porco', 'peixe', 'salmao', 'camarao']],
    ['saladas', ['salada', 'salad']],
    ['sopas', ['sopa', 'caldo', 'canja', 'creme de']],
    ['bebidas', ['suco', 'drink', 'smoothie', 'vitamina', 'shake', 'cafe', 'chá', 'cha ', 'limonada']],
    ['cafe-da-manha', ['cafe da manha', 'breakfast', 'tapioca', 'ovo mexido', 'crepioca', 'granola']],
    ['lanche', ['lanche', 'sanduiche', 'sanduba', 'snack', 'petisco', 'wrap', 'hamburguer']],
    ['fitness', ['fit', 'fitness', 'low carb', 'lowcarb', 'proteico', 'saudavel', 'light']],
  ];
  for (const [cat, terms] of rules) {
    if (terms.some((t) => hay.includes(t))) return cat;
  }
  return 'outros';
}

/** Monta o rascunho de receita a partir de uma legenda + contexto do link. */
function draftFrom(caption, { url = '', platform = 'web', author = '', videoUrl = '' } = {}) {
  const parsed = parseCaption(caption);
  return {
    ...parsed,
    category: guessCategory(parsed),
    source_url: url,
    source_name: author ? `${SOURCE_NAMES[platform] || 'Web'} · ${author}` : (SOURCE_NAMES[platform] || ''),
    video_url: videoUrl || url,
    raw_caption: caption,
  };
}

/** Le um link e devolve o rascunho da receita (sem salvar nada). */
router.post('/link', async (req, res, next) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Link inválido. Cole o endereço completo do post.' });
    }

    const result = await extractFromUrl(url);
    const platform = detectPlatform(url);

    if (!result.ok) {
      return res.status(422).json({
        error: result.message,
        platform,
        fallback: 'paste',
        ytdlp: await hasYtDlp(),
        attempts: result.attempts,
      });
    }

    res.json({
      ok: true,
      platform,
      via: result.via,
      thumbKey: stashThumb(result.thumbnail),
      hasThumb: Boolean(result.thumbnail),
      draft: draftFrom(result.caption, {
        url, platform, author: result.author, videoUrl: result.videoUrl,
      }),
    });
  } catch (err) { next(err); }
});

/** Fallback: a usuaria cola a legenda na mao. Sempre funciona. */
router.post('/caption', async (req, res, next) => {
  try {
    const caption = String(req.body?.caption || '').trim();
    if (caption.length < 10) {
      return res.status(400).json({ error: 'Cole a legenda da receita (texto muito curto).' });
    }
    const url = String(req.body?.url || '').trim();
    const platform = url ? detectPlatform(url) : 'web';
    res.json({ ok: true, platform, via: 'manual', draft: draftFrom(caption, { url, platform }) });
  } catch (err) { next(err); }
});

export default router;
