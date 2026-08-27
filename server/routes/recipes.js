import { Router } from 'express';
import crypto from 'node:crypto';
import { db, rowToRecipe } from '../db.js';
import { takeThumb } from './import.js';
import { savePhoto } from './photos.js';

const router = Router();
const now = () => new Date().toISOString();

const asArray = (v) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

/** Normaliza o corpo vindo do front num registro pronto pro banco. */
function sanitize(body = {}) {
  return {
    title: String(body.title || '').trim().slice(0, 200) || 'Receita sem nome',
    description: String(body.description || '').trim().slice(0, 5000),
    category: String(body.category || 'outros').trim().slice(0, 60),
    ingredients: JSON.stringify(asArray(body.ingredients)),
    steps: JSON.stringify(asArray(body.steps)),
    tags: JSON.stringify(asArray(body.tags).map((t) => t.toLowerCase()).slice(0, 30)),
    servings: String(body.servings || '').trim().slice(0, 60),
    prep_time: String(body.prep_time || '').trim().slice(0, 60),
    cook_time: String(body.cook_time || '').trim().slice(0, 60),
    difficulty: String(body.difficulty || '').trim().slice(0, 30),
    notes: String(body.notes || '').trim().slice(0, 5000),
    source_url: String(body.source_url || '').trim().slice(0, 1000),
    source_name: String(body.source_name || '').trim().slice(0, 200),
    video_url: String(body.video_url || '').trim().slice(0, 1000),
    favorite: body.favorite ? 1 : 0,
    rating: Math.max(0, Math.min(5, Number(body.rating) || 0)),
  };
}

/** Lista com busca, filtro e ordenacao. */
router.get('/', async (req, res, next) => {
  try {
    const { q, category, tag, favorite, sort } = req.query;
    const where = [];
    const args = [];

    if (q) {
      where.push('(lower(title) LIKE ? OR lower(ingredients) LIKE ? OR lower(tags) LIKE ? OR lower(description) LIKE ?)');
      const like = `%${String(q).toLowerCase()}%`;
      args.push(like, like, like, like);
    }
    if (category && category !== 'todas') { where.push('category = ?'); args.push(String(category)); }
    if (tag) { where.push('lower(tags) LIKE ?'); args.push(`%"${String(tag).toLowerCase()}"%`); }
    if (favorite === 'true') where.push('favorite = 1');

    const order = { recentes: 'updated_at DESC', antigas: 'created_at ASC', az: 'title COLLATE NOCASE ASC', nota: 'rating DESC, updated_at DESC' }[sort] || 'updated_at DESC';

    const sql = `SELECT id, title, description, category, tags, servings, prep_time,
                        cook_time, difficulty, source_name, source_url, cover_photo,
                        favorite, rating, created_at, updated_at,
                        json_array_length(ingredients) AS n_ingredients,
                        json_array_length(steps)       AS n_steps
                 FROM recipes
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY ${order}`;

    const { rows } = await db.execute({ sql, args });
    res.json(rows.map((r) => ({ ...rowToRecipe(r), ingredients: undefined, steps: undefined })));
  } catch (err) { next(err); }
});

/** Contagem por categoria, pra montar os filtros com numero. */
router.get('/counts', async (_req, res, next) => {
  try {
    const { rows } = await db.execute(
      'SELECT category, COUNT(*) AS total FROM recipes GROUP BY category',
    );
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const favs = await db.execute('SELECT COUNT(*) AS n FROM recipes WHERE favorite = 1');
    res.json({
      total,
      favorites: Number(favs.rows[0]?.n || 0),
      byCategory: Object.fromEntries(rows.map((r) => [r.category, Number(r.total)])),
    });
  } catch (err) { next(err); }
});

/** Todas as tags em uso, mais frequentes primeiro. */
router.get('/tags', async (_req, res, next) => {
  try {
    const { rows } = await db.execute('SELECT tags FROM recipes');
    const count = new Map();
    for (const row of rows) {
      try {
        for (const t of JSON.parse(row.tags || '[]')) count.set(t, (count.get(t) || 0) + 1);
      } catch { /* linha com tags invalidas: ignora */ }
    }
    res.json([...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n })));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM recipes WHERE id = ?', args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: 'receita nao encontrada' });

    const photos = await db.execute({
      sql: 'SELECT id, caption, position FROM photos WHERE recipe_id = ? ORDER BY position, created_at',
      args: [req.params.id],
    });
    res.json({ ...rowToRecipe(rows[0]), photos: photos.rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const d = sanitize(req.body);
    const ts = now();
    await db.execute({
      sql: `INSERT INTO recipes (id, title, description, category, ingredients, steps, tags,
                servings, prep_time, cook_time, difficulty, notes, source_url, source_name,
                video_url, favorite, rating, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [id, d.title, d.description, d.category, d.ingredients, d.steps, d.tags,
        d.servings, d.prep_time, d.cook_time, d.difficulty, d.notes, d.source_url,
        d.source_name, d.video_url, d.favorite, d.rating, ts, ts],
    });

    // Capa vinda da importacao por link: anexa, mas nao derruba a receita
    // se o download da imagem tiver expirado ou falhado.
    let coverPhotoId = null;
    const thumb = takeThumb(req.body?.thumb_key);
    if (thumb) {
      try {
        coverPhotoId = await savePhoto(id, thumb, 'Capa do vídeo original');
      } catch (err) {
        console.warn('[import] capa nao pode ser salva:', err.message);
      }
    }

    res.status(201).json({ id, cover_photo: coverPhotoId });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const d = sanitize(req.body);
    const r = await db.execute({
      sql: `UPDATE recipes SET title=?, description=?, category=?, ingredients=?, steps=?,
                tags=?, servings=?, prep_time=?, cook_time=?, difficulty=?, notes=?,
                source_url=?, source_name=?, video_url=?, favorite=?, rating=?, updated_at=?
            WHERE id=?`,
      args: [d.title, d.description, d.category, d.ingredients, d.steps, d.tags, d.servings,
        d.prep_time, d.cook_time, d.difficulty, d.notes, d.source_url, d.source_name,
        d.video_url, d.favorite, d.rating, now(), req.params.id],
    });
    if (!r.rowsAffected) return res.status(404).json({ error: 'receita nao encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** Alterna favorito sem precisar mandar a receita inteira. */
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const r = await db.execute({
      sql: 'UPDATE recipes SET favorite = NOT favorite, updated_at = ? WHERE id = ? RETURNING favorite',
      args: [now(), req.params.id],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'receita nao encontrada' });
    res.json({ favorite: Boolean(r.rows[0].favorite) });
  } catch (err) { next(err); }
});

router.patch('/:id/rating', async (req, res, next) => {
  try {
    const rating = Math.max(0, Math.min(5, Number(req.body?.rating) || 0));
    await db.execute({
      sql: 'UPDATE recipes SET rating = ?, updated_at = ? WHERE id = ?',
      args: [rating, now(), req.params.id],
    });
    res.json({ rating });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    // Sem ON DELETE CASCADE no libSQL por padrao: limpa na mao.
    await db.execute({ sql: 'DELETE FROM photos WHERE recipe_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'UPDATE meal_plan SET recipe_id = NULL WHERE recipe_id = ?', args: [req.params.id] });
    const r = await db.execute({ sql: 'DELETE FROM recipes WHERE id = ?', args: [req.params.id] });
    if (!r.rowsAffected) return res.status(404).json({ error: 'receita nao encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
