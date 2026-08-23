import type { Sprache } from '../i18n/sprachen.ts';
import { t, type TextSchluessel } from '../i18n/texte.ts';
import type { OeffentlichesObjekt } from './objekte.ts';

/** Schluessel der Uebersetzungstabelle je Datenwert. */
const TYP_TEXT = {
  casa: 'tCasa', palazzo: 'tPalazzo', appartamento: 'tApp', rudere: 'tRudere', locale: 'tLocale',
} as const satisfies Record<string, TextSchluessel>;

const ZUSTAND_TEXT = {
  abitabile: 'cAbit', 'da-ristrutturare': 'cRistr', ristrutturato: 'cRis', sconosciuto: 'cUnk',
} as const satisfies Record<string, TextSchluessel>;

const ANGEBOT_TEXT = {
  vendita: 'aVend', affitto: 'aAff', entrambi: 'aBoth',
} as const satisfies Record<string, TextSchluessel>;

const AUFWAND_TEXT = {
  S: 'aufS', M: 'aufM', L: 'aufL', XL: 'aufXL',
} as const satisfies Record<string, TextSchluessel>;

const PRUEFSTAND_TEXT = {
  unbesichtigt: 'pvKurz', eigentuemer: 'pvOwner', vermittler: 'pvAgent',
} as const satisfies Record<string, TextSchluessel>;

const EXTRA_TEXT: Record<string, Record<Sprache, string>> = {
  garage:              { it: 'Garage',    en: 'Garage',      de: 'Garage',       nl: 'Garage',      fr: 'Garage' },
  cantina:             { it: 'Cantina',   en: 'Cellar',      de: 'Keller',       nl: 'Kelder',      fr: 'Cave' },
  balcone:             { it: 'Balcone',   en: 'Balcony',     de: 'Balkon',       nl: 'Balkon',      fr: 'Balcon' },
  giardino:            { it: 'Giardino',  en: 'Garden',      de: 'Garten',       nl: 'Tuin',        fr: 'Jardin' },
  terrazzo:            { it: 'Terrazzo',  en: 'Terrace',     de: 'Terrasse',     nl: 'Terras',      fr: 'Terrasse' },
  'portone carrabile': { it: 'Portone carrabile', en: 'Carriage entrance', de: 'Durchfahrtstor', nl: 'Inrijpoort', fr: 'Porche carrossable' },
};

export const typText = (o: OeffentlichesObjekt, lang: Sprache) => t(lang, TYP_TEXT[o.typ]);
export const zustandText = (o: OeffentlichesObjekt, lang: Sprache) => t(lang, ZUSTAND_TEXT[o.zustand]);
export const angebotText = (o: OeffentlichesObjekt, lang: Sprache) => t(lang, ANGEBOT_TEXT[o.angebot]);
export const pruefstandText = (o: OeffentlichesObjekt, lang: Sprache) =>
  t(lang, PRUEFSTAND_TEXT[o.pruefstand]);

/** Volltext der Aufwandsstufe, oder der Hinweis, dass noch keine vorliegt. */
export const aufwandText = (o: OeffentlichesObjekt, lang: Sprache) =>
  o.aufwand === null ? t(lang, 'aufNd') : t(lang, AUFWAND_TEXT[o.aufwand]);

/** true, solange die Angaben von niemandem bestaetigt wurden. */
export const ungeprueft = (o: OeffentlichesObjekt) => o.pruefstand === 'unbesichtigt';

export const extraText = (extra: string, lang: Sprache) => EXTRA_TEXT[extra]?.[lang] ?? extra;

/** Preis in der Schreibweise der jeweiligen Sprache, oder "auf Anfrage". */
export function preisText(o: OeffentlichesObjekt, lang: Sprache): string {
  if (o.preis === null) return t(lang, 'nd');
  return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang, {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(o.preis);
}

export function flaecheText(o: OeffentlichesObjekt, lang: Sprache): string {
  return o.mq === null ? t(lang, 'nd') : `${o.mq} m²`;
}

export function raeumeText(o: OeffentlichesObjekt, lang: Sprache): string {
  return o.vani === null ? t(lang, 'nd') : String(o.vani);
}

/** "2026-08" -> "August 2026" in der jeweiligen Sprache. */
export function gesehenText(o: OeffentlichesObjekt, lang: Sprache): string {
  const [jahr, monat] = o.gesehen.split('-').map(Number);
  const d = new Date(Date.UTC(jahr!, monat! - 1, 1));
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

/** Kurze Kennzeichen fuer die Kachel: Preis, Flaeche, Raeume, Ausstattung. */
export function kennzeichen(o: OeffentlichesObjekt, lang: Sprache): { text: string; preis: boolean }[] {
  const liste: { text: string; preis: boolean }[] = [];
  if (o.preis !== null) liste.push({ text: preisText(o, lang), preis: true });
  if (o.mq !== null) liste.push({ text: `${o.mq} m²`, preis: false });
  if (o.vani !== null) liste.push({ text: `${o.vani} ${t(lang, 'dRooms')}`, preis: false });
  for (const e of o.extras) liste.push({ text: extraText(e, lang), preis: false });
  return liste;
}
