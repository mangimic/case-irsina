import { SPRACHEN, type Sprache } from './sprachen.ts';

/**
 * Uebersetzte Pfadsegmente. Eine niederlaendische Interessentin landet auf
 * /nl/panden/IR-004/ und nicht auf einem deutschen oder englischen Wort —
 * das ist fuer Suchmaschinen wie fuer Menschen die ehrlichere URL.
 */
export const SEGMENT: Record<Sprache, { objekt: string; impressum: string; datenschutz: string }> = {
  it: { objekt: 'immobili', impressum: 'note-legali', datenschutz: 'privacy' },
  en: { objekt: 'properties', impressum: 'legal-notice', datenschutz: 'privacy' },
  de: { objekt: 'objekte', impressum: 'impressum', datenschutz: 'datenschutz' },
  nl: { objekt: 'panden', impressum: 'colofon', datenschutz: 'privacy' },
  fr: { objekt: 'biens', impressum: 'mentions-legales', datenschutz: 'confidentialite' },
};

/** Startseite einer Sprache, z. B. /de/ */
export function startPfad(lang: Sprache): string {
  return `/${lang}/`;
}

/** Detailseite eines Objekts, z. B. /de/objekte/IR-004/ */
export function objektPfad(lang: Sprache, id: string): string {
  return `/${lang}/${SEGMENT[lang].objekt}/${id}/`;
}

export function impressumPfad(lang: Sprache): string {
  return `/${lang}/${SEGMENT[lang].impressum}/`;
}

export function datenschutzPfad(lang: Sprache): string {
  return `/${lang}/${SEGMENT[lang].datenschutz}/`;
}

/**
 * Dieselbe Seite in allen Sprachen — Grundlage fuer den Sprachumschalter
 * und fuer die hreflang-Angaben im Kopf jeder Seite.
 */
export type SeitenArt =
  | { art: 'start' }
  | { art: 'objekt'; id: string }
  | { art: 'impressum' }
  | { art: 'datenschutz' };

export function pfadFuer(lang: Sprache, seite: SeitenArt): string {
  switch (seite.art) {
    case 'objekt':
      return objektPfad(lang, seite.id);
    case 'impressum':
      return impressumPfad(lang);
    case 'datenschutz':
      return datenschutzPfad(lang);
    default:
      return startPfad(lang);
  }
}

export function alleSprachPfade(seite: SeitenArt): { lang: Sprache; pfad: string }[] {
  return SPRACHEN.map((lang) => ({ lang, pfad: pfadFuer(lang, seite) }));
}
