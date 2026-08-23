import { describe, expect, it, beforeEach } from 'vitest';
import worker from '../worker/index.ts';
import roh from '../src/data/objekte.json';

/**
 * Der Worker traegt zwei Dinge, die schiefgehen koennen, ohne dass es auffaellt:
 * das Kontaktformular (eine verlorene Anfrage merkt niemand) und den Editor
 * (ein falscher Schreibvorgang steht sofort oeffentlich auf der Seite).
 *
 * Diese Pruefungen rufen ihn so auf, wie Cloudflare es tut — mit Request und
 * Response —, statt nur den Quelltext zu durchsuchen.
 */
const PASSWORT = 'geheim-fuer-die-pruefung';

/** Ein D1-Ersatz, der sich merkt, was er ausgefuehrt haette. */
function datenbank() {
  const laeufe: { sql: string; werte: unknown[] }[] = [];
  return {
    laeufe,
    prepare(sql: string) {
      const anweisung = {
        werte: [] as unknown[],
        bind(...werte: unknown[]) { anweisung.werte = werte; return anweisung; },
        async run() { laeufe.push({ sql, werte: anweisung.werte }); return {}; },
        async all() { laeufe.push({ sql, werte: anweisung.werte }); return { results: [] }; },
      };
      return anweisung;
    },
  };
}

function umgebung(zusatz: Record<string, unknown> = {}) {
  return {
    ASSETS: { fetch: async () => new Response('Seite', { status: 200 }) },
    DB: datenbank(),
    ADMIN_PASSWORT: PASSWORT,
    GITHUB_BESITZER: 'mangimic',
    GITHUB_REPO: 'case-irsina',
    GITHUB_ZWEIG: 'main',
    ...zusatz,
  } as never;
}

function anfrage(weg: string, optionen: RequestInit = {}) {
  return new Request(`https://case-irsina.it${weg}`, optionen);
}
function jsonAnfrage(weg: string, koerper: unknown, optionen: RequestInit = {}) {
  return anfrage(weg, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(optionen.headers as object) },
    body: JSON.stringify(koerper),
    ...optionen,
  });
}

/** Meldet sich an und gibt das Sitzungsplaetzchen zurueck. */
async function plaetzchen(env = umgebung()): Promise<string> {
  const antwort = await worker.fetch(jsonAnfrage('/api/anmelden', { passwort: PASSWORT }), env);
  const gesetzt = antwort.headers.get('set-cookie') ?? '';
  return gesetzt.split(';')[0]!;
}

describe('Kontaktformular', () => {
  let env: ReturnType<typeof umgebung>;
  beforeEach(() => { env = umgebung(); });

  it('speichert eine vollstaendige Anfrage', async () => {
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', {
        name: 'Anna', email: 'anna@example.com',
        nachricht: 'Guten Tag, ist IR-017 noch zu haben?',
        objekt: 'IR-017', sprache: 'de', alter: 9000,
      }),
      env,
    );
    expect(antwort.status).toBe(200);
    const laeufe = (env as unknown as { DB: ReturnType<typeof datenbank> }).DB.laeufe;
    expect(laeufe).toHaveLength(1);
    expect(laeufe[0]!.werte.slice(0, 5)).toEqual([
      'Anna', 'anna@example.com', 'Guten Tag, ist IR-017 noch zu haben?', 'IR-017', 'de',
    ]);
  });

  it('weist eine unvollstaendige Adresse zurueck', async () => {
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', { email: 'keine-adresse', nachricht: 'Guten Tag.' }), env,
    );
    expect(antwort.status).toBe(400);
    expect((env as unknown as { DB: ReturnType<typeof datenbank> }).DB.laeufe).toHaveLength(0);
  });

  it('weist eine zu kurze Nachricht zurueck', async () => {
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', { email: 'a@b.de', nachricht: 'hi' }), env,
    );
    expect(antwort.status).toBe(400);
  });

  it('schluckt ein gefuelltes Honigtoepfchen, ohne es zu speichern', async () => {
    /* Nach aussen wie ein Erfolg — sonst laesst sich ausprobieren, was die
       Kontrolle ausloest. */
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', {
        email: 'bot@example.com', nachricht: 'Werbung Werbung Werbung',
        firma: 'Bot GmbH', alter: 9000,
      }),
      env,
    );
    expect(antwort.status).toBe(200);
    expect((env as unknown as { DB: ReturnType<typeof datenbank> }).DB.laeufe).toHaveLength(0);
  });

  it('schluckt ein zu schnell abgeschicktes Formular', async () => {
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', {
        email: 'schnell@example.com', nachricht: 'In einer halben Sekunde getippt.', alter: 300,
      }),
      env,
    );
    expect(antwort.status).toBe(200);
    expect((env as unknown as { DB: ReturnType<typeof datenbank> }).DB.laeufe).toHaveLength(0);
  });

  it('sagt Bescheid, wenn der Speicher fehlt, statt die Anfrage zu verlieren', async () => {
    const ohne = umgebung({ DB: undefined });
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anfrage', { email: 'a@b.de', nachricht: 'Eine richtige Anfrage.' }), ohne,
    );
    expect(antwort.status).toBe(503);
    expect((await antwort.json() as { fehler: string }).fehler).toMatch(/E-Mail/);
  });

  it('antwortet ohne JavaScript mit einer Seite statt mit JSON', async () => {
    const koerper = new URLSearchParams({
      email: 'bruno@example.com', nachricht: 'Buongiorno, sono interessato.',
      sprache: 'it', alter: '9000',
    });
    const antwort = await worker.fetch(
      anfrage('/api/anfrage', { method: 'POST', body: koerper }), env,
    );
    expect(antwort.headers.get('content-type')).toMatch(/text\/html/);
    const html = await antwort.text();
    expect(html).toMatch(/Grazie/);
    expect(html, 'darf nicht indexiert werden').toMatch(/noindex/);
  });
});

describe('Anmeldung', () => {
  it('laesst ohne Plaetzchen niemanden an die Nachrichten', async () => {
    const antwort = await worker.fetch(anfrage('/api/nachrichten'), umgebung());
    expect(antwort.status).toBe(401);
  });

  it('weist ein falsches Passwort ab', async () => {
    const antwort = await worker.fetch(jsonAnfrage('/api/anmelden', { passwort: 'falsch' }), umgebung());
    expect(antwort.status).toBe(401);
    expect(antwort.headers.get('set-cookie')).toBeNull();
  });

  it('setzt ein Plaetzchen, das nicht mitgelesen werden kann', async () => {
    const antwort = await worker.fetch(jsonAnfrage('/api/anmelden', { passwort: PASSWORT }), umgebung());
    const keks = antwort.headers.get('set-cookie') ?? '';
    expect(keks).toMatch(/HttpOnly/);
    expect(keks).toMatch(/Secure/);
    expect(keks).toMatch(/SameSite=Strict/);
    expect(keks, 'das Passwort darf darin nicht vorkommen').not.toContain(PASSWORT);
  });

  it('laesst mit Plaetzchen durch', async () => {
    const env = umgebung();
    const keks = await plaetzchen(env);
    const antwort = await worker.fetch(anfrage('/api/nachrichten', { headers: { cookie: keks } }), env);
    expect(antwort.status).toBe(200);
  });

  it('erkennt ein gefaelschtes Plaetzchen', async () => {
    const env = umgebung();
    const keks = await plaetzchen(env);
    /* Ablaufzeit verlaengern, Unterschrift unveraendert lassen. */
    const gefaelscht = keks.replace(/=(\d+)\./, `=${Date.now() + 10 ** 9}.`);
    const antwort = await worker.fetch(
      anfrage('/api/nachrichten', { headers: { cookie: gefaelscht } }), env,
    );
    expect(antwort.status).toBe(401);
  });

  it('sagt, wenn gar kein Passwort hinterlegt ist', async () => {
    const antwort = await worker.fetch(
      jsonAnfrage('/api/anmelden', { passwort: 'egal' }), umgebung({ ADMIN_PASSWORT: undefined }),
    );
    expect(antwort.status).toBe(503);
    expect((await antwort.json() as { fehler: string }).fehler).toMatch(/ADMIN_PASSWORT/);
  });
});

describe('Schreiben ins Repository', () => {
  const objekte = roh.objekte as unknown[];

  async function schreiben(koerper: unknown, zusatz: Record<string, unknown> = {}) {
    const env = umgebung({ GITHUB_TOKEN: 'nicht-echt', ...zusatz });
    const keks = await plaetzchen(env);
    return worker.fetch(
      jsonAnfrage('/api/objekte', koerper, { method: 'PUT', headers: { cookie: keks } }), env,
    );
  }

  it('verlangt den Stand, auf dem die Aenderung beruht', async () => {
    const antwort = await schreiben({ objekte });
    expect(antwort.status).toBe(400);
  });

  it('laesst keine Telefonnummer ohne Freigabe durch', async () => {
    /* Die Regel, die dieses Repository oeffentlich sein laesst. Ueber den
       Editor darf sie sich nicht umgehen lassen. */
    const geaendert = JSON.parse(JSON.stringify(objekte));
    geaendert[0].telefon = '+393331234567';
    const antwort = await schreiben({ objekte: geaendert, sha: 'abc' });
    expect(antwort.status).toBe(422);
    expect((await antwort.json() as { fehler: string }).fehler).toMatch(/ohne Freigabe/);
  });

  it('laesst keine Aufwandsstufe ohne Besichtigung durch', async () => {
    const geaendert = JSON.parse(JSON.stringify(objekte));
    geaendert[0].aufwand = 'S';
    const antwort = await schreiben({ objekte: geaendert, sha: 'abc' });
    expect(antwort.status).toBe(422);
    expect((await antwort.json() as { fehler: string }).fehler).toMatch(/Aufwandsstufe/);
  });

  it('nennt das fehlende Token erst, wenn die Daten in Ordnung sind', async () => {
    /* Was am Eintrag nicht stimmt, soll auch dann zu sehen sein, wenn der
       Zugang noch fehlt. */
    const antwort = await schreiben({ objekte, sha: 'abc' }, { GITHUB_TOKEN: undefined });
    expect(antwort.status).toBe(503);
    expect((await antwort.json() as { fehler: string }).fehler).toMatch(/GITHUB_TOKEN/);
  });

  it('weist einen unsinnigen Fotonamen ab', async () => {
    const env = umgebung({ GITHUB_TOKEN: 'nicht-echt' });
    const keks = await plaetzchen(env);
    for (const name of ['../../etc/passwd', 'beliebig.png', 'IR-17.jpg', '']) {
      const antwort = await worker.fetch(
        jsonAnfrage('/api/foto', { name, inhalt: 'AAAA' },
          { method: 'PUT', headers: { cookie: keks } }),
        env,
      );
      expect(antwort.status, name).toBe(400);
    }
  });
});

describe('Wegweiser', () => {
  it('reicht alles ausserhalb von /api an die Seite weiter', async () => {
    const antwort = await worker.fetch(anfrage('/de/objekte/IR-017/'), umgebung());
    expect(await antwort.text()).toBe('Seite');
  });

  it('antwortet auf einen unbekannten API-Weg mit 404', async () => {
    const env = umgebung();
    const keks = await plaetzchen(env);
    const antwort = await worker.fetch(anfrage('/api/gibtsnicht', { headers: { cookie: keks } }), env);
    expect(antwort.status).toBe(404);
  });

  it('laesst keine Antwort des Workers zwischenspeichern', async () => {
    const antwort = await worker.fetch(anfrage('/api/nachrichten'), umgebung());
    expect(antwort.headers.get('cache-control')).toBe('no-store');
  });
});
