/**
 * Nur so viel von der D1-Schnittstelle, wie dieser Worker benutzt.
 *
 * Bewusst selbst geschrieben statt @cloudflare/workers-types: das Paket bringt
 * globale Typdeklarationen mit, die sich mit denen von Astro ueberschneiden.
 */
export interface D1Ergebnis {
  results: Record<string, unknown>[];
}

export interface D1Anweisung {
  bind(...werte: unknown[]): D1Anweisung;
  run(): Promise<unknown>;
  all(): Promise<D1Ergebnis>;
}

export interface D1Database {
  prepare(sql: string): D1Anweisung;
}
