/** Kleine Helfer fuer die Antworten des Workers. */

const KOPFZEILEN = {
  'content-type': 'application/json; charset=utf-8',
  /* Diese Antworten sind je Sitzung verschieden und duerfen nirgends liegen
     bleiben — weder im Browser noch bei Cloudflare. */
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
};

export function json(daten: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(daten), { status, headers: { ...KOPFZEILEN, ...extra } });
}

/**
 * Fehler mit einem Satz, der erklaert, was zu tun ist. Die Meldungen erscheinen
 * im Editor und in der Nachrichtenuebersicht — dort steht sonst nur eine Zahl.
 */
export function fehler(status: number, meldung: string, extra: Record<string, string> = {}): Response {
  return json({ fehler: meldung }, status, extra);
}
