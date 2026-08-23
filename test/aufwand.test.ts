import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AUFWAND, objektSchema } from '../src/data/schema.ts';
import roh from '../src/data/objekte.json';
import { TEXTE } from '../src/i18n/texte.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';

/**
 * Die Aufwandsstufe sagt etwas ueber den Innenraum: S heisst einzugsbereit,
 * XL heisst aufwendige Arbeiten. Beides kann nur wissen, wer drin war.
 *
 * Das Projekt sagt an jeder Kachel, dass kein Haus besichtigt wurde. Eine
 * Stufe daneben waere ein Widerspruch — deshalb haengt das Feld am Pruefstand
 * und nicht am Gefuehl beim Betrachten des Fotos.
 */
const WURZEL = join(import.meta.dirname, '..');

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

describe('Aufwandsstufe', () => {
  it('kennt genau vier Stufen', () => {
    expect([...AUFWAND]).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('darf leer bleiben', () => {
    const geprueft = objektSchema.safeParse(objekt());
    expect(geprueft.success).toBe(true);
    if (geprueft.success) expect(geprueft.data.aufwand).toBeNull();
  });

  it('weist eine Stufe ohne Besichtigung zurueck', () => {
    const geprueft = objektSchema.safeParse(objekt({ aufwand: 'S' }));
    expect(geprueft.success).toBe(false);
    if (!geprueft.success) {
      expect(geprueft.error.issues.some((i) => i.path.includes('aufwand'))).toBe(true);
    }
  });

  it('laesst sie zu, sobald jemand bestaetigt hat', () => {
    for (const stand of ['eigentuemer', 'vermittler'] as const) {
      const geprueft = objektSchema.safeParse(objekt({ aufwand: 'XL', pruefstand: stand }));
      expect(geprueft.success, stand).toBe(true);
    }
  });

  it('weist eine erfundene Stufe zurueck', () => {
    expect(objektSchema.safeParse(objekt({ aufwand: 'XXL', pruefstand: 'eigentuemer' })).success)
      .toBe(false);
  });

  it('steht bei allen erfassten Objekten auf leer', () => {
    /* Es war noch niemand drin. Waere hier eine Stufe gesetzt, waere sie
       geraten. */
    for (const o of roh.objekte) {
      expect((o as { aufwand?: unknown }).aufwand ?? null, o.id).toBeNull();
    }
  });

  it('ist in allen fuenf Sprachen beschriftet', () => {
    for (const lang of SPRACHEN) {
      for (const schluessel of ['aufH', 'aufAll', 'aufS', 'aufM', 'aufL', 'aufXL', 'aufNd', 'aufP']) {
        const wert = (TEXTE[lang] as Record<string, string>)[schluessel];
        expect(wert, `${lang}.${schluessel}`).toBeTruthy();
      }
    }
  });

  it('erscheint auf der Seite: Plakette, Angabe und Filter', () => {
    const kachel = readFileSync(join(WURZEL, 'src/components/Objektkachel.astro'), 'utf-8');
    expect(kachel, 'Plakette auf der Kachel').toMatch(/aufwand a-/);
    expect(kachel, 'Filterattribut auf der Kachel').toMatch(/data-aufwand=/);

    const filter = readFileSync(join(WURZEL, 'src/components/Filter.astro'), 'utf-8');
    expect(filter, 'Auswahlfeld im Filter').toMatch(/name="aufwand"/);
    expect(filter, 'Filter greift auch').toMatch(/form\.aufwand\.value/);

    const detail = readFileSync(
      join(WURZEL, 'src/pages/[lang]/[segment]/[id].astro'),
      'utf-8',
    );
    expect(detail, 'Zeile in der Angabenliste').toMatch(/aufwandText/);
  });

  it('laesst sich im Prototyp setzen und filtern', () => {
    const editor = readFileSync(join(WURZEL, 'scripts/prototyp-editor.js'), 'utf-8');
    expect(editor, 'Auswahlfeld im Editor').toMatch(/auswahl\('aufwand'/);
    expect(editor, 'wird beim Speichern uebernommen').toMatch(/o\.aufwand = wert\('aufwand'\)/);
    expect(editor, 'steht im Auszug').toMatch(/aufwand: o\.aufwand/);

    const laufzeit = readFileSync(join(WURZEL, 'scripts/prototyp-laufzeit.js'), 'utf-8');
    expect(laufzeit, 'Filter im Prototyp').toMatch(/form\.aufwand\.value/);
    expect(laufzeit, 'Plakette im Prototyp').toMatch(/aufwand a-/);
  });

  it('steht im Prototyp fuer den Fall ohne Stufe bereit', () => {
    /* Der Prototyp muss "noch nicht eingeschaetzt" anzeigen koennen, sonst
       stuende dort undefined. */
    const laufzeit = readFileSync(join(WURZEL, 'scripts/prototyp-laufzeit.js'), 'utf-8');
    expect(laufzeit).toMatch(/aufwandText:\s*o\.aufwand == null \? tx\.aufNd/);
  });

  it('hat die Beispieldatei nicht vergessen', () => {
    const vorlage = join(WURZEL, 'daten-intern/kontakte.beispiel.json');
    expect(existsSync(vorlage)).toBe(true);
  });
});
