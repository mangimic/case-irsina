import { describe, expect, it } from 'vitest';
import { OBJEKTE } from '../src/data/objekte.ts';
import { pruefstandText, ungeprueft } from '../src/data/anzeige.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';
import { TEXTE } from '../src/i18n/texte.ts';
import { objektSchema, PRUEFSTAND } from '../src/data/schema.ts';
import roh from '../src/data/objekte.json';

/**
 * Kein Haus wurde besichtigt. Dass das an jedem Objekt steht, ist keine
 * Formalie, sondern die Voraussetzung dafuer, dass die Seite ehrlich ist.
 */
describe('Prüfstand', () => {
  it('ist bei jedem Objekt gesetzt', () => {
    for (const o of roh.objekte) {
      expect(PRUEFSTAND, `${o.id}`).toContain(o.pruefstand);
    }
  });

  it('steht ohne Angabe auf "unbesichtigt"', () => {
    const ohne = { ...roh.objekte[0] } as Record<string, unknown>;
    delete ohne.pruefstand;
    const ergebnis = objektSchema.safeParse(ohne);
    expect(ergebnis.success).toBe(true);
    if (ergebnis.success) expect(ergebnis.data.pruefstand).toBe('unbesichtigt');
  });

  it('weist einen erfundenen Wert zurück', () => {
    expect(objektSchema.safeParse({ ...roh.objekte[0], pruefstand: 'geprueft' }).success).toBe(false);
  });

  it('gilt derzeit für alle Objekte als unbesichtigt', () => {
    // Schlägt an, sobald ein Objekt bestätigt wird — dann ist dieser Test
    // anzupassen, und zwar bewusst.
    for (const o of OBJEKTE) {
      expect(ungeprueft(o), `${o.id} ist nicht mehr unbesichtigt`).toBe(true);
    }
  });

  it.each(SPRACHEN)('benennt den Stand in %s', (lang) => {
    for (const o of OBJEKTE) {
      expect(pruefstandText(o, lang).length).toBeGreaterThan(3);
    }
    for (const k of ['pvH', 'pvText', 'pvBitte', 'pvBitteBtn', 'pvListe', 'pvKurz'] as const) {
      expect(TEXTE[lang][k].length, `${lang}.${k}`).toBeGreaterThan(5);
    }
  });
});
