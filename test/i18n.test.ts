import { describe, expect, it } from 'vitest';
import { TEXTE, t } from '../src/i18n/texte.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';
import { IMPRESSUM, DATENSCHUTZ } from '../src/i18n/rechtliches.ts';
import { alleSprachPfade, SEGMENT } from '../src/i18n/routen.ts';
import { OBJEKTE } from '../src/data/objekte.ts';

describe('Uebersetzungen', () => {
  const schluessel = Object.keys(TEXTE.it) as (keyof typeof TEXTE.it)[];

  it.each(SPRACHEN)('%s kennt jeden Textschluessel', (lang) => {
    for (const k of schluessel) {
      expect(TEXTE[lang][k], `${lang}.${k} fehlt`).toBeTruthy();
      expect(TEXTE[lang][k].trim().length, `${lang}.${k} ist leer`).toBeGreaterThan(0);
    }
  });

  it.each(SPRACHEN)('%s uebersetzt die Rechtsseiten vollstaendig', (lang) => {
    for (const seite of [IMPRESSUM[lang], DATENSCHUTZ[lang]]) {
      expect(seite.titel.length).toBeGreaterThan(0);
      expect(seite.abschnitte.length).toBeGreaterThan(0);
      for (const a of seite.abschnitte) {
        expect(a.h.length).toBeGreaterThan(0);
        expect(a.p.length).toBeGreaterThan(0);
      }
    }
  });

  it('setzt Platzhalter ein', () => {
    expect(t('de', 'mapPending', { n: 3 })).toContain('3');
    expect(t('de', 'mapPending', { n: 3 })).not.toContain('{n}');
  });

  it('laesst keine unersetzten Platzhalter in den Texten stehen', () => {
    // Diese Texte nehmen bewusst Platzhalter entgegen; alle anderen duerfen
    // keine enthalten, sonst steht im Browser eine Zeichenfolge wie "{n}".
    const mitPlatzhalter = ['mapPending', 'photoOf', 'edOffen', 'edStandortOk', 'shEinfuegen'];
    for (const lang of SPRACHEN) {
      for (const [k, v] of Object.entries(TEXTE[lang])) {
        if (mitPlatzhalter.includes(k)) continue;
        expect(/\{[a-z]+\}/.test(v), `${lang}.${k} enthaelt einen Platzhalter`).toBe(false);
      }
    }
  });
});

describe('Adressen', () => {
  it('gibt jeder Sprache eigene Pfadsegmente', () => {
    for (const lang of SPRACHEN) {
      expect(SEGMENT[lang].objekt).toMatch(/^[a-z-]+$/);
      expect(SEGMENT[lang].impressum).toMatch(/^[a-z-]+$/);
      expect(SEGMENT[lang].datenschutz).toMatch(/^[a-z-]+$/);
    }
  });

  it('erzeugt fuer jede Seite genau eine Adresse je Sprache', () => {
    const seiten = [
      { art: 'start' as const },
      { art: 'impressum' as const },
      { art: 'datenschutz' as const },
      ...OBJEKTE.map((o) => ({ art: 'objekt' as const, id: o.id })),
    ];
    const alle = new Set<string>();
    for (const seite of seiten) {
      const pfade = alleSprachPfade(seite);
      expect(pfade).toHaveLength(SPRACHEN.length);
      for (const { pfad } of pfade) {
        expect(pfad.startsWith('/') && pfad.endsWith('/'), pfad).toBe(true);
        expect(alle.has(pfad), `${pfad} kommt doppelt vor`).toBe(false);
        alle.add(pfad);
      }
    }
  });
});
