#!/usr/bin/env node
/**
 * Prueft die fertig gebaute Seite in dist/, bevor sie veroeffentlicht wird.
 *
 * Der Datencheck vor dem Build sagt, ob die Quelle stimmt. Dieses Skript sagt,
 * ob das Ergebnis stimmt — und das ist die Stelle, an der eine versehentlich
 * veroeffentlichte Telefonnummer auffallen muss, nicht erst im Netz.
 *
 *   npm run build && node scripts/build-pruefen.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const DIST = join(WURZEL, 'dist');

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const gelb = (s) => `\x1b[33m${s}\x1b[0m`;

if (!existsSync(DIST)) {
  console.error(rot('dist/ fehlt — zuerst "npm run build" ausfuehren.'));
  process.exit(1);
}

const { SPRACHEN } = await import(join(WURZEL, 'src/i18n/sprachen.ts'));
const { SUCHMASCHINEN_ERLAUBT } = await import(join(WURZEL, 'src/config.ts'));
const { SEGMENT } = await import(join(WURZEL, 'src/i18n/routen.ts'));
const roh = JSON.parse(readFileSync(join(WURZEL, 'src/data/objekte.json'), 'utf-8'));

const fehler = [];
const warnungen = [];

/* --- alle Dateien einsammeln --------------------------------------------- */
function dateien(ordner) {
  const raus = [];
  for (const eintrag of readdirSync(ordner)) {
    const p = join(ordner, eintrag);
    if (statSync(p).isDirectory()) raus.push(...dateien(p));
    else raus.push(p);
  }
  return raus;
}
const alle = dateien(DIST);
const textDateien = alle.filter((p) => /\.(html|js|css|json|xml|txt|map)$/i.test(p));

/* --- 1. Ungefragte Telefonnummern duerfen nirgends auftauchen -------------
   objekte.json fuehrt seit dem Umzug in ein oeffentliches Repository nur noch
   freigegebene Nummern. Zu pruefen sind also die abgelesenen, ungefragten aus
   daten-intern/kontakte.json — und zusaetzlich, dass keine Nummer ausgeliefert
   wird, zu der die Freigabe fehlt. Auf dem Bauserver gibt es die interne Datei
   nicht; dann faellt der erste Teil weg, der zweite bleibt. */
const geschuetzt = new Map();

const INTERN = join(WURZEL, 'daten-intern/kontakte.json');
if (existsSync(INTERN)) {
  const kontakte = JSON.parse(readFileSync(INTERN, 'utf-8')).kontakte ?? {};
  for (const [id, eintrag] of Object.entries(kontakte)) {
    for (const feld of ['telefon', 'telefon2']) {
      const n = eintrag[feld];
      if (typeof n !== 'string') continue;
      const ziffern = n.replace(/\D/g, '');
      for (const form of [n, ziffern, ziffern.replace(/^39/, '')]) {
        if (form.length >= 8) geschuetzt.set(form, id);
      }
    }
  }
} else {
  warnungen.push(
    'daten-intern/kontakte.json ist hier nicht vorhanden — die Gegenprobe gegen die ' +
      'abgelesenen Nummern entfaellt (auf dem Bauserver ist das normal).',
  );
}

for (const o of roh.objekte) {
  if (o.freigabe) continue;
  for (const feld of ['telefon', 'telefon2']) {
    const n = o[feld];
    if (!n) continue;
    fehler.push(`${o.id}: fuehrt eine Nummer ohne Freigabe in objekte.json.`);
  }
}

for (const p of textDateien) {
  const inhalt = readFileSync(p, 'utf-8');
  for (const [form, id] of geschuetzt) {
    if (inhalt.includes(form)) {
      fehler.push(`Telefonnummer von ${id} steht in ${relative(WURZEL, p)} — nicht veroeffentlichen!`);
    }
  }
}

/* --- 2. Jede erwartete Seite muss existieren ------------------------------ */
const erwartet = [];
for (const lang of SPRACHEN) {
  erwartet.push(`${lang}/index.html`);
  erwartet.push(`${lang}/${SEGMENT[lang].impressum}/index.html`);
  erwartet.push(`${lang}/${SEGMENT[lang].datenschutz}/index.html`);
  for (const o of roh.objekte) {
    erwartet.push(`${lang}/${SEGMENT[lang].objekt}/${o.id}/index.html`);
  }
}
erwartet.push('index.html', '404.html', 'sitemap.xml', 'robots.txt', '_headers', '_redirects');

for (const rel of erwartet) {
  if (!existsSync(join(DIST, rel))) fehler.push(`Seite fehlt im Build: ${rel}`);
}

/* --- 3. Jede HTML-Seite braucht Canonical und Sprachverweise --------------
   Ausgenommen sind die beiden internen Seiten: /admin und /edit sind Werkzeug,
   einsprachig und sollen nicht gefunden werden. Statt Sprachverweisen wird bei
   ihnen geprueft, dass sie noindex tragen — das ist die Zusage, die dort
   gilt. */
const htmlSeiten = alle.filter((p) => p.endsWith('.html'));
const INTERNE_SEITEN = ['admin/index.html', 'edit/index.html'];

for (const rel of INTERNE_SEITEN) {
  const p = join(DIST, rel);
  if (!existsSync(p)) {
    fehler.push(`Interne Seite fehlt im Build: ${rel}`);
    continue;
  }
  const inhalt = readFileSync(p, 'utf-8');
  if (!/name="robots"[^>]*noindex/.test(inhalt)) {
    fehler.push(`${rel}: muss noindex tragen — sie gehoert in keine Suchmaschine.`);
  }
}

for (const p of htmlSeiten) {
  const rel = relative(DIST, p);
  if (rel === '404.html' || rel === 'index.html') continue; // bewusst ohne
  if (INTERNE_SEITEN.includes(rel)) continue; // eigene Regeln, siehe oben
  const inhalt = readFileSync(p, 'utf-8');
  if (!inhalt.includes('rel="canonical"')) fehler.push(`${rel}: kein canonical`);
  if (!inhalt.includes('hreflang="x-default"')) fehler.push(`${rel}: kein hreflang x-default`);
  for (const lang of SPRACHEN) {
    if (!new RegExp(`hreflang="${lang}[-"]`).test(inhalt)) {
      fehler.push(`${rel}: hreflang fuer ${lang} fehlt`);
    }
  }
  if (!/<title>[^<]{10,}<\/title>/.test(inhalt)) fehler.push(`${rel}: Titel fehlt oder ist zu kurz`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(inhalt)) {
    fehler.push(`${rel}: Beschreibung fehlt oder ist zu kurz`);
  }
  if (!/<h1[ >]/.test(inhalt)) warnungen.push(`${rel}: keine H1-Ueberschrift`);
}

/* --- 3b. Jede Objektseite muss den Pruefhinweis tragen -------------------- */
const { TEXTE } = await import(join(WURZEL, 'src/i18n/texte.ts'));
for (const lang of SPRACHEN) {
  for (const o of roh.objekte) {
    const rel = `${lang}/${SEGMENT[lang].objekt}/${o.id}/index.html`;
    const pfad = join(DIST, rel);
    if (!existsSync(pfad)) continue;
    const inhalt = readFileSync(pfad, 'utf-8');
    if (o.pruefstand === 'unbesichtigt' && !inhalt.includes(TEXTE[lang].pvH)) {
      fehler.push(`${rel}: der Hinweis "nicht geprueft" fehlt.`);
    }
  }
}

/* --- 3c. Sichtbarkeit fuer Suchmaschinen muss ueberall dasselbe sagen ----- */
const kopfzeilen = readFileSync(join(DIST, '_headers'), 'utf-8');
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf-8');
const kopfSperrt = /X-Robots-Tag:\s*noindex/i.test(kopfzeilen);
const robotsSperrt = /^Disallow:\s*\/\s*$/m.test(robots);

if (SUCHMASCHINEN_ERLAUBT) {
  if (kopfSperrt) {
    fehler.push(
      'src/config.ts erlaubt Suchmaschinen, aber public/_headers setzt noch ' +
        'X-Robots-Tag: noindex — die Seite bliebe unsichtbar.',
    );
  }
  if (robotsSperrt) fehler.push('robots.txt sperrt noch alles, obwohl die Seite sichtbar sein soll.');
} else {
  if (!kopfSperrt) {
    fehler.push(
      'Die Seite soll noch nicht gefunden werden, aber public/_headers setzt ' +
        'kein X-Robots-Tag: noindex.',
    );
  }
  if (!robotsSperrt) fehler.push('Die Seite soll noch nicht gefunden werden, aber robots.txt erlaubt alles.');
  for (const p of htmlSeiten) {
    const rel = relative(DIST, p);
    if (!/<meta name="robots" content="noindex/.test(readFileSync(p, 'utf-8'))) {
      fehler.push(`${rel}: noindex fehlt, obwohl die Seite noch nicht gefunden werden soll.`);
    }
  }
  warnungen.push(
    'Die Seite ist absichtlich fuer Suchmaschinen gesperrt (SUCHMASCHINEN_ERLAUBT = false).',
  );
}

/* --- 4. Sitemap muss zu den Seiten passen -------------------------------- */
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
const eintraege = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const erwarteteAnzahl = SPRACHEN.length * (roh.objekte.length + 3);
if (eintraege.length !== erwarteteAnzahl) {
  fehler.push(`sitemap.xml nennt ${eintraege.length} Adressen, erwartet waren ${erwarteteAnzahl}.`);
}
for (const url of eintraege) {
  const pfad = new URL(url).pathname;
  if (!existsSync(join(DIST, pfad, 'index.html'))) {
    fehler.push(`sitemap.xml nennt ${pfad}, die Seite gibt es aber nicht.`);
  }
}

/* --- 5. Keine Verweise auf fremde Server ausser der Karte ---------------- */
const ERLAUBT = [
  'tile.openstreetmap.org', 'www.openstreetmap.org', 'openstreetmap.org',
  'wa.me', 'www.facebook.com', 't.me', 'twitter.com', 'www.google.com',
  'www.instagram.com', 'www.tiktok.com',
  'schema.org', 'www.w3.org', 'case-irsina.it', 'ec.europa.eu',
];
for (const p of htmlSeiten) {
  const inhalt = readFileSync(p, 'utf-8');
  for (const m of inhalt.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    const host = m[1].toLowerCase();
    if (!ERLAUBT.includes(host)) {
      warnungen.push(`${relative(DIST, p)}: Verweis auf ${host}`);
    }
  }
}

/* --- 6. Platzhalter, die noch gefuellt werden muessen --------------------- */
for (const p of htmlSeiten) {
  if (readFileSync(p, 'utf-8').includes('ANSCHRIFT_FEHLT')) {
    warnungen.push(`${relative(DIST, p)}: im Impressum fehlt noch die Anschrift.`);
  }
}

/* --- 7. Groesse: das Gegenteil der alten 2,8-MB-Einzeldatei -------------- */
for (const p of htmlSeiten) {
  const kb = statSync(p).size / 1024;
  if (kb > 120) warnungen.push(`${relative(DIST, p)} ist ${kb.toFixed(0)} kB gross.`);
}

/* --- Bericht ------------------------------------------------------------- */
const einmalig = [...new Set(warnungen)];
for (const w of einmalig) console.log(gelb('  ~ ') + w);

if (fehler.length) {
  console.error('');
  for (const f of [...new Set(fehler)]) console.error(rot('  ✗ ') + f);
  console.error(rot(`\n${new Set(fehler).size} Beanstandungen — dieser Build gehoert nicht online.\n`));
  process.exit(1);
}

const gesamt = alle.reduce((s, p) => s + statSync(p).size, 0);
console.log(
  gruen(
    `\n  ✓ Build in Ordnung: ${htmlSeiten.length} Seiten, ${eintraege.length} Adressen in der Sitemap, ` +
      `${(gesamt / 1e6).toFixed(1)} MB gesamt, keine ungeschuetzte Telefonnummer.\n`,
  ),
);
