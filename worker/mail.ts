/**
 * Versand ueber Resend — fuer die Kopie an die Absenderin und die
 * Benachrichtigung an den Betreiber.
 *
 * Bewusst so gebaut, dass ein Fehler hier die Anfrage nicht verschluckt: die
 * Nachricht liegt zu diesem Zeitpunkt bereits in der Datenbank. Geht der
 * Versand schief, ist die Anfrage trotzdem da — das ist wichtiger als die
 * Kopie.
 */
export interface MailEinstellungen {
  token: string;
  /** Absender, z. B. 'Irsina <info@case-irsina.it>'. Die Domain muss bei Resend bestaetigt sein. */
  von: string;
  /** Wohin die Benachrichtigung geht. */
  an: string;
}

interface Nachricht {
  name: string;
  email: string;
  text: string;
  objekt: string;
  sprache: string;
}

/* Kurz und in der Sprache, in der geschrieben wurde. Die Kopie ist ein Beleg,
   kein Anschreiben. */
const KOPIE: Record<string, { betreff: string; kopf: string; fuss: string }> = {
  it: { betreff: 'Copia della vostra richiesta', kopf: 'Ecco una copia del messaggio che ci avete inviato:', fuss: 'Rispondiamo appena possibile. Non occorre rispondere a questa e-mail.' },
  en: { betreff: 'Copy of your enquiry', kopf: 'Here is a copy of the message you sent us:', fuss: 'We will reply as soon as we can. No need to answer this e-mail.' },
  de: { betreff: 'Kopie Ihrer Anfrage', kopf: 'Hier eine Kopie der Nachricht, die Sie uns geschickt haben:', fuss: 'Wir antworten, sobald es geht. Auf diese E-Mail müssen Sie nicht antworten.' },
  nl: { betreff: 'Kopie van uw bericht', kopf: 'Hier is een kopie van het bericht dat u ons stuurde:', fuss: 'We antwoorden zodra het kan. U hoeft niet op deze e-mail te reageren.' },
  fr: { betreff: 'Copie de votre demande', kopf: 'Voici une copie du message que vous nous avez envoyé :', fuss: 'Nous répondons dès que possible. Inutile de répondre à cet e-mail.' },
};

async function senden(
  e: MailEinstellungen,
  an: string,
  betreff: string,
  text: string,
  antwortAn?: string,
): Promise<void> {
  const antwort = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${e.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: e.von,
      to: [an],
      subject: betreff,
      text,
      ...(antwortAn ? { reply_to: antwortAn } : {}),
    }),
  });
  if (!antwort.ok) throw new Error(`Resend: ${antwort.status} ${await antwort.text()}`);
}

/** Kopie an die Absenderin. Nur auf ausdruecklichen Wunsch. */
export async function kopieSenden(e: MailEinstellungen, n: Nachricht): Promise<void> {
  const w = KOPIE[n.sprache] ?? KOPIE.it!;
  const bezug = n.objekt ? `\n(${n.objekt})` : '';
  await senden(
    e,
    n.email,
    w.betreff + bezug,
    `${w.kopf}\n\n---\n${n.text}\n---\n\n${w.fuss}\n`,
    e.an,
  );
}

/** Benachrichtigung an den Betreiber, damit eine Anfrage nicht liegen bleibt. */
export async function benachrichtigen(e: MailEinstellungen, n: Nachricht): Promise<void> {
  await senden(
    e,
    e.an,
    `Neue Anfrage${n.objekt ? ` — ${n.objekt}` : ''}`,
    `Von: ${n.name || '(ohne Namen)'} <${n.email}>\n` +
      `Objekt: ${n.objekt || '—'}\nSprache: ${n.sprache || '—'}\n\n${n.text}\n`,
    /* Antworten geht direkt an die Absenderin. */
    n.email,
  );
}
