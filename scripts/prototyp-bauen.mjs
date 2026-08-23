#!/usr/bin/env node
/**
 * Baut eine Prototyp-Fassung als EINE HTML-Datei.
 *
 * Wofuer: Feldversuche. Die Datei laesst sich als Claude-Artifact teilen, per
 * Messenger verschicken oder offline per Doppelklick oeffnen — praktisch in
 * Irsina, wo der Mobilfunk nicht ueberall traegt.
 *
 * Was sie NICHT ist: die veroeffentlichungsfertige Seite. Die hat 72 einzelne
 * Adressen und lebt davon, dass Suchmaschinen sie finden — beides geht in einer
 * Einzeldatei nicht. Der Prototyp dient dem Eindruck, nicht der Auffindbarkeit.
 *
 * Damit beide nicht auseinanderlaufen, kommen Daten, Uebersetzungen und
 * saemtliche Anzeigetexte aus denselben Modulen wie die echte Seite. Berechnet
 * wird alles hier beim Bauen; im Browser liegt nur noch fertiger Text.
 *
 *   node scripts/prototyp-bauen.mjs
 *     -> dist-prototyp/irsina-prototyp.html      vollstaendige Datei, doppelklickbar
 *     -> dist-prototyp/artifact.html             dieselbe Seite ohne html/head/body,
 *                                                wie es die Artifact-Veroeffentlichung verlangt
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const ZIEL = join(WURZEL, 'dist-prototyp');

const { OBJEKTE, adresse, beschreibung } = await import(join(WURZEL, 'src/data/objekte.ts'));
const { TEXTE } = await import(join(WURZEL, 'src/i18n/texte.ts'));
const { SPRACHEN, SPRACH_KUERZEL, SPRACH_NAME, HREFLANG } = await import(
  join(WURZEL, 'src/i18n/sprachen.ts')
);
const anzeige = await import(join(WURZEL, 'src/data/anzeige.ts'));
const { TYPEN, ANGEBOTE, ZUSTAENDE, EXTRAS, PRUEFSTAND } = await import(
  join(WURZEL, 'src/data/schema.ts')
);
const { MAIL, FAKTEN } = await import(join(WURZEL, 'src/config.ts'));

/* Beispielkoordinaten: erfunden, nur zur Vorfuehrung der Karte. Sie werden
   ausschliesslich fuer Objekte eingesetzt, die noch keine echten haben, und
   sind in der Ausgabe als Beispiel gekennzeichnet. */
const beispiel = JSON.parse(
  readFileSync(join(WURZEL, 'src/data/beispiel-koordinaten.json'), 'utf-8'),
);

const BREITE = 1000;   // Kantenlaenge der eingebetteten Fotos
const QUALITAET = 68;

/* ---------------------------------------------------------------------------
   Fotos einbetten
   --------------------------------------------------------------------------- */
const fotoDaten = {};
for (const o of OBJEKTE) {
  for (const name of o.foto) {
    if (fotoDaten[name]) continue;
    const puffer = await sharp(join(WURZEL, 'src/fotos', name))
      .rotate()
      .resize({ width: BREITE, height: BREITE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITAET, effort: 6 })
      .toBuffer();
    fotoDaten[name] = `data:image/webp;base64,${puffer.toString('base64')}`;
    process.stdout.write(`  · ${name}  ${(puffer.length / 1024).toFixed(0)} kB\n`);
  }
}

/* ---------------------------------------------------------------------------
   Anzeigetexte vorberechnen — mit denselben Funktionen wie die echte Seite
   --------------------------------------------------------------------------- */
const ANSICHT = {};
for (const lang of SPRACHEN) {
  ANSICHT[lang] = OBJEKTE.map((o) => ({
    id: o.id,
    foto: o.foto,
    typ: o.typ,
    zustand: o.zustand,
    angebot: o.angebot,
    preis: o.preis,
    strasse: o.strasse,
    civico: o.civico,
    adresseUnklar: o.adresse_unklar,
    pruefstand: o.pruefstand,
    pruefstandText: anzeige.pruefstandText(o, lang),
    /* Telefonnummern sind in OBJEKTE bereits entfernt, sofern nicht freigegeben.
       Der Prototyp bekommt also nur, was auch die echte Seite ausliefern wuerde. */
    telefon: o.telefon,
    telefonUnsicher: o.telefon_unsicher,
    anschrift: adresse(o, lang),
    text: beschreibung(o, lang),
    typText: anzeige.typText(o, lang),
    zustandText: anzeige.zustandText(o, lang),
    angebotText: anzeige.angebotText(o, lang),
    preisText: anzeige.preisText(o, lang),
    flaecheText: o.mq === null ? null : anzeige.flaecheText(o, lang),
    raeumeText: o.vani === null ? null : anzeige.raeumeText(o, lang),
    gesehenText: anzeige.gesehenText(o, lang),
    extras: o.extras.map((e) => anzeige.extraText(e, lang)),
    kennzeichen: anzeige.kennzeichen(o, lang),
    suche: `${o.id} ${o.strasse} ${o.civico ?? ''} ${beschreibung(o, lang)}`.toLowerCase(),
  }));
}

/* ---------------------------------------------------------------------------
   Beschriftungen fuer den Editor
   ---------------------------------------------------------------------------
   Der Editor muss eine Aenderung sofort zeigen koennen, also die Anzeigetexte
   im Browser neu bilden. Die Zuordnung Wert -> Beschriftung kommt dafuer aus
   denselben Helfern wie die echte Seite; im Browser bleibt nur das Nachschlagen
   und die Zahlen- und Datumsformatierung.
   --------------------------------------------------------------------------- */
const BESCHRIFTUNG = {};
for (const lang of SPRACHEN) {
  const alsObjekt = (werte, fn) =>
    Object.fromEntries(werte.map((w) => [w, fn(w)]));
  BESCHRIFTUNG[lang] = {
    typ: alsObjekt([...TYPEN], (w) => anzeige.typText({ typ: w }, lang)),
    zustand: alsObjekt([...ZUSTAENDE], (w) => anzeige.zustandText({ zustand: w }, lang)),
    angebot: alsObjekt([...ANGEBOTE], (w) => anzeige.angebotText({ angebot: w }, lang)),
    extras: alsObjekt([...EXTRAS], (w) => anzeige.extraText(w, lang)),
    pruefstand: alsObjekt([...PRUEFSTAND], (w) => anzeige.pruefstandText({ pruefstand: w }, lang)),
    /* Dieselbe Gebietseinstellung wie in anzeige.ts, damit Preise und Monate
       im Editor genauso aussehen wie auf der Seite. */
    gebiet: lang === 'en' ? 'en-GB' : lang,
  };
}

/* ---------------------------------------------------------------------------
   Rohdaten fuer den Editor
   ---------------------------------------------------------------------------
   Der Editor braucht die Felder selbst, nicht die fertigen Anzeigetexte.
   Die Telefonnummern bleiben draussen — sie sind in OBJEKTE schon entfernt,
   sofern nicht freigegeben. Damit der Editor sie nicht versehentlich als
   "geloescht" zurueckmeldet, merkt sich das Feld telefonBekannt, dass eine
   Nummer hinterlegt IST, ohne sie zu nennen. Beim Zurueckspielen bedeutet
   null deshalb "unveraendert", nicht "loeschen".
   --------------------------------------------------------------------------- */
const rohObjekte = JSON.parse(readFileSync(join(WURZEL, 'src/data/objekte.json'), 'utf-8')).objekte;
const ROH = OBJEKTE.map((o) => {
  const quelle = rohObjekte.find((x) => x.id === o.id);
  return {
    id: o.id,
    foto: [...o.foto],
    strasse: o.strasse,
    civico: o.civico,
    typ: o.typ,
    angebot: o.angebot,
    zustand: o.zustand,
    preis: o.preis,
    mq: o.mq,
    vani: o.vani,
    extras: [...o.extras],
    telefon: o.telefon,          // null, solange nicht freigegeben
    telefon2: o.telefon2,
    telefon_unsicher: o.telefon_unsicher,
    telefonBekannt: Boolean(quelle?.telefon),
    freigabe: Boolean(quelle?.freigabe),
    lat: o.lat,
    lng: o.lng,
    gesehen: o.gesehen,
    adresse_unklar: o.adresse_unklar,
    pruefstand: o.pruefstand,
    text: { ...o.text },
  };
});

/* ---------------------------------------------------------------------------
   Karte
   --------------------------------------------------------------------------- */
const KARTE = {
  zentrum: beispiel.zentrum,
  /* Echte Koordinaten haben Vorrang. Nur wo keine erhoben sind, tritt ein
     Beispielwert ein — und der wird als solcher ausgewiesen. */
  punkte: OBJEKTE.map((o) => {
    const echt = o.lat !== null && o.lng !== null;
    const b = beispiel.koordinaten[o.id];
    if (!echt && !b) return null;
    return {
      id: o.id,
      lat: echt ? o.lat : b.lat,
      lng: echt ? o.lng : b.lng,
      erfunden: !echt,
    };
  }).filter(Boolean),
};
KARTE.alleErfunden = KARTE.punkte.every((p) => p.erfunden);
KARTE.anzahlErfunden = KARTE.punkte.filter((p) => p.erfunden).length;

/* Leaflet wird eingebettet, nicht von einem fremden Server geholt: die Datei
   soll auch offline und in einer Umgebung mit enger Sicherheitsrichtlinie
   laufen. Die drei Bildverweise im Leaflet-Stylesheet betreffen Bedienelemente,
   die hier nicht vorkommen — sie liefen ins Leere und fliegen raus. */
const leafletJs = readFileSync(join(WURZEL, 'node_modules/leaflet/dist/leaflet.js'), 'utf-8');
const leafletCss = readFileSync(join(WURZEL, 'node_modules/leaflet/dist/leaflet.css'), 'utf-8')
  .split('\n')
  .filter((z) => !/url\(images\//.test(z))
  .join('\n');

/* ---------------------------------------------------------------------------
   Stylesheet
   --------------------------------------------------------------------------- */
const grundStil = readFileSync(join(WURZEL, 'src/styles/global.css'), 'utf-8');

const prototypStil = `
/* ---------- nur im Prototyp: Detailansicht als Overlay ---------- */
.ov { position: fixed; inset: 0; background: rgba(20,16,13,.62); backdrop-filter: blur(5px);
  z-index: 100; display: none; padding: 3vh 3vw; overflow: auto; }
.ov.on { display: block; }
.modal { background: var(--card); border-radius: 16px; max-width: 940px; margin: 0 auto;
  overflow: hidden; box-shadow: var(--shadow-lg); }
.modal .top { position: relative; background: #151110; }
.modal .top img { width: 100%; max-height: 62vh; object-fit: contain; }
.x { position: absolute; right: 12px; top: 12px; width: 40px; height: 40px; border-radius: 50%;
  border: 0; cursor: pointer; background: rgba(255,255,255,.92); font-size: 20px; line-height: 1; color: var(--ink); }
.x:hover { background: #fff; }
.modal-langs { position: absolute; left: 12px; top: 12px; background: rgba(250,246,240,.92);
  border-color: rgba(255,255,255,.5); backdrop-filter: blur(6px); }
.modal .in { padding: 26px clamp(20px,4vw,34px) 30px; }
.modal h2 { font-size: clamp(23px,3.2vw,31px); margin-bottom: 4px; }
.modal .addr { font-family: var(--sans); color: var(--ink-2); margin: 0 0 20px; }
/* .modal h2 wuerde sonst die Ueberschrift der Teilen-Leiste aufblaehen. */
.modal .share h2 { font: 700 11px/1 var(--sans); letter-spacing: .11em; text-transform: uppercase; }
.modal .pruefhinweis h3 { font-size: 15px; margin: 0 0 8px; }

/* ---------- Hinweisband ---------- */
.probe { position: sticky; top: 0; z-index: 90; background: var(--ink); color: #f3e9dc;
  font: 500 13.5px/1.45 var(--sans); }
.probe .wrap { display: flex; align-items: center; gap: 14px; padding: 9px 0; }
.probe b { color: #f0c98a; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 11.5px; flex: none; }
.probe p { margin: 0; flex: 1; }
.probe a { color: #f0c98a; }
.probe button { flex: none; border: 1px solid rgba(255,255,255,.3); background: none; color: inherit;
  border-radius: 999px; padding: 5px 12px; cursor: pointer; font: 600 12px/1 var(--sans); }
.probe button:hover { background: rgba(255,255,255,.12); }
#probe-ed { border-color: rgba(240,201,138,.6); color: #f0c98a; }

/* ---------- Bearbeitungsmodus ---------- */
.ed-leiste {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 150;
  background: #241f1b; color: #f3e9dc; border-top: 2px solid var(--terra);
  box-shadow: 0 -8px 30px rgba(0,0,0,.3); font-family: var(--sans);
}
.ed-leiste .wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 11px 0 4px; }
.ed-leiste b {
  color: #f0c98a; font: 700 11px/1 var(--sans); letter-spacing: .14em; flex: none;
  border: 1px solid rgba(240,201,138,.45); border-radius: 5px; padding: 5px 8px;
}
.ed-knopf {
  border: 1px solid rgba(255,255,255,.28); background: none; color: inherit; border-radius: 999px;
  padding: 8px 15px; cursor: pointer; font: 600 13px/1 var(--sans);
}
.ed-knopf:hover { background: rgba(255,255,255,.13); }
.ed-knopf.aus { margin-left: auto; border-color: var(--terra); background: var(--terra); color: #fff; }
.ed-stand { font-size: 12.5px; color: #bcae9c; }
.ed-fuss {
  margin: 0; padding: 0 0 10px; font-size: 12px; line-height: 1.5; color: #9d9081;
  width: min(1180px, 92vw); margin-inline: auto;
}
body.bearbeiten { padding-bottom: 108px; }

/* Der Stift sitzt auf der Kachel und erscheint nur im Bearbeitungsmodus. */
.ed-kachel-knopf { display: none; }
body.bearbeiten .objekt { position: relative; }
body.bearbeiten .ed-kachel-knopf {
  display: block; position: absolute; left: 12px; bottom: 12px; z-index: 5;
  border: 0; border-radius: 999px; background: var(--ink); color: #fff;
  padding: 8px 14px; cursor: pointer; font: 600 12.5px/1 var(--sans);
  box-shadow: 0 3px 12px rgba(0,0,0,.35);
}
body.bearbeiten .ed-kachel-knopf:hover { background: var(--terra); }

/* In der Detailansicht sitzt derselbe Knopf oben im Text statt auf dem Bild:
   dort wird er beim Berichtigen vor Ort zuerst gesucht. */
body.bearbeiten .ed-detail-knopf {
  position: static; display: inline-block; margin: 0 0 14px;
  padding: 10px 18px; font-size: 14px;
}

.ed-form {
  position: fixed; inset: 0; z-index: 200; background: rgba(20,16,13,.66);
  backdrop-filter: blur(5px); overflow: auto; padding: 3vh 3vw;
}
.ed-box {
  background: var(--card); border-radius: 16px; max-width: 820px; margin: 0 auto;
  box-shadow: var(--shadow-lg); font-family: var(--sans);
}
.ed-kopf {
  position: relative; padding: 22px clamp(20px,4vw,30px) 0;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.ed-kopf h2 { font-size: 21px; margin: 0; }
.ed-kopf .x { position: static; width: 36px; height: 36px; background: var(--paper-2); }
#ed-eingabe { padding: 0 clamp(20px,4vw,30px) 26px; }
.ed-raster { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 16px 0; }
.ed-feld { display: flex; flex-direction: column; gap: 5px; }
.ed-feld > span { font: 600 11px/1 var(--sans); letter-spacing: .07em; text-transform: uppercase; color: var(--ink-2); }
.ed-feld input, .ed-feld select, .ed-feld textarea {
  width: 100%; background: var(--paper); border: 1px solid var(--line); border-radius: 9px;
  padding: 10px 12px; font: 400 14.5px/1.35 var(--sans); color: var(--ink); resize: vertical;
}
.ed-feld input:focus, .ed-feld select:focus, .ed-feld textarea:focus {
  outline: 2px solid var(--terra); outline-offset: -1px;
}
.ed-gruppe { border: 1px solid var(--line); border-radius: 11px; padding: 8px 16px 16px; margin: 0 0 16px; }
.ed-gruppe legend { font: 700 11px/1 var(--sans); letter-spacing: .09em; text-transform: uppercase; color: var(--ink-2); padding: 0 6px; }
.ed-haken { display: inline-flex; align-items: center; gap: 7px; margin: 6px 16px 6px 0; font-size: 14px; }
.ed-notiz { font-size: 13px; color: var(--ink-2); margin: 8px 0 0; line-height: 1.5; }
.ed-fotos { display: flex; gap: 10px; flex-wrap: wrap; margin: 8px 0 12px; }
.ed-foto { position: relative; margin: 0; width: 110px; }
.ed-foto img { width: 110px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }
.ed-foto button {
  position: absolute; right: -6px; top: -6px; width: 24px; height: 24px; border-radius: 50%;
  border: 0; background: var(--terra); color: #fff; cursor: pointer; font-size: 12px; line-height: 1;
}
.ed-foto figcaption { font-size: 11px; color: var(--ink-2); margin-top: 4px; word-break: break-all; }
.ed-dateiwahl { display: inline-flex; cursor: pointer; }
.ed-aktionen { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.ed-loeschen { background: none; border-color: var(--line); color: var(--terra); margin-left: auto; }
.ed-loeschen:hover { background: var(--terra); color: #fff; border-color: var(--terra); }
header.site { top: 0; }

/* ---------- Karte ---------- */
.karte-rahmen { position: relative; height: clamp(360px,54vh,580px); border-radius: var(--r);
  overflow: hidden; border: 1px solid var(--line); background: var(--paper-2); }
#karte { position: absolute; inset: 0; background: var(--paper-2); }
/* Ohne Kartenkacheln bleibt ein ruhiger Papiergrund mit feinem Raster stehen —
   die Markierungen liegen dann immer noch richtig zueinander. */
#karte.ohne-kacheln {
  background-color: #f2ebe0;
  background-image:
    linear-gradient(rgba(36,31,27,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(36,31,27,.055) 1px, transparent 1px);
  background-size: 44px 44px;
}
.karte-tor {
  border: 1px solid var(--line); border-radius: 11px; background: var(--paper-2);
  padding: 14px 18px; margin: 12px 0 0; font-family: var(--sans);
}
.karte-tor p { margin: 0 0 10px; font-size: 14px; line-height: 1.55; color: var(--ink-2); }
.karte-tor .tor-knoepfe {
  display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 0;
}
.karte-tor label { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; cursor: pointer; }

.karte-legende { display: flex; gap: 18px; flex-wrap: wrap; align-items: center;
  font: 500 13px/1.4 var(--sans); color: var(--ink-2); margin: 12px 0 0; }
.karte-legende span { display: inline-flex; align-items: center; gap: 7px; }
.karte-legende i { width: 15px; height: 15px; border-radius: 50%; flex: none; }
.karte-legende i.echt { background: #a8462c; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
.karte-legende i.erfunden { background: transparent; border: 2px dashed #8a7a68; }
.leaflet-popup-content { font-family: var(--sans); font-size: 14px; }
.leaflet-popup-content b { display: block; font-size: 15px; margin-bottom: 2px; }
.leaflet-container { font-family: var(--sans); }

@media (max-width: 640px) {
  .probe .wrap { flex-wrap: wrap; gap: 8px 12px; }
  .probe p { flex: 1 1 100%; order: 3; }
}
`;

/* ---------------------------------------------------------------------------
   Seite zusammensetzen
   --------------------------------------------------------------------------- */
const daten = {
  texte: Object.fromEntries(SPRACHEN.map((l) => [l, TEXTE[l]])),
  ansicht: ANSICHT,
  fotos: fotoDaten,
  sprachen: [...SPRACHEN],
  kuerzel: SPRACH_KUERZEL,
  namen: SPRACH_NAME,
  hreflang: HREFLANG,
  mail: MAIL,
  fakten: FAKTEN,
  anzahl: OBJEKTE.length,
  karte: KARTE,
  roh: ROH,
  beschriftung: BESCHRIFTUNG,
  auswahl: {
    typ: [...TYPEN], angebot: [...ANGEBOTE], zustand: [...ZUSTAENDE],
    extras: [...EXTRAS], pruefstand: [...PRUEFSTAND],
  },
};

const laufzeit = readFileSync(join(HIER, 'prototyp-laufzeit.js'), 'utf-8');
const editor = readFileSync(join(HIER, 'prototyp-editor.js'), 'utf-8');

const rumpf = `
<div class="probe" id="probe">
  <div class="wrap">
    <b>Prototyp</b>
    <p id="probe-text"></p>
    <button type="button" id="probe-ed" data-ed="an">✎</button>
    <button type="button" id="probe-zu">OK</button>
  </div>
</div>

<a class="skip" href="#inhalt" id="skip"></a>
<header class="site">
  <div class="wrap hd">
    <a class="brand" href="#top">
      <span class="mark" aria-hidden="true">IR</span>
      <span class="txt"><b>Irsina</b><span id="brandsub"></span></span>
    </a>
    <nav class="main" id="hauptmenue"></nav>
    <nav class="langs" id="langs"></nav>
    <button class="burger" type="button" id="burger" aria-expanded="false" aria-controls="hauptmenue">☰</button>
  </div>
</header>

<main id="inhalt"></main>

<div class="ov" id="ov" role="dialog" aria-modal="true" aria-labelledby="modal-titel">
  <div class="modal" id="modal"></div>
</div>
<div class="ed-leiste" id="ed-leiste" hidden></div>
<div class="ed-form" id="ed-form" hidden><div class="ed-box" id="ed-box"></div></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script id="irsina-daten" type="application/json">${JSON.stringify(daten).replace(/</g, '\\u003c')}</script>
<script>${leafletJs}</script>
<script>
${laufzeit}
</script>
<script>
${editor}
</script>
`;

const titel = 'Case a Irsina';
const stil = `<style>\n${leafletCss}\n${grundStil}\n${prototypStil}\n</style>`;

mkdirSync(ZIEL, { recursive: true });

/* Fassung fuer die Artifact-Veroeffentlichung: dort liefert die Umgebung
   doctype, html, head und body — die Datei enthaelt nur den Inhalt. */
writeFileSync(join(ZIEL, 'artifact.html'), `<title>${titel}</title>\n${stil}\n${rumpf}`);

/* Vollstaendige Fassung: doppelklickbar, offline, weitergebbar. */
writeFileSync(
  join(ZIEL, 'irsina-prototyp.html'),
  `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<meta name="description" content="Case e palazzi in vendita nel centro storico di Irsina (Basilicata). Prototipo.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#faf6f0">
${stil}
</head>
<body>
${rumpf}
</body>
</html>
`,
);

for (const datei of ['artifact.html', 'irsina-prototyp.html']) {
  const kb = readFileSync(join(ZIEL, datei)).length / 1024;
  console.log(`\n  ✓ dist-prototyp/${datei}  ${(kb / 1024).toFixed(2)} MB`);
}
