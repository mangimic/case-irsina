import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import paket from '../package.json' with { type: 'json' };

/**
 * Die Skripte in scripts/ importieren TypeScript-Dateien direkt — etwa
 * daten-pruefen.mjs das Zod-Schema aus src/data/schema.ts. Node kann das erst
 * ab 22.18 ohne Schalter; davor bricht es mit ERR_UNKNOWN_FILE_EXTENSION ab.
 *
 * Genau daran ist der erste Cloudflare-Build gescheitert, und jeder CI-Lauf
 * davor: .node-version stand auf 22.12.0, oertlich lief eine neuere Fassung,
 * und die Meldung nennt die Ursache nicht. Diese Pruefung haelt die
 * Festlegungen zusammen, damit sie nicht wieder auseinanderlaufen.
 */
const WURZEL = join(import.meta.dirname, '..');
const gefordert = (paket as { engines?: { node?: string } }).engines?.node ?? '';

/** "22.23.2" -> [22, 23, 2] */
function teile(fassung: string): number[] {
  return fassung.trim().replace(/^[^\d]*/, '').split('.').map(Number);
}
function mindestens(fassung: string, schwelle: string): boolean {
  const a = teile(fassung);
  const b = teile(schwelle);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

/* Ab hier kann Node .ts-Dateien ohne --experimental-strip-types laden. */
const STRIP_TYPES_AB = '22.18.0';

describe('Node-Fassung', () => {
  it('legt .node-version und .nvmrc auf dieselbe Fassung fest', () => {
    const a = readFileSync(join(WURZEL, '.node-version'), 'utf-8').trim();
    const b = readFileSync(join(WURZEL, '.nvmrc'), 'utf-8').trim();
    expect(a).toBe(b);
  });

  it('fordert eine Fassung, die TypeScript ohne Schalter liest', () => {
    expect(gefordert, 'package.json braucht ein engines.node').toMatch(/\d/);
    expect(
      mindestens(gefordert, STRIP_TYPES_AB),
      `engines.node ist "${gefordert}" — die Skripte brauchen mindestens ${STRIP_TYPES_AB}`,
    ).toBe(true);
  });

  it('haelt die festgelegte Fassung im geforderten Bereich', () => {
    const fest = readFileSync(join(WURZEL, '.node-version'), 'utf-8').trim();
    expect(
      mindestens(fest, STRIP_TYPES_AB),
      `.node-version ist ${fest}, gebraucht wird mindestens ${STRIP_TYPES_AB}`,
    ).toBe(true);
  });

  it('laesst npm bei einer zu alten Fassung abbrechen statt nur warnen', () => {
    /* Ohne engine-strict ist engines nur ein Hinweis — der Build liefe weiter
       und schluege erst spaeter mit der unverstaendlichen Meldung fehl. */
    const npmrc = readFileSync(join(WURZEL, '.npmrc'), 'utf-8');
    expect(npmrc).toMatch(/^\s*engine-strict\s*=\s*true\s*$/m);
  });

  it('begruendet die Forderung: die Skripte importieren wirklich TypeScript', () => {
    /* Waere das nicht mehr so, waere diese ganze Pruefung gegenstandslos —
       dann soll sie auffallen und nicht stillschweigend weiterlaufen. */
    const ordner = join(WURZEL, 'scripts');
    const treffer = readdirSync(ordner)
      .filter((n) => n.endsWith('.mjs'))
      .filter((n) =>
        readFileSync(join(ordner, n), 'utf-8')
          .split('\n')
          /* Die Skripte laden ueber await import(join(WURZEL, '…​.ts')) — der
             Pfad steht also nicht unmittelbar hinter dem import. */
          .some((z) => /\bimport\b/.test(z) && /\.ts['"]/.test(z)),
      );
    expect(treffer.length, 'kein Skript importiert mehr eine .ts-Datei').toBeGreaterThan(0);
  });
});
