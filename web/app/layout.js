import './globals.css';
import { JetBrains_Mono } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '../lib/theme';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata = {
  title: { default: 'SUB/WAVE', template: '%s · SUB/WAVE' },
  description:
    'A real internet radio station. Single Icecast stream — every listener hears the same broadcast at the same time, picked and announced by an LLM-driven DJ.',
  applicationName: 'SUB/WAVE',
  // iOS standalone-install + status bar styling. Android picks these up via
  // manifest.js; iOS still needs the `apple-mobile-web-app-*` metas.
  appleWebApp: {
    capable: true,
    title: 'SUB/WAVE',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'SUB/WAVE',
    description: 'Personal radio frequency from the homelab.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUB/WAVE',
    description: 'Personal radio frequency from the homelab.',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3efe6' },
    { media: '(prefers-color-scheme: dark)',  color: '#100e0c' },
  ],
  // `cover` lets the page extend under the iPhone notch / Dynamic Island /
  // home indicator when installed. Pair with env(safe-area-inset-*) in CSS
  // for any UI close to the edges.
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        {/* Apply stored theme before paint to avoid flash of wrong palette.
            Script body is a static constant from lib/theme — no untrusted input. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
