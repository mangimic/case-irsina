#!/usr/bin/env node
/**
 * Uebernimmt einen Auszug aus dem Prototyp-Editor in src/data/objekte.json.
 *
 *   node scripts/prototyp-uebernehmen.mjs <auszug.json>              nur anzeigen
 *   node scripts/prototyp-uebernehmen.mjs <auszug.json> --schreiben  eintragen
 *
 * Mit --ziel <pfad> laesst sich das Ergebnis in eine andere Datei schreiben,
 * statt src/data/objekte.json anzufassen — praktisch zum Ausprobieren und
 * noetig, damit die Tests die Projektdatei nicht veraendern.
 *
 * Die eine Regel, auf die es ankommt: der Prototyp kennt die Telefonnummern
 * nicht — sie verlassen den Build nicht. Ein leeres Telefonfeld im Auszug
 * bedeutet deshalb UNVERAENDERT, niemals "loeschen". Dasselbe gilt fuer die
 * Freigabe. Nur ein ausgefuelltes Feld schreibt etwas.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const zielFlagge = process.argv.indexOf('--ziel');
const ZIEL = zielFlagge !== -1 && process.argv[zielFlagge + 1]
  ? resolve(process.argv[zielFlagge + 1])
  : join(WURZEL, 'src/data/objekte.json');

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;
const grau = (s) => `\x1b[90m${s}\x1b[0m`;

const stellen = process.argv.slice(2).filter((a, i, alle) => {
  if (a.startsWith('--')) return false;
  return !(i > 0 && alle[i - 1] === '--ziel');
});
const quelle = stellen[0];
const schreiben = process.argv.includes('--schreiben');

if (!quelle) {
  console.error('Aufruf: node scripts/prototyp-uebernehmen.mjs <auszug.json> [--schreiben]');
  process.exit(1);
}
const pfad = resolve(quelle);
if (!existsSync(pfad)) {
  console.error(rot(`Datei nicht gefunden: ${pfad}`));
  process.exit(1);
}

const { dateiSchema, objektSchema } = await import(join(WURZEL, 'src/data/schema.ts'));

let auszug;
try {
  auszug = JSON.parse(readFileSync(pfad, 'utf-8'));
} catch (e) {
  console.error(rot(`Kein gueltiges JSON: ${e.message}`));
  process.exit(1);
}
if (!Array.isArray(auszug?.objekte)) {
  console.error(rot('Im Auszug fehlt die Liste "objekte".'));
  process.exit(1);
}

const datei = JSON.parse(readFileSync(ZIEL, 'utf-8'));
const bestand = new Map(datei.objekte.map((o) => [o.id, o]));

/* Felder, bei denen ein leerer Wert "unveraendert" bedeutet, weil der Prototyp
   sie gar nicht kennen kann. */
const GESCHUETZT = ['telefon', 'telefon2'];

/** Schema-Meldungen in Klartext uebersetzen. */
function klartext(problem) {
  const feld = problem.path.join('.') || '(Eintrag)';
  if (feld === 'foto') return 'foto: mindestens ein Foto wird gebraucht';
  if (feld === 'id') return 'id: die Kennung muss der Form IR-001 folgen';
  if (feld.startsWith('text.')) return `${feld}: die Beschreibung fehlt in dieser Sprache`;
  return `${feld}: ${problem.message}`;
}

const zeilen = [];
const fehler = [];
let neue = 0;
let geaendert = 0;

const ergebnis = [];

for (const kommt of auszug.objekte) {
  const alt = bestand.get(kommt.id);

  if (!alt) {
    const geprueft = objektSchema.safeParse({ ...kommt, freigabe: kommt.freigabe ?? false });
    if (!geprueft.success) {
      fehler.push(
        `${kommt.id} (neu): ` +
          geprueft.error.issues.map(klartext).join('; '),
      );
      continue;
    }
    ergebnis.push(geprueft.data);
    zeilen.push(`${gruen('+')} ${kommt.id}  neu: ${kommt.strasse}`);
    neue++;
    continue;
  }

  const neu = { ...alt };
  const aenderungen = [];

  for (const feld of Object.keys(alt)) {
    if (!(feld in kommt)) continue;

    if (GESCHUETZT.includes(feld)) {
      // Leer = unveraendert. Nur ein ausgefuellter Wert schreibt.
      if (kommt[feld] == null || kommt[feld] === '') continue;
      if (kommt[feld] !== alt[feld]) {
        neu[feld] = kommt[feld];
        aenderungen.push(`${feld}: … → …`); // Nummern nicht ins Protokoll
      }
      continue;
    }

    if (feld === 'freigabe') {
      // Eine Freigabe wird nur gesetzt, nie versehentlich zurueckgenommen.
      if (kommt.freigabe === true && alt.freigabe !== true) {
        neu.freigabe = true;
        aenderungen.push('freigabe: false → true');
      }
      continue;
    }

    const vorher = JSON.stringify(alt[feld]);
    const nachher = JSON.stringify(kommt[feld]);
    if (vorher !== nachher) {
      neu[feld] = kommt[feld];
      const kurz = (v) => (v.length > 42 ? v.slice(0, 40) + '…' : v);
      aenderungen.push(`${feld}: ${kurz(vorher)} → ${kurz(nachher)}`);
    }
  }

  const geprueft = objektSchema.safeParse(neu);
  if (!geprueft.success) {
    fehler.push(
      `${kommt.id}: ` + geprueft.error.issues.map(klartext).join('; '),
    );
    continue;
  }

  ergebnis.push(geprueft.data);
  if (aenderungen.length) {
    geaendert++;
    zeilen.push(`${gelb('~')} ${kommt.id}`);
    for (const a of aenderungen) zeilen.push(`     ${grau(a)}`);
  }
}

/* Objekte, die im Auszug fehlen, bleiben erhalten — geloescht wird nur auf
   ausdrueckliche Ansage, nicht durch Weglassen. */
const imAuszug = new Set(auszug.objekte.map((o) => o.id));
const fehlend = datei.objekte.filter((o) => !imAuszug.has(o.id));
for (const o of fehlend) ergebnis.push(o);

console.log('');
for (const z of zeilen) console.log('  ' + z);
if (fehlend.length) {
  console.log(
    grau(
      `\n  ${fehlend.length} Objekt(e) kommen im Auszug nicht vor und bleiben unveraendert: ` +
        fehlend.map((o) => o.id).join(', '),
    ),
  );
}

if (fehler.length) {
  console.error('');
  for (const f of fehler) console.error(rot('  ✗ ') + f);
  console.error(rot(`\n  ${fehler.length} Eintrag/Eintraege passen nicht zum Schema — nichts geschrieben.\n`));
  process.exit(1);
}

if (!zeilen.length) {
  console.log(gruen('\n  Nichts zu tun: der Auszug entspricht dem aktuellen Stand.\n'));
  process.exit(0);
}

if (!schreiben) {
  console.log(
    `\n  ${neue} neu, ${geaendert} geaendert. Zum Eintragen:\n` +
      grau(`  node scripts/prototyp-uebernehmen.mjs ${quelle} --schreiben\n`),
  );
  process.exit(0);
}

ergebnis.sort((a, b) => a.id.localeCompare(b.id));
const gesamt = { ...datei, objekte: ergebnis };
const geprueft = dateiSchema.safeParse(gesamt);
if (!geprueft.success) {
  console.error(rot('\n  Das Ergebnis waere fehlerhaft — nichts geschrieben:'));
  for (const i of geprueft.error.issues) console.error(rot(`  ✗ ${i.path.join('.')}: ${i.message}`));
  process.exit(1);
}

writeFileSync(ZIEL, JSON.stringify(gesamt, null, 2) + '\n');
console.log(
  gruen(`\n  ✓ ${neue} neu, ${geaendert} geaendert in src/data/objekte.json.\n`) +
    grau(
      '  Fotos, die im Editor hinzugefuegt wurden, liegen nur in der HTML-Datei —\n' +
      '  sie muessen von Hand nach src/fotos/ kopiert werden. Danach "npm run build".\n',
    ),
);
