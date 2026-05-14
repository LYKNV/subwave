// Served by Next at /manifest.webmanifest. Same-origin so it works behind
// Caddy/Cloudflare without any extra route plumbing.

export default function manifest() {
  return {
    name: 'SUB/WAVE',
    short_name: 'SUB/WAVE',
    description:
      'Personal internet radio — single live stream, AI DJ between tracks.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#100e0c',
    theme_color: '#100e0c',
    categories: ['music', 'entertainment'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/192-maskable', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/512-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
