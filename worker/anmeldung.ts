/**
 * Anmeldung fuer /edit und /admin.
 *
 * Es gibt genau ein Passwort, hinterlegt als Cloudflare-Secret ADMIN_PASSWORT.
 * Daraus wird auch der Schluessel fuer das Sitzungsplaetzchen abgeleitet — ein
 * zweites Geheimnis waere eine zweite Stelle, an der etwas fehlen kann; wird
 * das Passwort geaendert, sind alle Sitzungen ohnehin zu Recht ungueltig.
 */
const PLAETZCHEN = 'irsina_sitzung';
const GUELTIG_MS = 12 * 60 * 60 * 1000; // zwoelf Stunden

/*
 * Als ArrayBuffer statt Uint8Array: seit TypeScript 5.7 ist Uint8Array ueber
 * seinen Puffer generisch, und die Web-Crypto-Signaturen verlangen genau
 * ArrayBuffer. Der Umweg ueber slice() nimmt der Sache die Mehrdeutigkeit.
 */
function bytes(text: string): ArrayBuffer {
  const roh = new TextEncoder().encode(text);
  return roh.buffer.slice(roh.byteOffset, roh.byteOffset + roh.byteLength) as ArrayBuffer;
}

async function schluessel(passwort: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bytes(passwort), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function hex(puffer: ArrayBuffer): string {
  return [...new Uint8Array(puffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Vergleich ohne Zeitunterschied — sonst liesse sich das Passwort erraten. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let abweichung = 0;
  for (let i = 0; i < a.length; i++) abweichung |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return abweichung === 0;
}

export async function plaetzchenBauen(passwort: string): Promise<string> {
  const ablauf = String(Date.now() + GUELTIG_MS);
  const signatur = hex(await crypto.subtle.sign('HMAC', await schluessel(passwort), bytes(ablauf)));
  const wert = `${ablauf}.${signatur}`;
  return `${PLAETZCHEN}=${wert}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${GUELTIG_MS / 1000}`;
}

export function plaetzchenLoeschen(): string {
  return `${PLAETZCHEN}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Prueft das Passwort selbst — fuer die Anmeldung. */
export function passwortStimmt(eingabe: unknown, hinterlegt: string | undefined): boolean {
  if (!hinterlegt || typeof eingabe !== 'string' || eingabe === '') return false;
  return gleich(eingabe, hinterlegt);
}

/** Prueft das Sitzungsplaetzchen — fuer jeden weiteren Aufruf. */
export async function angemeldet(anfrage: Request, passwort: string | undefined): Promise<boolean> {
  if (!passwort) return false;
  const roh = anfrage.headers.get('cookie') || '';
  const treffer = roh.match(new RegExp(`(?:^|;\\s*)${PLAETZCHEN}=([^;]+)`));
  if (!treffer) return false;

  const [ablauf, signatur] = treffer[1].split('.');
  if (!ablauf || !signatur) return false;
  if (!/^\d+$/.test(ablauf) || Number(ablauf) < Date.now()) return false;

  const erwartet = hex(await crypto.subtle.sign('HMAC', await schluessel(passwort), bytes(ablauf)));
  return gleich(signatur, erwartet);
}
