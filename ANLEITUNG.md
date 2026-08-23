# Irsina · Case nel centro storico — Anleitung

Ziel der Seite: die vielen VENDESI-Schilder in der Altstadt von Irsina sichtbar machen —
in fünf Sprachen (Italienisch, Englisch, Deutsch, Niederländisch, Französisch),
damit Interessenten aus dem Ausland die Angebote überhaupt finden können.

---

## Was sich gegenüber der ersten Fassung geändert hat

Die erste Fassung war **eine einzige HTML-Datei** mit eingebetteten Fotos und einem
versteckten `#edit`-Editor im Browser. Das war für den Anfang genau richtig — für das
eigentliche Ziel aber nicht: Suchmaschinen sahen dort eine leere Seite. Alle Inhalte
entstanden erst im Browser, jedes Objekt lag hinter einem `#IR-004`, und Adressfragmente
nimmt Google nie als eigene Seite auf. Wer in Amsterdam „huis kopen Basilicata" sucht,
wäre nie angekommen.

Jetzt ist es eine **statische Seite mit echten Adressen**:

| | vorher | jetzt |
|---|---|---|
| Seiten | 1 | 72 |
| Objekt IR-004 | `…/irsina-immobili.html#IR-004` | `…/de/objekte/IR-004/` und vier weitere Sprachen |
| Erste Ladung | 2,8 MB | rund 40 kB, Fotos danach nach Bedarf |
| Suchmaschine sieht | Titel und leeres Gerüst | jedes Objekt vollständig, in fünf Sprachen |
| Telefonnummern | veröffentlicht | zurückgehalten, siehe unten |
| Fehler in den Daten | fallen im Browser auf | brechen den Build ab |

**Der `#edit`-Editor im Browser entfällt.** Gepflegt wird jetzt die Datei
`src/data/objekte.json` — dafür meldet ein Prüfschritt jeden Tippfehler sofort und
benennt Objekt und Feld.

---

## Was in diesem Ordner liegt

| Ort | Wofür |
|---|---|
| `src/data/objekte.json` | **Die Objektliste. Hier wird gepflegt.** |
| `src/fotos/` | Die Fotos, ein oder mehrere je Objekt (`IR-001.jpg`, `IR-010a.jpg`, …). |
| `daten-intern/kontakte.json` | **Nicht eingecheckt.** Die abgelesenen Telefonnummern ohne Einwilligung. |
| `src/config.ts` | Adresse der Seite, Kontakt-E-Mail, Kartenmittelpunkt. |
| `src/i18n/texte.ts` | Alle sichtbaren Texte in fünf Sprachen. |
| `src/i18n/rechtliches.ts` | Impressum und Datenschutzerklärung, fünfsprachig. |
| `src/pages/` | Die Seitenvorlagen. Nur anfassen, wenn sich der Aufbau ändern soll. |
| `src/styles/global.css` | Gestaltung. |
| `scripts/fotos-anonymisieren.mjs` | Verpixelt Kennzeichen und beschneidet Personen aus den Fotos. |
| `scripts/koordinaten-aus-fotos.mjs` | Liest die Koordinaten aus den EXIF-Daten der Originalfotos. |
| `dist/` | Das gebaute Ergebnis. Wird nicht eingecheckt und bei jedem Build neu erzeugt. |

---

## Ein neues Objekt aufnehmen — in drei Schritten

### 1. Foto ablegen

Das Foto nach `src/fotos/` kopieren und nach der nächsten freien Kennung benennen,
z. B. `IR-012.jpg`. Mehrere Fotos je Objekt: `IR-012a.jpg`, `IR-012b.jpg`.
Ein Foto reicht — die Fassade, auf der das Schild zu sehen ist. Größe egal:
die Bilder werden beim Bauen automatisch verkleinert, in WebP umgewandelt und in
mehreren Auflösungen abgelegt, damit ein Handy nicht die große Fassung lädt.

### 2. Eintrag in `src/data/objekte.json` ergänzen

Einen bestehenden Block kopieren und anpassen:

```json
{
  "id": "IR-012",
  "foto": ["IR-012.jpg"],
  "strasse": "Via Roma",
  "civico": "12",
  "typ": "casa",
  "angebot": "vendita",
  "zustand": "da-ristrutturare",
  "preis": 28000,
  "mq": 90,
  "vani": 4,
  "extras": ["garage", "cantina"],
  "telefon": "+393331234567",
  "telefon2": null,
  "telefon_unsicher": false,
  "freigabe": false,
  "lat": 40.7503,
  "lng": 16.2381,
  "gesehen": "2026-09",
  "adresse_unklar": false,
  "text": {
    "it": "…", "en": "…", "de": "…", "nl": "…", "fr": "…"
  }
}
```

In VS Code werden Felder und erlaubte Werte dabei vorgeschlagen — dafür sorgt die
Zeile `"$schema": "./objekte.schema.json"` ganz oben in der Datei.

### 3. Prüfen und bauen

```
npm run daten:pruefen     # meldet Fehler und offene Punkte, dauert eine Sekunde
npm run build             # baut die komplette Seite nach dist/
```

Stimmt etwas nicht, sagt die Prüfung genau was:

```
  ✗ IR-012: Foto "IR-012.jpg" fehlt in src/fotos/.
  ✗ IR-013 · objekte.13.typ: Invalid enum value. Expected 'casa' | 'palazzo' | …
```

Zum Anschauen im Browser während der Arbeit:

```
npm run dev               # http://localhost:4321
```

---

## Die Felder im Einzelnen

| Feld | Werte | Hinweis |
|---|---|---|
| `id` | `"IR-012"` | Muss eindeutig sein und steht in der Adresse der Detailseite. |
| `foto` | `["IR-012.jpg", "IR-012b.jpg"]` | Dateinamen aus `src/fotos/`. Ab dem zweiten Bild erscheint eine Galerie. |
| `strasse` | freier Text | Überschrift der Kachel und `<h1>` der Detailseite. |
| `civico` | `"12"` oder `null` | Hausnummer. |
| `typ` | `casa`, `palazzo`, `appartamento`, `rudere`, `locale` | Steuert die Filter. Andere Werte werden abgelehnt. |
| `angebot` | `vendita`, `affitto`, `entrambi` | Verkauf, Miete oder beides. |
| `zustand` | `abitabile`, `da-ristrutturare`, `ristrutturato`, `sconosciuto` | Steuert die farbige Plakette. |
| `preis` | Zahl ohne Punkte, z. B. `28000`, oder `null` | `null` → „auf Anfrage". |
| `mq` | Zahl oder `null` | Quadratmeter. `null` → die Zeile entfällt. |
| `vani` | Zahl oder `null` | Zimmer. `null` → die Zeile entfällt. |
| `extras` | Liste | Erlaubt: `garage`, `cantina`, `balcone`, `giardino`, `terrazzo`, `portone carrabile`. |
| `telefon` | `"+393331234567"` oder `null` | Immer mit `+39`. **Wird nur mit `freigabe: true` veröffentlicht.** |
| `telefon2` | wie oben, oder `null` | Zweite Nummer, falls das Schild zwei nennt. |
| `telefon_unsicher` | `true` / `false` | `true` = vom Foto abgelesen, nicht bestätigt. Sperrt die Freigabe. |
| `freigabe` | `true` / `false` | **Siehe nächster Abschnitt.** Vorgabe ist `false`. |
| `lat` / `lng` | Zahl oder `null` | Koordinaten. Beide gesetzt oder beide `null`. |
| `gesehen` | `"2026-09"` | Monat, in dem das Schild fotografiert wurde. |
| `adresse_unklar` | `true` / `false` | `true` zeigt „Adresse noch zu bestätigen". |
| `text` | 5 Sprachen | 1–2 Sätze zum Objekt. Alle fünf sind Pflicht. |

**Koordinaten holen — zwei Wege:**

*Aus den Fotos.* Handys speichern beim Fotografieren, wo das Bild entstanden ist.
Liegen die Originale unverändert vor, geht es in einem Schritt:

```
npm run koordinaten -- ~/Bilder/irsina-originale                # nur anzeigen
npm run koordinaten -- ~/Bilder/irsina-originale --schreiben    # eintragen
```

Der Ordner enthält die Originale, am besten benannt wie in `objekte.json` (`IR-001` …).
Die Endung ist egal — `IR-016.HEIC` findet zu `IR-016.jpg`; gelesen werden `.jpg` `.jpeg`
`.heic` `.heif` `.avif` `.tif` `.tiff` `.png`. Das iPhone-Format HEIC muss also nicht
vorher umgewandelt werden. Dateien mit fremdem Namen (`IMG_9560.HEIC`) werden mit ihren
Koordinaten angezeigt, aber nicht eingetragen — dann umbenennen und erneut laufen lassen.
Das Skript rechnet vor dem Eintragen nach: Was weiter als 5 km von Irsina entfernt liegt,
wird abgelehnt statt übernommen. Bei mehreren Fotos je Objekt zählt das erste; die
weiteren werden mit ihrem Abstand angezeigt, damit auffällt, wenn sie nicht zusammenpassen.

**Damit das klappt, müssen die Fotos unverändert ankommen:**

- **Nicht über WhatsApp** an sich selbst schicken. WhatsApp löscht sämtliche Metadaten —
  genauso Signal, Telegram (als „Foto") und die meisten Messenger.
- **Nicht in ein Chatfenster hochladen.** Auch der Upload in einen Chat — diesen hier
  eingeschlossen — kodiert die Bilder neu. Alle bisher im Projekt liegenden Fotos sind so
  angekommen: die Originale auf dem Telefon tragen ihren Standort, die Kopien hier nicht
  mehr. Kein Werkzeug kann das nachträglich zurückholen.
- **iPhone:** Fotos → Teilen → oben **Optionen** → **„Alle Fotodaten"** einschalten.
  Dann AirDrop, iCloud-Link oder Kabel — die Datei muss als Datei ankommen, nicht als Bild
  in einer Nachricht.
- **Android:** beim Teilen darf **„Standort entfernen"** nicht aktiv sein. Am sichersten
  ist auch hier das Kabel.

Ob eine Datei ihren Standort noch hat, verrät sie selbst: am iPhone in der Foto-Info
(nach oben wischen) steht unter dem Bild eine kleine Karte, wenn ein Ort gespeichert ist.
Am Rechner zeigt `npm run koordinaten -- <ordner>` für jede Datei entweder die Zahlen
oder „keine Koordinaten im Bild".

*Aus Google Maps.* Auf die Stelle lange tippen bzw. rechtsklicken — die beiden Zahlen
(z. B. `40.750312, 16.238104`) erscheinen und lassen sich kopieren. Erste Zahl = `lat`,
zweite = `lng`.

**In beiden Fällen nachsehen.** In drei Meter breiten Gassen ist die Handy-Ortung auf
10–30 m genau; die Markierung kann am Nachbarhaus landen. Die Werte sind ein guter
Anfang, kein Ergebnis.

Objekte ohne Koordinaten erscheinen noch nicht auf der Karte; die Seite nennt dann selbst,
wie viele noch fehlen.

---

## Kein Haus wurde besichtigt — und das steht überall

Alle Angaben stammen von Schildern an den Fassaden und aus den Fotos. Niemand war
in einem der Häuser. Deshalb trägt **jedes Objekt** das Feld `pruefstand`:

| Wert | Bedeutung | Wirkung auf der Seite |
|---|---|---|
| `unbesichtigt` | Vorgabe. Nur vom Schild abgelesen. | Gelbe Plakette „Ungeprüft" auf der Kachel; auf der Detailseite ein Kasten, der ausspricht, dass Objektart, Zustand, Fläche, Räume und Verfügbarkeit unbestätigt sind — und dazu ein Knopf für Eigentümer und Vermittler, die Angaben zu bestätigen. |
| `eigentuemer` | Der Eigentümer hat die Angaben bestätigt. | Grüne Plakette „Vom Eigentümer bestätigt". |
| `vermittler` | Ein beauftragter Vermittler hat bestätigt. | Grüne Plakette „Vom Vermittler bestätigt". |

Über der Objektliste steht derselbe Hinweis noch einmal für den ganzen Bestand.
Alles in fünf Sprachen.

Das ist nicht nur beschrieben, sondern abgesichert: `npm run build:pruefen` verlangt den
Hinweis auf **jeder** Objektseite in **jeder** Sprache und bricht ab, wenn er fehlt.

Erst auf `eigentuemer` oder `vermittler` setzen, wenn wirklich jemand geantwortet hat.

---

## Telefonnummern — die wichtigste Regel

Die Nummern auf den Schildern gehören Privatpersonen. Dass ein Zettel am Haus hängt,
ist keine Einwilligung, ihn weltweit und maschinenlesbar zu veröffentlichen.

**Dieses Repository ist öffentlich.** Deshalb greift die Regel eine Stufe früher als bei
einer bloßen Anzeigeentscheidung:

> In `src/data/objekte.json` darf eine Telefonnummer **nur dann stehen**, wenn
> `freigabe` auf `true` steht — also der Eigentümer der Veröffentlichung zugestimmt hat.

Das ist keine Absichtserklärung, sondern eine Schemaregel: Der Versuch, eine Nummer ohne
Freigabe einzutragen, bricht `npm run daten:pruefen` und damit jeden Build ab.

### Wo die abgelesenen Nummern liegen

Die von den Schildern abgelesenen, noch ungefragten Nummern stehen in

```
daten-intern/kontakte.json     ← wird nicht eingecheckt
```

Der Ordner steht in `.gitignore`; nur die Vorlage `kontakte.beispiel.json` liegt im
Repository. **Diese Datei ist die einzige Stelle im Projekt, an der die Nummern stehen —
eine Sicherung lohnt sich.** (Sie stehen außerdem noch im privaten Repository
`mangimic/mangieriERP`, aus dem dieses Projekt hervorgegangen ist.)

### Wenn jemand zustimmt

```
npm run kontakt:freigeben -- IR-013              # nur anzeigen
npm run kontakt:freigeben -- IR-013 --schreiben  # eintragen
```

Der Befehl holt die Nummer aus `daten-intern/kontakte.json`, trägt sie in `objekte.json`
ein und setzt `freigabe`. Er **verweigert** das, solange die Nummer als `unsicher`
vermerkt ist — also vom Foto abgelesen und nicht bestätigt. Eine falsche Nummer
öffentlich zu stellen trifft womöglich jemanden, der mit dem Haus nichts zu tun hat.
Erst anrufen, dann in `kontakte.json` `"unsicher": false` setzen.

### Was das absichert

| Ebene | Was sie verhindert |
|---|---|
| Zod-Schema | eine Nummer ohne Freigabe in `objekte.json` |
| `test/oeffentlich.test.ts` | eine echte Nummer in **irgendeiner** versionierten Datei |
| `scripts/build-pruefen.mjs` | eine Nummer aus `kontakte.json` in **irgendeiner** gebauten Datei |
| `test/prototyp.test.ts` | dasselbe für die Prototyp-Einzeldatei |

Ein Widerruf ist jederzeit möglich: `freigabe` auf `false`, Nummer auf `null`. Zu bedenken
bleibt, dass eine einmal eingecheckte Nummer in der Git-Historie stehen bleibt.

---

## Personen und Kennzeichen auf den Fotos

Die Fotos zeigen Fassaden an öffentlichen Straßen. Manchmal gerät dabei jemand ins Bild,
der mit dem Haus nichts zu tun hat, oder ein Kfz-Kennzeichen wird lesbar. Beides ist ein
personenbezogenes Datum und gehört nicht auf eine öffentliche Seite — die
Datenschutzerklärung des Projekts sagt genau das zu.

Betroffen waren bisher vier Fotos:

- **IR-009** — eine Passantin war klar erkennbar, dazu ein lesbares Kennzeichen.
  Das Bild ist am rechten Rand beschnitten, das Kennzeichen verpixelt.
- **IR-003** — ein teilweise lesbares Kennzeichen, verpixelt.
- **IR-016** — ein Passant am rechten Bildrand, erkennbar. Rand beschnitten.
- **IR-019** — drei parkende Autos, alle drei Kennzeichen voll lesbar. Alle drei
  verpixelt.

Gemacht hat das `scripts/fotos-anonymisieren.mjs`. Die Bereiche stehen **im Skript**,
nicht in einem Bildbearbeitungsprogramm: so ist nachvollziehbar, was warum verdeckt
wurde, und der Schritt lässt sich jederzeit wiederholen.

**Bei einem neuen Foto:** durchsehen. Ist jemand erkennbar oder ein Kennzeichen lesbar,
im Skript einen Eintrag ergänzen —

```js
'IR-012.jpg': {
  verdecken: [{ grund: 'Kfz-Kennzeichen', left: 400, top: 900, width: 90, height: 55 }],
  beschneiden: { grund: 'Passant am Rand', right: 200 },
},
```

— und `npm run fotos:anonymisieren` ausführen. `npm run fotos:pruefen` meldet offene
Fälle und bricht die CI ab, falls ein erfasster Bereich noch unbearbeitet ist.

> Die unbearbeiteten Originale liegen weiterhin im ursprünglichen ZIP und in der
> Git-Historie (Commit `a3707b6`). **Beim Umzug in ein öffentliches Repository** darf
> diese Historie nicht mitgenommen werden — dort mit den bearbeiteten Fotos neu beginnen.

---

## Erst ausprobieren: die Prototyp-Fassung

Bevor die Seite unter einer eigenen Adresse läuft, lässt sie sich als **eine einzige
Datei** herumzeigen:

```
npm run prototyp
```

Das erzeugt `dist-prototyp/irsina-prototyp.html` — rund 1,3 MB, alle Fotos eingebettet,
fünf Sprachen, ohne Internetverbindung lauffähig. Die Datei lässt sich per WhatsApp
verschicken, auf einen USB-Stick legen oder in Irsina direkt am Handy zeigen, auch dort,
wo kein Netz ist.

Oben steht ein Band: *„Diese Seite ist ein Entwurf, um Rückmeldungen zu sammeln"* — in
der Sprache der Besucherin, mit deiner E-Mail-Adresse. Es lässt sich wegklicken.

Was im Prototyp anders ist als in der fertigen Seite:

- Die Detailansicht öffnet sich als Fenster über der Liste statt als eigene Seite.
- Die Karte zeigt **Beispielpositionen**, solange keine echten Koordinaten erhoben sind —
  gestrichelte Markierungen, mit einem Kasten darüber, der das ausdrücklich sagt. Sobald
  ein Objekt eine richtige Position bekommt, erscheint es als volle Markierung; die übrigen
  bleiben als Beispiel stehen. Die Legende unterscheidet beides.
- Die Karte steht von Anfang an mit ihren Markierungen und einem Maßstab da, aber
  **ohne Hintergrund**: der kommt von openstreetmap.org und wird erst auf Klick geholt —
  wie auf der veröffentlichten Seite. Vorher verlässt keine Anfrage den Browser. Wer
  *„Auswahl merken"* ankreuzt, wird beim nächsten Mal nicht wieder gefragt. In einer
  Umgebung, die fremde Server sperrt (etwa als Claude-Artifact), bleibt das Raster
  stehen — die Markierungen liegen dann immer noch richtig zueinander.
- Suchmaschinen finden nichts davon. Das ist der Zweck der fertigen Fassung, nicht dieser.

Die Angaben selbst sind identisch: Preise, Zustände, Beschreibungen, der Prüfstand und
der Schutz der Telefonnummern kommen aus denselben Bausteinen wie die echte Seite.

### Der Bearbeitungsmodus

Oben im Hinweisband sitzt ein **✎**-Knopf (oder `#edit` an die Adresse hängen). Damit
lässt sich vor Ort arbeiten — vor dem Haus stehen und die Angaben richtigstellen:

- Auf jeder Kachel erscheint unten links **✎ Bearbeiten**.
- In der geöffneten Detailansicht steht **✎ Dieses Objekt bearbeiten** ganz oben. Vor
  Ort ist das der übliche Weg: erst das Haus aufmachen, dann berichtigen. Nach dem
  Speichern bleibt die Ansicht offen und zeigt sofort den neuen Stand; wird die Kennung
  geändert, folgt sie ihr.
- **+ Neues Objekt** legt einen Eintrag an; die nächste freie Kennung wird vorgeschlagen.
- **Aktuellen Standort übernehmen** holt die Koordinaten vom Gerät — genau das, was
  fehlt, damit die Karte trägt. Die Genauigkeit steht dabei (±x m).
- **+ Foto hinzufügen** öffnet am Handy direkt die Kamera. Das Bild wird verkleinert.
- Der **Prüfstand** ist ein eigenes Feld: sobald ein Eigentümer bestätigt, hier umstellen.

Änderungen bleiben zunächst im Browser — auch nach dem Neuladen. **Änderungen verwerfen**
stellt den Auslieferungsstand wieder her.

### Zurück ins Projekt

```
npm run prototyp:uebernehmen -- ~/Downloads/objekte.json               # nur anzeigen
npm run prototyp:uebernehmen -- ~/Downloads/objekte.json --schreiben   # eintragen
```

Die Vorschau zeigt Feld für Feld, was sich ändern würde:

```
~ IR-001
     preis: null → 45000
     lat: null → 40.74702
     pruefstand: "unbesichtigt" → "vermittler"
+ IR-012  neu: Via Cavour
```

**Die eine Regel, auf die es dabei ankommt:** Der Prototyp kennt die Telefonnummern nicht —
sie verlassen den Build nicht. Ein leeres Telefonfeld im Auszug bedeutet deshalb
**unverändert**, niemals „löschen". Die mühsam von den Schildern abgelesenen Nummern
können beim Zurückspielen also nicht verlorengehen. Genauso wird eine einmal erteilte
Freigabe nie versehentlich zurückgenommen, und Objekte, die im Auszug fehlen, bleiben
stehen. Acht Tests halten das fest.

Fotos, die im Editor entstanden sind, stecken nur in der HTML-Datei; sie müssen von Hand
nach `src/fotos/` gelegt werden.

**Zwei Wege, den Auszug herauszubekommen:** *Daten kopieren (JSON)* legt ihn in die
Zwischenablage — das funktioniert überall. *Daten herunterladen* speichert eine Datei;
im Claude-Artifact fragt die Ansicht dabei um Erlaubnis, die HTML-Fassung lässt sich dort
je nach Einstellung nicht speichern. Bei der eigenständigen Datei geht beides.

---

## Die Seite online stellen

Gehostet wird bei **Cloudflare**, kostenlos, als **Worker mit statischen Dateien**
(Workers Static Assets). Danach genügt ein Link — er funktioniert auf jedem Handy, in
jedem Browser, ohne Konto und ohne Anhang.

> Cloudflare hat zwei Wege für so eine Seite: das ältere *Pages* und das neuere
> *Workers*. Dieses Projekt ist auf **Workers** eingerichtet. Der Unterschied steckt in
> `wrangler.toml`: Workers braucht `[assets] directory`, Pages `pages_build_output_dir`.
> **Beides zusammen bricht das Deployment ab** — genau daran ist der erste Versuch
> gescheitert (`Missing entry-point to Worker script or to assets directory`).
> `npm test` hält die Datei jetzt bei dem, was der Build erzeugt.

**Das Repository ist öffentlich** — deshalb steht in `src/data/objekte.json` keine
einzige ungefragte Telefonnummer, sondern nur, was freigegeben wurde. Die abgelesenen
Nummern liegen in `daten-intern/kontakte.json`, das nicht eingecheckt wird. Cloudflare
braucht diese Datei nicht: der Build läuft ohne sie durch, und `npm run build:pruefen`
bricht ab, falls doch eine ungeschützte Nummer in der fertigen Seite steht.

### Einmalig einrichten (etwa zehn Minuten)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a
   repository** → GitHub verbinden → Repo `mangimic/case-irsina` wählen.

2. Build-Einstellungen:

   | Feld | Wert |
   |---|---|
   | Build command | `npm run build && npm run build:pruefen` |
   | Deploy command | `npx wrangler deploy` |
   | Production branch | `main` |

   Ein *Root directory* muss **nicht** gesetzt werden — das Projekt liegt in der
   Wurzel des Repositorys. Wo die fertigen Dateien liegen, steht in `wrangler.toml`
   (`[assets] directory = "./dist"`) und nicht im Dashboard.

   Der Build-Befehl enthält bewusst auch die Kontrolle: findet sie eine ungeschützte
   Telefonnummer, eine fehlende Seite oder einen fehlenden Prüfhinweis, **schlägt das
   Deployment fehl, statt etwas Falsches zu veröffentlichen.**

3. **Der Name muss übereinstimmen.** In `wrangler.toml` steht
   `name = "irsina-immobili"`. Heißt der Worker im Dashboard anders, legt `wrangler
   deploy` beim Deployen einen **zweiten** Worker unter diesem Namen an. Entweder den
   Worker umbenennen oder die Zeile anpassen.

4. **Deploy.** Nach zwei bis drei Minuten läuft die Seite unter
   `https://<name>.<konto>.workers.dev`.

5. **Die Adresse eintragen** — sonst zeigen die Teilen-Knöpfe ins Leere.
   Im Worker unter **Settings → Variables and Secrets**:

   | Variable | Wert |
   |---|---|
   | `SITE_URL` | die tatsächliche Adresse, z. B. `https://irsina-immobili.mangimic.workers.dev` |

   Danach einmal neu bauen, damit sie greift. Ohne diesen Schritt verweisen geteilte
   Objektlinks weiterhin auf `case-irsina.it`, das es noch nicht gibt.

Ab jetzt baut jeder Push die Seite neu.

### Noch nicht in Google

`src/config.ts` steht auf:

```ts
export const SUCHMASCHINEN_ERLAUBT = false;
```

Die Seite ist damit **für jeden mit dem Link erreichbar**, erscheint aber nicht in
Suchergebnissen: jede Seite trägt `noindex`, `robots.txt` sperrt alles, und
`public/_headers` setzt zusätzlich `X-Robots-Tag`. Genau der richtige Stand, solange
Rückmeldungen gesammelt werden und Impressum, Preise und Koordinaten noch fehlen.

**Sichtbar machen**, wenn es so weit ist: den Wert auf `true` setzen **und** in
`public/_headers` die Zeile `X-Robots-Tag: noindex, nofollow` entfernen. Wird nur eines
von beiden geändert, bricht `npm run build:pruefen` ab und sagt welches — halb umgestellt
bliebe die Seite sonst unsichtbar, ohne dass jemand den Grund fände.

### Das Vorschaubild

`public/vorschau.jpg` erscheint, wenn jemand die **Startseite** bei WhatsApp, Facebook
oder Telegram verschickt. Es entsteht aus einem der Objektfotos:

```
npm run vorschaubild
```

Ein anderes Foto ist eine geänderte Zeile in `scripts/vorschaubild-bauen.mjs`.
Die **Detailseiten** brauchen das nicht — sie erzeugen ihr Vorschaubild aus dem
eigenen Foto.

### Eigene Domain

Im Worker unter **Settings → Domains & Routes → Add → Custom domain** eintragen.
Danach die Umgebungsvariable `SITE_URL` **löschen** — ohne sie gilt der eingebaute
Wert `https://case-irsina.it` aus `src/config.ts`, und der ist dann der richtige.
Einmal neu bauen, fertig: canonical, hreflang, Sitemap, JSON-LD und die
Teilen-Knöpfe ziehen alle daraus.

### Wenn der Build fehlschlägt

- *`ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".ts"`* — Cloudflare baut mit
  einer zu alten Node-Fassung. Die Prüfskripte laden das Zod-Schema direkt aus
  `src/data/schema.ts`; das kann Node erst **ab 22.18** ohne Zusatzschalter. Im Repo
  liegen `.node-version` und `.nvmrc` mit `22.23.2`. Greift Cloudflare sie nicht auf,
  unter *Settings → Environment variables* zusätzlich `NODE_VERSION` = `22.23.2` setzen
  und neu bauen. `npm test` hält die drei Festlegungen (`.node-version`, `.nvmrc`,
  `engines` in `package.json`) zusammen, damit sie nicht wieder auseinanderlaufen.
- *„Unsupported engine"* bei `npm ci` — dieselbe Ursache. `.npmrc` setzt
  `engine-strict=true`, damit npm gleich abbricht und die nötige Fassung nennt,
  statt es nur zu erwähnen und später unverständlich zu scheitern.
- *`Missing entry-point to Worker script or to assets directory`* — `wrangler.toml`
  enthält Pages-Angaben (`pages_build_output_dir`) statt `[assets] directory`.
  `npm test` fängt das ab.
- *Die Kontrolle bricht ab* — sie nennt den Grund im Protokoll. Das ist Absicht:
  lieber kein Deployment als ein falsches.

---

## Nachrichten und Editor auf der Seite

Zwei Seiten sind nur für dich da. Beide hängen an **einem** Passwort und stehen in
keiner Suchmaschine (`noindex`, dazu ein Eintrag in `robots.txt`).

| Adresse | Wofür |
|---|---|
| `/admin` | Was über das Kontaktformular hereinkam: lesen, beantworten, als gelesen markieren, löschen. |
| `/edit` | Die Objekte bearbeiten. Speichern legt einen **Commit im Repository** an; die Seite baut neu und ist nach ein bis zwei Minuten aktuell. |

Der Editor ist damit etwas anderes als der im Prototyp: dort bleibt eine Änderung im
Browser und muss später von Hand übernommen werden. Hier geht sie direkt in die Seite.
Vor dem Haus stehen, korrigieren, **Aktuellen Standort übernehmen**, speichern — fertig.

Er kann auch **Fotos hinzufügen**: das Bild wird im Browser auf 1400 px verkleinert und
als eigene Datei ins Repository gelegt. Und er lässt nichts durch, was der Datencheck
später ablehnen würde — es ist dasselbe Zod-Schema. Eine Telefonnummer ohne Freigabe
oder eine Aufwandsstufe ohne Besichtigung wird mit Begründung abgewiesen, **bevor**
etwas geschrieben wird.

#### Einmalig einrichten

**1. Datenbank für die Nachrichten anlegen**

```
npx wrangler d1 create irsina
npx wrangler d1 execute irsina --remote --file migrations/0001_nachrichten.sql
```

Der erste Befehl gibt eine `database_id` aus. Die gehört in `wrangler.toml` — dort steht
der Block auskommentiert bereit:

```toml
[[d1_databases]]
binding = "DB"
database_name = "irsina"
database_id = "hier-die-ausgegebene-id"
```

Solange das nicht geschehen ist, **verliert das Formular keine Nachricht**: es sagt der
Besucherin, dass der Speicher fehlt, und verweist auf die E-Mail-Adresse.

**2. Passwort setzen**

```
npx wrangler secret put ADMIN_PASSWORT
```

Ein langes, eigenes Passwort. Es gilt für `/admin` und `/edit` und ist zugleich der
Schlüssel, mit dem die Sitzung unterschrieben wird — änderst du es, sind alle offenen
Sitzungen zu Recht ungültig.

**3. Zugang zum Repository für den Editor**

Auf github.com unter *Settings → Developer settings → Personal access tokens → Fine-grained*
ein Token anlegen:

- *Repository access*: nur `mangimic/case-irsina`
- *Permissions → Contents*: **Read and write** — mehr nicht
- Laufzeit: so kurz, wie es dir passt; danach neu anlegen

```
npx wrangler secret put GITHUB_TOKEN
```

Ohne dieses Token zeigt `/edit` die Objekte trotzdem an (das Repository ist öffentlich),
sagt beim Speichern aber, dass der Zugang fehlt.

> **Wer den Token hat, kann in das Repository schreiben.** Deshalb nur *Contents* und
> nur dieses eine Repository. Er liegt als Cloudflare-Secret und ist danach auch im
> Dashboard nicht mehr lesbar.

#### Auf dem eigenen Rechner ausprobieren

```
npm run build
npx wrangler d1 execute irsina --local -c wrangler.lokal.toml --file migrations/0001_nachrichten.sql
npx wrangler dev -c wrangler.lokal.toml
```

`wrangler.lokal.toml` hat die D1-Bindung schon drin; im lokalen Betrieb legt wrangler
dafür eine SQLite-Datei unter `.wrangler/` an und fasst nichts in der Cloud an. Passwort
und Token gehören in `.dev.vars` (nicht eingecheckt):

```
ADMIN_PASSWORT = "probe"
GITHUB_TOKEN = "..."
```

---

## Aufwand: S, M, L, XL

Neben dem Zustand trägt jedes Objekt eine Stufe, wie viel Arbeit es braucht:

| | |
|---|---|
| **S** | einzugsbereit bis geringer Aufwand |
| **M** | überschaubare Arbeiten |
| **L** | größere Arbeiten |
| **XL** | aufwendige Sanierung |

Sie erscheint als farbige Plakette auf der Kachel und als eigene Zeile auf der
Detailseite, und es lässt sich danach filtern.

**Bei allen zwanzig Objekten ist sie leer** — und das bleibt so, bis jemand drin war.
Eine Aufwandsstufe ist eine Aussage über den Innenraum; sie vom Foto abzulesen wäre
geraten. Das Schema hält sich daran: **eine Stufe ohne `pruefstand` lässt sich gar nicht
speichern**, weder über den Editor noch von Hand. Erst bestätigen, dann einschätzen.

---

## Teilen über Instagram und TikTok

Beide nehmen — anders als WhatsApp, Facebook oder Telegram — **keinen vorbereiteten Link
entgegen**. Es gibt dafür schlicht keine Adresse; was danach aussieht, wäre eine
Attrappe. Der Weg ist deshalb:

- **Auf dem Handy** ist der erste Knopf der **systemweite Teilen-Dialog**. Er führt in
  jede App, die auf dem Gerät liegt — Instagram und TikTok eingeschlossen. Das ist der
  bequemste Weg und er funktioniert überall.
- **Die Knöpfe „Instagram" und „TikTok"** kopieren den Link, sagen in einem Satz, dass er
  eingefügt werden muss (Story-Sticker, Bio oder Beschreibung), und öffnen die App.

---

## Was noch offen ist

1. **Anschrift im Impressum.** In `src/i18n/rechtliches.ts` steht `ANSCHRIFT_FEHLT`.
   Eine Anbieterkennzeichnung braucht eine ladungsfähige Anschrift; die kann nur der
   Betreiber selbst eintragen. `npm run build:pruefen` erinnert bei jedem Build daran.
2. **D1-Datenbank anlegen und die Secrets setzen**, sonst nimmt das Formular keine
   Nachricht an und der Editor speichert nicht — siehe *Nachrichten und Editor auf der
   Seite*.
3. **Koordinaten** für alle zwanzig Objekte, damit die Karte trägt. Die vorliegenden
   Fotos haben ihre Metadaten unterwegs verloren — mit den Originalen vom Handy geht es
   in einem Schritt, siehe *Koordinaten holen*.
4. **Hausnummer von IR-016** klären: die Foto-Info nennt *Corso Canio Musacchio 46*,
   am Gebäude selbst steht die **13** als Relief unter dem Gesims. Siehe unten.
5. **Preise, Flächen und Aufwandsstufen** erheben — die Felder sind angelegt und bleiben leer,
   bis sie gefüllt werden. Die Aufwandsstufe setzt eine Besichtigung voraus.
6. **Eigentümer ansprechen.** Das schafft Kontakt im Ort, klärt die Angaben und
   ermöglicht es, Nummern mit Zustimmung freizuschalten.
7. **Neue Fotos** vor der Aufnahme in die Seite auf Personen und Kennzeichen durchsehen
   (siehe oben).

---

## Rechtliches, kurz

Impressum und Datenschutzerklärung liegen in allen fünf Sprachen vor und sind aus
jeder Seite im Fußbereich erreichbar. Im Fußbereich steht außerdem der Hinweis:
kein Makler, keine Provision, Angaben von öffentlich angebrachten Schildern, ohne Gewähr.
Das ist der richtige Rahmen für dieses Projekt — bitte nicht entfernen.

Die Karte lädt ihre Kacheln erst nach ausdrücklichem Klick von OpenStreetMap. Vorher
verlässt keine Anfrage den Browser. Cookies, Analyse- oder Trackingwerkzeuge gibt es
keine — deshalb braucht die Seite auch kein Cookie-Banner.

---

## Woher die Angaben der ersten Objekte stammen

Alle Einträge wurden aus den Fotos der Schilder abgelesen. Sicher lesbar waren:

- **IR-001** — Schild: *„casa + garage + cantina"*, Telefonnummer handschriftlich
  (deshalb als „zu prüfen" markiert), Hausnummer 5.
- **IR-004** — Schild: *„civici 8/9 — rivolgersi …"*.
- **IR-006** — handgemaltes Schild an einem Balkongitter.
- **IR-007** — Schild mit zwei Nummern.
- **IR-010** — Schild: *„AFFITTASI / VENDESI — locali x attività commerciali"*, also
  Gewerberaum zum Kauf **oder** zur Miete. Im *II Vico San Martino*, neben dem Wandbild
  der alten Bäckerei.
- Ohne lesbaren Kontakt: **IR-002, IR-003, IR-005, IR-008, IR-009, IR-011**.

Aus Straßenschildern im Bild gesichert:
**IR-003** *Largo Domenico Mangieri* · **IR-008** *Largo San Martino* ·
**IR-010** *II Vico San Martino* · **IR-011** *Largo San Nicola* · **IR-005** Ecke *Via Zara*.

**Zweiter Satz Fotos (IR-012 bis IR-015):**

- **IR-012** — zugenagelte Tür in ockerfarbener Fassade, handgemalt *VENDESI* mit
  Telefonnummer. Nur der Anfang ist lesbar (*3398 0…*); der Rest ist auf dem dunklen,
  verwitterten Holz nicht mehr zu entziffern und wurde deshalb **nicht** erfasst.
- **IR-013** — Schild: *„VENDESI — cell. …"*, gedruckt und eindeutig lesbar. Die Nummer
  ist in `daten-intern/kontakte.json` erfasst und steht bewusst nicht in diesem Text —
  das Repository ist öffentlich. Im Erdgeschoss das Schild einer ehemaligen
  *Arredamenti / Falegnameria*.
- **IR-014** — zwei Fotos desselben Hauses. Schild: *„VENDESI — per informazioni, tel."*,
  das **Nummernfeld ist leer geblieben**. Hausnummer **13**, in Stein gehauen.
- **IR-015** — *VENDESI*-Aufkleber im Oberlichtgitter; die Kontaktzeilen darunter sind
  auf dem Foto zu klein, um sie zu lesen. Hausnummer **53**, neben der Frutteria
  *Fruttolandia di Rocco*.

Die Straßennamen dieser vier sind auf den Fotos nicht zu sehen — sie tragen deshalb
beschreibende Bezeichnungen und `adresse_unklar: true`. Auch der Erfassungsmonat ist
geschätzt (`2026-08`): die Fotos hatten keine Metadaten mehr.

**IR-016 (einzeln nachgereicht):**

Straße aus der **Foto-Info des Originals** auf dem Telefon: *Corso Canio Musacchio,
75022 Irsina MT*. Diese Adresse hat das Telefon selbst aus den GPS-Daten des Bildes
zurückgerechnet — sie ist damit belastbarer als eine Schätzung, aber sie bezeichnet die
Stelle, an der fotografiert wurde, nicht zwingend das Haus davor.

Die Hausnummern widersprechen sich: die Foto-Info sagt **46**, am Gebäude steht die
**13** als Relief unter dem Gesims. Im Datensatz steht die **13** — sie ist im Bild zu
sehen. `adresse_unklar` bleibt deshalb `true`, bis jemand vor Ort nachsieht.

**Vierter Satz Fotos (IR-017 bis IR-020):**

- **IR-017** — lachsrosa Haus an einer gepflasterten Gasse, **zwei** Schilder an zwei
  Fenstern: eines handgemalt rot mit Telefonnummer (in `daten-intern/kontakte.json`, als
  unsicher markiert — die Gitterstäbe verdecken einen Teil der Ziffern), eines gedruckt
  und nicht mehr lesbar. Hausnummern **4** und **2** auf derselben Fassade; im Datensatz
  steht die 4, weil sie neben der Haustür sitzt.
- **IR-018** — ockerfarbenes Eckhaus, Hausnummer **7**, Schild auf der Haustür geklebt.
  Die Kontaktzeilen darunter sind verblasst und wurden deshalb **nicht** erfasst.
- **IR-019** — Palazzo mit vier Rundbogenfenstern unter dem Dach. Das Straßenschild im
  Bild beginnt mit *„Largo San G…"* — der Rest ist auf dem Foto zu klein (die Tafel ist
  im Original nur rund 70 Bildpunkte breit). Deshalb steht dort weiter ein beschreibender
  Name; der Anfang ist ein guter Anhaltspunkt für die Suche vor Ort. Auf dem Foto waren
  **drei Kfz-Kennzeichen voll lesbar** — sie sind verpixelt, siehe *Personen und
  Kennzeichen*.
- **IR-020** — gelbes Haus mit rot-weißem Rautenfries, zwei Fotos. Schild gedruckt mit
  zwei handschriftlichen Nummern, beide gut lesbar, beide in `daten-intern/kontakte.json`.
  Die Hausnummer **26** im Bild gehört dem **Nachbarhaus**, nicht diesem.

Auch bei diesen vier hatten die Fotos keine Metadaten mehr — Erfassungsmonat geschätzt
(`2026-08`), Straßennamen bis auf den Anfang von IR-019 unbekannt.

Alles Übrige — genaue Adressen, Preise, Flächen, Zustand — ist noch zu erheben.
