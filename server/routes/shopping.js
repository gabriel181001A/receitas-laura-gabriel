import { Router } from 'express';
import crypto from 'node:crypto';
import { db, rowToShoppingItem } from '../db.js';
import { classifyAisle, parseIngredient, AISLES } from '../lib/aisles.js';

/**
 * Lista de compras manual: quem escreve os itens é a gente.
 * O único automatismo é adivinhar a seção do mercado, para a lista sair
 * na ordem do corredor em vez da ordem em que foi digitada.
 */
const router = Router();
const now = () => new Date().toISOString();
const AISLE_ORDER = Object.fromEntries(AISLES.map((a, i) => [a.id, i]));

/** Lista atual, agrupada por seção do mercado. */
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.execute(
      'SELECT * FROM shopping_items ORDER BY position, created_at',
    );
    const items = rows.map(rowToShoppingItem);

    const groups = AISLES.map((aisle) => ({
      ...aisle,
      items: items.filter((i) => i.aisle === aisle.id),
    })).filter((g) => g.items.length);

    res.json({
      groups,
      total: items.length,
      checked: items.filter((i) => i.checked).length,
    });
  } catch (err) { next(err); }
});

/**
 * Adiciona itens. Aceita uma linha só ou várias de uma vez —
 * dá para colar a lista inteira do bloco de notas.
 */
router.post('/item', async (req, res, next) => {
  try {
    const raw = String(req.body?.text || '');
    const linhas = raw
      .split('\n')
      .map((l) => l.replace(/^\s*[-–—•*·]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 100);

    if (!linhas.length) return res.status(400).json({ error: 'escreva pelo menos um item' });

    const posRow = await db.execute(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM shopping_items',
    );
    let pos = Number(posRow.rows[0]?.next || 0);
    const ids = [];

    for (const linha of linhas) {
      const texto = linha.slice(0, 300);
      const parsed = parseIngredient(texto);
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO shopping_items (id, label, name, qty, unit, aisle, checked,
                  recipe_ids, recipes, position, created_at)
              VALUES (?,?,?,?,?,?,0,'[]','[]',?,?)`,
        args: [id, texto, parsed.name, parsed.qty, parsed.unit,
          String(req.body?.aisle || classifyAisle(parsed.name)), pos++, now()],
      });
      ids.push(id);
    }

    res.status(201).json({ ids, added: ids.length });
  } catch (err) { next(err); }
});

router.patch('/item/:id', async (req, res, next) => {
  try {
    const fields = [];
    const args = [];
    if ('checked' in req.body) { fields.push('checked = ?'); args.push(req.body.checked ? 1 : 0); }
    if ('label' in req.body) { fields.push('label = ?'); args.push(String(req.body.label).slice(0, 300)); }
    if ('aisle' in req.body) { fields.push('aisle = ?'); args.push(String(req.body.aisle)); }
    if (!fields.length) return res.status(400).json({ error: 'nada para atualizar' });

    args.push(req.params.id);
    const r = await db.execute({
      sql: `UPDATE shopping_items SET ${fields.join(', ')} WHERE id = ?`, args,
    });
    if (!r.rowsAffected) return res.status(404).json({ error: 'item nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/item/:id', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM shopping_items WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** ?only=checked apaga só o que já foi comprado. */
router.delete('/', async (req, res, next) => {
  try {
    const sql = req.query.only === 'checked'
      ? 'DELETE FROM shopping_items WHERE checked = 1'
      : 'DELETE FROM shopping_items';
    const r = await db.execute(sql);
    res.json({ removed: r.rowsAffected });
  } catch (err) { next(err); }
});

/** Texto puro para mandar no WhatsApp. */
router.get('/text', async (_req, res, next) => {
  try {
    const { rows } = await db.execute(
      'SELECT * FROM shopping_items WHERE checked = 0 ORDER BY position',
    );
    const items = rows.map(rowToShoppingItem);
    const byAisle = new Map();
    for (const i of items) {
      if (!byAisle.has(i.aisle)) byAisle.set(i.aisle, []);
      byAisle.get(i.aisle).push(i);
    }

    const lines = ['🛒 *Lista de compras*', ''];
    const sorted = [...byAisle.entries()].sort(
      (a, b) => (AISLE_ORDER[a[0]] ?? 99) - (AISLE_ORDER[b[0]] ?? 99),
    );
    for (const [aisleId, list] of sorted) {
      const meta = AISLES.find((a) => a.id === aisleId);
      lines.push(`${meta?.icon || '•'} *${meta?.label || aisleId}*`);
      for (const i of list) lines.push(`  ▢ ${i.label}`);
      lines.push('');
    }
    res.type('text/plain').send(lines.join('\n').trim());
  } catch (err) { next(err); }
});

export default router;
