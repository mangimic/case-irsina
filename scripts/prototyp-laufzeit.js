/* Laufzeit der Prototyp-Einzeldatei.
   Alle Texte sind beim Bauen fertig berechnet worden — hier wird nur noch
   ausgewaehlt, gefiltert und dargestellt. */
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('irsina-daten').textContent);
  var LANG = 'it';
  var chip = 'alle';

  document.documentElement.classList.add('js');
  D.karte.urspruenglich = D.karte.punkte.slice();

  function t(k, werte) {
    var s = D.texte[LANG][k] || '';
    if (werte) for (var n in werte) s = s.split('{' + n + '}').join(String(werte[n]));
    return s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(s) { return document.querySelector(s); }
  function objekte() { return D.ansicht[LANG]; }
  function objekt(id) {
    var liste = objekte();
    for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
    return null;
  }

  /* ---- Ansicht aus Rohdaten bilden ------------------------------------
     Gegenstueck zu src/data/anzeige.ts. Die Zuordnung Wert -> Beschriftung
     liefert der Generator aus genau jenen Helfern mit (D.beschriftung), hier
     bleibt das Nachschlagen und die Formatierung von Zahlen und Monaten. */
  function preisFormat(wert, lang) {
    if (wert == null) return D.texte[lang].nd;
    try {
      return new Intl.NumberFormat(D.beschriftung[lang].gebiet, {
        style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
      }).format(wert);
    } catch (e) { return '€ ' + wert; }
  }

  function monatFormat(gesehen, lang) {
    var teile = String(gesehen).split('-');
    try {
      return new Intl.DateTimeFormat(D.beschriftung[lang].gebiet, {
        month: 'long', year: 'numeric', timeZone: 'UTC',
      }).format(new Date(Date.UTC(Number(teile[0]), Number(teile[1]) - 1, 1)));
    } catch (e) { return gesehen; }
  }

  function ansichtBauen(o, lang) {
    var b = D.beschriftung[lang];
    var tx = D.texte[lang];
    var beschreibung = (o.text[lang] || '').trim() || o.text.it;
    var anschrift = o.civico ? o.strasse + ', ' + (lang === 'it' ? 'n. ' : '') + o.civico : o.strasse;
    var kennzeichen = [];
    if (o.preis != null) kennzeichen.push({ text: preisFormat(o.preis, lang), preis: true });
    if (o.mq != null) kennzeichen.push({ text: o.mq + ' m²', preis: false });
    if (o.vani != null) kennzeichen.push({ text: o.vani + ' ' + tx.dRooms, preis: false });
    o.extras.forEach(function (e) { kennzeichen.push({ text: b.extras[e] || e, preis: false }); });

    return {
      id: o.id, foto: o.foto, typ: o.typ, zustand: o.zustand, angebot: o.angebot,
      aufwand: o.aufwand == null ? null : o.aufwand,
      preis: o.preis, strasse: o.strasse, civico: o.civico,
      adresseUnklar: o.adresse_unklar, pruefstand: o.pruefstand,
      telefon: o.telefon, telefonUnsicher: o.telefon_unsicher,
      anschrift: anschrift, text: beschreibung,
      typText: b.typ[o.typ], zustandText: b.zustand[o.zustand],
      aufwandText: o.aufwand == null ? tx.aufNd : b.aufwand[o.aufwand],
      angebotText: b.angebot[o.angebot], pruefstandText: b.pruefstand[o.pruefstand],
      preisText: preisFormat(o.preis, lang),
      flaecheText: o.mq == null ? null : o.mq + ' m²',
      raeumeText: o.vani == null ? null : String(o.vani),
      gesehenText: monatFormat(o.gesehen, lang),
      extras: o.extras.map(function (e) { return b.extras[e] || e; }),
      kennzeichen: kennzeichen,
      suche: (o.id + ' ' + o.strasse + ' ' + (o.civico || '') + ' ' + beschreibung).toLowerCase(),
    };
  }

  /** Ersetzt den gesamten Bestand — vom Editor benutzt. */
  function datenSetzen(rohObjekte) {
    D.sprachen.forEach(function (l) {
      D.ansicht[l] = rohObjekte.map(function (o) { return ansichtBauen(o, l); });
    });
    D.anzahl = rohObjekte.length;
    /* Echte Koordinaten haben Vorrang; wo noch keine erhoben sind, bleibt der
       Beispielpunkt stehen. So verschwindet die Karte nicht, sobald das erste
       Objekt eine richtige Position bekommt — und die Legende unterscheidet
       weiterhin beides. */
    var beispiele = {};
    (D.karte.urspruenglich || []).forEach(function (p) { beispiele[p.id] = p; });
    D.karte.punkte = rohObjekte.map(function (o) {
      if (o.lat != null && o.lng != null) {
        return { id: o.id, lat: o.lat, lng: o.lng, erfunden: false };
      }
      var b = beispiele[o.id];
      return b ? { id: o.id, lat: b.lat, lng: b.lng, erfunden: true } : null;
    }).filter(Boolean);
    D.karte.anzahlErfunden = D.karte.punkte.filter(function (p) { return p.erfunden; }).length;
    zeichnen();
    /* Wurde aus der Detailansicht heraus bearbeitet, steht dort noch der alte
       Stand — zeichnen() erneuert nur die Liste. Ist das Objekt inzwischen
       geloescht, geht die Ansicht zu, statt leer stehen zu bleiben. */
    if ($('#ov').classList.contains('on') && aktuellesObjekt) {
      if (objekt(aktuellesObjekt)) detailOeffnen(aktuellesObjekt, true);
      else detailSchliessen();
    }
  }

  /* ---- Sprache ------------------------------------------------------- */
  function sprachAuswahl() {
    try {
      var bevorzugt = navigator.languages || [navigator.language || 'it'];
      for (var i = 0; i < bevorzugt.length; i++) {
        var k = String(bevorzugt[i]).slice(0, 2).toLowerCase();
        if (D.sprachen.indexOf(k) !== -1) return k;
      }
    } catch (e) { /* egal */ }
    return 'it';
  }

  function spracheSetzen(l) {
    LANG = l;
    document.documentElement.lang = D.hreflang[l] || l;
    zeichnen();
    var offen = $('#ov').classList.contains('on');
    if (offen && aktuellesObjekt) detailOeffnen(aktuellesObjekt, true);
  }

  /* ---- Kopf und Fuss -------------------------------------------------- */
  function kopfZeichnen() {
    $('#skip').textContent = t('skip');
    $('#brandsub').textContent = t('brandsub');
    $('#burger').setAttribute('aria-label', t('menu'));

    $('#hauptmenue').setAttribute('aria-label', t('menu'));
    $('#hauptmenue').innerHTML =
      '<a href="#perche">' + esc(t('navwhy')) + '</a>' +
      '<a href="#immobili">' + esc(t('navlist')) + '</a>' +
      '<a href="#mappa">' + esc(t('navmap')) + '</a>' +
      '<a href="#proprietari">' + esc(t('navowner')) + '</a>';

    $('#langs').setAttribute('aria-label', t('langLabel'));
    $('#langs').innerHTML = D.sprachen.map(function (l) {
      return '<a href="#" data-lang="' + l + '" title="' + esc(D.namen[l]) + '"' +
        (l === LANG ? ' aria-current="true"' : '') + '>' + esc(D.kuerzel[l]) + '</a>';
    }).join('');

    $('#probe-text').innerHTML = esc(t('probeHinweis')) +
      ' <a href="mailto:' + esc(D.mail) + '">' + esc(D.mail) + '</a>.';
    $('#probe-zu').textContent = t('aClose');
    var stift = document.getElementById('probe-ed');
    if (stift) stift.textContent = '✎ ' + t('edBtn');
  }

  /* ---- Kachel --------------------------------------------------------- */
  function kachel(o, eifrig) {
    var adressZeile = '';
    if (o.civico || o.adresseUnklar) {
      adressZeile = '<p class="addr">' + (o.civico ? esc(o.anschrift) : '') +
        (o.adresseUnklar ? '<span class="tbd"' + (o.civico ? '' : ' style="margin-left:0"') + '>' +
          esc(t('addrTbd')) + '</span>' : '') + '</p>';
    }
    return '<li class="objekt" data-id="' + o.id + '" data-typ="' + o.typ +
      '" data-zustand="' + o.zustand + '" data-aufwand="' + (o.aufwand || '') +
      '" data-angebot="' + o.angebot +
      '" data-preis="' + (o.preis == null ? '' : o.preis) +
      '" data-strasse="' + esc(o.strasse) + '" data-suche="' + esc(o.suche) + '">' +
      '<a class="card" href="#' + o.id + '">' +
        '<div class="ph"><img src="' + D.fotos[o.foto[0]] + '" alt="' +
          esc(t('photoOf', { ref: o.id, via: o.strasse })) + '" loading="' +
          (eifrig ? 'eager' : 'lazy') + '" decoding="async">' +
          '<span class="ref">' + o.id + '</span>' +
          '<span class="badge b-' + o.zustand + '">' + esc(o.zustandText) + '</span>' +
          (o.aufwand ? '<span class="aufwand a-' + o.aufwand + '" title="' +
            esc(o.aufwandText) + '">' + esc(o.aufwand) + '</span>' : '') +
          '<span class="pruef ' + (o.pruefstand === 'unbesichtigt' ? 'offen' : 'bestaetigt') + '">' +
            (o.pruefstand === 'unbesichtigt' ? '?' : '✓') + ' ' + esc(o.pruefstandText) + '</span>' +
        '</div>' +
        '<div class="body">' +
          '<h3>' + esc(o.strasse) + '</h3>' + adressZeile +
          '<p class="txt">' + esc(o.text) + '</p>' +
          '<ul class="metas"><li class="meta">' + esc(o.typText) + '</li>' +
          o.kennzeichen.map(function (k) {
            return '<li class="meta' + (k.preis ? ' pr' : '') + '">' + esc(k.text) + '</li>';
          }).join('') + '</ul>' +
        '</div>' +
      '</a>' +
      '<button type="button" class="ed-kachel-knopf" data-id="' + o.id + '">' +
        esc(t('edKachel')) + '</button>' +
      '</li>';
  }

  /* ---- Seite ---------------------------------------------------------- */
  function zeichnen() {
    kopfZeichnen();

    var liste = objekte();
    var gruende = [
      ['🏛', t('w1h'), t('w1p')], ['🚗', t('w2h'), t('w2p')],
      ['💶', t('w3h'), t('w3p')], ['🌍', t('w4h'), t('w4p')],
    ];
    var fakten = [
      [String(D.anzahl), t('f1')],
      [D.fakten.minutenMatera + ' min', t('f2')],
      [D.fakten.minutenBari + ' min', t('f3')],
      [D.fakten.einwohner, t('f4')],
    ];
    var typen = [['casa', 'tCasa'], ['palazzo', 'tPalazzo'], ['appartamento', 'tApp'],
                 ['rudere', 'tRudere'], ['locale', 'tLocale']];
    var zustaende = [['abitabile', 'cAbit'], ['da-ristrutturare', 'cRistr'],
                     ['ristrutturato', 'cRis'], ['sconosciuto', 'cUnk']];
    var aufwaende = [['S', 'aufS'], ['M', 'aufM'], ['L', 'aufL'], ['XL', 'aufXL']];
    var chips = [['alle', t('qall')], ['preis', t('qprice')],
                 ['vendita', t('aVend')], ['affitto', t('aAff')]];

    $('#inhalt').innerHTML =
      '<div class="hero" id="top">' +
        '<div class="bg" aria-hidden="true"><img src="' + D.fotos[liste[0].foto[0]] + '" alt=""></div>' +
        '<div class="wrap">' +
          '<p class="eyebrow">' + esc(t('eyebrow')) + '</p>' +
          '<h1>' + esc(t('h1')) + '</h1>' +
          '<p class="lede">' + esc(t('lede')) + '</p>' +
          '<div class="cta">' +
            '<a class="btn btn-p" href="#immobili">' + esc(t('cta1')) + '</a>' +
            '<a class="btn btn-g" href="#proprietari">' + esc(t('cta2')) + '</a>' +
          '</div>' +
        '</div>' +
        '<div class="facts"><div class="wrap">' +
          fakten.map(function (f) {
            return '<div class="fact"><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>';
          }).join('') +
        '</div></div>' +
      '</div>' +

      '<section id="perche" class="tinted"><div class="wrap">' +
        '<div class="sec-head"><p class="eyebrow">' + esc(t('whyeye')) + '</p><h2>' +
          esc(t('whyh')) + '</h2><p>' + esc(t('whyp')) + '</p></div>' +
        '<div class="why-grid">' + gruende.map(function (g) {
          return '<article class="why-card"><div class="ico" aria-hidden="true">' + g[0] +
            '</div><h3>' + esc(g[1]) + '</h3><p>' + esc(g[2]) + '</p></article>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section id="immobili"><div class="wrap">' +
        '<div class="sec-head"><p class="eyebrow">' + esc(t('listeye')) + '</p><h2>' +
          esc(t('listh')) + '</h2><p>' + esc(t('listp')) + '</p></div>' +
        '<p class="pruefhinweis offen sammel">' + esc(t('pvListe')) + '</p>' +
        '<form class="filters js-only" id="filter" role="search" aria-label="' + esc(t('filterH')) + '">' +
          '<div class="field search"><label for="f-suche">' + esc(t('phsearch')) + '</label>' +
            '<input type="search" id="f-suche" name="suche" placeholder="' + esc(t('phsearch')) + '" autocomplete="off"></div>' +
          '<div class="field sel"><label for="f-typ">' + esc(t('dType')) + '</label><select id="f-typ" name="typ">' +
            '<option value="">' + esc(t('tAll')) + '</option>' +
            typen.map(function (x) { return '<option value="' + x[0] + '">' + esc(t(x[1])) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field sel"><label for="f-zustand">' + esc(t('dCond')) + '</label><select id="f-zustand" name="zustand">' +
            '<option value="">' + esc(t('cAll')) + '</option>' +
            zustaende.map(function (x) { return '<option value="' + x[0] + '">' + esc(t(x[1])) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field sel"><label for="f-aufwand">' + esc(t('aufH')) + '</label><select id="f-aufwand" name="aufwand">' +
            '<option value="">' + esc(t('aufAll')) + '</option>' +
            aufwaende.map(function (x) { return '<option value="' + x[0] + '">' + esc(t(x[1])) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field sel"><label for="f-sortierung">' + esc(t('sRef')) + '</label><select id="f-sortierung" name="sortierung">' +
            '<option value="ref">' + esc(t('sRef')) + '</option>' +
            '<option value="preis">' + esc(t('sPrice')) + '</option>' +
            '<option value="strasse">' + esc(t('sStreet')) + '</option>' +
          '</select></div>' +
        '</form>' +
        '<div class="chip-row js-only">' +
          chips.map(function (c) {
            return '<button class="chip" type="button" data-chip="' + c[0] + '" aria-pressed="' +
              (c[0] === chip ? 'true' : 'false') + '">' + esc(c[1]) + '</button>';
          }).join('') +
          '<button class="chip" type="button" id="filter-reset">' + esc(t('filterReset')) + '</button>' +
          '<output class="count" id="anzahl"></output>' +
        '</div>' +
        '<ul class="grid" id="objektliste">' +
          liste.map(function (o, i) { return kachel(o, i < 3); }).join('') +
        '</ul>' +
        '<p class="empty" id="keine-treffer" hidden>' + esc(t('noresult')) + '</p>' +
      '</div></section>' +

      '<section id="mappa" class="tinted"><div class="wrap">' +
        '<div class="sec-head"><p class="eyebrow">' + esc(t('mapeye')) + '</p><h2>' +
          esc(t('maph')) + '</h2><p>' + esc(t('mapp')) + '</p></div>' +
        (D.karte.anzahlErfunden
          ? '<div class="pruefhinweis offen sammel"><h2>' + esc(t('mapBeispielH')) + '</h2><p>' +
            esc(t('mapBeispiel')) + '</p></div>'
          : '') +
        '<div class="karte-rahmen"><div id="karte" role="application" aria-label="' +
          esc(t('maph')) + '"></div></div>' +
        /* Die Markierungen liegen von Anfang an richtig — nur der Hintergrund
           von openstreetmap.org wird erst auf Klick geholt. Bis dahin verlaesst
           keine Anfrage den Browser; genau das sagt auch die Datenschutzseite
           zu. */
        '<div class="karte-tor" id="karte-tor"' + (kachelnErlaubt() ? ' hidden' : '') + '>' +
          '<p>' + esc(t('mapConsentP')) + '</p>' +
          '<p class="tor-knoepfe">' +
            '<button type="button" class="btn btn-o" id="karte-laden">' +
              esc(t('mapConsentBtn')) + '</button>' +
            '<label><input type="checkbox" id="karte-merken"> ' +
              esc(t('mapConsentKeep')) + '</label>' +
          '</p>' +
        '</div>' +
        '<p class="karte-legende">' +
          '<span><i class="echt"></i>' + esc(t('mapEcht')) + '</span>' +
          '<span><i class="erfunden"></i>' + esc(t('mapErfunden')) + '</span>' +
          '<span id="karte-hinweis"></span>' +
        '</p>' +
      '</div></section>' +

      '<section id="proprietari"><div class="wrap owner-grid">' +
        '<div><p class="eyebrow">' + esc(t('owneye')) + '</p><h2>' + esc(t('ownh')) + '</h2>' +
          '<p style="color:var(--ink-2)">' + esc(t('ownp')) + '</p>' +
          '<p><a class="btn btn-p" href="mailto:' + esc(D.mail) + '?subject=' +
            encodeURIComponent(t('shSubject')) + '">' + esc(t('ownbtn')) + '</a></p></div>' +
        '<ol class="steps"><li>' + esc(t('s1')) + '</li><li>' + esc(t('s2')) +
          '</li><li>' + esc(t('s3')) + '</li></ol>' +
      '</div></section>' +

      '<footer class="site"><div class="wrap">' +
        '<div class="foot-grid">' +
          '<div><h2>' + esc(t('ftitle')) + '</h2>' +
            '<p style="max-width:34em;color:#c9bcaa;margin:0">' + esc(t('ftext')) + '</p></div>' +
          '<div>' + teilenLeiste(null, true) + '</div>' +
        '</div>' +
        '<p class="disclaimer">' + esc(t('fdisc')) + '</p>' +
      '</div></footer>';

    filterVerdrahten();
    anwenden();
    karteZeichnen();
  }

  /* ---- Karte ---------------------------------------------------------- */
  var karte = null;
  var kachelSchicht = null;
  var KARTE_SCHLUESSEL = 'irsina-karte-erlaubt';

  /** Merkt sich die Zustimmung nur, wenn ausdruecklich darum gebeten wurde. */
  function kachelnErlaubt() {
    try { return localStorage.getItem(KARTE_SCHLUESSEL) === 'ja'; } catch (e) { return false; }
  }

  function kachelnLaden() {
    var behaelter = document.getElementById('karte');
    var tor = document.getElementById('karte-tor');
    if (tor) tor.hidden = true;
    if (!karte || kachelSchicht) return;

    var geladen = 0;
    kachelSchicht = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    kachelSchicht.on('tileload', function () {
      geladen++;
      if (behaelter) behaelter.classList.remove('ohne-kacheln');
    });
    kachelSchicht.addTo(karte);

    /* Kommt kein einziges Kachelbild an — kein Netz, oder eine Umgebung, die
       fremde Server sperrt —, bleibt der ruhige Untergrund stehen. Die
       Markierungen liegen dann immer noch richtig zueinander. */
    window.setTimeout(function () {
      if (geladen === 0) {
        if (behaelter) behaelter.classList.add('ohne-kacheln');
        if (kachelSchicht) { karte.removeLayer(kachelSchicht); kachelSchicht = null; }
        var hinweis = document.getElementById('karte-hinweis');
        if (hinweis) hinweis.textContent = t('mapOhneKacheln');
      }
    }, 2500);
  }

  function karteZeichnen() {
    var behaelter = document.getElementById('karte');
    if (!behaelter || typeof L === 'undefined' || !D.karte.punkte.length) return;

    /* Beim Sprachwechsel wird der Inhalt neu aufgebaut — die alte Karte haengt
       dann an einem Element, das es nicht mehr gibt. */
    if (karte) { karte.remove(); karte = null; }

    kachelSchicht = null;
    karte = L.map(behaelter, { scrollWheelZoom: false, attributionControl: true })
      .setView([D.karte.zentrum.lat, D.karte.zentrum.lng], D.karte.zentrum.zoom);

    /* Ohne Hintergrund, aber mit Massstab: die Markierungen sind schon jetzt
       zueinander richtig zu lesen. */
    behaelter.classList.add('ohne-kacheln');
    L.control.scale({ imperial: false }).addTo(karte);

    var punkte = [];
    D.karte.punkte.forEach(function (p) {
      var o = objekt(p.id);
      if (!o) return;
      var symbol = L.divIcon({
        className: '',
        html: p.erfunden
          ? '<span style="display:grid;place-items:center;width:32px;height:32px;border-radius:50%;' +
            'background:rgba(250,246,240,.9);color:#6d551b;font:700 10px/1 ui-sans-serif,system-ui,sans-serif;' +
            'border:2px dashed #8a7a68">' + p.id.replace('IR-', '') + '</span>'
          : '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50%;' +
            'background:#a8462c;color:#fff;font:700 10px/1 ui-sans-serif,system-ui,sans-serif;' +
            'border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)">' + p.id.replace('IR-', '') + '</span>',
        iconSize: p.erfunden ? [32, 32] : [34, 34],
        iconAnchor: p.erfunden ? [16, 16] : [17, 17],
      });
      L.marker([p.lat, p.lng], { icon: symbol, title: o.strasse })
        .addTo(karte)
        .bindPopup(
          '<b>' + esc(o.strasse) + '</b>' + esc(o.id) + ' · ' + esc(o.zustandText) +
          (p.erfunden ? '<br><em>' + esc(t('mapErfunden')) + '</em>' : '') +
          '<br><a href="#' + o.id + '" data-karte-detail="' + o.id + '">' +
          esc(t('openDetail')) + ' &rarr;</a>',
        );
      punkte.push([p.lat, p.lng]);
    });

    if (punkte.length > 1) karte.fitBounds(punkte, { padding: [46, 46] });
    if (kachelnErlaubt()) kachelnLaden();
  }

  /* ---- Teilen --------------------------------------------------------- */
  function seitenUrl(id) {
    var u = location.href.split('#')[0];
    return id ? u + '#' + id : u;
  }

  function teilenLeiste(id, hell) {
    var o = id ? objekt(id) : null;
    var url = seitenUrl(id);
    var text = o ? o.strasse + ' · ' + o.id + ' — ' + t('ftitle') : t('ftitle');
    var voll = text + '\n' + url;
    var stil = hell ? ' style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:#f2e9dc"' : '';
    var ziele = [
      ['wa', t('shWa'), 'https://wa.me/?text=' + encodeURIComponent(voll)],
      ['fb', t('shFb'), 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)],
      ['tg', t('shTg'), 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text)],
      ['xx', t('shX'), 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text)],
      ['ml', t('shMail'), 'mailto:?subject=' + encodeURIComponent(t('shSubject')) + '&body=' + encodeURIComponent(voll)],
    ];
    return '<div class="share"' + (hell ? ' style="border-top-color:rgba(255,255,255,.16)"' : '') + '>' +
      '<h2' + (hell ? ' style="color:#b6a794"' : '') + '>' + esc(t(id ? 'shareTitle' : 'shareAllT')) + '</h2>' +
      '<ul class="sh-row">' +
        ziele.map(function (z) {
          return '<li><a class="sh ' + z[0] + '" href="' + esc(z[2]) +
            '" target="_blank" rel="noopener noreferrer"' + stil + '>' + esc(z[1]) + '</a></li>';
        }).join('') +
        '<li><button class="sh kopieren" type="button" data-url="' + esc(url) + '"' + stil + '>' +
          esc(t('shCopy')) + '</button></li>' +
        (typeof navigator.share === 'function'
          ? '<li><button class="sh nativ" type="button" data-url="' + esc(url) + '" data-titel="' +
              esc(text) + '"' + stil + '>' + esc(t('shNative')) + '</button></li>'
          : '') +
      '</ul></div>';
  }

  function melden(text) {
    var el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    window.setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* ---- Detailansicht -------------------------------------------------- */
  var aktuellesObjekt = null;

  function detailOeffnen(id, behalten) {
    var o = objekt(id);
    if (!o) return;
    aktuellesObjekt = id;

    var angaben = [[t('dRef'), o.id], [t('dType'), o.typText], [t('dCond'), o.zustandText],
                   [t('aufH'), o.aufwandText],
                   [t('dPrice'), o.preisText]];
    if (o.flaecheText) angaben.push([t('dSize'), o.flaecheText]);
    if (o.raeumeText) angaben.push([t('dRooms'), o.raeumeText]);
    angaben.push([t('dSeen'), o.gesehenText]);

    var kontakt = o.telefon
      ? (o.telefonUnsicher ? '<p class="note">' + esc(t('warnPhone')) + '</p>' : '') +
        '<div class="acts"><a class="btn btn-p" href="tel:' + esc(o.telefon) + '">' + esc(t('aCall')) + '</a>' +
        '<a class="btn btn-o" href="https://wa.me/' + esc(o.telefon.replace(/\D/g, '')) +
        '" target="_blank" rel="noopener noreferrer">' + esc(t('aWa')) + '</a></div>'
      : '<p class="note">' + esc(t('phoneHidden')) + '</p>';

    var anfrage = 'mailto:' + D.mail + '?subject=' +
      encodeURIComponent(t('shSubject') + ' — ' + o.id + ' (' + o.strasse + ')') +
      '&body=' + encodeURIComponent(o.id + ' · ' + o.anschrift + '\n' + seitenUrl(o.id) + '\n\n');

    var karte = 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(o.strasse + ', Irsina, Matera, Italia');

    var galerie = o.foto.length > 1
      ? '<ul class="thumbs" style="padding:0 clamp(20px,4vw,34px)">' + o.foto.map(function (f, i) {
          return '<li><a href="#" data-thumb="' + i + '" aria-current="' + (i === 0 ? 'true' : 'false') +
            '"><img src="' + D.fotos[f] + '" alt="' + esc(o.id + ' — ' + (i + 1) + '/' + o.foto.length) + '"></a></li>';
        }).join('') + '</ul>'
      : '';

    $('#modal').innerHTML =
      '<div class="top">' +
        '<img src="' + D.fotos[o.foto[0]] + '" id="buehne" alt="' +
          esc(t('photoOf', { ref: o.id, via: o.strasse })) + '">' +
        '<button class="x" type="button" id="zu" aria-label="' + esc(t('aClose')) + '">✕</button>' +
        /* Wer einen geteilten Link direkt oeffnet, landet hier — und kaeme
           ohne diesen Umschalter nicht aus der Ausgangssprache heraus. */
        '<nav class="langs modal-langs" aria-label="' + esc(t('langLabel')) + '">' +
          D.sprachen.map(function (l) {
            return '<a href="#" data-lang="' + l + '" title="' + esc(D.namen[l]) + '"' +
              (l === LANG ? ' aria-current="true"' : '') + '>' + esc(D.kuerzel[l]) + '</a>';
          }).join('') +
        '</nav>' +
      '</div>' + galerie +
      '<div class="in">' +
        /* Derselbe Knopf wie auf der Kachel, damit der Editor ihn ohne
           Sonderfall aufsammelt. Vor Ort wird meist erst das Haus geoeffnet
           und dann berichtigt — nicht umgekehrt. */
        '<button type="button" class="ed-kachel-knopf ed-detail-knopf" data-id="' + o.id + '">' +
          esc(t('edDetail')) + '</button>' +
        '<p class="eyebrow">' + esc(o.angebotText) + ' · ' + o.id + '</p>' +
        '<h2 id="modal-titel">' + esc(o.strasse) + '</h2>' +
        (o.civico || o.adresseUnklar
          ? '<p class="addr">' + (o.civico ? esc(o.anschrift) : '') +
            (o.adresseUnklar ? '<span class="tbd"' + (o.civico ? '' : ' style="margin-left:0"') + '>' +
              esc(t('addrTbd')) + '</span>' : '') + '</p>'
          : '') +
        '<p>' + esc(o.text) + '</p>' +
        '<dl class="dl">' + angaben.map(function (a) {
          return '<div><dt>' + esc(a[0]) + '</dt><dd>' + esc(a[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        (o.extras.length
          ? '<dl class="dl"><div style="grid-column:1/-1"><dt>' + esc(t('dExtras')) +
            '</dt><dd>' + esc(o.extras.join(' · ')) + '</dd></div></dl>'
          : '') +
        '<aside class="pruefhinweis ' + (o.pruefstand === 'unbesichtigt' ? 'offen' : 'bestaetigt') + '">' +
          '<h3>' + esc(o.pruefstand === 'unbesichtigt' ? t('pvH') : o.pruefstandText) + '</h3>' +
          '<p>' + esc(o.pruefstand === 'unbesichtigt' ? t('pvText') : t('pvTextOk')) + '</p>' +
          (o.pruefstand === 'unbesichtigt'
            ? '<p class="bitte">' + esc(t('pvBitte')) + '</p>'
            : '') +
        '</aside>' +
        '<h3 style="font-size:19px;margin-top:22px">' + esc(t('askH')) + '</h3>' +
        '<p style="color:var(--ink-2);font-size:15.5px">' + esc(t('askP')) + '</p>' +
        kontakt +
        '<div class="acts">' +
          '<a class="btn ' + (o.telefon ? 'btn-o' : 'btn-p') + '" href="' + esc(anfrage) + '">' + esc(t('askBtn')) + '</a>' +
          '<a class="btn btn-o" href="' + esc(karte) + '" target="_blank" rel="noopener noreferrer">' + esc(t('aMap')) + '</a>' +
        '</div>' +
        teilenLeiste(o.id, false) +
      '</div>';

    $('#ov').classList.add('on');
    document.body.style.overflow = 'hidden';
    if (!behalten && location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }
    $('#zu').focus();
  }

  function detailSchliessen() {
    aktuellesObjekt = null;
    $('#ov').classList.remove('on');
    document.body.style.overflow = '';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---- Filter --------------------------------------------------------- */
  function filterVerdrahten() {
    var form = $('#filter');
    if (!form) return;
    form.addEventListener('input', anwenden);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-chip]'), function (k) {
      k.addEventListener('click', function () {
        chip = k.dataset.chip;
        Array.prototype.forEach.call(document.querySelectorAll('[data-chip]'), function (a) {
          a.setAttribute('aria-pressed', String(a === k));
        });
        anwenden();
      });
    });
    $('#filter-reset').addEventListener('click', function () {
      form.reset();
      chip = 'alle';
      Array.prototype.forEach.call(document.querySelectorAll('[data-chip]'), function (a) {
        a.setAttribute('aria-pressed', String(a.dataset.chip === 'alle'));
      });
      anwenden();
    });
  }

  function anwenden() {
    var liste = $('#objektliste');
    var form = $('#filter');
    if (!liste || !form) return;
    var kacheln = Array.prototype.slice.call(liste.querySelectorAll('.objekt'));
    var suche = form.suche.value.trim().toLowerCase();
    var treffer = 0;

    kacheln.forEach(function (el) {
      var ok = true;
      if (suche && el.dataset.suche.indexOf(suche) === -1) ok = false;
      if (form.typ.value && el.dataset.typ !== form.typ.value) ok = false;
      if (form.zustand.value && el.dataset.zustand !== form.zustand.value) ok = false;
      if (form.aufwand.value && el.dataset.aufwand !== form.aufwand.value) ok = false;
      if (chip === 'preis' && !el.dataset.preis) ok = false;
      if (chip === 'vendita' && ['vendita', 'entrambi'].indexOf(el.dataset.angebot) === -1) ok = false;
      if (chip === 'affitto' && ['affitto', 'entrambi'].indexOf(el.dataset.angebot) === -1) ok = false;
      el.hidden = !ok;
      if (ok) treffer++;
    });

    var art = form.sortierung.value;
    kacheln.slice().sort(function (a, b) {
      if (art === 'preis') {
        var pa = a.dataset.preis ? Number(a.dataset.preis) : Infinity;
        var pb = b.dataset.preis ? Number(b.dataset.preis) : Infinity;
        if (pa !== pb) return pa - pb;
      }
      if (art === 'strasse') {
        var s = a.dataset.strasse.localeCompare(b.dataset.strasse);
        if (s !== 0) return s;
      }
      return a.dataset.id.localeCompare(b.dataset.id);
    }).forEach(function (el) { liste.appendChild(el); });

    $('#anzahl').textContent = treffer + ' ' + (treffer === 1 ? t('cntOne') : t('cnt'));
    $('#keine-treffer').hidden = treffer !== 0;
  }

  /* ---- Verdrahtung ---------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a,button') : null;
    if (!el) return;

    if (el.dataset.lang) { e.preventDefault(); spracheSetzen(el.dataset.lang); return; }

    var karte = el.closest('.card');
    if (karte) {
      e.preventDefault();
      detailOeffnen(karte.closest('.objekt').dataset.id);
      return;
    }

    if (el.dataset.karteDetail) { e.preventDefault(); detailOeffnen(el.dataset.karteDetail); return; }

    if (el.id === 'zu') { e.preventDefault(); detailSchliessen(); return; }

    if (el.id === 'karte-laden') {
      var merken = document.getElementById('karte-merken');
      if (merken && merken.checked) {
        try { localStorage.setItem(KARTE_SCHLUESSEL, 'ja'); } catch (err) { /* gesperrt */ }
      }
      kachelnLaden();
      return;
    }

    if (el.dataset.thumb !== undefined) {
      e.preventDefault();
      var o = objekt(aktuellesObjekt);
      $('#buehne').src = D.fotos[o.foto[Number(el.dataset.thumb)]];
      Array.prototype.forEach.call(document.querySelectorAll('[data-thumb]'), function (a) {
        a.setAttribute('aria-current', String(a === el));
      });
      return;
    }

    if (el.classList.contains('kopieren')) {
      e.preventDefault();
      var url = el.dataset.url;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { melden(t('shCopied')); },
          function () { window.prompt(t('shCopy'), url); });
      } else { window.prompt(t('shCopy'), url); }
      return;
    }

    if (el.classList.contains('nativ')) {
      e.preventDefault();
      navigator.share({ title: el.dataset.titel, text: el.dataset.titel, url: el.dataset.url })
        .catch(function () {});
      return;
    }

    if (el.id === 'burger') {
      var menue = $('#hauptmenue');
      var offen = menue.classList.toggle('on');
      el.setAttribute('aria-expanded', String(offen));
      return;
    }

    if (el.id === 'probe-zu') { $('#probe').hidden = true; return; }

    /* Menuepunkt auf dem Handy: nach dem Sprung das Menue schliessen. */
    if (el.parentElement && el.parentElement.id === 'hauptmenue') {
      $('#hauptmenue').classList.remove('on');
      $('#burger').setAttribute('aria-expanded', 'false');
    }
  });

  $('#ov').addEventListener('click', function (e) { if (e.target === this) detailSchliessen(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('#ov').classList.contains('on')) detailSchliessen();
  });

  /* ---- Schnittstelle fuer den Editor ----------------------------------- */
  window.irsinaPrototyp = {
    t: function (k, w) { return t(k, w); },
    esc: esc,
    melden: melden,
    datenSetzen: datenSetzen,
    neuZeichnen: zeichnen,
    ansichtBauen: ansichtBauen,
    extraText: function (e) { return D.beschriftung[LANG].extras[e] || e; },
    sprache: function () { return LANG; },
    /** Kennung des offenen Objekts, sonst null — der Editor braucht sie, um
        nach einer Umbenennung die richtige Ansicht wieder zu zeigen. */
    detailOffen: function () {
      return $('#ov').classList.contains('on') ? aktuellesObjekt : null;
    },
    detailZeigen: function (id) { if (id) detailOeffnen(id, true); else detailSchliessen(); },
  };

  /* ---- Start ---------------------------------------------------------- */
  spracheSetzen(sprachAuswahl());
  var start = /^#(IR-\d{3})$/.exec(location.hash);
  if (start) detailOeffnen(start[1], true);
})();
