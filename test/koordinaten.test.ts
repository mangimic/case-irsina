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

  it('findet das Objekt auch bei anderer Dateiendung', () => {
    // Vom iPhone kommen die Originale als HEIC, in objekte.json steht .jpg.
    const eigener = mkdtempSync(join(tmpdir(), 'irsina-gps-endung-'));
    execFileSync('python3', [HELFER, basis, join(eigener, 'IR-002.jpeg'), '40.7466', '16.2417']);
    const kopie = join(eigener, 'objekte.json');
    writeFileSync(kopie, readFileSync(join(WURZEL, 'src/data/objekte.json'), 'utf-8'));
    execFileSync(
      'node',
      [join(WURZEL, 'scripts/koordinaten-aus-fotos.mjs'), eigener, '--ziel', kopie, '--schreiben'],
      { encoding: 'utf-8' },
    );
    const objekt = JSON.parse(readFileSync(kopie, 'utf-8')).objekte.find(
      (o: { id: string }) => o.id === 'IR-002',
    );
    expect(objekt.lat).toBeCloseTo(40.7466, 4);
    expect(objekt.lng).toBeCloseTo(16.2417, 4);
  });

  it('traegt ein Foto mit fremdem Namen nicht ein', () => {
    // IMG_9560.HEIC laesst sich keinem Objekt zuordnen — Koordinaten nur zeigen.
    const eigener = mkdtempSync(join(tmpdir(), 'irsina-gps-fremd-'));
    execFileSync('python3', [HELFER, basis, join(eigener, 'IMG_9560.jpg'), '40.7466', '16.2417']);
    const kopie = join(eigener, 'objekte.json');
    const inhalt = readFileSync(join(WURZEL, 'src/data/objekte.json'), 'utf-8');
    writeFileSync(kopie, inhalt);
    const ausgabe = execFileSync(
      'node',
      [join(WURZEL, 'scripts/koordinaten-aus-fotos.mjs'), eigener, '--ziel', kopie, '--schreiben'],
      { encoding: 'utf-8' },
    );
    expect(ausgabe).toMatch(/40\.7466/);
    expect(ausgabe).toMatch(/umbenennen/);
    expect(readFileSync(kopie, 'utf-8')).toBe(inhalt);
  });

  it('liest auch HEIC-Dateien ein, statt sie zu uebergehen', () => {
    // exifr kann HEIC; der Ordnerfilter darf sie nicht vorher aussortieren.
    const quelltext = readFileSync(
      join(WURZEL, 'scripts/koordinaten-aus-fotos.mjs'),
      'utf-8',
    );
    const zeile = quelltext.match(/const ENDUNGEN = (.+);/);
    expect(zeile).not.toBeNull();
    const muster = new RegExp(zeile![1].replace(/^\/|\/i$/g, ''), 'i');
    for (const name of ['IR-016.HEIC', 'IR-016.heif', 'IR-016.jpg', 'IR-016.TIF']) {
      expect(muster.test(name), name).toBe(true);
    }
    expect(muster.test('IR-016.txt')).toBe(false);
  });

  it('hat den Helfer zum Erzeugen der Testfotos dabei', () => {
    expect(existsSync(HELFER)).toBe(true);
  });
});
