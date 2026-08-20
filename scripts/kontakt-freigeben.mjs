#!/usr/bin/env node
/**
 * Traegt eine Telefonnummer nach erteilter Einwilligung in objekte.json ein.
 *
 *   node scripts/kontakt-freigeben.mjs IR-013              nur anzeigen
 *   node scripts/kontakt-freigeben.mjs IR-013 --schreiben  eintragen
 *
 * Der Weg dorthin ist bewusst ein eigener Schritt: dieses Repository ist
 * oeffentlich, eine Nummer darin ist also fuer jeden lesbar. Das soll nicht
 * beilaeufig beim Bearbeiten anderer Felder passieren, sondern nur, wenn
 * jemand ausdruecklich zugestimmt hat.
 *
 * Die Nummer wird aus daten-intern/kontakte.json geholt (dort stehen die
 * abgelesenen, noch ungefragten) oder mit --nummer +39… direkt angegeben.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const ZIEL = join(WURZEL, 'src/data/objekte.json');
const INTERN = join(WURZEL, 'daten-intern/kontakte.json');

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;
const grau = (s) => `\x1b[90m${s}\x1b[0m`;

const argumente = process.argv.slice(2);
const kennung = argumente.find((a) => /^IR-\d{3}$/i.test(a))?.toUpperCase();
const schreiben = argumente.includes('--schreiben');
const nummerFlagge = argumente.indexOf('--nummer');
const nummerDirekt = nummerFlagge !== -1 ? argumente[nummerFlagge + 1] : undefined;

if (!kennung) {
  console.error('Aufruf: node scripts/kontakt-freigeben.mjs IR-013 [--nummer +39…] [--schreiben]');
  process.exit(1);
}

const { objektSchema } = await import(join(WURZEL, 'src/data/schema.ts'));

const datei = JSON.parse(readFileSync(ZIEL, 'utf-8'));
const objekt = datei.objekte.find((o) => o.id === kennung);
if (!objekt) {
  console.error(rot(`Kein Objekt mit der Kennung ${kennung}.`));
  process.exit(1);
}

let nummer = nummerDirekt;
let zweite = null;
let unsicher = false;

if (!nummer) {
  if (!existsSync(INTERN)) {
    console.error(
      rot(`daten-intern/kontakte.json fehlt.`) +
        grau('\n  Entweder die Datei anlegen oder die Nummer mit --nummer +39… angeben.\n'),
    );
    process.exit(1);
  }
  const intern = JSON.parse(readFileSync(INTERN, 'utf-8'));
  const eintrag = intern.kontakte?.[kennung];
  if (!eintrag?.telefon) {
    console.error(rot(`Für ${kennung} ist auch intern keine Nummer hinterlegt.`));
    process.exit(1);
  }
  nummer = eintrag.telefon;
  zweite = eintrag.telefon2 ?? null;
  unsicher = Boolean(eintrag.unsicher);
}

if (unsicher) {
  console.error(
    rot(`\n  ${kennung}: die Nummer ist als unsicher vermerkt (vom Foto abgelesen).`) +
      grau(
        '\n  Erst pruefen — anrufen genuegt —, dann in daten-intern/kontakte.json\n' +
          '  "unsicher": false setzen. Eine falsche Nummer oeffentlich zu stellen\n' +
          '  trifft womoeglich jemanden, der mit dem Haus nichts zu tun hat.\n',
      ),
  );
  process.exit(1);
}

const neu = {
  ...objekt,
  telefon: nummer,
  telefon2: zweite,
  telefon_unsicher: false,
  freigabe: true,
};

const geprueft = objektSchema.safeParse(neu);
if (!geprueft.success) {
  console.error(rot('\n  Das ginge nicht durch das Schema:'));
  for (const i of geprueft.error.issues) console.error(rot(`  ✗ ${i.message}`));
  process.exit(1);
}

const verdeckt = nummer.slice(0, 6) + '…' + nummer.slice(-2);
console.log(
  `\n  ${kennung} · ${objekt.strasse}\n` +
    `  Nummer ${verdeckt} wird ${gelb('oeffentlich sichtbar')} und ` +
    `freigabe auf true gesetzt.\n`,
);

if (!schreiben) {
  console.log(grau(`  Zum Eintragen:\n  npm run kontakt:freigeben -- ${kennung} --schreiben\n`));
  process.exit(0);
}

Object.assign(objekt, { telefon: nummer, telefon2: zweite, telefon_unsicher: false, freigabe: true });
writeFileSync(ZIEL, JSON.stringify(datei, null, 2) + '\n');
console.log(
  gruen(`  ✓ ${kennung} freigegeben.\n`) +
    grau('  Danach "npm run build". Ein Widerruf ist jederzeit moeglich: freigabe auf\n' +
         '  false, Nummer auf null — und daran denken, dass sie in der Git-Historie bleibt.\n'),
);
