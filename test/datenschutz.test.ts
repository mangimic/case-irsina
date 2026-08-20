import { describe, expect, it } from 'vitest';
import { OBJEKTE, oeffentlich } from '../src/data/objekte.ts';
import { objektSchema } from '../src/data/schema.ts';
import roh from '../src/data/objekte.json';

/**
 * Die wichtigste Regel des Projekts: eine Telefonnummer wird nur mit
 * ausdruecklicher Freigabe des Eigentuemers oeffentlich.
 *
 * Seit das Repository oeffentlich ist, greift sie eine Stufe frueher: eine
 * ungefragte Nummer darf gar nicht erst in objekte.json stehen (das prueft
 * test/oeffentlich.test.ts). Hier geht es um die Abbildung auf das, was die
 * Seite ausliefert.
 */
describe('Telefonnummern', () => {
  it('haelt die Kennzeichnung freigabe aus den oeffentlichen Objekten heraus', () => {
    for (const o of OBJEKTE) {
      expect(Object.hasOwn(o, 'freigabe')).toBe(false);
    }
  });

  it('liefert derzeit keine einzige Nummer aus', () => {
    // Stand heute hat niemand zugestimmt. Schlaegt an, sobald sich das aendert
    // — dann ist dieser Test bewusst anzupassen.
    for (const o of OBJEKTE) {
      expect(o.telefon, `${o.id} liefert eine Nummer aus`).toBeNull();
      expect(o.telefon2, `${o.id} liefert eine zweite Nummer aus`).toBeNull();
    }
  });

  it('gibt eine freigegebene Nummer weiter, eine ungefragte nicht', () => {
    // Die Abbildung selbst pruefen, unabhaengig vom aktuellen Datenstand.
    const vorlage = roh.objekte[0]!;
    const freigegeben = objektSchema.parse({
      ...vorlage, telefon: '+393331234567', telefon_unsicher: false, freigabe: true,
    });
    expect(oeffentlich(freigegeben).telefon).toBe('+393331234567');

    const ohneFreigabe = objektSchema.parse({ ...vorlage, telefon: null, freigabe: false });
    expect(oeffentlich(ohneFreigabe).telefon).toBeNull();
  });
});
