import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import beispiel from '../src/data/beispiel-koordinaten.json';
import roh from '../src/data/objekte.json';

const WURZEL = join(import.meta.dirname, '..');

function dateien(ordner: string): string[] {
  return readdirSync(ordner).flatMap((n) => {
    const p = join(ordner, n);
    return statSync(p).isDirectory() ? dateien(p) : [p];
  });
}

/**
 * Die Beispielkoordinaten sind erfunden. Sie duerfen ausschliesslich im
 * Prototyp auftauchen, und dort gekennzeichnet — niemals in der Seite, die
 * veroeffentlicht wird. Sonst stuende auf der Karte eine Behauptung.
 */
describe('Beispielkoordinaten', () => {
  it('deckt jedes Objekt ab', () => {
    for (const o of roh.objekte) {
      expect(beispiel.koordinaten, o.id).toHaveProperty(o.id);
    }
  });

  it('wird von keiner Datei der echten Seite gelesen', () => {
    const quellen = [
      ...dateien(join(WURZEL, 'src/pages')),
      ...dateien(join(WURZEL, 'src/components')),
      ...dateien(join(WURZEL, 'src/layouts')),
      ...dateien(join(WURZEL, 'src/data')).filter((p) => !p.endsWith('beispiel-koordinaten.json')),
      ...dateien(join(WURZEL, 'src/i18n')),
    ];
    for (const p of quellen) {
      const inhalt = readFileSync(p, 'utf-8');
      expect(inhalt.includes('beispiel-koordinaten'), `${p} liest die Beispieldaten`).toBe(false);
    }
  });

  it('steht nicht in objekte.json', () => {
    for (const o of roh.objekte) {
      const b = (beispiel.koordinaten as Record<string, { lat: number }>)[o.id];
      if (o.lat !== null && b) {
        expect(o.lat, `${o.id} trägt einen Beispielwert als echte Koordinate`).not.toBe(b.lat);
      }
    }
  });

  it('sagt im Dateikopf, dass es Beispielwerte sind', () => {
    expect(beispiel._hinweis).toMatch(/BEISPIELWERTE/);
  });
});
