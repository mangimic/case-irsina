# Irsina · Case nel centro storico

Mehrsprachige statische Seite für die VENDESI-Angebote in der Altstadt von Irsina (MT, Basilikata).
Fünf Sprachen, eine indexierbare Adresse je Objekt und Sprache, kein Server, kein Framework
im Browser.

Für die inhaltliche Pflege: **[ANLEITUNG.md](./ANLEITUNG.md)**.
Dieses Dokument beschreibt Aufbau und Technik.

---

## Schnellstart

```bash
npm install
npm run dev            # http://localhost:4321
npm run verify         # Daten · Build · Build-Kontrolle · Tests · Typen
```

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Entwicklungsserver mit sofortiger Aktualisierung |
| `npm run build` | prüft die Daten und baut nach `dist/` |
| `npm run preview` | zeigt das gebaute Ergebnis lokal |
| `npm run daten:pruefen` | prüft `objekte.json` allein, in unter einer Sekunde |
| `npm run kontakt:freigeben -- <ID>` | trägt eine Nummer nach erteilter Einwilligung ein |
| `npm run fotos:pruefen` | meldet Fotos, deren erfasste Bereiche noch nicht unkenntlich sind |
| `npm run fotos:anonymisieren` | verpixelt bzw. beschneidet sie |
| `npm run koordinaten -- <ordner>` | liest lat/lng aus den EXIF-Daten von Originalfotos |
| `npm run build:pruefen` | kontrolliert das fertige `dist/` (siehe unten) |
| `npm test` | Vitest |
| `npm run check` | `astro check` — Typen in `.astro` und `.ts` |
| `npm run prototyp` | baut die Einzeldatei-Fassung für Feldversuche (siehe unten) |
| `npm run prototyp:uebernehmen -- <datei>` | spielt einen Editor-Auszug zurück nach `objekte.json` |
| `npm run verify` | alles nacheinander, wie in der CI |

---

## Aufbau

```
src/
  config.ts               Adresse der Seite, Kontakt, Kartenmittelpunkt
  data/
    objekte.json          Datenquelle  ← hier wird gepflegt
    objekte.schema.json   JSON-Schema für die Editor-Unterstützung
    schema.ts             Zod-Schema — die maßgebliche Prüfung
    objekte.ts            Laden, Prüfen, Telefonnummern zurückhalten, Fotos auflösen
    anzeige.ts            Formatierung (Preis, Fläche, Datum) je Sprache
  i18n/
    sprachen.ts           die fünf Sprachen, hreflang, og:locale
    texte.ts              126 Textschlüssel × 5 Sprachen, typgeprüft
    routen.ts             übersetzte Pfadsegmente und Sprachverweise
    rechtliches.ts        Impressum und Datenschutz, fünfsprachig
  layouts/Basis.astro     Dokumentgerüst mit vollständigem SEO-Kopf
  components/             Kopf, Fuß, Kachel, Filter, Karte, Teilen
  pages/
    index.astro           Wurzel → Sprache des Browsers
    [lang]/index.astro    Übersichtsseite je Sprache
    [lang]/[segment]/[id].astro   Detailseite je Objekt und Sprache
    [lang]/[seite].astro  Impressum und Datenschutz
    sitemap.xml.ts        Sitemap mit xhtml:link-Alternativen
    robots.txt.ts
  fotos/                  Ausgangsfotos, unbearbeitet
daten-intern/             abgelesene Nummern ohne Einwilligung — NICHT versioniert
public/
  _headers                CSP und Sicherheits-Header für Cloudflare Pages
  _redirects              alte Einzeldatei-Adressen
scripts/
  daten-pruefen.mjs       Kontrolle vor dem Build
  build-pruefen.mjs       Kontrolle nach dem Build
  fotos-anonymisieren.mjs Personen und Kennzeichen unkenntlich machen
  koordinaten-aus-fotos.mjs  Koordinaten aus EXIF-Daten übernehmen
  kontakt-freigeben.mjs   Nummer nach Einwilligung veröffentlichen
  prototyp-bauen.mjs      Einzeldatei-Fassung für Feldversuche
  prototyp-laufzeit.js    deren Browser-Logik
  prototyp-editor.js      Bearbeitungsmodus des Prototyps
  prototyp-uebernehmen.mjs  Editor-Auszug zurück nach objekte.json
```

## Adressen

Die Pfadsegmente sind übersetzt — eine niederländische Interessentin landet nicht auf
einem deutschen Wort:

| | Übersicht | Objekt | Impressum | Datenschutz |
|---|---|---|---|---|
| it | `/it/` | `/it/immobili/IR-004/` | `/it/note-legali/` | `/it/privacy/` |
| en | `/en/` | `/en/properties/IR-004/` | `/en/legal-notice/` | `/en/privacy/` |
| de | `/de/` | `/de/objekte/IR-004/` | `/de/impressum/` | `/de/datenschutz/` |
| nl | `/nl/` | `/nl/panden/IR-004/` | `/nl/colofon/` | `/nl/privacy/` |
| fr | `/fr/` | `/fr/biens/IR-004/` | `/fr/mentions-legales/` | `/fr/confidentialite/` |

Jede Seite trägt ein `canonical`, `hreflang` für alle fünf Sprachen und `x-default`.
Die Sitemap verknüpft die Fassungen zusätzlich über `xhtml:link`.
Alle Adressen leiten sich aus `SITE_URL` in `src/config.ts` ab; für einen Umzug genügt
das Ändern dieser einen Zeile.

---

## Zwei Grundsatzentscheidungen

### Ohne JavaScript bleibt die Seite vollständig

Filter, Sortierung, Karte und Bildwechsel sind Zutaten, keine Voraussetzung. Der volle
Objektbestand steht im ausgelieferten HTML. Ohne JavaScript werden die Filter
ausgeblendet (`.js-only`) und die vollständige Liste bleibt stehen. Ein Suchbot sieht
darum immer alles — genau darum ging es bei diesem Projekt.

### Auf den Fotos ist niemand zu erkennen

Die Fotos zeigen Fassaden an öffentlichen Straßen; gelegentlich gerät jemand ins Bild
oder ein Kennzeichen wird lesbar. `scripts/fotos-anonymisieren.mjs` hält je Foto fest,
welcher Bereich aus welchem Grund verpixelt oder abgeschnitten wird, und arbeitet
idempotent. `npm run fotos:pruefen` bricht ab, solange ein erfasster Bereich offen ist —
die CI führt das bei jedem Push aus.

### Kein Objekt ohne Prüfstand

Kein Haus wurde besichtigt. `pruefstand` (`unbesichtigt` | `eigentuemer` | `vermittler`)
ist deshalb Pflichtfeld mit `unbesichtigt` als Vorgabe. Solange nichts bestätigt ist,
trägt jede Kachel eine Plakette und jede Detailseite einen Kasten, der ausspricht, was
unbestätigt ist — in fünf Sprachen. `scripts/build-pruefen.mjs` verlangt diesen Hinweis
auf jeder Objektseite jeder Sprache und bricht ab, wenn er fehlt.

### Der Prototyp kann nichts kaputtmachen

Der Bearbeitungsmodus des Prototyps schreibt nur in den Browser. Zurück ins Projekt geht
es über `prototyp-uebernehmen.mjs`, und dort gilt: Felder, die der Prototyp nicht kennen
kann — `telefon`, `telefon2` —, bedeuten leer **unverändert**, nie „löschen". Eine erteilte
`freigabe` wird nie zurückgenommen, fehlende Objekte bleiben stehen, und das Ergebnis muss
das Zod-Schema erfüllen, sonst wird gar nichts geschrieben. `--ziel <pfad>` schreibt in
eine andere Datei, statt `objekte.json` anzufassen.

### Metadaten gehen rein, nicht raus

`npm run koordinaten` liest die Aufnahmeposition aus den EXIF-Daten der Originalfotos und
trägt sie in `objekte.json` ein — plausibilisiert gegen einen 5-km-Umkreis um Irsina.
Umgekehrt verlassen keine Metadaten den Build: `astro:assets` kodiert jedes Bild neu,
die Ausgabe enthält weder EXIF noch GPS noch Farbprofil. Der Aufnahmeort eines Fotos ist
schließlich auch ein Datum, das niemand mitliefern muss.

### Ohne Freigabe steht hier keine Telefonnummer

Das Repository ist öffentlich, also greift die Regel früher als bei einer bloßen
Anzeigeentscheidung: In `src/data/objekte.json` **darf** eine Nummer nur stehen, wenn
`freigabe` true ist. Das Zod-Schema erzwingt es; ein Versuch bricht den Build ab.

Die abgelesenen, ungefragten Nummern liegen in `daten-intern/kontakte.json` — nicht
versioniert; nur `kontakte.beispiel.json` liegt im Repository. Der Weg von dort nach
`objekte.json` ist ein eigener, bewusster Schritt: `npm run kontakt:freigeben -- IR-013`,
der eine als unsicher vermerkte Nummer verweigert.

Vier Ebenen sichern das ab:

1. **Zod** verweigert eine Nummer ohne Freigabe — und eine Freigabe ohne Nummer oder mit
   unbestätigter Nummer.
2. **`test/oeffentlich.test.ts`** durchsucht jede versionierte Datei (`git ls-files`) nach
   italienischen Rufnummern; erlaubt sind nur zwei erfundene Beispiele.
3. **`scripts/build-pruefen.mjs`** durchsucht jede Datei in `dist/` nach den Nummern aus
   `kontakte.json`, in allen Schreibweisen — mit und ohne `+39`, mit und ohne Pluszeichen.
4. **`test/prototyp.test.ts`** tut dasselbe für die Einzeldatei-Fassung.

`src/data/objekte.ts` bildet zusätzlich jedes Objekt auf ein `OeffentlichesObjekt` ab und
entfernt dabei `telefon`, `telefon2` und `freigabe`, sofern nicht freigegeben — keine
Vorlage sieht die Rohdaten.

---

## Was `build:pruefen` kontrolliert

Der Datencheck sagt, ob die Quelle stimmt. Dieses Skript sagt, ob das Ergebnis stimmt:

1. keine ungeschützte Telefonnummer in irgendeiner ausgelieferten Datei
2. jede erwartete Seite existiert (5 Sprachen × Objekte + Rechtsseiten + Sitemap …)
3. jede Seite hat `canonical`, `x-default`, alle fünf `hreflang`, Titel und Beschreibung
4. die Sitemap nennt genau die Seiten, die es auch gibt
5. keine Verweise auf fremde Server außer den erwarteten
6. Platzhalter wie `ANSCHRIFT_FEHLT` werden gemeldet
7. keine HTML-Seite über 120 kB

## Die Prototyp-Fassung

`npm run prototyp` baut aus denselben Daten **eine einzige HTML-Datei**:

- `dist-prototyp/irsina-prototyp.html` — vollständig, doppelklickbar, offline lauffähig.
  Praktisch für Feldversuche in Irsina, wo der Mobilfunk nicht überall trägt.
- `dist-prototyp/artifact.html` — dieselbe Seite ohne `html`/`head`/`body`, wie es die
  Veröffentlichung als Claude-Artifact verlangt.

Rund 1,3 MB, Fotos als WebP-Data-URIs eingebettet. Die Detailansicht ist dort ein Overlay
statt einer eigenen Seite — in einer Einzeldatei gibt es keine zweite Adresse. Die Karte
weicht einem Hinweis: Kartenkacheln kämen von einem fremden Server, den die
Artifact-Sicherheitsrichtlinie ohnehin blockiert.

**Das ist nicht die veröffentlichungsfertige Seite.** Sie hat 72 einzelne Adressen und
lebt davon, gefunden zu werden — beides kann eine Einzeldatei nicht. Der Prototyp dient
dem Eindruck, nicht der Auffindbarkeit.

Damit beide nicht auseinanderlaufen, kommen Daten, Übersetzungen und **sämtliche
Anzeigetexte** aus denselben Modulen: `scripts/prototyp-bauen.mjs` ruft `preisText`,
`typText`, `gesehenText` und so fort genauso auf wie die Astro-Komponenten und legt das
Ergebnis fertig in die Datei. Im Browser wird nichts nachgerechnet.
`test/prototyp.test.ts` prüft die gebaute Datei — allen voran darauf, dass auch hier
keine ungeschützte Telefonnummer steht.

## Bilder

`astro:assets` erzeugt beim Bauen aus jedem Foto WebP in mehreren Breiten samt `srcset`
und `sizes`. Die Fotos in `src/fotos/` bleiben unangetastet. Die ersten drei Kacheln
laden `eager`, alles Weitere `lazy`.

Die Detailseiten erzeugen zusätzlich ein 1200 × 630 großes Vorschaubild für `og:image`.

## Karte

Leaflet ist eine Abhängigkeit des Projekts, kein CDN-Verweis — die Content-Security-Policy
kann deshalb eng bleiben. Der Code liegt in einem eigenen Bündel und wird erst
nachgeladen, wenn die Besucherin dem Laden der OpenStreetMap-Kacheln zustimmt.
Bis dahin geht keine Anfrage nach außen. Die Marker sind `divIcon`s — kein zusätzliches
Bild, und die Kennung ist direkt auf der Karte lesbar.

## Sichtbarkeit für Suchmaschinen

`SUCHMASCHINEN_ERLAUBT` in `src/config.ts` entscheidet es an einer Stelle: auf `false`
trägt jede Seite `noindex`, `robots.txt` sperrt alles und `public/_headers` setzt
`X-Robots-Tag` — die Seite ist über ihren Link erreichbar, taucht aber in keiner Suche
auf. `scripts/build-pruefen.mjs` besteht darauf, dass Konfiguration und `_headers`
dasselbe sagen, und bricht ab, wenn nur eines von beiden umgestellt wurde.

`SITE_URL` liest eine Umgebungsvariable gleichen Namens, sonst den Wert aus der
Konfiguration. Beim Hoster lässt sich die Adresse damit ohne Codeänderung setzen — nötig,
damit die Teilen-Knöpfe nicht auf eine Domain zeigen, die es noch nicht gibt.

## Hosting

Cloudflare Pages; das Projekt liegt in der Wurzel des Repositorys, ein *Root directory*
ist nicht nötig. Siehe [ANLEITUNG.md](./ANLEITUNG.md#die-seite-online-stellen) und
`wrangler.toml`. `.github/workflows/pruefen.yml` prüft bei jedem Push Daten, Fotos,
Typen, Tests, Build und Prototyp.

## Herkunft

Das Projekt entstand zunächst als Unterordner im privaten Repository `mangimic/mangieriERP`
und wurde von dort mit frischer Historie hierher gelöst — die alte Historie enthält
Fotostände, die vor der Veröffentlichung noch nicht bearbeitet waren.

Das Repository ist **öffentlich**. Was das für die Telefonnummern bedeutet, steht unten
unter *Ohne Freigabe steht hier keine Telefonnummer* — kurz gesagt: sie stehen nicht drin.
