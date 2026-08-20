#!/usr/bin/env node
/**
 * Liest die Koordinaten aus den EXIF-Daten von Fotos und traegt sie in
 * objekte.json ein.
 *
 * Handys speichern beim Fotografieren, wo das Bild entstanden ist. Wenn die
 * Originale noch unveraendert vorliegen, muessen die Koordinaten nicht von Hand
 * aus Google Maps abgetippt werden.
 *
 *   node scripts/koordinaten-aus-fotos.mjs <ordner>            nur anzeigen
 *   node scripts/koordinaten-aus-fotos.mjs <ordner> --schreiben  eintragen
 *
 * Mit --ziel <pfad> geht das Ergebnis in eine andere Datei statt in
 * src/data/objekte.json.
 *
 * Der Ordner enthaelt die Originale, benannt wie in objekte.json (IR-001.jpg …).
 * Die Fotos in src/fotos/ tragen keine EXIF-Daten mehr — sie wurden unterwegs
 * neu kodiert. Deshalb ein eigener Ordner statt src/fotos/.
 *
 * WICHTIG — wie die Originale heil ankommen:
 *   · Nicht ueber WhatsApp an sich selbst schicken. WhatsApp entfernt saemtliche
 *     Metadaten. Genauso Signal, Telegram (als "Foto") und die meisten Messenger.
 *   · iPhone: Fotos -> Teilen -> oben "Optionen" -> "Alle Fotodaten" einschalten.
 *     Dann per AirDrop, iCloud-Link oder Kabel.
 *   · Android: Teilen -> im Menue darf "Standort entfernen" NICHT aktiv sein.
 *     Sicherer ist auch hier das Kabel.
 *
 * Zur Genauigkeit: in engen Altstadtgassen ist die Ortung ungenau, oft 10-30 m.
 * Bei drei Meter breiten Gassen kann die Markierung damit am Nachbarhaus landen.
 * Die Werte sind ein guter Anfang — nachsehen lohnt sich trotzdem.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import exifr from 'exifr';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const zielFlagge = process.argv.indexOf('--ziel');
const DATEN = zielFlagge !== -1 && process.argv[zielFlagge + 1]
  ? resolve(process.argv[zielFlagge + 1])
  : join(WURZEL, 'src/data/objekte.json');

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;
const grau = (s) => `\x1b[90m${s}\x1b[0m`;

/** Grober Umriss von Irsina. Was weit ausserhalb liegt, ist ein Irrtum. */
const IRSINA = { lat: 40.7466, lng: 16.2417 };
const MAX_KM = 5;

function entfernungKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const stellen = process.argv.slice(2).filter((a, i, alle) => {
  if (a.startsWith('--')) return false;
  return !(i > 0 && alle[i - 1] === '--ziel');
});
const ordner = stellen[0];
const schreiben = process.argv.includes('--schreiben');

if (!ordner) {
  console.error('Aufruf: node scripts/koordinaten-aus-fotos.mjs <ordner> [--schreiben]');
  process.exit(1);
}
const quelle = resolve(ordner);
if (!existsSync(quelle)) {
  console.error(rot(`Ordner nicht gefunden: ${quelle}`));
  process.exit(1);
}

const datei = JSON.parse(readFileSync(DATEN, 'utf-8'));

/** Dateiname -> Objekt, damit auch IR-010a.jpg zu IR-010 findet. */
const nachFoto = new Map();
for (const o of datei.objekte) for (const f of o.foto) nachFoto.set(f, o);

const bilder = readdirSync(quelle).filter((n) => /\.jpe?g$/i.test(n)).sort();
if (!bilder.length) {
  console.error(rot(`Keine JPEG-Dateien in ${quelle}`));
  process.exit(1);
}

console.log(`\n  ${bilder.length} Foto(s) in ${quelle}\n`);

const funde = new Map();   // Objekt-Kennung -> { lat, lng, quelle, genauigkeit }
let ohne = 0;

for (const name of bilder) {
  const objekt = nachFoto.get(name);
  const gps = await exifr.gps(join(quelle, name)).catch(() => null);

  if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
    console.log(`  ${gelb('—')} ${name.padEnd(14)} keine Koordinaten im Bild`);
    ohne++;
    continue;
  }

  const punkt = { lat: Number(gps.latitude.toFixed(6)), lng: Number(gps.longitude.toFixed(6)) };
  const km = entfernungKm(IRSINA, punkt);

  if (!objekt) {
    console.log(
      `  ${gelb('?')} ${name.padEnd(14)} ${punkt.lat}, ${punkt.lng}  ` +
        grau('— dieser Dateiname steht in keinem Objekt'),
    );
    continue;
  }

  if (km > MAX_KM) {
    console.log(
      `  ${rot('✗')} ${name.padEnd(14)} ${punkt.lat}, ${punkt.lng}  ` +
        rot(`${km.toFixed(1)} km von Irsina entfernt — wird nicht uebernommen`),
    );
    continue;
  }

  // Mehrere Fotos je Objekt: das erste gewinnt, die weiteren werden verglichen.
  const bisher = funde.get(objekt.id);
  if (bisher) {
    const abstand = entfernungKm(bisher, punkt) * 1000;
    console.log(
      `  ${grau('·')} ${name.padEnd(14)} ${punkt.lat}, ${punkt.lng}  ` +
        grau(`${abstand.toFixed(0)} m vom ersten Foto desselben Objekts`),
    );
    continue;
  }

  funde.set(objekt.id, { ...punkt, quelle: name });
  const vorhanden = objekt.lat !== null;
  console.log(
    `  ${gruen('✓')} ${name.padEnd(14)} ${punkt.lat}, ${punkt.lng}  ` +
      `${objekt.id}${vorhanden ? gelb('  — hat bereits Koordinaten, wird ueberschrieben') : ''}`,
  );
}

if (!funde.size) {
  console.log(
    rot('\n  Keine brauchbaren Koordinaten gefunden.\n') +
      grau(
        '  Meist wurden die Fotos unterwegs neu kodiert — WhatsApp und die meisten\n' +
          '  Messenger entfernen alle Metadaten. Die Originale direkt vom Geraet holen,\n' +
          '  am iPhone unter Teilen -> Optionen -> "Alle Fotodaten".\n',
      ),
  );
  process.exit(ohne === bilder.length ? 1 : 0);
}

if (!schreiben) {
  console.log(
    `\n  ${funde.size} Objekt(e) haetten Koordinaten. Zum Eintragen:\n` +
      grau(`  node scripts/koordinaten-aus-fotos.mjs ${ordner} --schreiben\n`),
  );
  process.exit(0);
}

for (const o of datei.objekte) {
  const fund = funde.get(o.id);
  if (!fund) continue;
  o.lat = fund.lat;
  o.lng = fund.lng;
}
writeFileSync(DATEN, JSON.stringify(datei, null, 2) + '\n');

console.log(
  gruen(`\n  ✓ ${funde.size} Objekt(e) in src/data/objekte.json eingetragen.\n`) +
    grau(
      '  Bitte nachsehen: in engen Gassen ist die Ortung auf 10-30 m genau — die\n' +
        '  Markierung kann am Nachbarhaus landen. Danach "npm run build".\n',
    ),
);
