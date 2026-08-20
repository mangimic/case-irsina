/** Die fuenf Sprachen der Seite. Die erste ist die Vorgabe. */
export const SPRACHEN = ['it', 'en', 'de', 'nl', 'fr'] as const;
export type Sprache = (typeof SPRACHEN)[number];

export const STANDARD_SPRACHE: Sprache = 'it';

/** Beschriftung im Sprachumschalter. */
export const SPRACH_NAME: Record<Sprache, string> = {
  it: 'Italiano',
  en: 'English',
  de: 'Deutsch',
  nl: 'Nederlands',
  fr: 'Français',
};

/** Kuerzel im Umschalter. */
export const SPRACH_KUERZEL: Record<Sprache, string> = {
  it: 'IT',
  en: 'EN',
  de: 'DE',
  nl: 'NL',
  fr: 'FR',
};

/** Wert fuer <html lang> und hreflang. */
export const HREFLANG: Record<Sprache, string> = {
  it: 'it-IT',
  en: 'en',
  de: 'de',
  nl: 'nl',
  fr: 'fr',
};

/** Vollstaendige Gebietsangabe fuer og:locale. */
export const OG_LOCALE: Record<Sprache, string> = {
  it: 'it_IT',
  en: 'en_GB',
  de: 'de_DE',
  nl: 'nl_NL',
  fr: 'fr_FR',
};

export function istSprache(wert: unknown): wert is Sprache {
  return typeof wert === 'string' && (SPRACHEN as readonly string[]).includes(wert);
}
