import type { APIRoute } from 'astro';
import { SITE_URL, SUCHMASCHINEN_ERLAUBT } from '../config.ts';

export const GET: APIRoute = () => {
  /* Solange die Seite nicht gefunden werden soll, wird auch die Sitemap nicht
     genannt — sie waere sonst eine Einladung, doch zu indexieren. */
  /* Die beiden internen Seiten bleiben in jedem Fall draussen — auch dann,
     wenn der Rest der Seite gefunden werden soll. */
  const zeilen = SUCHMASCHINEN_ERLAUBT
    ? [
        'User-agent: *',
        'Disallow: /admin',
        'Disallow: /edit',
        'Disallow: /api/',
        'Allow: /',
        '',
        `Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}`,
        '',
      ]
    : [
        '# Die Seite ist erreichbar, soll aber noch nicht in Suchergebnissen',
        '# erscheinen. Umgestellt wird das in src/config.ts.',
        'User-agent: *',
        'Disallow: /',
        '',
      ];
  return new Response(zeilen.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
