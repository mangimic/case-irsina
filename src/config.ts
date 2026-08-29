/**
 * Zentrale Einstellungen der Seite.
 *
 * Wer die Seite unter einer anderen Adresse betreibt, aendert hier eine Zeile
 * und baut neu. Alle kanonischen URLs, hreflang-Angaben, die Sitemap und die
 * Share-Links leiten sich hiervon ab.
 */

/**
 * Oeffentliche Adresse der Seite. Ohne Schraegstrich am Ende.
 *
 * Davon haengen die kanonischen Adressen, die Sprachverweise, die Sitemap und
 * vor allem die Teilen-Knoepfe ab: steht hier die falsche Adresse, verweisen
 * geteilte Objektlinks ins Leere.
 *
 * Beim Hoster laesst sich das ohne Codeaenderung setzen — eine Umgebungs-
 * variable SITE_URL beim Bauen genuegt (bei Cloudflare Pages im Dashboard
 * unter Settings -> Environment variables). Ist keine gesetzt, gilt der Wert
 * unten; er ist auch die richtige Stelle, sobald die eigene Domain steht.
 *
 * Die typeof-Pruefung ist noetig, weil diese Datei auch aus dem Browser heraus
 * erreichbar sein koennte, wo es kein process gibt.
 */
const ADRESSE_AUS_UMGEBUNG =
  typeof process !== 'undefined' ? process.env?.SITE_URL : undefined;

export const SITE_URL = (ADRESSE_AUS_UMGEBUNG || 'https://case-irsina.it').replace(/\/+$/, '');

/** Kontaktadresse fuer Eigentuemer und Interessenten. */
export const MAIL = 'michele.mangieri@gmail.com';

/** Name des Betreibers, erscheint im Impressum und in den strukturierten Daten. */
export const BETREIBER = 'Michele Mangieri';

/**
 * Duerfen Suchmaschinen die Seite aufnehmen?
 *
 * false = die Seite ist unter ihrer Adresse fuer jeden erreichbar, taucht aber
 * nicht in Suchergebnissen auf: jede Seite traegt noindex, robots.txt sperrt
 * alles, und die Sitemap wird dort nicht genannt. Das ist der richtige Stand,
 * solange Rueckmeldungen gesammelt werden und Impressum, Preise und Koordinaten
 * noch nicht stehen.
 *
 * Zum Sichtbarwerden auf true stellen — UND in public/_headers die Zeile
 * X-Robots-Tag entfernen. Der Build-Check besteht darauf, dass beides
 * zusammenpasst, damit es nicht halb umgestellt bleibt.
 */
export const SUCHMASCHINEN_ERLAUBT = false;

/**
 * Ob das Formular eine Kopie an die Absenderin anbieten darf.
 *
 * Dafuer muss im Worker ein Versand eingerichtet sein (RESEND_TOKEN, MAIL_VON,
 * MAIL_AN). Solange das fehlt, bleibt das Kaestchen aus — ein Haken, der nichts
 * bewirkt, waere ein gebrochenes Versprechen.
 */
export const KOPIE_MOEGLICH = false;

/** Vorschaubild fuer Facebook, WhatsApp und Co. Relativ zu SITE_URL. */
export const OG_IMAGE = '/vorschau.jpg';

/** Kartenmittelpunkt: Irsina, Piazza Garibaldi. */
export const KARTE_ZENTRUM = { lat: 40.7466, lng: 16.2417, zoom: 16 } as const;

/** Zahlen fuer die Kennzahlenleiste im Kopfbereich. */
export const FAKTEN = {
  minutenMatera: '30',
  minutenBari: '60',
  einwohner: '4.100',
} as const;
