/**
 * Schreibt Aenderungen aus dem Editor zurueck ins Repository.
 *
 * Der Editor auf der Seite ist damit kein Zettel mehr, der spaeter von Hand
 * uebertragen wird: Speichern legt einen Commit an, Cloudflare baut neu, und
 * die Korrektur steht nach ein bis zwei Minuten auf der Seite.
 *
 * Gelesen wird immer der aktuelle Stand aus dem Repository — nicht der, mit
 * dem der Worker gebaut wurde. Sonst wuerde ein Editor, der seit gestern offen
 * ist, gestern zurueckschreiben.
 */
const API = 'https://api.github.com';

export interface GithubEinstellungen {
  besitzer: string;
  repo: string;
  zweig: string;
  pfad: string;
  /**
   * Nur zum Schreiben noetig. Das Repository ist oeffentlich, Lesen geht also
   * auch ohne — so zeigt der Editor die Objekte schon, bevor der Token
   * hinterlegt ist, und sagt erst beim Speichern, was fehlt.
   */
  token?: string;
}

interface Inhalt {
  text: string;
  sha: string;
}

function kopfzeilen(token?: string): HeadersInit {
  return {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    /* GitHub lehnt Anfragen ohne User-Agent ab. */
    'user-agent': 'case-irsina-worker',
  };
}

export async function dateiLesen(e: GithubEinstellungen): Promise<Inhalt> {
  const adresse = `${API}/repos/${e.besitzer}/${e.repo}/contents/${e.pfad}?ref=${encodeURIComponent(e.zweig)}`;
  const antwort = await fetch(adresse, { headers: kopfzeilen(e.token) });
  if (!antwort.ok) {
    throw new Error(`GitHub antwortet beim Lesen mit ${antwort.status}: ${await antwort.text()}`);
  }
  const daten = (await antwort.json()) as { content: string; sha: string; encoding: string };
  if (daten.encoding !== 'base64') throw new Error(`Unerwartete Kodierung: ${daten.encoding}`);
  /* atob liefert Bytes als Zeichen; ohne diesen Umweg werden Umlaute zerstoert. */
  const roh = Uint8Array.from(atob(daten.content.replace(/\n/g, '')), (z) => z.charCodeAt(0));
  return { text: new TextDecoder().decode(roh), sha: daten.sha };
}

/**
 * Legt eine Datei an, die es noch nicht gibt — fuer Fotos aus dem Editor.
 * Ohne sha, weil nichts ueberschrieben werden soll: existiert der Name schon,
 * lehnt GitHub ab, und das ist hier die richtige Antwort.
 */
export async function neueDatei(
  e: GithubEinstellungen,
  pfad: string,
  inhaltBase64: string,
  meldung: string,
): Promise<void> {
  if (!e.token) throw new Error('Zum Schreiben fehlt der GITHUB_TOKEN.');
  const antwort = await fetch(`${API}/repos/${e.besitzer}/${e.repo}/contents/${pfad}`, {
    method: 'PUT',
    headers: { ...kopfzeilen(e.token), 'content-type': 'application/json' },
    body: JSON.stringify({ message: meldung, content: inhaltBase64, branch: e.zweig }),
  });
  if (antwort.status === 422) {
    throw new Error(`Es gibt bereits eine Datei ${pfad}. Bitte einen anderen Namen waehlen.`);
  }
  if (!antwort.ok) {
    throw new Error(`GitHub antwortet beim Anlegen mit ${antwort.status}: ${await antwort.text()}`);
  }
}

export async function dateiSchreiben(
  e: GithubEinstellungen,
  text: string,
  sha: string,
  meldung: string,
): Promise<{ commit: string }> {
  if (!e.token) throw new Error('Zum Schreiben fehlt der GITHUB_TOKEN.');
  const roh = new TextEncoder().encode(text);
  let binaer = '';
  for (const b of roh) binaer += String.fromCharCode(b);

  const antwort = await fetch(`${API}/repos/${e.besitzer}/${e.repo}/contents/${e.pfad}`, {
    method: 'PUT',
    headers: { ...kopfzeilen(e.token), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: meldung,
      content: btoa(binaer),
      /* Der sha stammt aus demselben Lesevorgang wie der bearbeitete Stand.
         Hat inzwischen jemand anders geschrieben, lehnt GitHub mit 409 ab —
         besser als stillschweigend zu ueberschreiben. */
      sha,
      branch: e.zweig,
    }),
  });

  if (antwort.status === 409) {
    throw new Error(
      'Die Datei wurde inzwischen an anderer Stelle geaendert. Seite neu laden und die Aenderung wiederholen.',
    );
  }
  if (!antwort.ok) {
    throw new Error(`GitHub antwortet beim Schreiben mit ${antwort.status}: ${await antwort.text()}`);
  }
  const daten = (await antwort.json()) as { commit: { sha: string } };
  return { commit: daten.commit.sha };
}
