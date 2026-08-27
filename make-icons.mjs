import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

/* Marca: panela bege sobre oliva, com o motivo de ladrilho ao fundo.
   Emoji não renderiza no sharp (sem fonte de emoji), então é tudo path. */
const tiles = [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => {
  const x = c * 128 + 64;
  const y = r * 128 + 64;
  return `<path d="M${x} ${y - 46} L${x + 46} ${y} L${x} ${y + 46} L${x - 46} ${y} Z"/>`
       + `<path d="M${x} ${y - 24} L${x + 24} ${y} L${x} ${y + 24} L${x - 24} ${y} Z"/>`;
})).join('');

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#5C6B39"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="7" opacity="0.12">${tiles}</g>

  <!-- vapor -->
  <g fill="none" stroke="#E8C88A" stroke-width="15" stroke-linecap="round" opacity="0.95">
    <path d="M212 168 q-20 -26 0 -52 q20 -26 0 -52"/>
    <path d="M300 168 q-20 -26 0 -52 q20 -26 0 -52"/>
  </g>

  <!-- alças -->
  <g fill="#E0A54E">
    <rect x="60"  y="232" width="52" height="34" rx="17"/>
    <rect x="400" y="232" width="52" height="34" rx="17"/>
  </g>

  <!-- corpo da panela -->
  <path d="M96 224 h320 l-26 150 a44 44 0 0 1 -43 36 h-182 a44 44 0 0 1 -43 -36 z" fill="#F6EFE0"/>
  <!-- tampa -->
  <rect x="78" y="196" width="356" height="38" rx="19" fill="#F6EFE0"/>
  <circle cx="256" cy="188" r="17" fill="#E0A54E"/>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(SVG)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
  console.log(`icon-${size}.png`);
}

// Prévia grande, só pra conferir o desenho.
await sharp(Buffer.from(SVG)).resize(320, 320).png().toFile('icon-preview.png');
console.log('icon-preview.png');
