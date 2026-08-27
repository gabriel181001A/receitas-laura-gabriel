import { Router } from 'express';
import crypto from 'node:crypto';
import { db, MEAL_SLOTS } from '../db.js';

const router = Router();
const now = () => new Date().toISOString();
const SLOT_IDS = MEAL_SLOTS.map((s) => s.id);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

/** Segunda-feira da semana que contem `date`. */
function mondayOf(date) {
  const d = new Date(`${date}T12:00:00`);
  const day = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Semana completa: 7 dias x 4 refeicoes, com a receita ja embutida. */
router.get('/', async (req, res, next) => {
  try {
    const ref = isDate(req.query.date) ? String(req.query.date) : new Date().toISOString().slice(0, 10);
    const start = mondayOf(ref);
    const end = addDays(start, 6);

    const { rows } = await db.execute({
      sql: `SELECT p.id, p.date, p.slot, p.recipe_id, p.note, p.servings,
                   r.title, r.cover_photo, r.category, r.prep_time
            FROM meal_plan p LEFT JOIN recipes r ON r.id = p.recipe_id
            WHERE p.date BETWEEN ? AND ?
            ORDER BY p.date, p.created_at`,
      args: [start, end],
    });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        slots: Object.fromEntries(
          SLOT_IDS.map((slot) => [slot, rows.filter((r) => r.date === date && r.slot === slot)]),
        ),
      });
    }
    res.json({ start, end, days });
  } catch (err) { next(err); }
});

/** Agenda uma receita (ou uma anotacao livre) num dia + refeicao. */
router.post('/', async (req, res, next) => {
  try {
    const date = String(req.body?.date || '');
    const slot = String(req.body?.slot || '');
    if (!isDate(date)) return res.status(400).json({ error: 'data inválida (use YYYY-MM-DD)' });
    if (!SLOT_IDS.includes(slot)) return res.status(400).json({ error: 'refeição inválida' });

    const recipeId = req.body?.recipe_id ? String(req.body.recipe_id) : null;
    const note = String(req.body?.note || '').trim().slice(0, 300);
    if (!recipeId && !note) {
      return res.status(400).json({ error: 'informe uma receita ou uma anotação' });
    }

    if (recipeId) {
      const found = await db.execute({ sql: 'SELECT id FROM recipes WHERE id = ?', args: [recipeId] });
      if (!found.rows.length) return res.status(404).json({ error: 'receita nao encontrada' });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO meal_plan (id, date, slot, recipe_id, note, servings, created_at)
            VALUES (?,?,?,?,?,?,?)`,
      args: [id, date, slot, recipeId, note,
        Math.max(1, Number(req.body?.servings) || 2), now()],
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

/** Move um item para outro dia/refeicao (usado no arrastar-e-soltar). */
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = [];
    const args = [];
    if (isDate(req.body?.date)) { fields.push('date = ?'); args.push(String(req.body.date)); }
    if (SLOT_IDS.includes(req.body?.slot)) { fields.push('slot = ?'); args.push(String(req.body.slot)); }
    if ('servings' in req.body) { fields.push('servings = ?'); args.push(Math.max(1, Number(req.body.servings) || 2)); }
    if ('note' in req.body) { fields.push('note = ?'); args.push(String(req.body.note).slice(0, 300)); }
    if (!fields.length) return res.status(400).json({ error: 'nada para atualizar' });

    args.push(req.params.id);
    const r = await db.execute({ sql: `UPDATE meal_plan SET ${fields.join(', ')} WHERE id = ?`, args });
    if (!r.rowsAffected) return res.status(404).json({ error: 'item nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM meal_plan WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** Limpa a semana inteira a partir de uma data. */
router.delete('/week/:date', async (req, res, next) => {
  try {
    if (!isDate(req.params.date)) return res.status(400).json({ error: 'data inválida' });
    const start = mondayOf(req.params.date);
    const r = await db.execute({
      sql: 'DELETE FROM meal_plan WHERE date BETWEEN ? AND ?',
      args: [start, addDays(start, 6)],
    });
    res.json({ removed: r.rowsAffected });
  } catch (err) { next(err); }
});

export default router;
