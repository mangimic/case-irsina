import { describe, expect, it } from 'vitest';
import vorlage from '../src/data/objekte.schema.json';
import { TYPEN, ANGEBOTE, ZUSTAENDE, EXTRAS } from '../src/data/schema.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';

/**
 * objekte.schema.json dient nur dem Editor. Es darf trotzdem nicht von
 * src/data/schema.ts abweichen — sonst schlaegt der Editor Werte vor, die
 * der Build danach ablehnt.
 */
describe('objekte.schema.json passt zum Zod-Schema', () => {
  const felder = vorlage.definitions.objekt.properties;

  it('kennt dieselben Objekttypen', () => {
    expect(felder.typ.enum).toEqual([...TYPEN]);
  });

  it('kennt dieselben Angebotsarten', () => {
    expect(felder.angebot.enum).toEqual([...ANGEBOTE]);
  });

  it('kennt dieselben Zustaende', () => {
    expect(felder.zustand.enum).toEqual([...ZUSTAENDE]);
  });

  it('kennt dieselbe Ausstattung', () => {
    expect(felder.extras.items.enum).toEqual([...EXTRAS]);
  });

  it('verlangt alle fuenf Sprachen', () => {
    expect(felder.text.required).toEqual([...SPRACHEN]);
  });

  it('laesst keine unbekannten Felder zu', () => {
    expect(vorlage.definitions.objekt.additionalProperties).toBe(false);
  });
});
