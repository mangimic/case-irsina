import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Die Angaben in wrangler.toml sind erst beim Deployen zu pruefen — und dort
 * kostet ein Fehler einen fehlgeschlagenen Build. Der erste Versuch ist daran
 * gescheitert, dass die Datei fuer Cloudflare Pages geschrieben war
 * (pages_build_output_dir), das Projekt aber als Worker deployt wird:
 *
 *   ERROR  Missing entry-point to Worker script or to assets directory
 *
 * Beides zusammen geht nicht. Diese Pruefungen halten die Datei bei dem, was
 * der Build tatsaechlich erzeugt.
 */
const WURZEL = join(import.meta.dirname, '..');
const TOML = readFileSync(join(WURZEL, 'wrangler.toml'), 'utf-8');

/** Wert einer Zeile `schluessel = "wert"`, Kommentarzeilen ausgenommen. */
function wert(schluessel: string): string | null {
  for (const zeile of TOML.split('\n')) {
    if (zeile.trimStart().startsWith('#')) continue;
    const treffer = zeile.match(new RegExp(`^\\s*${schluessel}\\s*=\\s*"([^"]*)"`));
    if (treffer) return treffer[1];
  }
  return null;
}

const AUSGABE = join(WURZEL, 'dist');
const gebaut = existsSync(AUSGABE);

describe('Cloudflare-Konfiguration', () => {
  it('mischt nicht Pages- und Worker-Angaben', () => {
    /* pages_build_output_dir gehoert zu Cloudflare Pages. Steht es in einem
       Projekt, das ueber `wrangler deploy` geht, bricht das Deployment ab. */
    const zeilen = TOML.split('\n').filter((z) => !z.trimStart().startsWith('#'));
    expect(zeilen.join('\n')).not.toMatch(/pages_build_output_dir/);
  });

  it('nennt den Ordner, den der Build erzeugt', () => {
    expect(wert('directory'), 'wrangler.toml braucht [assets] directory').toBe('./dist');
  });

  it('nennt einen Worker, den es wirklich gibt', () => {
    /* Der Worker traegt das Kontaktformular und den Editor. Steht hier ein
       Pfad ins Leere, bricht das Deployment ab. */
    const main = wert('main');
    expect(main, 'wrangler.toml braucht ein main').not.toBeNull();
    expect(existsSync(join(WURZEL, main!)), `${main} fehlt`).toBe(true);
  });

  it('gibt dem Worker Zugriff auf die statischen Dateien', () => {
    /* Ohne diese Bindung koennte er unbekannte Wege nicht an die Seite
       weiterreichen. */
    expect(TOML).toMatch(/binding\s*=\s*"ASSETS"/);
  });

  it('liefert die eigene 404-Seite aus', () => {
    expect(TOML).toMatch(/not_found_handling\s*=\s*"404-page"/);
  });
});

describe.skipIf(!gebaut)('Was Cloudflare hochlaedt', () => {
  /* Diese vier Dateien tragen Sicherheits-Header, Weiterleitungen, die eigene
     Fehlerseite und das Vorschaubild. Fehlt eine, faellt es sonst erst online
     auf. */
  for (const datei of ['_headers', '_redirects', '404.html', 'vorschau.jpg']) {
    it(`hat ${datei} im Ausgabeordner`, () => {
      expect(existsSync(join(AUSGABE, datei))).toBe(true);
    });
  }
});
