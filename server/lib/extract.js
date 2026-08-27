import { spawn } from 'node:child_process';

/**
 * Puxa legenda + capa de um link de video.
 *
 * Estrategia, do melhor pro mais tolerante:
 *   1. yt-dlp  -> legenda completa e thumbnail (melhor resultado)
 *   2. oEmbed  -> so titulo e capa, mas funciona de qualquer IP (TikTok/YouTube)
 *   3. erro explicativo -> a tela cai no modo "colar legenda"
 *
 * O Instagram bloqueia IP de datacenter com frequencia. Em producao, defina
 * IG_COOKIES_FILE apontando pra um cookies.txt para melhorar a taxa de acerto.
 */

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS || 45000);

export function detectPlatform(url) {
  const u = String(url).toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('pinterest.')) return 'pinterest';
  return 'web';
}

export function isValidUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function run(cmd, args, { timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch (err) {
      return resolve({ ok: false, code: -1, stdout: '', stderr: String(err.message) });
    }

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) { settled = true; child.kill('SIGKILL'); resolve({ ok: false, code: -2, stdout, stderr: 'timeout' }); }
    }, timeout);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr: String(err.message) });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

/**
 * Como chamar o yt-dlp. O pip costuma instalar o .exe fora do PATH no Windows,
 * entao tentamos tambem o modulo do Python antes de desistir.
 */
function candidates() {
  const list = [];
  if (process.env.YTDLP_PATH) list.push([process.env.YTDLP_PATH, []]);
  list.push([YTDLP, []]);
  for (const py of ['python', 'python3', 'py']) list.push([py, ['-m', 'yt_dlp']]);
  return list;
}

let resolved;
/** Descobre uma vez qual invocacao funciona e reaproveita. */
async function resolveYtDlp() {
  if (resolved !== undefined) return resolved;
  for (const [cmd, prefix] of candidates()) {
    const r = await run(cmd, [...prefix, '--version'], { timeout: 10000 });
    if (r.ok && /\d/.test(r.stdout)) {
      resolved = { cmd, prefix, version: r.stdout.trim() };
      console.log(`[yt-dlp] usando "${[cmd, ...prefix].join(' ')}" v${resolved.version}`);
      return resolved;
    }
  }
  resolved = null;
  return resolved;
}

export async function hasYtDlp() {
  return Boolean(await resolveYtDlp());
}

async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

async function viaYtDlp(url) {
  const bin = await resolveYtDlp();
  if (!bin) return null;

  const args = [...bin.prefix, '-J', '--no-warnings', '--no-playlist', '--skip-download'];
  if (process.env.IG_COOKIES_FILE) args.push('--cookies', process.env.IG_COOKIES_FILE);
  if (process.env.YTDLP_PROXY) args.push('--proxy', process.env.YTDLP_PROXY);
  args.push(url);

  const r = await run(bin.cmd, args);
  if (!r.ok || !r.stdout.trim()) {
    return { failed: true, reason: (r.stderr || '').split('\n').filter(Boolean).pop() || 'yt-dlp falhou' };
  }

  let info;
  try {
    info = JSON.parse(r.stdout);
  } catch {
    return { failed: true, reason: 'resposta do yt-dlp ilegivel' };
  }

  const thumb =
    info.thumbnail ||
    (Array.isArray(info.thumbnails) && info.thumbnails.length
      ? info.thumbnails[info.thumbnails.length - 1].url
      : null);

  return {
    caption: info.description || info.title || '',
    title: info.title || '',
    author: info.uploader || info.channel || info.uploader_id || '',
    thumbnailUrl: thumb || '',
    videoUrl: info.webpage_url || url,
    via: 'yt-dlp',
  };
}

async function viaOEmbed(url, platform) {
  const endpoints = {
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  };
  const endpoint = endpoints[platform];
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      // No TikTok o "title" do oEmbed e a legenda inteira do post.
      caption: data.title || '',
      title: data.title || '',
      author: data.author_name || '',
      thumbnailUrl: data.thumbnail_url || '',
      videoUrl: url,
      via: 'oembed',
    };
  } catch {
    return null;
  }
}

export async function extractFromUrl(url) {
  const platform = detectPlatform(url);
  const attempts = [];

  let result = await viaYtDlp(url);
  if (result?.failed) { attempts.push(`yt-dlp: ${result.reason}`); result = null; }
  if (!result) attempts.push('yt-dlp indisponivel ou sem dados');

  if (!result) {
    result = await viaOEmbed(url, platform);
    if (!result) attempts.push('oEmbed sem dados');
  }

  if (!result || !result.caption) {
    return {
      ok: false,
      platform,
      attempts,
      message:
        platform === 'instagram'
          ? 'O Instagram bloqueou a leitura automática deste post (é comum). Copie a legenda e cole no campo abaixo.'
          : 'Não consegui ler a descrição deste link automaticamente. Copie a legenda e cole no campo abaixo.',
    };
  }

  const thumbnail = await fetchImage(result.thumbnailUrl);

  return {
    ok: true,
    platform,
    caption: result.caption,
    author: result.author,
    videoUrl: result.videoUrl,
    thumbnail,
    via: result.via,
    attempts,
  };
}
