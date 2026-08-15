// One-off asset generation: PWA icons + OG image from public/favicon.svg
import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/favicon.svg');

// Maskable needs the mark inside an 80% safe zone on a solid background
const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" fill="#6366f1"/>
  <svg x="14" y="14" width="52" height="52" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#6366f1"/>
    </linearGradient></defs>
    <rect width="64" height="64" rx="14" fill="url(#g)"/>
    <path d="M42.5 24.5a13 13 0 1 0 0 15" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  </svg>
</svg>`);

const ogSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="300" fill="#6366f1" opacity="0.15"/>
  <circle cx="120" cy="560" r="280" fill="#a855f7" opacity="0.15"/>
  <g transform="translate(100,150)">
    <rect width="120" height="120" rx="26" fill="url(#mark)"/>
    <path d="M79.7 45.9a24.4 24.4 0 1 0 0 28.2" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/>
  </g>
  <text x="100" y="360" font-family="Segoe UI, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">CreativeOS</text>
  <text x="100" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="38" fill="#c7d2fe">AI creative studio — write, design, voice &amp; video</text>
  <text x="100" y="520" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#818cf8">soldiomai.github.io/CreativeOS</text>
</svg>`);

await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/pwa-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/pwa-512.png');
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(maskableSvg, { density: 300 }).resize(512, 512).png().toFile('public/pwa-maskable-512.png');
await sharp(ogSvg).png().toFile('public/og-image.png');
console.log('assets generated');
