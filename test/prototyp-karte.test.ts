import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Zwei Zusagen, die der Prototyp einhalten muss — er ist die Fassung, die
 * herumgereicht wird:
 *
 *  · Der Kartenhintergrund von openstreetmap.org wird erst nach ausdruecklicher
 *    Zustimmung geholt. Genau das steht in der Datenschutzerklaerung. Der
 *    Prototyp hat ihn eine Zeit lang beim Aufbau der Seite geladen, ohne zu
 *    fragen; diese Pruefung haelt fest, dass das nicht zurueckkommt.
 *  · Ein Objekt laesst sich aus seiner eigenen Ansicht heraus berichtigen.
 *    Vor Ort wird erst das Haus geoeffnet und dann korrigiert, nicht umgekehrt.
 */
const WURZEL = join(import.meta.dirname, '..');
const LAUFZEIT = readFileSync(join(WURZEL, 'scripts/prototyp-laufzeit.js'), 'utf-8');
const EDITOR = readFileSync(join(WURZEL, 'scripts/prototyp-editor.js'), 'utf-8');

/** Rumpf der mit `function <name>(` beginnenden Funktion, ueber Klammerzaehlung. */
function rumpf(quelle: string, name: string): string {
  const von = quelle.indexOf('function ' + name + '(');
  expect(von, `function ${name} nicht gefunden`).toBeGreaterThan(-1);
  const start = quelle.indexOf('{', quelle.indexOf(')', von));
  let tiefe = 0;
  for (let i = start; i < quelle.length; i++) {
    if (quelle[i] === '{') tiefe++;
    else if (quelle[i] === '}') {
      tiefe--;
      if (tiefe === 0) return quelle.slice(start + 1, i);
    }
  }
  throw new Error(`Klammer nicht geschlossen bei ${name}`);
}

describe('Karte: Kacheln erst nach Zustimmung', () => {
  it('holt den Hintergrund nicht schon beim Zeichnen der Karte', () => {
    expect(rumpf(LAUFZEIT, 'karteZeichnen')).not.toMatch(/L\.tileLayer/);
  });

  it('kennt genau eine Stelle, die Kacheln anfordert', () => {
    const stellen = LAUFZEIT.match(/L\.tileLayer\(/g) || [];
    expect(stellen.length, 'L.tileLayer steht mehr als einmal in der Laufzeit').toBe(1);
    expect(rumpf(LAUFZEIT, 'kachelnLaden')).toMatch(/L\.tileLayer\(/);
  });

  it('ruft diese Stelle nur nach Zustimmung auf', () => {
    /* Jeder Aufruf von kachelnLaden() ausserhalb der Funktion selbst muss
       entweder hinter kachelnErlaubt() stehen oder im Klickpfad des Knopfes. */
    const zeilen = LAUFZEIT.split('\n');
    const aufrufe = zeilen
      .map((z, i) => ({ z: z.trim(), i }))
      .filter((e) => /(^|[^.\w])kachelnLaden\(\)/.test(e.z) && !e.z.startsWith('function'));
    expect(aufrufe.length, 'kein Aufruf von kachelnLaden gefunden').toBeGreaterThan(0);
    for (const a of aufrufe) {
      const umfeld = zeilen.slice(Math.max(0, a.i - 8), a.i + 1).join('\n');
      expect(
        /kachelnErlaubt\(\)/.test(umfeld) || /karte-laden/.test(umfeld),
        `Zeile ${a.i + 1} laedt Kacheln ohne Zustimmung: ${a.z}`,
      ).toBe(true);
    }
  });

  it('fragt mit denselben Texten wie die gebaute Seite', () => {
    for (const schluessel of ['mapConsentP', 'mapConsentBtn', 'mapConsentKeep']) {
      expect(LAUFZEIT, `${schluessel} wird im Prototyp nicht benutzt`).toMatch(
        new RegExp("t\\('" + schluessel + "'\\)"),
      );
    }
  });

  it('zeigt die Markierungen auch ohne Hintergrund', () => {
    /* Die Beispielkarte war der ausdrueckliche Wunsch — sie darf nicht hinter
       der Zustimmungsfrage verschwinden. */
    const zeichnen = rumpf(LAUFZEIT, 'karteZeichnen');
    expect(zeichnen).toMatch(/L\.marker\(/);
    expect(zeichnen).toMatch(/ohne-kacheln/);
  });
});

describe('Bearbeiten aus der Objektansicht heraus', () => {
  it('setzt einen Knopf mit der Kennung in die Detailansicht', () => {
    const detail = rumpf(LAUFZEIT, 'detailOeffnen');
    expect(detail).toMatch(/ed-detail-knopf/);
    expect(detail).toMatch(/data-id="' \+ o\.id \+ '"/);
  });

  it('traegt die Klasse, auf die der Editor hoert', () => {
    /* Der Editor sammelt Bearbeiten-Knoepfe ueber .ed-kachel-knopf ein. Faellt
       sie weg, ist der Knopf da und tut nichts. */
    expect(EDITOR).toMatch(/closest\('\.ed-kachel-knopf'\)/);
    expect(rumpf(LAUFZEIT, 'detailOeffnen')).toMatch(/class="ed-kachel-knopf ed-detail-knopf"/);
  });

  it('zieht die offene Detailansicht nach einer Aenderung mit', () => {
    const setzen = rumpf(LAUFZEIT, 'datenSetzen');
    expect(setzen).toMatch(/detailOeffnen\(aktuellesObjekt, true\)/);
    expect(setzen, 'geloeschtes Objekt bliebe sonst offen stehen').toMatch(/detailSchliessen\(\)/);
  });

  it('laesst die Seite hinter der Detailansicht gesperrt', () => {
    /* Sonst scrollt die Seite darunter weg, sobald das Formular zugeht. */
    expect(rumpf(EDITOR, 'formularSchliessen')).toMatch(/detailOffen\(\)/);
  });
});
