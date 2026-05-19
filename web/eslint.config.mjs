import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'node_modules/**']),
  {
    rules: {
      // Prose noise — JSX renders apostrophes/quotes fine.
      'react/no-unescaped-entities': 'off',
      // Two simple <img> sites (cover proxy, screenshot helper). next/image
      // would need explicit dimensions + images.remotePatterns config for the
      // controller proxy — not worth it at this scale.
      '@next/next/no-img-element': 'off',
      // Standard Tailwind config pattern (export default object literal).
      'import/no-anonymous-default-export': ['error', {
        allowObject: true,
        allowArray: true,
      }],
      // React 19 lints below flag the canonical SSR-safe hydration pattern
      // (read localStorage / matchMedia / Date.now on mount, then setState).
      // Moving these to useState(init) breaks SSR; useSyncExternalStore is
      // overkill for one-shot init. Leaving off project-wide.
      'react-hooks/set-state-in-effect': 'off',
      // useKeyboardShortcuts mutates handlersRef.current during render so the
      // window listener binds once and survives PlayerApp's per-second
      // re-renders (see hook header comment). Moving into useEffect creates a
      // stale-on-first-render window.
      'react-hooks/refs': 'off',
    },
  },
]);
