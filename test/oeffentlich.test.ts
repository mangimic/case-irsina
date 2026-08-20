import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import roh from '../src/data/objekte.json';

/**
 * Dieses Repository ist oeffentlich. Alles, was hier eingecheckt ist, kann
 * jeder lesen — die Quelldateien, nicht nur die gebaute Seite.
 *
 * Diese Pruefung durchsucht deshalb jede versionierte Datei nach italienischen
 * Telefonnummern. Erlaubt sind nur zwei erfundene Beispiele aus der
 * Dokumentation und den Tests; alles andere schlaegt fehl.
 */
const WURZEL = join(import.meta.dirname, '..');

/** Frei erfunden, kommen in Dokumentation und Tests vor. */
const ERFUNDEN = ['+393331234567', '3331234567', '+393401112233'];

function versionierteDateien(): string[] {
  return execFileSync('git', ['ls-files'], { cwd: WURZEL, encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
}

describe('Öffentliches Repository', () => {
  it('checkt keine echte Telefonnummer ein', () => {
    const muster = /\+?\b39?3\d{2}[ .-]?\d{3}[ .-]?\d{4}\b/g;
    const funde: string[] = [];

    for (const datei of versionierteDateien()) {
      if (/\.(jpe?g|png|webp|svg|ico)$/i.test(datei)) continue;
      const inhalt = readFileSync(join(WURZEL, datei), 'utf-8');
      for (const treffer of inhalt.match(muster) ?? []) {
        const blank = treffer.replace(/[ .-]/g, '');
        if (ERFUNDEN.some((e) => e.replace('+', '') === blank.replace('+', ''))) continue;
        funde.push(`${datei}: ${treffer}`);
      }
    }

    expect(funde, `Telefonnummern im oeffentlichen Repository:\n${funde.join('\n')}`).toEqual([]);
  });

  it('haelt die internen Kontaktdaten aus der Versionierung heraus', () => {
    const versioniert = versionierteDateien();
    expect(versioniert).not.toContain('daten-intern/kontakte.json');
    // Die Vorlage darf und soll dabei sein.
    expect(versioniert).toContain('daten-intern/kontakte.beispiel.json');
  });

  it('erlaubt eine Nummer in objekte.json nur mit erteilter Freigabe', () => {
    for (const o of roh.objekte) {
      if (!o.freigabe) {
        expect(o.telefon, `${o.id} traegt eine Nummer ohne Freigabe`).toBeNull();
        expect(o.telefon2, `${o.id} traegt eine zweite Nummer ohne Freigabe`).toBeNull();
      }
    }
  });
});
