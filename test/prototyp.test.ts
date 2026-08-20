import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import roh from '../src/data/objekte.json';

/**
 * Der Prototyp ist eine zweite Ausgabeform derselben Daten. Diese Tests halten
 * fest, was dabei nicht verloren gehen darf — vor allem der Schutz der
 * Telefonnummern, denn die Einzeldatei wird direkt weitergegeben.
 *
 * Sie laufen nur, wenn zuvor "npm run prototyp" ausgefuehrt wurde.
 */
const DATEI = join(import.meta.dirname, '../dist-prototyp/irsina-prototyp.html');
const gebaut = existsSync(DATEI);

describe.skipIf(!gebaut)('Prototyp-Einzeldatei', () => {
  const inhalt = gebaut ? readFileSync(DATEI, 'utf-8') : '';

  it('enthaelt keine Nummer aus den internen Notizen', () => {
    /* objekte.json fuehrt seit dem Umzug in ein oeffentliches Repository nur
       noch freigegebene Nummern — die duerfen im Prototyp stehen. Die
       abgelesenen, ungefragten liegen in daten-intern/kontakte.json; genau
       die duerfen es nicht. Auf dem Bauserver gibt es die Datei nicht, dort
       ist hier nichts zu pruefen. */
    const intern = join(import.meta.dirname, '../daten-intern/kontakte.json');
    if (!existsSync(intern)) return;

    const kontakte = JSON.parse(readFileSync(intern, 'utf-8')).kontakte ?? {};
    for (const [id, eintrag] of Object.entries<Record<string, unknown>>(kontakte)) {
      for (const feld of ['telefon', 'telefon2']) {
        const nummer = eintrag[feld];
        if (typeof nummer !== 'string') continue;
        const ziffern = nummer.replace(/\D/g, '');
        for (const form of [nummer, ziffern, ziffern.replace(/^39/, '')]) {
          if (form.length < 8) continue;
          expect(inhalt.includes(form), `${id}: ${form} steht im Prototyp`).toBe(false);
        }
      }
    }
  });

  it('liefert nur Nummern aus, zu denen eine Freigabe vorliegt', () => {
    for (const o of roh.objekte) {
      if (o.freigabe) continue;
      // Ohne Freigabe steht in objekte.json ohnehin nichts — die Gegenprobe
      // faellt damit auf test/oeffentlich.test.ts.
      expect(o.telefon).toBeNull();
    }
  });

  it('fuehrt jedes Objekt in allen fuenf Sprachen', () => {
    for (const o of roh.objekte) {
      const treffer = inhalt.split(`"${o.id}"`).length - 1;
      expect(treffer, `${o.id} kommt nur ${treffer}× vor`).toBeGreaterThanOrEqual(5);
    }
  });

  it('laedt beim Oeffnen nichts von fremden Servern ausser den Kartenkacheln', () => {
    /* Geprueft wird, was der Browser tatsaechlich holt — also src, href von
       Stylesheets und url() in CSS. Blosse Zeichenketten zaehlen nicht: der
       eingebettete Leaflet-Quelltext nennt in Kommentaren Fehlerdatenbanken,
       und die Teilen-Knoepfe sind Verweise, die erst ein Klick aufruft. */
    const geladen = [
      ...inhalt.matchAll(/<(?:script|img|iframe)[^>]+src="(https?:\/\/[^"]+)"/gi),
      ...inhalt.matchAll(/<link[^>]+rel="(?:stylesheet|preconnect|preload)"[^>]*href="(https?:\/\/[^"]+)"/gi),
      ...inhalt.matchAll(/url\((https?:\/\/[^)]+)\)/gi),
    ].map((m) => new URL(m[1]!).host);

    expect(geladen, `laedt: ${geladen.join(', ')}`).toHaveLength(0);
  });

  it('holt die Kartenkacheln nur von OpenStreetMap', () => {
    const vorlagen = [...inhalt.matchAll(/L\.tileLayer\('([^']+)'/g)].map((m) => m[1]!);
    expect(vorlagen.length).toBeGreaterThan(0);
    for (const v of vorlagen) {
      expect(v).toMatch(/^https:\/\/tile\.openstreetmap\.org\//);
    }
    // Und der Urheberhinweis, den die Nutzungsbedingungen verlangen.
    expect(inhalt).toContain('openstreetmap.org/copyright');
  });

  it('bleibt unter der Groessengrenze fuer Artifacts', () => {
    expect(inhalt.length / 1e6).toBeLessThan(16);
  });

  it('traegt den Prototyp-Hinweis in allen fuenf Sprachen', () => {
    for (const satz of ['una bozza', 'a draft', 'ein Entwurf', 'een voorlopige', 'une ébauche']) {
      expect(inhalt.includes(satz), `Hinweis fehlt: ${satz}`).toBe(true);
    }
  });

  it('bringt den Editor und die Karte mit', () => {
    expect(inhalt).toContain('window.irsinaEditor');
    expect(inhalt).toContain('data-ed="an"');
    expect(inhalt).toContain('L.tileLayer');
  });

  it('kennzeichnet die Beispielkoordinaten als Beispiel', () => {
    for (const satz of ['Rappresentazione di esempio', 'Example view', 'Beispieldarstellung']) {
      expect(inhalt.includes(satz), `Kennzeichnung fehlt: ${satz}`).toBe(true);
    }
    expect(inhalt).toContain('"erfunden":true');
  });

  it('liefert den Pruefhinweis fuer jedes unbesichtigte Objekt mit', () => {
    expect(inhalt).toContain('pruefhinweis');
    for (const satz of ['non è stato visitato', 'has not been visited', 'nicht besichtigt']) {
      expect(inhalt.includes(satz), `Pruefhinweis fehlt: ${satz}`).toBe(true);
    }
  });
});
