// Post-build: add PWA / iOS home-screen metadata to the exported index.html.
// (Expo's `web.output: "single"` ignores app/+html.tsx.)
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../dist/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');

const tags = `
    <meta name="description" content="Household help in the Bay Area — find work, find help." />
    <meta name="theme-color" content="#c2410c" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Kaam" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Kaam" />
    <meta property="og:title" content="Kaam — household help in the Bay Area" />
    <meta property="og:description" content="Cooks, cleaners, nannies and elder care. Find work or find help, in English or Hindi. Sign up with your phone number." />
    <meta property="og:image" content="/icons/icon-512.png" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />`;

if (!html.includes('rel="manifest"')) {
  html = html
    .replace('shrink-to-fit=no"', 'shrink-to-fit=no, viewport-fit=cover"')
    .replace('<title>Kaam</title>', `<title>Kaam</title>${tags}`);
  writeFileSync(file, html);
  console.log('PWA metadata injected into dist/index.html');
} else {
  console.log('PWA metadata already present');
}
