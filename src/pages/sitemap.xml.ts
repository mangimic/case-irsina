import type { APIRoute } from 'astro';
import { SITE_URL } from '../config.ts';
import { SPRACHEN, HREFLANG, STANDARD_SPRACHE } from '../i18n/sprachen.ts';
import { alleSprachPfade, pfadFuer, type SeitenArt } from '../i18n/routen.ts';
import { OBJEKTE } from '../data/objekte.ts';

/**
 * Eigene Sitemap statt der Standard-Integration: die Pfadsegmente sind je
 * Sprache uebersetzt (/it/immobili/ vs. /nl/panden/), und nur so lassen sich
 * die Sprachfassungen korrekt als xhtml:link-Alternativen verknuepfen.
 */
const SEITEN: SeitenArt[] = [
  { art: 'start' },
  ...OBJEKTE.map((o) => ({ art: 'objekt' as const, id: o.id })),
  { art: 'impressum' },
  { art: 'datenschutz' },
];

function prioritaet(seite: SeitenArt): string {
  if (seite.art === 'start') return '1.0';
  if (seite.art === 'objekt') return '0.8';
  return '0.3';
}

export const GET: APIRoute = () => {
  const eintraege: string[] = [];

  for (const seite of SEITEN) {
    const alternates = alleSprachPfade(seite)
      .map(
        ({ lang, pfad }) =>
          `    <xhtml:link rel="alternate" hreflang="${HREFLANG[lang]}" href="${new URL(pfad, SITE_URL).href}"/>`,
      )
      .join('\n');
    const standard = `    <xhtml:link rel="alternate" hreflang="x-default" href="${new URL(pfadFuer(STANDARD_SPRACHE, seite), SITE_URL).href}"/>`;

    for (const lang of SPRACHEN) {
      eintraege.push(
        [
          '  <url>',
          `    <loc>${new URL(pfadFuer(lang, seite), SITE_URL).href}</loc>`,
          alternates,
          standard,
          `    <priority>${prioritaet(seite)}</priority>`,
          '  </url>',
        ].join('\n'),
      );
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...eintraege,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
