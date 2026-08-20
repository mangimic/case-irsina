import roh from './objekte.json' with { type: 'json' };
import { dateiSchema, type Objekt } from './schema.ts';
import type { Sprache } from '../i18n/sprachen.ts';
import { STANDARD_SPRACHE } from '../i18n/sprachen.ts';

/**
 * Die Daten werden beim Build geprueft. Ein Tippfehler in objekte.json bricht
 * den Build ab, statt still eine kaputte Seite zu veroeffentlichen.
 */
const geprueft = dateiSchema.safeParse(roh);
if (!geprueft.success) {
  const zeilen = geprueft.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`);
  throw new Error(`src/data/objekte.json ist fehlerhaft:\n${zeilen.join('\n')}`);
}

const ALLE: Objekt[] = geprueft.data.objekte;

const doppelt = ALLE.map((o) => o.id).filter((id, i, a) => a.indexOf(id) !== i);
if (doppelt.length) {
  throw new Error(`Doppelte Kennungen in objekte.json: ${[...new Set(doppelt)].join(', ')}`);
}

/**
 * Ein Objekt so, wie es die Seite verlaesst.
 *
 * Die Telefonnummern der Schilder gehoeren Privatpersonen. Sie sind nur dann
 * Teil der Ausgabe, wenn der Eigentuemer zugestimmt hat (freigabe: true).
 * Dieses Feld ist die einzige Stelle, an der das entschieden wird — die
 * Komponenten bekommen die Nummer gar nicht erst zu sehen.
 */
export type OeffentlichesObjekt = Omit<Objekt, 'telefon' | 'telefon2' | 'freigabe'> & {
  telefon: string | null;
  telefon2: string | null;
};

export function oeffentlich(o: Objekt): OeffentlichesObjekt {
  const { freigabe, telefon, telefon2, ...rest } = o;
  return {
    ...rest,
    telefon: freigabe ? telefon : null,
    telefon2: freigabe ? telefon2 : null,
  };
}

/** Sortiert nach Kennung — stabile, vorhersehbare Reihenfolge im HTML. */
export const OBJEKTE: OeffentlichesObjekt[] = ALLE.map(oeffentlich).sort((a, b) =>
  a.id.localeCompare(b.id),
);

export function objektNachId(id: string): OeffentlichesObjekt | undefined {
  return OBJEKTE.find((o) => o.id === id);
}

/** Objekte mit Koordinaten — nur die koennen auf der Karte erscheinen. */
export const MIT_KOORDINATEN = OBJEKTE.filter((o) => o.lat !== null && o.lng !== null);

/** Beschreibung in der gewuenschten Sprache, mit Rueckfall auf Italienisch. */
export function beschreibung(o: OeffentlichesObjekt, lang: Sprache): string {
  return o.text[lang]?.trim() || o.text[STANDARD_SPRACHE];
}

/** Vollstaendige Adresse als eine Zeile. */
export function adresse(o: OeffentlichesObjekt, lang: Sprache): string {
  if (!o.civico) return o.strasse;
  return `${o.strasse}, ${lang === 'it' ? 'n. ' : ''}${o.civico}`;
}
