/**
 * Testa o caminho de upload de foto — a parte mais exposta do app e a que
 * mudou ao subir sharp e multer de versão.
 */
import sharp from 'sharp';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;

const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log('  OK  ', label); }
  else { fail++; console.log('  FALHA', label, extra); }
};

const json = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = res.headers.get('content-type') || '';
  return { status: res.status, data: t.includes('json') ? await res.json() : await res.text() };
};

/** Gera uma imagem de verdade, com EXIF de rotação, como sai de um celular. */
async function foto(w, h, cor) {
  return sharp({ create: { width: w, height: h, channels: 3, background: cor } })
    .jpeg({ quality: 90 }).toBuffer();
}

const upload = async (recipeId, buffers) => {
  const fd = new FormData();
  for (const [i, b] of buffers.entries()) {
    fd.append('photos', new Blob([b], { type: 'image/jpeg' }), `foto${i}.jpg`);
  }
  const res = await fetch(`${BASE}/api/photos/${recipeId}`, { method: 'POST', body: fd });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

console.log('\n=== fotos ===');

const nova = await json('POST', '/api/recipes', { title: 'Teste de foto', category: 'outros' });
const id = nova.data.id;

// 1. Envio simples
{
  const r = await upload(id, [await foto(1200, 1600, { r: 200, g: 120, b: 60 })]);
  check('upload responde 201', r.status === 201, JSON.stringify(r.data));
  check('devolve o id da foto', r.data.ids?.length === 1);

  const photoId = r.data.ids[0];
  const grande = await fetch(`${BASE}/api/photos/${photoId}`);
  const buf = Buffer.from(await grande.arrayBuffer());
  check('serve a imagem', grande.status === 200);
  check('converteu para webp', grande.headers.get('content-type') === 'image/webp');

  const meta = await sharp(buf).metadata();
  check('redimensionou para caber em 1600', Math.max(meta.width, meta.height) <= 1600,
    `${meta.width}x${meta.height}`);

  const thumb = await fetch(`${BASE}/api/photos/${photoId}?size=thumb`);
  const tbuf = Buffer.from(await thumb.arrayBuffer());
  const tmeta = await sharp(tbuf).metadata();
  check('miniatura é 500x500', tmeta.width === 500 && tmeta.height === 500,
    `${tmeta.width}x${tmeta.height}`);
  check('miniatura é bem menor que a grande', tbuf.length < buf.length,
    `${tbuf.length} vs ${buf.length}`);

  const rec = await json('GET', `/api/recipes/${id}`);
  check('primeira foto vira a capa', rec.data.cover_photo === photoId);
}

// 2. Várias de uma vez
{
  const r = await upload(id, [
    await foto(800, 800, { r: 60, g: 140, b: 90 }),
    await foto(600, 900, { r: 90, g: 90, b: 180 }),
  ]);
  check('aceita várias fotos de uma vez', r.data.ids?.length === 2, JSON.stringify(r.data));

  const rec = await json('GET', `/api/recipes/${id}`);
  check('galeria tem as 3 fotos', rec.data.photos.length === 3, String(rec.data.photos.length));

  // Trocar a capa
  const outra = rec.data.photos[2].id;
  await fetch(`${BASE}/api/photos/${outra}/cover`, { method: 'PATCH' });
  const rec2 = await json('GET', `/api/recipes/${id}`);
  check('trocar a capa funciona', rec2.data.cover_photo === outra);

  // Apagar a capa promove outra
  await fetch(`${BASE}/api/photos/${outra}`, { method: 'DELETE' });
  const rec3 = await json('GET', `/api/recipes/${id}`);
  check('apagar a capa promove a próxima', rec3.data.cover_photo && rec3.data.cover_photo !== outra,
    String(rec3.data.cover_photo));
}

// 3. Rejeições
{
  const fd = new FormData();
  fd.append('photos', new Blob([Buffer.from('isso nao e imagem')], { type: 'text/plain' }), 'x.txt');
  const r = await fetch(`${BASE}/api/photos/${id}`, { method: 'POST', body: fd });
  check('arquivo que não é imagem é recusado', r.status === 400, String(r.status));

  const vazio = await fetch(`${BASE}/api/photos/${id}`, { method: 'POST', body: new FormData() });
  check('envio sem arquivo é recusado', vazio.status === 400, String(vazio.status));

  const semReceita = await upload('receita-que-nao-existe', [await foto(100, 100, { r: 1, g: 1, b: 1 })]);
  check('receita inexistente dá 404', semReceita.status === 404, String(semReceita.status));

  check('foto inexistente dá 404', (await fetch(`${BASE}/api/photos/nao-existe`)).status === 404);
}

await json('DELETE', `/api/recipes/${id}`);

console.log(`\n  ${pass} passaram, ${fail} falharam\n`);
process.exit(fail ? 1 : 0);
