#!/usr/bin/env node
/**
 * Prueft src/data/objekte.json, bevor gebaut wird.
 *
 * Der Astro-Build wuerde bei fehlerhaften Daten ebenfalls abbrechen, aber erst
 * nach dem Einlesen aller Bilder. Dieses Skript braucht keine Sekunde und sagt
 * genau, welches Feld welchen Objekts nicht stimmt:
 *
 *   npm run daten:pruefen
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');

const { dateiSchema } = await import(join(WURZEL, 'src/data/schema.ts'));

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;

const fehler = [];
const warnungen = [];

const pfad = join(WURZEL, 'src/data/objekte.json');
let roh;
try {
  roh = JSON.parse(readFileSync(pfad, 'utf-8'));
} catch (e) {
  console.error(rot(`objekte.json ist kein gueltiges JSON: ${e.message}`));
  process.exit(1);
}

const ergebnis = dateiSchema.safeParse(roh);
if (!ergebnis.success) {
  for (const problem of ergebnis.error.issues) {
    const stelle = problem.path.join('.');
    const objekt = roh.objekte?.[problem.path[1]]?.id;
    fehler.push(`${objekt ? objekt + ' · ' : ''}${stelle}: ${problem.message}`);
  }
}

const objekte = ergebnis.success ? ergebnis.data.objekte : (roh.objekte ?? []);

/* Kennungen muessen eindeutig sein — sie stehen in der URL. */
const gesehen = new Set();
for (const o of objekte) {
  if (gesehen.has(o.id)) fehler.push(`Kennung ${o.id} kommt mehrfach vor.`);
  gesehen.add(o.id);
}

/* Jedes genannte Foto muss auch wirklich in src/fotos/ liegen. */
const fotoOrdner = join(WURZEL, 'src/fotos');
const vorhanden = existsSync(fotoOrdner) ? new Set(readdirSync(fotoOrdner)) : new Set();
const benutzt = new Set();
for (const o of objekte) {
  for (const name of o.foto ?? []) {
    benutzt.add(name);
    if (!vorhanden.has(name)) fehler.push(`${o.id}: Foto "${name}" fehlt in src/fotos/.`);
  }
}
for (const datei of vorhanden) {
  if (/\.jpe?g$/i.test(datei) && !benutzt.has(datei)) {
    warnungen.push(`src/fotos/${datei} wird von keinem Objekt verwendet.`);
  }
}

/* Hinweise, die keinen Abbruch rechtfertigen, aber Arbeit sichtbar machen. */
for (const o of objekte) {
  if (o.lat === null) warnungen.push(`${o.id}: noch keine Koordinaten — erscheint nicht auf der Karte.`);
  if (o.preis === null) warnungen.push(`${o.id}: kein Preis hinterlegt.`);
  if (o.telefon && !o.freigabe) {
    warnungen.push(`${o.id}: Telefonnummer erfasst, aber nicht freigegeben — wird nicht veroeffentlicht.`);
  }
}

for (const w of warnungen) console.log(gelb('  ~ ') + w);

if (fehler.length) {
  console.error('');
  for (const f of fehler) console.error(rot('  ✗ ') + f);
  console.error(rot(`\n${fehler.length} Fehler in src/data/objekte.json — es wird nicht gebaut.\n`));
  process.exit(1);
}

console.log(
  gruen(`\n  ✓ objekte.json in Ordnung: ${objekte.length} Objekte, ` +
    `${objekte.filter((o) => o.lat !== null).length} mit Koordinaten, ` +
    `${objekte.filter((o) => o.freigabe).length} mit freigegebener Telefonnummer.\n`),
);
