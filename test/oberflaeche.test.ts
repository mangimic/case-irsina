import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEXTE } from '../src/i18n/texte.ts';
import { SPRACHEN } from '../src/i18n/sprachen.ts';

const WURZEL = join(import.meta.dirname, '..');
const lies = (p: string) => readFileSync(join(WURZEL, p), 'utf-8');

describe('Kontaktformular auf der Seite', () => {
  const formular = lies('src/components/Anfrageformular.astro');

  it('schickt an den Worker, nicht an einen fremden Dienst', () => {
    expect(formular).toMatch(/action="\/api\/anfrage"/);
    expect(formular, 'kein Formulardienst von aussen').not.toMatch(/formspree|web3forms|getform/i);
  });

  it('funktioniert auch ohne JavaScript', () => {
    /* method und action stehen im HTML; das Skript faengt das Abschicken nur
       ab, wenn es laeuft. */
    expect(formular).toMatch(/method="post"/);
    expect(formular).toMatch(/e\.preventDefault\(\)/);
  });

  it('hat die beiden stillen Kontrollen gegen Maschinen', () => {
    expect(formular, 'unsichtbares Feld').toMatch(/name="firma"/);
    expect(formular, 'Verweildauer').toMatch(/data-alter/);
  });

  it('nennt vor dem Absenden, was mit den Angaben geschieht', () => {
    expect(formular).toMatch(/fmDatenschutz/);
    expect(formular, 'verweist auf die Datenschutzseite').toMatch(/datenschutzPfad|datenschutz\b/);
  });

  it('steht auf den Objektseiten und auf der Startseite', () => {
    expect(lies('src/pages/[lang]/[segment]/[id].astro')).toMatch(/<Anfrageformular/);
    expect(lies('src/pages/[lang]/index.astro')).toMatch(/<Anfrageformular/);
  });

  it('darf laut Sicherheitsregeln an die eigene Herkunft abschicken', () => {
    /* Stand hier noch form-action 'none', ginge der Weg ohne JavaScript nicht. */
    expect(lies('public/_headers')).toMatch(/form-action 'self'/);
  });

  it('ist in der Datenschutzerklaerung beschrieben — in allen fuenf Sprachen', () => {
    const recht = lies('src/i18n/rechtliches.ts');
    for (const wort of ['Kontaktformular', 'Contact form', 'Modulo di contatto',
                        'Contactformulier', 'Formulaire de contact']) {
      expect(recht, wort).toContain(wort);
    }
    expect(recht, 'nennt, wo die Nachrichten liegen').toMatch(/D1/);
  });

  it('behauptet nicht mehr, es werde nichts gespeichert', () => {
    const recht = lies('src/i18n/rechtliches.ts');
    expect(recht, 'die Seite laeuft auf Workers, nicht auf Pages').not.toMatch(/Cloudflare Pages/);
  });
});

describe('Teilen', () => {
  const teilen = lies('src/components/Teilen.astro');

  it('bietet Instagram und TikTok an', () => {
    expect(teilen).toMatch(/instagram\.com/);
    expect(teilen).toMatch(/tiktok\.com/);
  });

  it('erfindet fuer beide keinen Teilen-Link', () => {
    /* Weder Instagram noch TikTok haben eine Adresse, die einen Link
       entgegennimmt. Etwas in der Art waere eine Attrappe, die nichts tut. */
    expect(teilen).not.toMatch(/instagram\.com\/(share|sharer|intent)/);
    expect(teilen).not.toMatch(/tiktok\.com\/(share|sharer|intent)/);
  });

  it('kopiert den Link und sagt, dass er eingefuegt werden muss', () => {
    expect(teilen).toMatch(/clipboard\.writeText/);
    expect(teilen).toMatch(/shEinfuegen/);
  });

  it('erklaert das in allen fuenf Sprachen und nennt die App beim Namen', () => {
    for (const lang of SPRACHEN) {
      const text = (TEXTE[lang] as Record<string, string>).shEinfuegen;
      expect(text, lang).toBeTruthy();
      expect(text, `${lang} nennt die App`).toContain('{app}');
    }
  });

  it('stellt den systemweiten Dialog voran — er fuehrt in jede App', () => {
    expect(lies('src/styles/global.css')).toMatch(/\.sh\.teilen-nativ \{[^}]*order: -1/);
    expect(teilen).toMatch(/navigator\.share/);
  });

  it('behaelt die bisherigen Ziele', () => {
    for (const ziel of ['wa.me', 'facebook.com/sharer', 't.me/share', 'twitter.com/intent', 'mailto:']) {
      expect(teilen, ziel).toContain(ziel);
    }
  });
});

describe('Interne Seiten', () => {
  it('bleiben aus Suchmaschinen heraus, auch wenn der Rest hinein darf', () => {
    const robots = lies('src/pages/robots.txt.ts');
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Disallow: \/edit/);
    expect(robots).toMatch(/Disallow: \/api\//);
  });

  it('tragen noindex im Kopf', () => {
    expect(lies('src/layouts/Intern.astro')).toMatch(/noindex, nofollow/);
  });

  it('stehen nicht in der Sitemap', () => {
    const sitemap = lies('src/pages/sitemap.xml.ts');
    expect(sitemap).not.toMatch(/'admin'|'edit'/);
  });

  it('teilen sich das Formular-Aussehen mit dem Prototyp', () => {
    /* Sonst haette der Editor auf der Seite kein Aussehen — die Regeln lagen
       vorher nur im Prototyp. */
    expect(existsSync(join(WURZEL, 'src/styles/editor.css'))).toBe(true);
    expect(lies('src/layouts/Intern.astro')).toMatch(/styles\/editor\.css/);
    expect(lies('scripts/prototyp-bauen.mjs')).toMatch(/styles\/editor\.css/);
  });
});
