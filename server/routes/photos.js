import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { db } from '../db.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('só imagens são aceitas'), { status: 400 }));
  },
});

/**
 * Foto de celular chega com 4-8 MB. Guardamos duas versoes em webp:
 * uma grande (tela cheia) e uma miniatura (listagem), ambas no proprio banco.
 */
export async function processImage(buffer) {
  const base = sharp(buffer, { failOn: 'none' }).rotate(); // respeita EXIF
  const [full, thumb] = await Promise.all([
    base.clone().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer(),
    base.clone().resize(500, 500, { fit: 'cover', position: 'attention' })
      .webp({ quality: 72 }).toBuffer(),
  ]);
  return { full, thumb };
}

/** Grava uma imagem ja em buffer e devolve o id. Usado tambem pela importacao. */
export async function savePhoto(recipeId, buffer, caption = '') {
  const { full, thumb } = await processImage(buffer);
  const id = crypto.randomUUID();
  const { rows } = await db.execute({
    sql: 'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM photos WHERE recipe_id = ?',
    args: [recipeId],
  });
  await db.execute({
    sql: `INSERT INTO photos (id, recipe_id, data, thumb, mime, caption, position, created_at)
          VALUES (?,?,?,?,?,?,?,?)`,
    args: [id, recipeId, full, thumb, 'image/webp', caption,
      Number(rows[0]?.next || 0), new Date().toISOString()],
  });

  // Primeira foto da receita vira a capa automaticamente.
  await db.execute({
    sql: 'UPDATE recipes SET cover_photo = ?, updated_at = ? WHERE id = ? AND (cover_photo IS NULL OR cover_photo = \'\')',
    args: [id, new Date().toISOString(), recipeId],
  });
  return id;
}

router.post('/:recipeId', upload.array('photos', 12), async (req, res, next) => {
  try {
    const { recipeId } = req.params;
    const exists = await db.execute({ sql: 'SELECT id FROM recipes WHERE id = ?', args: [recipeId] });
    if (!exists.rows.length) return res.status(404).json({ error: 'receita nao encontrada' });
    if (!req.files?.length) return res.status(400).json({ error: 'nenhuma imagem enviada' });

    const ids = [];
    for (const file of req.files) ids.push(await savePhoto(recipeId, file.buffer));
    res.status(201).json({ ids });
  } catch (err) { next(err); }
});

/** Serve a imagem. ?size=thumb devolve a miniatura. */
router.get('/:id', async (req, res, next) => {
  try {
    const col = req.query.size === 'thumb' ? 'thumb' : 'data';
    const { rows } = await db.execute({
      sql: `SELECT ${col} AS img, mime FROM photos WHERE id = ?`, args: [req.params.id],
    });
    if (!rows.length) return res.status(404).end();

    const raw = rows[0].img;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    res.set('Content-Type', rows[0].mime || 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buf);
  } catch (err) { next(err); }
});

router.patch('/:id/cover', async (req, res, next) => {
  try {
    const { rows } = await db.execute({
      sql: 'SELECT recipe_id FROM photos WHERE id = ?', args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: 'foto nao encontrada' });
    await db.execute({
      sql: 'UPDATE recipes SET cover_photo = ?, updated_at = ? WHERE id = ?',
      args: [req.params.id, new Date().toISOString(), rows[0].recipe_id],
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.execute({
      sql: 'SELECT recipe_id FROM photos WHERE id = ?', args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: 'foto nao encontrada' });
    const recipeId = rows[0].recipe_id;

    await db.execute({ sql: 'DELETE FROM photos WHERE id = ?', args: [req.params.id] });

    // Se era a capa, promove a proxima foto da receita.
    const next2 = await db.execute({
      sql: 'SELECT id FROM photos WHERE recipe_id = ? ORDER BY position, created_at LIMIT 1',
      args: [recipeId],
    });
    await db.execute({
      sql: 'UPDATE recipes SET cover_photo = ?, updated_at = ? WHERE id = ? AND cover_photo = ?',
      args: [next2.rows[0]?.id || null, new Date().toISOString(), recipeId, req.params.id],
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
