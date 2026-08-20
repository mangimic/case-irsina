import { describe, expect, it } from 'vitest';
import { objektSchema, dateiSchema } from '../src/data/schema.ts';
import roh from '../src/data/objekte.json';

const gueltig = {
  id: 'IR-042',
  foto: ['IR-042.jpg'],
  strasse: 'Via Roma',
  civico: '12',
  typ: 'casa',
  angebot: 'vendita',
  zustand: 'abitabile',
  preis: 28000,
  mq: 90,
  vani: 4,
  extras: ['garage'],
  /* Ohne Freigabe darf hier keine Nummer stehen — das ist die Regel, die
     dieses Repository oeffentlich sein laesst. */
  telefon: null,
  telefon2: null,
  telefon_unsicher: false,
  freigabe: false,
  lat: 40.7503,
  lng: 16.2381,
  gesehen: '2026-09',
  adresse_unklar: false,
  text: { it: 'a', en: 'b', de: 'c', nl: 'd', fr: 'e' },
};

describe('objektSchema', () => {
  it('nimmt einen vollstaendigen Eintrag an', () => {
    expect(objektSchema.safeParse(gueltig).success).toBe(true);
  });

  it('weist eine Kennung ohne IR-Praefix zurueck', () => {
    expect(objektSchema.safeParse({ ...gueltig, id: '42' }).success).toBe(false);
  });

  it('weist eine Telefonnummer ohne Laendervorwahl zurueck', () => {
    const freigegeben = { ...gueltig, freigabe: true, telefon_unsicher: false };
    expect(objektSchema.safeParse({ ...freigegeben, telefon: '3331234567' }).success).toBe(false);
  });

  it('weist eine Nummer ohne erteilte Freigabe zurueck', () => {
    // Das Repository ist oeffentlich: eine ungefragte Nummer darf gar nicht
    // erst in der Datei stehen, nicht nur nicht ausgeliefert werden.
    const ergebnis = objektSchema.safeParse({ ...gueltig, telefon: '+393331234567' });
    expect(ergebnis.success).toBe(false);
    if (!ergebnis.success) {
      expect(ergebnis.error.issues[0]!.message).toMatch(/ohne Freigabe/);
    }
  });

  it('weist unbekannte Felder zurueck, damit Tippfehler auffallen', () => {
    expect(objektSchema.safeParse({ ...gueltig, strase: 'Via Roma' }).success).toBe(false);
  });

  it('weist einen unbekannten Objekttyp zurueck', () => {
    expect(objektSchema.safeParse({ ...gueltig, typ: 'villa' }).success).toBe(false);
  });

  it('verlangt lat und lng gemeinsam', () => {
    expect(objektSchema.safeParse({ ...gueltig, lng: null }).success).toBe(false);
    expect(objektSchema.safeParse({ ...gueltig, lat: null, lng: null }).success).toBe(true);
  });

  it('verweigert eine Freigabe ohne hinterlegte Nummer', () => {
    expect(objektSchema.safeParse({ ...gueltig, telefon: null, freigabe: true }).success).toBe(false);
  });

  it('verweigert die Freigabe einer als unsicher markierten Nummer', () => {
    const ergebnis = objektSchema.safeParse({
      ...gueltig, telefon: '+393331234567', telefon_unsicher: true, freigabe: true,
    });
    expect(ergebnis.success).toBe(false);
  });

  it('nimmt eine gepruefte, freigegebene Nummer an', () => {
    expect(
      objektSchema.safeParse({
        ...gueltig, telefon: '+393331234567', telefon_unsicher: false, freigabe: true,
      }).success,
    ).toBe(true);
  });

  it('weist einen unmoeglichen Erfassungsmonat zurueck', () => {
    expect(objektSchema.safeParse({ ...gueltig, gesehen: '2026-13' }).success).toBe(false);
  });
});

describe('die echten Daten', () => {
  it('erfuellen das Schema', () => {
    const ergebnis = dateiSchema.safeParse(roh);
    if (!ergebnis.success) {
      throw new Error(
        ergebnis.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
      );
    }
    expect(ergebnis.success).toBe(true);
  });
});
