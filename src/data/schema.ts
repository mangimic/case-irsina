import { z } from 'astro/zod';
import { SPRACHEN } from '../i18n/sprachen.ts';

export const TYPEN = ['casa', 'palazzo', 'appartamento', 'rudere', 'locale'] as const;
export const ANGEBOTE = ['vendita', 'affitto', 'entrambi'] as const;
export const ZUSTAENDE = ['abitabile', 'da-ristrutturare', 'ristrutturato', 'sconosciuto'] as const;
/**
 * Wie viel Arbeit ein Haus braucht, in vier groben Stufen — bewusst grob, weil
 * hier niemand eine Kostenschaetzung abgibt:
 *
 *   S   einzugsbereit bis geringer Aufwand
 *   M   ueberschaubare Arbeiten
 *   L   groessere Arbeiten
 *   XL  aufwendige Arbeiten noetig
 *
 * null bedeutet: noch nicht eingeschaetzt. Das ist der Stand bei allen
 * Objekten, solange niemand drin war — geraten wird hier nichts.
 */
export const AUFWAND = ['S', 'M', 'L', 'XL'] as const;

export const EXTRAS = ['garage', 'cantina', 'balcone', 'giardino', 'terrazzo', 'portone carrabile'] as const;

/**
 * Wie belastbar die Angaben eines Objekts sind.
 *
 * Alle Einträge beruhen zunächst nur auf einem Schild an der Fassade und dem
 * Foto davon — kein Haus wurde besichtigt. Das muss auf der Seite stehen, an
 * jedem einzelnen Objekt, und es darf nicht vergessen werden können. Deshalb
 * ist es ein Pflichtfeld mit 'unbesichtigt' als Vorgabe.
 */
export const PRUEFSTAND = ['unbesichtigt', 'eigentuemer', 'vermittler'] as const;

/** Italienische Mobil- und Festnetznummern in internationaler Schreibweise. */
const telefon = z
  .string()
  .regex(/^\+\d{8,15}$/, 'Telefonnummer muss international geschrieben sein, z. B. +393331234567')
  .nullable();

const beschreibung = z.object(
  Object.fromEntries(SPRACHEN.map((l) => [l, z.string().trim().min(1)])) as Record<
    (typeof SPRACHEN)[number],
    z.ZodString
  >,
);

export const objektSchema = z
  .object({
    /** Eindeutige Kennung, erscheint auf Karte, Kachel und in der URL. */
    id: z.string().regex(/^IR-\d{3}$/, 'Kennung muss der Form IR-001 folgen'),
    /** Dateinamen aus src/fotos/. Mindestens eines. */
    foto: z.array(z.string().regex(/^IR-\d{3}[a-z]?\.jpe?g$/i)).min(1),
    strasse: z.string().trim().min(1),
    civico: z.string().trim().min(1).nullable(),
    typ: z.enum(TYPEN),
    angebot: z.enum(ANGEBOTE),
    zustand: z.enum(ZUSTAENDE),
    /** Ganze Euro ohne Trennzeichen. null bedeutet "auf Anfrage". */
    preis: z.number().int().positive().max(50_000_000).nullable(),
    mq: z.number().int().positive().max(10_000).nullable(),
    vani: z.number().int().positive().max(100).nullable(),
    extras: z.array(z.enum(EXTRAS)),
    /** Aufwandsstufe; null, solange sie niemand eingeschaetzt hat. */
    aufwand: z.enum(AUFWAND).nullable().default(null),
    telefon: telefon,
    telefon2: telefon.optional().default(null),
    /** Nummer wurde von einem Foto abgelesen und ist noch nicht bestaetigt. */
    telefon_unsicher: z.boolean(),
    /**
     * Einwilligung des Eigentuemers zur Veroeffentlichung der Telefonnummer.
     *
     * Dieses Repository ist oeffentlich. Ohne Freigabe darf hier deshalb gar
     * keine Nummer stehen — nicht nur nicht ausgeliefert werden. Abgelesene,
     * aber ungefragte Nummern gehoeren nach daten-intern/kontakte.json.
     */
    freigabe: z.boolean().default(false),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    /** Monat der Erfassung, z. B. "2026-08". */
    gesehen: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    adresse_unklar: z.boolean(),
    /** Wer die Angaben bestätigt hat. Vorgabe: niemand. */
    pruefstand: z.enum(PRUEFSTAND).default('unbesichtigt'),
    text: beschreibung,
  })
  .strict()
  .superRefine((o, ctx) => {
    /* Eine Aufwandsstufe ist eine Aussage ueber den Innenraum. Wer sie
       vergibt, ohne dass jemand drin war, behauptet etwas. */
    if (o.aufwand !== null && o.pruefstand === 'unbesichtigt') {
      ctx.addIssue({
        code: 'custom',
        message:
          `${o.id}: eine Aufwandsstufe setzt voraus, dass jemand das Haus gesehen hat. ` +
          `Erst pruefstand auf 'eigentuemer' oder 'vermittler' setzen.`,
        path: ['aufwand'],
      });
    }
    if (o.lat === null !== (o.lng === null)) {
      ctx.addIssue({
        code: 'custom',
        message: `${o.id}: lat und lng muessen beide gesetzt oder beide null sein.`,
        path: ['lat'],
      });
    }
    /* Die Regel, die dieses Repository oeffentlich sein laesst: ohne Freigabe
       keine Nummer in der Datei. Damit kann sie gar nicht erst hineingeraten. */
    if (!o.freigabe && (o.telefon || o.telefon2)) {
      ctx.addIssue({
        code: 'custom',
        message:
          `${o.id}: ohne Freigabe darf hier keine Telefonnummer stehen — dieses ` +
          `Repository ist oeffentlich. Die Nummer gehoert nach ` +
          `daten-intern/kontakte.json (wird nicht eingecheckt).`,
        path: ['telefon'],
      });
    }
    if (o.freigabe && !o.telefon) {
      ctx.addIssue({
        code: 'custom',
        message: `${o.id}: freigabe ist true, aber es ist keine Telefonnummer hinterlegt.`,
        path: ['freigabe'],
      });
    }
    if (o.freigabe && o.telefon_unsicher) {
      ctx.addIssue({
        code: 'custom',
        message:
          `${o.id}: eine als unsicher markierte Nummer darf nicht freigegeben werden — ` +
          `erst pruefen, dann telefon_unsicher auf false setzen.`,
        path: ['freigabe'],
      });
    }
  });

export const dateiSchema = z.object({
  $schema: z.string().optional(),
  _hinweis: z.string().optional(),
  objekte: z.array(objektSchema).min(1),
});

export type Objekt = z.infer<typeof objektSchema>;
