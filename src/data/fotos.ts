import type { ImageMetadata } from 'astro';
import type { OeffentlichesObjekt } from './objekte.ts';

/**
 * Aufloesung der Fotodateinamen zu Bildern, die Astro optimieren kann.
 *
 * Bewusst von objekte.ts getrennt: import.meta.glob gibt es nur unter Vite.
 * So bleiben die Daten selbst aus jedem gewoehnlichen Node-Skript nutzbar —
 * etwa aus scripts/prototyp-bauen.mjs.
 */
/* Grundrisse liegen als PNG genauso oft vor wie als JPEG — gezeichnet wird
   selten mit der Kamera. */
const FOTO_MODULE = import.meta.glob<{ default: ImageMetadata }>(
  '../fotos/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
  { eager: true },
);

/** Dateiname aus objekte.json -> von Astro optimierbares Bild. */
const FOTOS = new Map<string, ImageMetadata>(
  Object.entries(FOTO_MODULE).map(([pfad, mod]) => [pfad.split('/').pop()!, mod.default]),
);

export function foto(name: string): ImageMetadata {
  const bild = FOTOS.get(name);
  if (!bild) {
    throw new Error(
      `Foto "${name}" fehlt in src/fotos/. Vorhanden sind: ${[...FOTOS.keys()].join(', ')}`,
    );
  }
  return bild;
}

export function fotos(o: OeffentlichesObjekt): ImageMetadata[] {
  return o.foto.map(foto);
}

/** Grundriss des Objekts, sofern einer hinterlegt ist. */
export function grundriss(o: OeffentlichesObjekt): ImageMetadata | null {
  return o.grundriss === null ? null : foto(o.grundriss);
}
