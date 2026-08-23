#!/usr/bin/env node
/**
 * Unkenntlichmachen von Personen und Kfz-Kennzeichen in den Objektfotos.
 *
 * Die Fotos zeigen Fassaden an oeffentlichen Strassen. Gelegentlich geraet
 * dabei jemand ins Bild, der damit nichts zu tun hat, oder ein Kennzeichen
 * wird lesbar. Beides ist ein personenbezogenes Datum und hat auf einer
 * oeffentlichen Seite nichts zu suchen — die Datenschutzerklaerung des
 * Projekts sagt das ausdruecklich zu.
 *
 * Die Bereiche stehen hier fest im Code statt in einem Bildbearbeitungs-
 * programm zu verschwinden: so ist nachvollziehbar, was warum verdeckt wurde,
 * und der Schritt laesst sich jederzeit wiederholen.
 *
 *   node scripts/fotos-anonymisieren.mjs --pruefen   zeigt nur an, was zu tun waere
 *   node scripts/fotos-anonymisieren.mjs             wendet es an
 *
 * Neue Fotos: hier einen Eintrag ergaenzen. Koordinaten in Bildpunkten des
 * Originals, Ursprung oben links.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const FOTOS = join(WURZEL, 'src/fotos');
const PROTOKOLL = join(WURZEL, 'src/fotos/anonymisiert.json');

/**
 * Zwei Mittel, je nachdem was das Bild hergibt:
 *
 *   verdecken   verpixelt einen Bereich. Fuer Kennzeichen mitten im Bild.
 *   beschneiden schneidet einen Rand ab. Fuer Personen am Bildrand — das
 *               sieht besser aus als ein grauer Kasten und laesst nichts uebrig.
 *
 * Beschnitten wird zuletzt, die Koordinaten beziehen sich also immer auf das
 * unveraenderte Original.
 *
 * @type {Record<string, {
 *   verdecken?: {grund: string, left: number, top: number, width: number, height: number}[],
 *   beschneiden?: {grund: string, left?: number, top?: number, right?: number, bottom?: number},
 * }>}
 */
const BEREICHE = {
  'IR-003.jpg': {
    verdecken: [
      { grund: 'Kfz-Kennzeichen, teilweise lesbar', left: 818, top: 782, width: 74, height: 40 },
    ],
  },
  'IR-016.jpg': {
    beschneiden: { grund: 'Passant am rechten Bildrand, erkennbar', right: 135 },
  },
  'IR-019.jpg': {
    verdecken: [
      { grund: 'Kfz-Kennzeichen, voll lesbar', left: 345, top: 1118, width: 82, height: 30 },
      { grund: 'Kfz-Kennzeichen, voll lesbar', left: 598, top: 1118, width: 90, height: 30 },
      { grund: 'Kfz-Kennzeichen, voll lesbar', left: 868, top: 1095, width: 92, height: 30 },
    ],
  },
  'IR-009.jpg': {
    verdecken: [
      { grund: 'Kfz-Kennzeichen, lesbar', left: 345, top: 928, width: 96, height: 62 },
    ],
    beschneiden: { grund: 'Passantin am rechten Bildrand, erkennbar', right: 215 },
  },
};

const nurPruefen = process.argv.includes('--pruefen');
const protokoll = existsSync(PROTOKOLL) ? JSON.parse(readFileSync(PROTOKOLL, 'utf-8')) : {};

function fingerabdruck(anweisung) {
  return createHash('sha256').update(JSON.stringify(anweisung)).digest('hex').slice(0, 12);
}

let geaendert = 0;
for (const [datei, anweisung] of Object.entries(BEREICHE)) {
  const pfad = join(FOTOS, datei);
  if (!existsSync(pfad)) {
    console.error(`  ! ${datei} liegt nicht in src/fotos/`);
    process.exitCode = 1;
    continue;
  }

  const verdecken = anweisung.verdecken ?? [];
  const beschneiden = anweisung.beschneiden;
  const marke = fingerabdruck(anweisung);
  if (protokoll[datei] === marke) {
    console.log(`  · ${datei} ist bereits bearbeitet`);
    continue;
  }

  for (const b of verdecken) console.log(`  → ${datei}: ${b.grund} (verpixeln)`);
  if (beschneiden) console.log(`  → ${datei}: ${beschneiden.grund} (beschneiden)`);
  if (nurPruefen) { geaendert++; continue; }

  const { width = 0, height = 0 } = await sharp(pfad).metadata();

  /* Die verdeckten Stellen werden aus dem Bild selbst erzeugt: verkleinert,
     wieder vergroessert und weichgezeichnet. Das faellt weniger auf als ein
     schwarzer Balken und laesst sich nicht zurueckrechnen. */
  const flicken = [];
  for (const b of verdecken) {
    const left = Math.max(0, Math.min(b.left, width - 1));
    const top = Math.max(0, Math.min(b.top, height - 1));
    const w = Math.min(b.width, width - left);
    const h = Math.min(b.height, height - top);
    const klein = Math.max(3, Math.round(Math.max(w, h) / 22));
    const roh = await sharp(pfad)
      .extract({ left, top, width: w, height: h })
      .resize({ width: klein, kernel: 'cubic' })
      .resize({ width: w, height: h, kernel: 'nearest' })
      .blur(Math.max(4, klein))
      .toBuffer();
    flicken.push({ input: roh, left, top });
  }

  let bild = sharp(pfad);
  if (flicken.length) bild = sharp(await bild.composite(flicken).toBuffer());

  if (beschneiden) {
    const left = beschneiden.left ?? 0;
    const top = beschneiden.top ?? 0;
    const w = width - left - (beschneiden.right ?? 0);
    const h = height - top - (beschneiden.bottom ?? 0);
    if (w < 200 || h < 200) {
      console.error(`  ! ${datei}: Beschnitt liesse nur ${w}×${h} uebrig — uebersprungen.`);
      process.exitCode = 1;
      continue;
    }
    bild = bild.extract({ left, top, width: w, height: h });
  }

  writeFileSync(pfad, await bild.jpeg({ quality: 92, mozjpeg: true }).toBuffer());
  protokoll[datei] = marke;
  geaendert++;
}

if (!nurPruefen) {
  writeFileSync(PROTOKOLL, JSON.stringify(protokoll, null, 2) + '\n');
}

if (nurPruefen && geaendert > 0) process.exitCode = 1;

console.log(
  geaendert === 0
    ? '\n  ✓ Alle erfassten Bereiche sind bereits unkenntlich.\n'
    : nurPruefen
      ? `\n  ${geaendert} Foto(s) waeren zu bearbeiten.\n`
      : `\n  ✓ ${geaendert} Foto(s) bearbeitet.\n`,
);
