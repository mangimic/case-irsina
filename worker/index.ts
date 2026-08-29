/**
 * Der Worker vor der statischen Seite.
 *
 * Die 117 gebauten Seiten liefert Cloudflare direkt aus; hier landet nur, was
 * dabei nicht vorkommt:
 *
 *   POST /api/anfrage      Kontaktformular — speichert die Nachricht
 *   POST /api/anmelden     Passwort gegen ein Sitzungsplaetzchen
 *   POST /api/abmelden     Plaetzchen loeschen
 *   GET  /api/nachrichten  eingegangene Anfragen (angemeldet)
 *   POST /api/nachrichten  eine als gelesen markieren oder loeschen (angemeldet)
 *   GET  /api/objekte      aktueller Stand aus dem Repository (angemeldet)
 *   PUT  /api/objekte      geaenderten Stand zurueckschreiben (angemeldet)
 *
 * Alles andere geht an die statischen Dateien.
 */
import { dateiSchema } from '../src/data/schema.ts';
import { angemeldet, passwortStimmt, plaetzchenBauen, plaetzchenLoeschen } from './anmeldung.ts';
import { dateiLesen, dateiSchreiben, neueDatei, type GithubEinstellungen } from './github.ts';
import { fehler, json } from './antwort.ts';
import { benachrichtigen, kopieSenden, type MailEinstellungen } from './mail.ts';
import type { D1Database } from './d1.ts';

export interface Umgebung {
  ASSETS: { fetch: (anfrage: Request) => Promise<Response> };
  /** Erst vorhanden, wenn die D1-Datenbank verbunden ist. */
  DB?: D1Database;
  ADMIN_PASSWORT?: string;
  GITHUB_TOKEN?: string;
  GITHUB_BESITZER?: string;
  GITHUB_REPO?: string;
  GITHUB_ZWEIG?: string;
  /** Erst gesetzt, wenn der Versand eingerichtet ist. Ohne diese drei wird
      gespeichert, aber nichts verschickt. */
  RESEND_TOKEN?: string;
  MAIL_VON?: string;
  MAIL_AN?: string;
}

function mailEinstellungen(env: Umgebung): MailEinstellungen | null {
  if (!env.RESEND_TOKEN || !env.MAIL_VON || !env.MAIL_AN) return null;
  return { token: env.RESEND_TOKEN, von: env.MAIL_VON, an: env.MAIL_AN };
}

const DATEN_PFAD = 'src/data/objekte.json';

/* Was ein Mensch in ein Kontaktformular schreibt, passt hier hinein. Alles
   darueber ist entweder ein Versehen oder kein Mensch. */
const GRENZEN = { name: 120, email: 200, nachricht: 4000, objekt: 12 };

function text(wert: unknown, grenze: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, grenze) : '';
}

/* Bewusst grosszuegig: eine Adresse abzulehnen, die es doch gibt, kostet eine
   Anfrage. Der Zweck ist nur, Tippfehler und leere Felder abzufangen. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Antwortseite fuer den Weg ohne JavaScript. Absichtlich eine einzelne Datei
 * ohne Stylesheet: sie muss auch dann noch stehen, wenn sonst nichts geht.
 */
function dankeSeite(sprache: string, gut: boolean, meldung: string): Response {
  const zurueck = `/${/^(it|en|de|nl|fr)$/.test(sprache) ? sprache : 'it'}/`;
  const html = `<!doctype html><html lang="${/^[a-z]{2}$/.test(sprache) ? sprache : 'it'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${gut ? 'Grazie' : 'Errore'}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:34em;margin:14vh auto;padding:0 6vw;color:#2b2119}
a{color:#a8462c}p{margin:0 0 1.2em}</style></head><body>
<p><strong>${meldung.replace(/[<>&]/g, (z) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[z]!)}</strong></p>
<p><a href="${zurueck}">&larr; zur&uuml;ck</a></p></body></html>`;
  return new Response(html, {
    status: gut ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function anfrageSpeichern(anfrage: Request, env: Umgebung): Promise<Response> {
  /* Mit JavaScript kommt JSON, ohne JavaScript das gewoehnliche Formular.
     Beides muss ankommen — sonst stuende ein Teil der Besucherinnen vor einem
     Formular, das nichts tut. */
  const art = anfrage.headers.get('content-type') || '';
  const alsFormular = !art.includes('application/json');

  let koerper: Record<string, unknown>;
  try {
    if (alsFormular) {
      koerper = Object.fromEntries((await anfrage.formData()).entries());
    } else {
      koerper = (await anfrage.json()) as Record<string, unknown>;
    }
  } catch {
    return fehler(400, 'Die Anfrage war nicht lesbar.');
  }

  const antwort = await anfrageVerarbeiten(koerper, env);
  if (!alsFormular) return antwort;

  const daten = (await antwort.clone().json()) as { fehler?: string };
  const sprache = typeof koerper.sprache === 'string' ? koerper.sprache : 'it';
  return antwort.ok
    ? dankeSeite(sprache, true, DANKE[sprache] ?? DANKE.it)
    : dankeSeite(sprache, false, daten.fehler ?? 'Es hat nicht geklappt.');
}

/* Kurz gehalten: diese Seite erscheint nur ohne JavaScript, die ausfuehrliche
   Fassung steht im Formular selbst. */
const DANKE: Record<string, string> = {
  it: 'Grazie — il messaggio è arrivato.',
  en: 'Thank you — your message arrived.',
  de: 'Danke — die Nachricht ist angekommen.',
  nl: 'Dank u — het bericht is aangekomen.',
  fr: 'Merci — le message est bien arrivé.',
};

async function anfrageVerarbeiten(
  koerper: Record<string, unknown>,
  env: Umgebung,
): Promise<Response> {

  /* Zwei stille Kontrollen gegen automatisch ausgefuellte Formulare: ein Feld,
     das kein Mensch sieht, und die Zeit seit dem Aufbau der Seite. Beide
     antworten mit "angekommen", damit ein Versuch nichts darueber lernt. */
  if (text(koerper.firma, 200) !== '') return json({ ok: true });
  const alter = Number(koerper.alter);
  if (Number.isFinite(alter) && alter < 2000) return json({ ok: true });

  const name = text(koerper.name, GRENZEN.name);
  const email = text(koerper.email, GRENZEN.email);
  const nachricht = text(koerper.nachricht, GRENZEN.nachricht);
  const objekt = text(koerper.objekt, GRENZEN.objekt);
  const sprache = text(koerper.sprache, 2);

  if (nachricht.length < 5) return fehler(400, 'Bitte schreiben Sie einen Satz mehr.');
  if (!EMAIL.test(email)) return fehler(400, 'Diese E-Mail-Adresse sieht nicht vollstaendig aus.');
  if (objekt !== '' && !/^IR-\d{3}$/.test(objekt)) return fehler(400, 'Unbekanntes Objekt.');

  if (!env.DB) {
    return fehler(
      503,
      'Der Nachrichtenspeicher ist noch nicht verbunden. Bitte schreiben Sie so lange direkt eine E-Mail.',
    );
  }

  const kopie = koerper.kopie === true || koerper.kopie === 'on' || koerper.kopie === '1';
  const eingegangen = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO nachrichten (name, email, nachricht, objekt, sprache, eingegangen, kopie)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(name || null, email, nachricht, objekt || null, sprache || null, eingegangen, kopie ? 1 : 0)
      .run();
  } catch {
    /* Aeltere Tabellen haben die Spalte kopie noch nicht. Die Anfrage ist
       wichtiger als der Vermerk — also ohne sie speichern. */
    await env.DB.prepare(
      `INSERT INTO nachrichten (name, email, nachricht, objekt, sprache, eingegangen)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(name || null, email, nachricht, objekt || null, sprache || null, eingegangen)
      .run();
  }

  /* Ab hier liegt die Nachricht sicher. Was beim Versand schiefgeht, darf sie
     nicht mehr gefaehrden — deshalb kein await auf den Fehlerfall und kein
     Fehlerschluss nach aussen. */
  const post = mailEinstellungen(env);
  if (post) {
    const inhalt = { name, email, text: nachricht, objekt, sprache };
    await benachrichtigen(post, inhalt).catch(() => {});
    if (kopie) await kopieSenden(post, inhalt).catch(() => {});
  }

  return json({ ok: true });
}

async function nachrichtenLesen(env: Umgebung): Promise<Response> {
  if (!env.DB) return fehler(503, 'Die D1-Datenbank ist noch nicht mit dem Worker verbunden.');
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, nachricht, objekt, sprache, eingegangen, gelesen
       FROM nachrichten ORDER BY id DESC LIMIT 500`,
  ).all();
  return json({ nachrichten: results });
}

async function nachrichtAendern(anfrage: Request, env: Umgebung): Promise<Response> {
  if (!env.DB) return fehler(503, 'Die D1-Datenbank ist noch nicht mit dem Worker verbunden.');
  const { id, was } = (await anfrage.json()) as { id?: number; was?: string };
  if (!Number.isInteger(id)) return fehler(400, 'Keine Nachricht angegeben.');

  if (was === 'loeschen') {
    await env.DB.prepare('DELETE FROM nachrichten WHERE id = ?').bind(id).run();
  } else if (was === 'gelesen' || was === 'ungelesen') {
    await env.DB.prepare('UPDATE nachrichten SET gelesen = ? WHERE id = ?')
      .bind(was === 'gelesen' ? 1 : 0, id)
      .run();
  } else {
    return fehler(400, 'Unbekannte Aktion.');
  }
  return json({ ok: true });
}

function githubEinstellungen(env: Umgebung): GithubEinstellungen | null {
  if (!env.GITHUB_BESITZER || !env.GITHUB_REPO) return null;
  return {
    besitzer: env.GITHUB_BESITZER,
    repo: env.GITHUB_REPO,
    zweig: env.GITHUB_ZWEIG || 'main',
    pfad: DATEN_PFAD,
    token: env.GITHUB_TOKEN,
  };
}

async function objekteLesen(env: Umgebung): Promise<Response> {
  const e = githubEinstellungen(env);
  if (!e) return fehler(503, 'Der Zugang zum Repository ist noch nicht eingerichtet.');
  try {
    const { text: inhalt, sha } = await dateiLesen(e);
    return json({ ...JSON.parse(inhalt), sha });
  } catch (ausnahme) {
    const meldung = (ausnahme as Error).message;
    /* Ohne Token zaehlt GitHub die Abrufe pro IP-Adresse — und die teilt sich
       ein Worker mit vielen anderen. Dann steht hier eine Meldung ueber
       Kontingente, die den eigentlichen Grund nicht nennt. */
    if (!e.token && /rate limit|\b(403|429)\b/i.test(meldung)) {
      return fehler(
        503,
        'GitHub laesst gerade keine Abrufe ohne Anmeldung zu. Bitte das Secret GITHUB_TOKEN hinterlegen — ' +
          'damit gilt ein eigenes, deutlich groesseres Kontingent.',
      );
    }
    return fehler(502, meldung);
  }
}

async function objekteSchreiben(anfrage: Request, env: Umgebung): Promise<Response> {
  const e = githubEinstellungen(env);
  if (!e) return fehler(503, 'Der Zugang zum Repository ist noch nicht eingerichtet.');

  const koerper = (await anfrage.json()) as { objekte?: unknown; sha?: string; notiz?: string };
  if (typeof koerper.sha !== 'string' || koerper.sha === '') {
    return fehler(400, 'Ohne den Stand, auf dem die Aenderung beruht, wird nicht geschrieben.');
  }

  /* Zuerst pruefen, dann erst nach dem Token fragen: was am Eintrag nicht
     stimmt, soll die Bearbeiterin auch dann erfahren, wenn der Zugang noch
     fehlt. Es ist dieselbe Pruefung wie beim Bauen — samt der Regel, dass ohne
     Freigabe keine Telefonnummer in der Datei stehen darf. Der Weg ueber den
     Editor darf daran nicht vorbeifuehren. */
  const geprueft = dateiSchema.safeParse({ objekte: koerper.objekte });
  if (!geprueft.success) {
    const erste = geprueft.error.issues.slice(0, 4).map((i) => `${i.path.join('.')}: ${i.message}`);
    return fehler(422, `Der Stand passt nicht zum Schema — nichts geschrieben.\n${erste.join('\n')}`);
  }

  if (!e.token) return fehler(503, 'Zum Speichern fehlt das Secret GITHUB_TOKEN.');

  const inhalt = JSON.stringify({ objekte: geprueft.data.objekte }, null, 2) + '\n';
  const notiz = text(koerper.notiz, 120) || 'Aenderung ueber den Editor auf der Seite';

  try {
    const { commit } = await dateiSchreiben(e, inhalt, koerper.sha, `${notiz}\n\nGeaendert ueber /edit.`);
    return json({ ok: true, commit, anzahl: geprueft.data.objekte.length });
  } catch (ausnahme) {
    return fehler(409, (ausnahme as Error).message);
  }
}

/* Ein Handyfoto kommt verkleinert an (der Editor rechnet es auf 1400 px
   herunter). Alles darueber ist ein Versehen. */
const FOTO_GRENZE = 3 * 1024 * 1024;

/**
 * Liefert ein Foto aus dem Repository durch — der Editor braucht es zur
 * Vorschau. Auf der Seite selbst gibt es die Bilder nur unter den von Astro
 * vergebenen Namen mit Pruefsumme; unter ihrem urspruenglichen Namen sind sie
 * dort nicht erreichbar.
 */
async function fotoZeigen(adresse: URL, env: Umgebung): Promise<Response> {
  const e = githubEinstellungen(env);
  if (!e) return fehler(503, 'Der Zugang zum Repository ist noch nicht eingerichtet.');
  const name = adresse.searchParams.get('name') || '';
  if (!/^IR-\d{3}[a-z]?\.jpe?g$/i.test(name)) return fehler(400, 'Unbekannter Dateiname.');

  const roh = `https://raw.githubusercontent.com/${e.besitzer}/${e.repo}/${e.zweig}/src/fotos/${name}`;
  const antwort = await fetch(roh, { headers: { 'user-agent': 'case-irsina-worker' } });
  if (!antwort.ok) return fehler(404, `${name} liegt nicht im Repository.`);
  return new Response(antwort.body, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'private, max-age=60',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

async function fotoAnlegen(anfrage: Request, env: Umgebung): Promise<Response> {
  const e = githubEinstellungen(env);
  if (!e) return fehler(503, 'Der Zugang zum Repository ist noch nicht eingerichtet.');
  if (!e.token) return fehler(503, 'Zum Hochladen fehlt das Secret GITHUB_TOKEN.');

  const { name, inhalt } = (await anfrage.json()) as { name?: string; inhalt?: string };
  if (typeof name !== 'string' || !/^IR-\d{3}[a-z]?\.jpe?g$/i.test(name)) {
    return fehler(400, 'Der Dateiname muss der Form IR-021.jpg folgen.');
  }
  if (typeof inhalt !== 'string' || inhalt === '') return fehler(400, 'Kein Bild empfangen.');

  /* base64 traegt vier Zeichen je drei Byte. */
  if ((inhalt.length * 3) / 4 > FOTO_GRENZE) return fehler(413, 'Das Bild ist zu gross.');

  try {
    await neueDatei(e, `src/fotos/${name}`, inhalt, `Foto ${name} ueber den Editor hinzugefuegt`);
    return json({ ok: true, name });
  } catch (ausnahme) {
    return fehler(409, (ausnahme as Error).message);
  }
}

export default {
  async fetch(anfrage: Request, env: Umgebung): Promise<Response> {
    const adresse = new URL(anfrage.url);
    const weg = adresse.pathname.replace(/\/+$/, '') || '/';

    if (!weg.startsWith('/api/')) return env.ASSETS.fetch(anfrage);

    /* Offen, weil sich sonst niemand melden koennte. */
    if (weg === '/api/anfrage' && anfrage.method === 'POST') return anfrageSpeichern(anfrage, env);

    if (weg === '/api/anmelden' && anfrage.method === 'POST') {
      if (!env.ADMIN_PASSWORT) {
        return fehler(503, 'Es ist noch kein Passwort hinterlegt (Secret ADMIN_PASSWORT).');
      }
      const { passwort } = (await anfrage.json()) as { passwort?: unknown };
      if (!passwortStimmt(passwort, env.ADMIN_PASSWORT)) {
        /* Kurze Verzoegerung: sie kostet einen Menschen nichts und macht das
           Durchprobieren muehsam. */
        await new Promise((fertig) => setTimeout(fertig, 900));
        return fehler(401, 'Das Passwort stimmt nicht.');
      }
      return json({ ok: true }, 200, { 'set-cookie': await plaetzchenBauen(env.ADMIN_PASSWORT) });
    }

    if (weg === '/api/abmelden' && anfrage.method === 'POST') {
      return json({ ok: true }, 200, { 'set-cookie': plaetzchenLoeschen() });
    }

    if (!(await angemeldet(anfrage, env.ADMIN_PASSWORT))) {
      return fehler(401, 'Bitte anmelden.');
    }

    if (weg === '/api/nachrichten' && anfrage.method === 'GET') return nachrichtenLesen(env);
    if (weg === '/api/nachrichten' && anfrage.method === 'POST') return nachrichtAendern(anfrage, env);
    if (weg === '/api/objekte' && anfrage.method === 'GET') return objekteLesen(env);
    if (weg === '/api/objekte' && anfrage.method === 'PUT') return objekteSchreiben(anfrage, env);
    if (weg === '/api/foto' && anfrage.method === 'GET') return fotoZeigen(adresse, env);
    if (weg === '/api/foto' && anfrage.method === 'PUT') return fotoAnlegen(anfrage, env);

    return fehler(404, 'Diesen Weg gibt es nicht.');
  },
};
