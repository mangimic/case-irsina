import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Eigene Konfiguration, damit Vitest nicht die vite.config.js des
 * uebergeordneten Repositorys aufgreift: irsina/ ist ein in sich
 * geschlossenes Projekt mit eigenen Abhaengigkeiten.
 */
export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
  },
});
