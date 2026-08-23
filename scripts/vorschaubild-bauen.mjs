#!/usr/bin/env node
/**
 * Vorschaubild fuer das Teilen der Startseite.
 *
 * Wer die Startseite bei WhatsApp, Facebook oder Telegram verschickt, bekommt
 * dieses Bild angezeigt — 1200 x 630 ist das Format, das alle erwarten. Fehlt
 * es, bleibt an der Nachricht ein leerer Kasten; genau der Moment, in dem das
 * Projekt weitergereicht wird, saehe dann kaputt aus.
 *
 * Die Detailseiten brauchen das nicht: sie erzeugen ihr Vorschaubild aus dem
 * eigenen Foto (siehe src/pages/[lang]/[segment]/[id].astro).
 *
 * Erzeugt statt von Hand geschnitten, damit es sich wiederholen laesst — ein
 * anderes Foto ist eine geaenderte Zeile.
 *
 *   node scripts/vorschaubild-bauen.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');

/* IR-017: warme Fassade, blauer Himmel, schmiedeeiserne Laterne. Ein Bild vom
   Ort statt eines Logos — das Projekt hat keines und braucht keines. */
const QUELLE = join(WURZEL, 'src/fotos/IR-017.jpg');
const ZIEL = join(WURZEL, 'public/vorschau.jpg');

const BREITE = 1200;
const HOEHE = 630;

/* Der Verlauf ist nicht Zierde: ohne ihn steht heller Text auf hellem Putz.
   Er beginnt erst bei 42 %, damit die Fassade oben unberuehrt bleibt. */
const schrift = Buffer.from(
  `<svg width="${BREITE}" height="${HOEHE}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0.42" stop-color="#140f0c" stop-opacity="0"/>
         <stop offset="1"    stop-color="#140f0c" stop-opacity="0.82"/>
       </linearGradient>
     </defs>
     <rect width="${BREITE}" height="${HOEHE}" fill="url(#v)"/>
     <text x="64" y="522" font-family="Georgia, 'Times New Roman', serif"
           font-size="62" font-weight="700" fill="#faf6f0">Irsina</text>
     <text x="66" y="572" font-family="Helvetica, Arial, sans-serif"
           font-size="26" fill="#e8d9c4">Case nel centro storico · Basilicata</text>
   </svg>`,
);

/* Das Foto ist hochkant; ein einfacher Zuschnitt auf 1200 x 630 liefert
   fast nur Himmel. Deshalb wird zuerst das Band mit der Fassade und den
   beiden Schildern herausgeschnitten und erst dann skaliert. */
const AUSSCHNITT = { left: 0, top: 430, width: 1050, height: 551 };

await sharp(QUELLE)
  .extract(AUSSCHNITT)
  .resize(BREITE, HOEHE, { fit: 'cover' })
  .composite([{ input: schrift }])
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(ZIEL);

const masse = await sharp(ZIEL).metadata();
console.log(`\n  ✓ public/vorschau.jpg  ${masse.width}x${masse.height}\n`);
