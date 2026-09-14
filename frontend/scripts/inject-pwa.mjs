// Post-build: add PWA / iOS home-screen metadata to the exported index.html.
// (Expo's `web.output: "single"` ignores app/+html.tsx.)
import { readFileSync, writeFileSync } from 'node:fs';

// Absolute URLs are required for link previews (WhatsApp, iMessage). Vercel exposes the
// deployment host at build time; fall back to production.
const host =
  process.env.EXPO_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === 'preview'
      ? 'https://kaam-web-staging.vercel.app'
      : 'https://kaam-web-tau.vercel.app');

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
    <meta property="og:url" content="${host}/" />
    <meta property="og:image" content="${host}/icons/icon-512.png" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />`;

// Must come after Expo's reset <style> so `100dvh` wins the cascade over its `height: 100%`.
const viewportStyle = `
    <style id="kaam-viewport">
      /* Expo's reset uses height:100% + overflow:hidden, which on iOS Safari is taller than the
         visible area while the toolbar shows and cuts off the bottom tab bar. Prefer the dynamic
         viewport height. (The tab bar's safe-area padding comes from useSafeAreaInsets in
         src/components/Tabs.tsx, which reads env(safe-area-inset-bottom) on web.) */
      html, body, #root { height: 100%; min-height: -webkit-fill-available; height: 100dvh; }
    </style>`;

if (!html.includes('rel="manifest"')) {
  html = html
    .replace('shrink-to-fit=no"', 'shrink-to-fit=no, viewport-fit=cover"')
    .replace('<title>Kaam</title>', `<title>Kaam</title>${tags}`)
    .replace(/(<style id="expo-reset">[\s\S]*?<\/style>)/, `$1${viewportStyle}`);
  writeFileSync(file, html);
  console.log('PWA metadata injected into dist/index.html');
} else {
  console.log('PWA metadata already present');
}
