import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Onde o banco mora, em ordem de preferência:
 *   DATABASE_URL         arquivo num disco persistente (volume do Fly)
 *   TURSO_DATABASE_URL   banco remoto no Turso
 *   padrão               arquivo local, para rodar no PC
 */
const url = process.env.DATABASE_URL
  || process.env.TURSO_DATABASE_URL
  || 'file:data/receitas.db';

if (url.startsWith('file:')) {
  const dir = path.dirname(url.slice(5));
  if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
}

export const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/** Categorias padrao. A usuaria pode criar outras livremente. */
export const CATEGORIES = [
  { id: 'cafe-da-manha', label: 'Café da manhã', icon: '☕' },
  { id: 'almoco', label: 'Almoço', icon: '🍽️' },
  { id: 'jantar', label: 'Jantar', icon: '🌙' },
  { id: 'lanche', label: 'Lanches', icon: '🥪' },
  { id: 'sobremesa', label: 'Sobremesas', icon: '🍰' },
  { id: 'massas', label: 'Massas', icon: '🍝' },
  { id: 'carnes', label: 'Carnes', icon: '🥩' },
  { id: 'saladas', label: 'Saladas', icon: '🥗' },
  { id: 'sopas', label: 'Sopas', icon: '🍲' },
  { id: 'paes-bolos', label: 'Pães e Bolos', icon: '🍞' },
  { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'outros', label: 'Outros', icon: '🍳' },
];

/** Refeicoes do planejador semanal. */
export const MEAL_SLOTS = [
  // `short` é o rótulo da coluna estreita do planejador no celular.
  { id: 'cafe', label: 'Café da manhã', short: 'Café', icon: '☕' },
  { id: 'almoco', label: 'Almoço', short: 'Almoço', icon: '🍽️' },
  { id: 'lanche', label: 'Lanche', short: 'Lanche', icon: '🥪' },
  { id: 'jantar', label: 'Jantar', short: 'Jantar', icon: '🌙' },
];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS recipes (
     id           TEXT PRIMARY KEY,
     title        TEXT NOT NULL,
     description  TEXT NOT NULL DEFAULT '',
     category     TEXT NOT NULL DEFAULT 'outros',
     ingredients  TEXT NOT NULL DEFAULT '[]',
     steps        TEXT NOT NULL DEFAULT '[]',
     tags         TEXT NOT NULL DEFAULT '[]',
     servings     TEXT NOT NULL DEFAULT '',
     prep_time    TEXT NOT NULL DEFAULT '',
     cook_time    TEXT NOT NULL DEFAULT '',
     difficulty   TEXT NOT NULL DEFAULT '',
     notes        TEXT NOT NULL DEFAULT '',
     source_url   TEXT NOT NULL DEFAULT '',
     source_name  TEXT NOT NULL DEFAULT '',
     video_url    TEXT NOT NULL DEFAULT '',
     cover_photo  TEXT,
     favorite     INTEGER NOT NULL DEFAULT 0,
     rating       INTEGER NOT NULL DEFAULT 0,
     created_at   TEXT NOT NULL,
     updated_at   TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS photos (
     id          TEXT PRIMARY KEY,
     recipe_id   TEXT NOT NULL,
     data        BLOB NOT NULL,
     thumb       BLOB NOT NULL,
     mime        TEXT NOT NULL DEFAULT 'image/webp',
     caption     TEXT NOT NULL DEFAULT '',
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL
   )`,

  // Itens da lista de compras. recipe_id nulo = item adicionado na mao.
  `CREATE TABLE IF NOT EXISTS shopping_items (
     id          TEXT PRIMARY KEY,
     label       TEXT NOT NULL,
     name        TEXT NOT NULL DEFAULT '',
     qty         REAL,
     unit        TEXT NOT NULL DEFAULT '',
     aisle       TEXT NOT NULL DEFAULT 'outros',
     checked     INTEGER NOT NULL DEFAULT 0,
     recipe_ids  TEXT NOT NULL DEFAULT '[]',
     recipes     TEXT NOT NULL DEFAULT '[]',
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL
   )`,

  // Uma linha por refeicao planejada.
  `CREATE TABLE IF NOT EXISTS meal_plan (
     id          TEXT PRIMARY KEY,
     date        TEXT NOT NULL,
     slot        TEXT NOT NULL,
     recipe_id   TEXT,
     note        TEXT NOT NULL DEFAULT '',
     servings    INTEGER NOT NULL DEFAULT 2,
     created_at  TEXT NOT NULL
   )`,

  `CREATE INDEX IF NOT EXISTS idx_photos_recipe   ON photos(recipe_id, position)`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_updated ON recipes(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_cat     ON recipes(category)`,
  `CREATE INDEX IF NOT EXISTS idx_plan_date       ON meal_plan(date, slot)`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_aisle  ON shopping_items(aisle, position)`,
];

/** Colunas adicionadas depois da v1 -- aplica em banco que ja existe. */
const MIGRATIONS = [
  ['recipes', 'category', `ALTER TABLE recipes ADD COLUMN category TEXT NOT NULL DEFAULT 'outros'`],
];

export async function initDb() {
  for (const stmt of SCHEMA) await db.execute(stmt);

  for (const [table, column, sql] of MIGRATIONS) {
    const info = await db.execute(`PRAGMA table_info(${table})`);
    if (!info.rows.some((r) => r.name === column)) {
      await db.execute(sql);
      console.log(`[db] migracao aplicada: ${table}.${column}`);
    }
  }
}

// ---- helpers ----------------------------------------------------------------

const JSON_FIELDS = {
  recipes: ['ingredients', 'steps', 'tags'],
  shopping_items: ['recipe_ids', 'recipes'],
};

function safeParse(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value ?? 'null');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function rowToRecipe(row) {
  if (!row) return null;
  const recipe = { ...row };
  for (const f of JSON_FIELDS.recipes) recipe[f] = safeParse(row[f]);
  recipe.favorite = Boolean(row.favorite);
  recipe.rating = Number(row.rating) || 0;
  return recipe;
}

export function rowToShoppingItem(row) {
  if (!row) return null;
  const item = { ...row };
  for (const f of JSON_FIELDS.shopping_items) item[f] = safeParse(row[f]);
  item.checked = Boolean(row.checked);
  item.qty = row.qty === null ? null : Number(row.qty);
  return item;
}
