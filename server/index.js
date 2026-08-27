import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { initDb, CATEGORIES, MEAL_SLOTS } from './db.js';
import { AISLES } from './lib/aisles.js';
import { hasYtDlp } from './lib/extract.js';

import recipesRouter from './routes/recipes.js';
import photosRouter from './routes/photos.js';
import importRouter from './routes/import.js';
import shoppingRouter from './routes/shopping.js';
import planRouter from './routes/plan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || 'receitas-dev-secret-trocar-em-producao';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ---- autenticacao -----------------------------------------------------------
// Senha unica compartilhada. Sem APP_PASSWORD definida (uso local), libera tudo.

const token = () =>
  crypto.createHmac('sha256', SECRET).update('autorizado').digest('hex');

const COOKIE = 'receitas_auth';
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

function requireAuth(req, res, next) {
  if (!PASSWORD) return next();
  if (req.cookies?.[COOKIE] === token()) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'nao autorizado' });
  }
  return res.redirect('/login');
}

app.get('/api/auth/status', (req, res) => {
  res.json({
    required: Boolean(PASSWORD),
    authenticated: !PASSWORD || req.cookies?.[COOKIE] === token(),
  });
});

app.post('/api/auth/login', (req, res) => {
  const sent = String(req.body?.password ?? '');
  if (!PASSWORD) return res.json({ ok: true });

  // Comparacao em tempo constante para nao vazar a senha por timing.
  const a = crypto.createHash('sha256').update(sent).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  res.cookie(COOKIE, token(), cookieOpts);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// Tela de login e os assets dela ficam abertos; o resto exige sessao.
app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/manifest.json', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'manifest.json')));
app.get('/styles.css', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'styles.css')));
app.get('/sw.js', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'sw.js')));

app.use(requireAuth);

// ---- metadados usados pelo front -------------------------------------------

app.get('/api/meta', async (_req, res) => {
  res.json({
    categories: CATEGORIES,
    aisles: AISLES,
    mealSlots: MEAL_SLOTS,
    ytdlp: await hasYtDlp(),
  });
});

// ---- rotas ------------------------------------------------------------------

app.use('/api/recipes', recipesRouter);
app.use('/api/photos', photosRouter);
app.use('/api/import', importRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/plan', planRouter);

app.use(express.static(PUBLIC_DIR, { maxAge: '1h', index: 'index.html' }));

// SPA: qualquer rota nao-API devolve o app.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[erro]', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'erro interno' });
});

// ---- start ------------------------------------------------------------------

function localAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

await initDb();

app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n  🍲  Receitas da Laura e do Gabriel\n');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  for (const ip of localAddresses()) {
    console.log(`  No celular (Wi-Fi): http://${ip}:${PORT}`);
  }
  console.log(`\n  Senha:  ${PASSWORD ? 'ativada' : 'desativada (defina APP_PASSWORD para proteger)'}`);
  console.log(`  yt-dlp: ${(await hasYtDlp()) ? 'disponivel' : 'nao encontrado (importacao por link limitada)'}\n`);
});
