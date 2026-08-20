import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';

/**
 * Das Auslesen der Koordinaten wird gegen selbst gebaute Fotos geprueft, deren
 * Position bekannt ist. Ohne solche Testdaten liesse sich nicht unterscheiden,
 * ob das Werkzeug nichts findet — oder ob nichts da ist.
 *
 * Die Testfotos entstehen mit einem kleinen Python-Helfer, weil sharp beim
 * Schreiben von EXIF den GPS-Block stillschweigend verwirft.
 */
const WURZEL = join(import.meta.dirname, '..');
const HELFER = join(WURZEL, 'test/hilfen/mach-gps-jpeg.py');

let ordner: string;
let basis: string;

function gpsFoto(name: string, lat: number, lng: number) {
  execFileSync('python3', [HELFER, basis, join(ordner, name), String(lat), String(lng)]);
}

beforeAll(async () => {
  ordner = mkdtempSync(join(tmpdir(), 'irsina-gps-'));
  basis = join(ordner, '_basis.jpg');
  await sharp({ create: { width: 60, height: 60, channels: 3, background: '#a8462c' } })
    .jpeg()
    .toFile(basis);
});

describe('EXIF-Koordinaten', () => {
  it('liest die geschriebene Position wieder aus', async () => {
    gpsFoto('probe.jpg', 40.7466, 16.2417);
    const gps = await exifr.gps(join(ordner, 'probe.jpg'));
    expect(gps).not.toBeNull();
    expect(gps!.latitude).toBeCloseTo(40.7466, 4);
    expect(gps!.longitude).toBeCloseTo(16.2417, 4);
  });

  it('kommt mit einem Foto ohne GPS zurecht', async () => {
    const gps = await exifr.gps(basis).catch(() => null);
    expect(gps?.latitude ?? null).toBeNull();
  });

  it('meldet ein Foto weit ausserhalb von Irsina, statt es zu uebernehmen', () => {
    gpsFoto('IR-001.jpg', 45.4642, 9.19); // Mailand
    const ausgabe = execFileSync(
      'node',
      [join(WURZEL, 'scripts/koordinaten-aus-fotos.mjs'), ordner],
      { encoding: 'utf-8' },
    );
    expect(ausgabe).toMatch(/km von Irsina entfernt/);
    expect(ausgabe).not.toMatch(/✓ IR-001/);
  });

  it('traegt ohne --schreiben nichts ein', () => {
    // Auf einer Kopie, damit die Projektdatei unberuehrt bleibt.
    const kopie = join(ordner, 'objekte.json');
    const inhalt = readFileSync(join(WURZEL, 'src/data/objekte.json'), 'utf-8');
    writeFileSync(kopie, inhalt);
    execFileSync(
      'node',
      [join(WURZEL, 'scripts/koordinaten-aus-fotos.mjs'), ordner, '--ziel', kopie],
      { encoding: 'utf-8' },
    );
    expect(readFileSync(kopie, 'utf-8')).toBe(inhalt);
  });

  it('hat den Helfer zum Erzeugen der Testfotos dabei', () => {
    expect(existsSync(HELFER)).toBe(true);
  });
});
