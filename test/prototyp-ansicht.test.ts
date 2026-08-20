import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Die Anzeigetexte des Prototyps entstehen an zwei Stellen: beim Bauen
 * (scripts/prototyp-bauen.mjs, mit den Helfern der echten Seite) und im
 * Browser nach einer Aenderung im Editor (ansichtBauen in
 * scripts/prototyp-laufzeit.js).
 *
 * Genau hier ist schon einmal etwas auseinandergelaufen: 'pruefstand' kam nur
 * in der Laufzeit vor, weshalb die Plakette auf jeder Kachel falsch war und
 * leer blieb. Diese Pruefung vergleicht die Feldnamen beider Stellen und
 * schlaegt an, sobald eines nur auf einer Seite ergaenzt wird.
 */
const WURZEL = join(import.meta.dirname, '..');

/**
 * Liest das Objektliteral, das nach `anker` beginnt. Mit `ab` laesst sich der
 * Suchbeginn vorher festlegen — bei einer Funktion muss der Anker das
 * Rueckgabeobjekt treffen, nicht die Funktionsklammer.
 */
function literal(quelle: string, anker: string, ab?: string): string {
  const text = readFileSync(join(WURZEL, quelle), 'utf-8');
  const beginn = ab ? text.indexOf(ab) : 0;
  expect(beginn, `"${ab}" nicht gefunden in ${quelle}`).toBeGreaterThan(-1);
  const von = text.indexOf(anker, beginn);
  expect(von, `"${anker}" nicht gefunden in ${quelle}`).toBeGreaterThan(-1);
  const start = text.indexOf('{', von);
  let tiefe = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}') {
      tiefe--;
      if (tiefe === 0) return text.slice(start + 1, i);
    }
  }
  throw new Error(`Klammer nicht geschlossen in ${quelle}`);
}

/** Feldnamen der obersten Ebene eines flachen Objektliterals. */
function felder(roh: string): Set<string> {
  // Kommentare zuerst entfernen: stuenden sie zwischen zwei Feldern, bliebe
  // das folgende Feld ungezaehlt.
  const block = roh.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const namen = new Set<string>();
  let tiefe = 0;
  let rest = '';
  for (const zeichen of block) {
    if (zeichen === '{' || zeichen === '[' || zeichen === '(') tiefe++;
    else if (zeichen === '}' || zeichen === ']' || zeichen === ')') tiefe--;
    if (tiefe === 0) rest += zeichen;
  }
  for (const treffer of rest.matchAll(/(?:^|,)\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:/g)) {
    namen.add(treffer[1]!);
  }
  return namen;
}

describe('Ansicht des Prototyps', () => {
  it('kennt beim Bauen und im Browser dieselben Felder', () => {
    const bauen = felder(literal('scripts/prototyp-bauen.mjs', 'ANSICHT[lang] = OBJEKTE.map'));
    const laufzeit = felder(
      literal('scripts/prototyp-laufzeit.js', 'return {', 'function ansichtBauen'),
    );

    expect(bauen.size, 'zu wenige Felder gefunden — Anker geprüft?').toBeGreaterThan(15);
    expect(laufzeit.size, 'zu wenige Felder gefunden — Anker geprüft?').toBeGreaterThan(15);

    const nurBauen = [...bauen].filter((k) => !laufzeit.has(k)).sort();
    const nurLaufzeit = [...laufzeit].filter((k) => !bauen.has(k)).sort();

    expect(nurBauen, `nur beim Bauen: ${nurBauen.join(', ')}`).toHaveLength(0);
    expect(nurLaufzeit, `nur in der Laufzeit: ${nurLaufzeit.join(', ')}`).toHaveLength(0);
  });

  it('reicht den Prüfstand an beide Stellen durch', () => {
    for (const datei of ['scripts/prototyp-bauen.mjs', 'scripts/prototyp-laufzeit.js']) {
      const text = readFileSync(join(WURZEL, datei), 'utf-8');
      expect(text, `${datei} kennt pruefstandText nicht`).toContain('pruefstandText');
    }
  });
});
