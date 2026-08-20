// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/config.ts';

/**
 * Statische Seite, komplett vorgerendert: jede Sprache und jedes Objekt bekommt
 * eine eigene, indexierbare URL. Kein Server, kein Client-Framework.
 *
 * Die Sprachrouten werden bewusst NICHT ueber Astros i18n-Routing gebaut,
 * weil die Pfadsegmente je Sprache uebersetzt sind (/it/immobili/ vs. /de/objekte/).
 * Das erledigen die getStaticPaths in src/pages/[lang]/.
 */
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: {
    // Fotos von Handykameras sind gross; mehr braucht die Seite nie.
    responsiveStyles: true,
    layout: 'constrained',
  },
  devToolbar: { enabled: false },
});
