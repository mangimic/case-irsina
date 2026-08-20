import { describe, expect, it, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Ein leeres Telefonfeld im Auszug bedeutet UNVERAENDERT, nie "loeschen".
 *
 * Das war urspruenglich noetig, weil der Prototyp die Nummern gar nicht kannte.
 * Seit das Repository oeffentlich ist, stehen ohnehin nur freigegebene Nummern
 * in objekte.json — die Regel bleibt trotzdem: eine Freigabe soll sich nicht
 * beilaeufig durch einen Auszug widerrufen lassen, sondern nur bewusst.
 */
const WURZEL = join(import.meta.dirname, '..');
/* Gearbeitet wird auf einer Kopie: die Projektdatei bleibt unangetastet,
   und die Testdateien kommen sich nicht in die Quere. */
const VORLAGE = join(WURZEL, 'src/data/objekte.json');
const SKRIPT = join(WURZEL, 'scripts/prototyp-uebernehmen.mjs');
const ORIGINAL = readFileSync(VORLAGE, 'utf-8');
const ordner = mkdtempSync(join(tmpdir(), 'irsina-uebernahme-'));
const ZIEL = join(ordner, 'objekte.json');

function daten() {
  return JSON.parse(readFileSync(ZIEL, 'utf-8'));
}
function auszugSchreiben(objekte: unknown[]) {
  const p = join(ordner, 'auszug.json');
  writeFileSync(p, JSON.stringify({ objekte }, null, 2));
  return p;
}
function laufen(pfad: string, schreiben = false) {
  const argumente = [SKRIPT, pfad, '--ziel', ZIEL];
  if (schreiben) argumente.push('--schreiben');
  return execFileSync('node', argumente, { encoding: 'utf-8' });
}

beforeEach(() => writeFileSync(ZIEL, ORIGINAL));

describe('Übernahme aus dem Prototyp', () => {
  /** Legt im Zielbestand ein Objekt mit erteilter Freigabe an. */
  function mitFreigabe() {
    const stand = JSON.parse(ORIGINAL);
    const o = stand.objekte[0];
    o.telefon = '+393331234567';
    o.telefon_unsicher = false;
    o.freigabe = true;
    writeFileSync(ZIEL, JSON.stringify(stand, null, 2));
    return o;
  }

  it('lässt eine freigegebene Telefonnummer unangetastet, wenn der Auszug null meldet', () => {
    const o = mitFreigabe();
    laufen(auszugSchreiben([{ ...o, telefon: null, telefon2: null, preis: 33000 }]), true);

    const nachher = daten().objekte.find((x: any) => x.id === o.id);
    expect(nachher.telefon).toBe('+393331234567');
    expect(nachher.preis).toBe(33000);
  });

  it('trägt eine im Editor eingegebene Nummer nur mit Freigabe ein', () => {
    const o = daten().objekte.find((x: any) => !x.telefon);
    // Ohne Freigabe lehnt das Schema ab — nichts wird geschrieben.
    expect(() => laufen(auszugSchreiben([{ ...o, telefon: '+393401112233' }]), true)).toThrow();
    expect(daten().objekte.find((x: any) => x.id === o.id).telefon).toBeNull();

    // Mit Freigabe und geprüfter Nummer geht es durch.
    laufen(
      auszugSchreiben([
        { ...o, telefon: '+393401112233', telefon_unsicher: false, freigabe: true },
      ]),
      true,
    );
    expect(daten().objekte.find((x: any) => x.id === o.id).telefon).toBe('+393401112233');
  });

  it('nimmt eine einmal erteilte Freigabe nicht zurück', () => {
    const o = mitFreigabe();
    laufen(auszugSchreiben([{ ...o, freigabe: false, telefon: null }]), true);
    const nachher = daten().objekte.find((x: any) => x.id === o.id);
    expect(nachher.freigabe).toBe(true);
    expect(nachher.telefon).toBe('+393331234567');
  });

  it('schreibt ohne --schreiben nichts', () => {
    const vorher = readFileSync(ZIEL, 'utf-8');
    const o = daten().objekte[0];
    laufen(auszugSchreiben([{ ...o, preis: 99000 }]));
    expect(readFileSync(ZIEL, 'utf-8')).toBe(vorher);
  });

  it('lässt Objekte stehen, die im Auszug fehlen', () => {
    const anzahl = daten().objekte.length;
    laufen(auszugSchreiben([daten().objekte[0]]), true);
    expect(daten().objekte).toHaveLength(anzahl);
  });

  it('weist einen neuen Eintrag ohne Foto zurück und schreibt nichts', () => {
    const vorher = readFileSync(ZIEL, 'utf-8');
    const vorlage = daten().objekte[0];
    const pfad = auszugSchreiben([{ ...vorlage, id: 'IR-900', foto: [] }]);
    expect(() => laufen(pfad, true)).toThrow();
    expect(readFileSync(ZIEL, 'utf-8')).toBe(vorher);
  });

  it('nimmt einen vollständigen neuen Eintrag an', () => {
    const vorlage = daten().objekte[0];
    const anzahl = daten().objekte.length;
    laufen(auszugSchreiben([{ ...vorlage, id: 'IR-901', strasse: 'Via Nuova' }]), true);
    expect(daten().objekte).toHaveLength(anzahl + 1);
    expect(daten().objekte.find((o: any) => o.id === 'IR-901').strasse).toBe('Via Nuova');
  });

  it('übernimmt Koordinaten und Prüfstand', () => {
    const o = daten().objekte[0];
    laufen(auszugSchreiben([{ ...o, lat: 40.747, lng: 16.2411, pruefstand: 'eigentuemer' }]), true);
    const nachher = daten().objekte.find((x: any) => x.id === o.id);
    expect(nachher.lat).toBe(40.747);
    expect(nachher.pruefstand).toBe('eigentuemer');
  });
});
