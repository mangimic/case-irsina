import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SUCHMASCHINEN_ERLAUBT } from '../src/config.ts';

/**
 * Sichtbarkeit fuer Suchmaschinen wird an genau einer Stelle entschieden
 * (src/config.ts). Diese Pruefung haelt fest, dass public/_headers dieselbe
 * Sprache spricht — sonst bliebe die Seite beim Sichtbarmachen unsichtbar,
 * und niemand fände den Grund.
 */
const WURZEL = join(import.meta.dirname, '..');

describe('Sichtbarkeit für Suchmaschinen', () => {
  const kopfzeilen = readFileSync(join(WURZEL, 'public/_headers'), 'utf-8');
  const kopfSperrt = /^\s*X-Robots-Tag:\s*noindex/im.test(kopfzeilen);

  it('sagt in config.ts und _headers dasselbe', () => {
    expect(
      kopfSperrt,
      SUCHMASCHINEN_ERLAUBT
        ? 'config erlaubt Suchmaschinen, _headers sperrt noch'
        : 'config sperrt Suchmaschinen, _headers nicht',
    ).toBe(!SUCHMASCHINEN_ERLAUBT);
  });

  it('legt die Node-Version für den Hoster fest', () => {
    for (const datei of ['.node-version', '.nvmrc']) {
      const pfad = join(WURZEL, datei);
      expect(existsSync(pfad), `${datei} fehlt`).toBe(true);
      expect(readFileSync(pfad, 'utf-8').trim()).toMatch(/^22\./);
    }
  });
});
