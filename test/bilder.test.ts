import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { objektSchema } from '../src/data/schema.ts';
import roh from '../src/data/objekte.json';
import { TEXTE } from '../src/i18n/texte.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';

/**
 * Ziel je Objekt: fuenf Aufnahmen und ein Grundriss.
 *
 * Die Obergrenze von fuenf ist keine Schikane — jedes Foto wird beim Bauen in
 * mehreren Groessen und zwei Formaten erzeugt, und zwanzig Bilder eines Hauses
 * sieht sich niemand an. Der Grundriss steht getrennt, weil er anders gezeigt
 * wird: vollstaendig statt beschnitten.
 */
const WURZEL = join(import.meta.dirname, '..');
const lies = (p: string) => readFileSync(join(WURZEL, p), 'utf-8');

function objekt(zusatz: Record<string, unknown> = {}) {
  return {
    id: 'IR-900', foto: ['IR-900.jpg'], strasse: 'Via Prova', civico: '1',
    typ: 'casa', angebot: 'vendita', zustand: 'sconosciuto',
    preis: null, mq: null, vani: null, extras: [],
    telefon: null, telefon2: null, telefon_unsicher: false, freigabe: false,
    lat: null, lng: null, gesehen: '2026-08', adresse_unklar: true,
    pruefstand: 'unbesichtigt',
    text: Object.fromEntries(SPRACHEN.map((l) => [l, 'Testtext'])),
    ...zusatz,
  };
}

describe('Fotos', () => {
  it('laesst bis zu fuenf zu', () => {
    const fuenf = ['a', 'b', 'c', 'd', 'e'].map((z, i) => `IR-900${i === 0 ? '' : z}.jpg`);
    expect(objektSchema.safeParse(objekt({ foto: fuenf })).success).toBe(true);
  });

  it('weist das sechste zurueck', () => {
    const sechs = ['a', 'b', 'c', 'd', 'e', 'f'].map((z) => `IR-900${z}.jpg`);
    expect(objektSchema.safeParse(objekt({ foto: sechs })).success).toBe(false);
  });

  it('verlangt weiterhin mindestens eines', () => {
    expect(objektSchema.safeParse(objekt({ foto: [] })).success).toBe(false);
  });
});

describe('Grundriss', () => {
  it('darf fehlen', () => {
    const geprueft = objektSchema.safeParse(objekt());
    expect(geprueft.success).toBe(true);
    if (geprueft.success) expect(geprueft.data.grundriss).toBeNull();
  });

  it('nimmt jpg und png', () => {
    for (const name of ['IR-900-grundriss.jpg', 'IR-900-grundriss.jpeg', 'IR-900-grundriss.png']) {
      expect(objektSchema.safeParse(objekt({ grundriss: name })).success, name).toBe(true);
    }
  });

  it('weist andere Namen zurueck', () => {
    for (const name of ['IR-900.jpg', 'grundriss.jpg', 'IR-900-plan.jpg', '../geheim.png']) {
      expect(objektSchema.safeParse(objekt({ grundriss: name })).success, name).toBe(false);
    }
  });

  it('ist bei allen erfassten Objekten noch leer', () => {
    for (const o of roh.objekte) {
      expect((o as { grundriss?: unknown }).grundriss ?? null, o.id).toBeNull();
    }
  });

  it('wird auf der Detailseite als eigener Abschnitt gezeigt', () => {
    const detail = lies('src/pages/[lang]/[segment]/[id].astro');
    expect(detail).toMatch(/const plan = grundriss\(o\)/);
    expect(detail, 'eigener Abschnitt, nicht in der Galerie').toMatch(/class="grundriss"/);
    expect(detail, 'zum Vergroessern verlinkt').toMatch(/href=\{plan\.src\}/);
  });

  it('ist in allen fuenf Sprachen beschriftet', () => {
    for (const lang of SPRACHEN) {
      for (const k of ['grH', 'grP', 'grAlt', 'grNd']) {
        expect((TEXTE[lang] as Record<string, string>)[k], `${lang}.${k}`).toBeTruthy();
      }
    }
  });

  it('laesst sich auch als PNG laden', () => {
    /* Grundrisse werden gezeichnet, nicht fotografiert — PNG ist dort haeufig. */
    expect(lies('src/data/fotos.ts')).toMatch(/png,PNG/);
    expect(lies('src/data/fotos.ts')).toMatch(/export function grundriss/);
  });
});

describe('Was noch fehlt, steht im Datencheck', () => {
  const pruefer = lies('scripts/daten-pruefen.mjs');

  it('zaehlt die fehlenden Fotos je Objekt', () => {
    expect(pruefer).toMatch(/ZIEL_FOTOS = 5/);
    expect(pruefer).toMatch(/von \$\{ZIEL_FOTOS\} Fotos/);
  });

  it('nennt Objekte ohne Grundriss', () => {
    expect(pruefer).toMatch(/kein Grundriss hinterlegt/);
  });

  it('meldet einen fehlenden Grundriss als Fehler, nicht als Hinweis', () => {
    /* Steht ein Dateiname im Datensatz, muss die Datei auch da sein — sonst
       bricht der Build erst beim Bilderzeugen ab, mit unklarer Meldung. */
    expect(pruefer).toMatch(/Grundriss "\$\{o\.grundriss\}" fehlt/);
  });
});

describe('Hochladen im Editor', () => {
  const editor = lies('src/pages/edit.astro');
  const worker = lies('worker/index.ts');

  it('bietet einen eigenen Platz fuer den Grundriss', () => {
    expect(editor).toMatch(/datei-grundriss/);
    expect(editor).toMatch(/-grundriss\.jpg/);
  });

  it('blendet den Foto-Knopf beim fuenften aus, statt spaeter abzuweisen', () => {
    expect(editor).toMatch(/bearbeitet\.foto\.length >= 5/);
  });

  it('legt den Grundriss groesser ab als die Fotos', () => {
    /* Auf einem Grundriss stehen Masse, die sonst nicht mehr zu lesen sind. */
    expect(editor).toMatch(/-grundriss\.jpg', 2000/);
    expect(editor).toMatch(/\.jpg', 1400/);
  });

  it('nimmt im Worker nur die beiden erlaubten Namensformen an', () => {
    expect(worker).toMatch(/ISTFOTO/);
    expect(worker).toMatch(/ISTGRUNDRISS/);
  });
});
