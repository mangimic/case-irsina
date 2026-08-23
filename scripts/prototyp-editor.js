/* Bearbeitungsmodus des Prototyps.
   ---------------------------------------------------------------------------
   Gedacht fuer die Arbeit vor Ort: vor dem Haus stehen, Angaben berichtigen,
   den Standort vom Geraet uebernehmen, ein Foto machen. Alles bleibt im
   Browser; zurueck ins Projekt kommt es ueber den JSON-Auszug.

   Die Telefonnummern kennt der Prototyp nicht — sie verlassen den Build nicht.
   Ein leeres Telefonfeld bedeutet deshalb "unveraendert", nicht "loeschen";
   scripts/prototyp-uebernehmen.mjs haelt sich daran. */
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('irsina-daten').textContent);
  var SPEICHER = 'irsina-prototyp-entwurf';
  var an = false;
  var bearbeitet = null;
  var alteKennung = null;

  var api = window.irsinaPrototyp;
  if (!api) return;

  /* ---- Datenhaltung ---------------------------------------------------- */
  function lade() {
    try {
      var roh = localStorage.getItem(SPEICHER);
      if (roh) return JSON.parse(roh);
    } catch (e) { /* Speicher gesperrt */ }
    return null;
  }
  function sichere(objekte) {
    try { localStorage.setItem(SPEICHER, JSON.stringify(objekte)); } catch (e) { /* egal */ }
  }
  function verwerfe() {
    try { localStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
  }

  var URSPRUNG = JSON.parse(JSON.stringify(D.roh));
  var objekte = lade() || JSON.parse(JSON.stringify(D.roh));

  function geaendert() {
    var n = 0;
    var vorher = {};
    URSPRUNG.forEach(function (o) { vorher[o.id] = JSON.stringify(o); });
    objekte.forEach(function (o) {
      if (vorher[o.id] === undefined || vorher[o.id] !== JSON.stringify(o)) n++;
    });
    n += URSPRUNG.filter(function (o) {
      return !objekte.some(function (x) { return x.id === o.id; });
    }).length;
    return n;
  }

  function naechsteKennung() {
    var hoechste = 0;
    objekte.forEach(function (o) {
      var m = /^IR-(\d{3})$/.exec(o.id);
      if (m) hoechste = Math.max(hoechste, Number(m[1]));
    });
    return 'IR-' + String(hoechste + 1).padStart(3, '0');
  }

  function leeresObjekt() {
    var heute = new Date();
    return {
      id: naechsteKennung(), foto: [], strasse: '', civico: null,
      typ: 'casa', angebot: 'vendita', zustand: 'sconosciuto',
      preis: null, mq: null, vani: null, extras: [],
      telefon: null, telefon2: null, telefon_unsicher: false,
      telefonBekannt: false, freigabe: false,
      lat: null, lng: null,
      gesehen: heute.getFullYear() + '-' + String(heute.getMonth() + 1).padStart(2, '0'),
      adresse_unklar: true, pruefstand: 'unbesichtigt',
      text: { it: '', en: '', de: '', nl: '', fr: '' },
    };
  }

  /* ---- Leiste ---------------------------------------------------------- */
  function leisteZeichnen() {
    var leiste = document.getElementById('ed-leiste');
    if (!leiste) return;
    leiste.hidden = !an;
    if (!an) return;
    var n = geaendert();
    leiste.innerHTML =
      '<div class="wrap">' +
        '<b>' + api.esc(api.t('edAn')) + '</b>' +
        '<button type="button" class="ed-knopf" data-ed="neu">' + api.esc(api.t('edNeu')) + '</button>' +
        '<button type="button" class="ed-knopf" data-ed="kopieren">' + api.esc(api.t('edKopieren')) + '</button>' +
        '<button type="button" class="ed-knopf" data-ed="json">' + api.esc(api.t('edLaden')) + '</button>' +
        '<button type="button" class="ed-knopf" data-ed="html">' + api.esc(api.t('edHtml')) + '</button>' +
        (n ? '<button type="button" class="ed-knopf" data-ed="verwerfen">' + api.esc(api.t('edVerwerfen')) + '</button>' : '') +
        '<span class="ed-stand">' + api.esc(n ? api.t('edOffen', { n: n }) : api.t('edKeine')) + '</span>' +
        '<button type="button" class="ed-knopf aus" data-ed="aus">' + api.esc(api.t('edAus')) + '</button>' +
      '</div>' +
      '<p class="ed-fuss">' + api.esc(api.t('edHinweis')) + '</p>';
  }

  /* ---- Formular -------------------------------------------------------- */
  function feld(name, beschriftung, wert, art) {
    return '<label class="ed-feld"><span>' + api.esc(beschriftung) + '</span>' +
      '<input name="' + name + '" type="' + (art || 'text') + '" value="' +
      api.esc(wert == null ? '' : wert) + '"></label>';
  }

  function auswahl(name, beschriftung, werte, gewaehlt, texte) {
    return '<label class="ed-feld"><span>' + api.esc(beschriftung) + '</span><select name="' + name + '">' +
      werte.map(function (w) {
        return '<option value="' + api.esc(w) + '"' + (w === gewaehlt ? ' selected' : '') + '>' +
          api.esc(texte && texte[w] ? texte[w] : w) + '</option>';
      }).join('') + '</select></label>';
  }

  function formularOeffnen(id) {
    var neu = !id;
    bearbeitet = neu ? leeresObjekt() : JSON.parse(JSON.stringify(
      objekte.filter(function (o) { return o.id === id; })[0]));
    if (!bearbeitet) return;
    alteKennung = neu ? null : id;
    var o = bearbeitet;

    var typText = {}, zustandText = {}, angebotText = {}, pruefText = {};
    D.auswahl.typ.forEach(function (w) {
      typText[w] = api.t({ casa:'tCasa', palazzo:'tPalazzo', appartamento:'tApp', rudere:'tRudere', locale:'tLocale' }[w]);
    });
    D.auswahl.zustand.forEach(function (w) {
      zustandText[w] = api.t({ abitabile:'cAbit','da-ristrutturare':'cRistr',ristrutturato:'cRis',sconosciuto:'cUnk' }[w]);
    });
    D.auswahl.angebot.forEach(function (w) {
      angebotText[w] = api.t({ vendita:'aVend', affitto:'aAff', entrambi:'aBoth' }[w]);
    });
    D.auswahl.pruefstand.forEach(function (w) {
      pruefText[w] = api.t({ unbesichtigt:'pvKurz', eigentuemer:'pvOwner', vermittler:'pvAgent' }[w]);
    });

    document.getElementById('ed-box').innerHTML =
      '<form id="ed-eingabe" action="javascript:void 0" novalidate>' +
      '<div class="ed-kopf"><h2>' + api.esc(neu ? api.t('edNeuTitel') : api.t('edTitel') + ' · ' + o.id) + '</h2>' +
        '<button type="button" class="x" data-ed="form-zu" aria-label="' + api.esc(api.t('aClose')) + '">✕</button></div>' +

      '<div class="ed-raster">' +
        feld('kennung', api.t('dRef'), o.id) +
        feld('strasse', api.t('edFStrasse'), o.strasse) +
        feld('civico', api.t('edFCivico'), o.civico) +
        auswahl('typ', api.t('dType'), D.auswahl.typ, o.typ, typText) +
        auswahl('zustand', api.t('dCond'), D.auswahl.zustand, o.zustand, zustandText) +
        auswahl('angebot', api.t('edFAngebot'), D.auswahl.angebot, o.angebot, angebotText) +
        feld('preis', api.t('dPrice') + ' (€)', o.preis, 'number') +
        feld('mq', api.t('dSize') + ' (m²)', o.mq, 'number') +
        feld('vani', api.t('dRooms'), o.vani, 'number') +
        feld('gesehen', api.t('dSeen') + ' (JJJJ-MM)', o.gesehen) +
      '</div>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('dExtras')) + '</legend>' +
        D.auswahl.extras.map(function (x) {
          return '<label class="ed-haken"><input type="checkbox" name="extra" value="' + api.esc(x) + '"' +
            (o.extras.indexOf(x) !== -1 ? ' checked' : '') + '> ' + api.esc(api.extraText(x)) + '</label>';
        }).join('') +
      '</fieldset>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('edGPruefung')) + '</legend>' +
        auswahl('pruefstand', api.t('edFStand'), D.auswahl.pruefstand, o.pruefstand, pruefText) +
        '<label class="ed-haken"><input type="checkbox" name="adresse_unklar"' +
          (o.adresse_unklar ? ' checked' : '') + '> ' + api.esc(api.t('addrTbd')) + '</label>' +
      '</fieldset>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('edFTelefon')) + '</legend>' +
        (o.telefonBekannt ? '<p class="ed-notiz">' + api.esc(api.t('edTelefonBekannt')) + '</p>' : '') +
        '<div class="ed-raster">' +
          feld('telefon', api.t('edFTelefon'), o.telefon) +
          feld('telefon2', api.t('edFTelefon') + ' 2', o.telefon2) +
        '</div>' +
        '<label class="ed-haken"><input type="checkbox" name="telefon_unsicher"' +
          (o.telefon_unsicher ? ' checked' : '') + '> ' + api.esc(api.t('warnPhone')) + '</label>' +
      '</fieldset>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('edGLage')) + '</legend>' +
        '<div class="ed-raster">' +
          feld('lat', 'Lat', o.lat) + feld('lng', 'Lng', o.lng) +
        '</div>' +
        '<button type="button" class="btn btn-o" data-ed="standort">' + api.esc(api.t('edStandort')) + '</button>' +
        '<span class="ed-notiz" id="ed-standort-stand"></span>' +
      '</fieldset>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('edFoto')) + '</legend>' +
        '<div class="ed-fotos" id="ed-fotos"></div>' +
        '<label class="btn btn-o ed-dateiwahl">' + api.esc(api.t('edFotoNeu')) +
          '<input type="file" accept="image/*" capture="environment" id="ed-datei" hidden multiple></label>' +
      '</fieldset>' +

      '<fieldset class="ed-gruppe"><legend>' + api.esc(api.t('edGText')) + '</legend>' +
        D.sprachen.map(function (l) {
          return '<label class="ed-feld"><span>' + api.esc(D.namen[l]) + '</span>' +
            '<textarea name="text-' + l + '" rows="2">' + api.esc(o.text[l] || '') + '</textarea></label>';
        }).join('') +
      '</fieldset>' +

      '<div class="ed-aktionen">' +
        '<button type="submit" class="btn btn-p">' + api.esc(api.t('edSpeichern')) + '</button>' +
        '<button type="button" class="btn btn-o" data-ed="form-zu">' + api.esc(api.t('edAbbrechen')) + '</button>' +
        (neu ? '' : '<button type="button" class="btn ed-loeschen" data-ed="loeschen">' + api.esc(api.t('edLoeschen')) + '</button>') +
      '</div>' +
      '</form>';

    fotosZeichnen();
    document.getElementById('ed-form').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function formularSchliessen() {
    document.getElementById('ed-form').hidden = true;
    /* Wurde aus der Detailansicht heraus bearbeitet, liegt diese noch darunter
       und braucht die Sperre weiter — sonst scrollt die Seite dahinter weg. */
    document.body.style.overflow = api.detailOffen && api.detailOffen() ? 'hidden' : '';
    bearbeitet = null;
    alteKennung = null;
  }

  function fotosZeichnen() {
    var behaelter = document.getElementById('ed-fotos');
    if (!behaelter || !bearbeitet) return;
    behaelter.innerHTML = bearbeitet.foto.map(function (name, i) {
      return '<figure class="ed-foto"><img src="' + (D.fotos[name] || '') + '" alt="">' +
        '<button type="button" data-ed="foto-weg" data-i="' + i + '" aria-label="' +
        api.esc(api.t('edLoeschen')) + '">✕</button>' +
        '<figcaption>' + api.esc(name) + '</figcaption></figure>';
    }).join('') || '<p class="ed-notiz">—</p>';
  }

  /* Fotos werden vor dem Ablegen verkleinert: ein Handybild hat schnell
     4 MB, und der Speicher des Browsers ist knapp bemessen. */
  function fotoEinlesen(datei, fertig) {
    var leser = new FileReader();
    leser.onload = function () {
      var bild = new Image();
      bild.onload = function () {
        var max = 1000;
        var b = bild.width, h = bild.height;
        if (b > max || h > max) {
          var f = Math.min(max / b, max / h);
          b = Math.round(b * f); h = Math.round(h * f);
        }
        var flaeche = document.createElement('canvas');
        flaeche.width = b; flaeche.height = h;
        flaeche.getContext('2d').drawImage(bild, 0, 0, b, h);
        fertig(flaeche.toDataURL('image/jpeg', 0.72));
      };
      bild.onerror = function () { fertig(null); };
      bild.src = leser.result;
    };
    leser.onerror = function () { fertig(null); };
    leser.readAsDataURL(datei);
  }

  /* ---- Speichern ------------------------------------------------------- */
  function zahl(v) {
    if (v === '' || v == null) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  function text(v) {
    v = (v || '').trim();
    return v === '' ? null : v;
  }

  function uebernehmen(form) {
    var o = bearbeitet;

    /* Ueber form.elements zugreifen, nicht ueber form.<name>: Namen wie "id",
       "action" oder "method" werden sonst von den gleichnamigen Eigenschaften
       des Formulars ueberdeckt — form.id liefert das id-Attribut, nicht das
       Eingabefeld. */
    var e = form.elements;
    var wert = function (name) { return e[name] ? e[name].value : ''; };
    var haken = function (name) { return Boolean(e[name] && e[name].checked); };

    o.id = (wert('kennung') || '').trim().toUpperCase();
    o.strasse = (wert('strasse') || '').trim();
    o.civico = text(wert('civico'));
    o.typ = wert('typ');
    o.zustand = wert('zustand');
    o.angebot = wert('angebot');
    o.preis = zahl(wert('preis'));
    o.mq = zahl(wert('mq'));
    o.vani = zahl(wert('vani'));
    o.gesehen = (wert('gesehen') || '').trim();
    o.pruefstand = wert('pruefstand');
    o.adresse_unklar = haken('adresse_unklar');
    o.telefon = text(wert('telefon'));
    o.telefon2 = text(wert('telefon2'));
    o.telefon_unsicher = haken('telefon_unsicher');
    o.lat = zahl(wert('lat'));
    o.lng = zahl(wert('lng'));
    o.extras = Array.prototype.slice
      .call(form.querySelectorAll('input[name="extra"]:checked'))
      .map(function (k) { return k.value; });
    D.sprachen.forEach(function (l) {
      o.text[l] = (wert('text-' + l) || '').trim();
    });

    if (!o.strasse || !/^IR-\d{3}$/.test(o.id) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(o.gesehen)) {
      api.melden(api.t('edPflicht'));
      return false;
    }
    /* Ohne Foto laesst sich der Eintrag spaeter nicht veroeffentlichen — das
       hier zu sagen ist freundlicher, als es erst bei der Uebernahme zu
       merken. */
    if (!o.foto.length) {
      api.melden(api.t('edFotoPflicht'));
      return false;
    }

    /* Wurde die Kennung geaendert, darf der alte Eintrag nicht stehen bleiben. */
    if (alteKennung && alteKennung !== o.id) {
      objekte = objekte.filter(function (x) { return x.id !== alteKennung; });
    }
    var stelle = -1;
    objekte.forEach(function (x, i) { if (x.id === o.id) stelle = i; });
    if (stelle === -1) objekte.push(o); else objekte[stelle] = o;
    objekte.sort(function (a, c) { return a.id.localeCompare(c.id); });

    sichere(objekte);
    /* Vor datenSetzen merken: das Neuzeichnen schliesst eine Detailansicht,
       deren Kennung es nicht mehr gibt. */
    var warOffen = api.detailOffen ? api.detailOffen() : null;
    api.datenSetzen(objekte);
    if (warOffen && warOffen !== o.id && (warOffen === alteKennung || !alteKennung)) {
      api.detailZeigen(o.id);
    }
    return true;
  }

  /* ---- Auszug ---------------------------------------------------------- */
  function alsJson() {
    var raus = objekte.map(function (o) {
      return {
        id: o.id, foto: o.foto, strasse: o.strasse, civico: o.civico,
        typ: o.typ, angebot: o.angebot, zustand: o.zustand,
        preis: o.preis, mq: o.mq, vani: o.vani, extras: o.extras,
        telefon: o.telefon, telefon2: o.telefon2,
        telefon_unsicher: o.telefon_unsicher, freigabe: o.freigabe,
        lat: o.lat, lng: o.lng, gesehen: o.gesehen,
        adresse_unklar: o.adresse_unklar, pruefstand: o.pruefstand,
        text: o.text,
      };
    });
    return JSON.stringify({
      _hinweis:
        'Auszug aus dem Prototyp-Editor. Uebernahme ins Projekt: ' +
        'npm run prototyp:uebernehmen -- <diese-datei.json>. ' +
        'Ein leeres Telefonfeld bedeutet UNVERAENDERT, nicht geloescht — ' +
        'der Prototyp kennt die hinterlegten Nummern nicht.',
      objekte: raus,
    }, null, 2);
  }

  /* Zwei Wege, je nachdem wo die Seite laeuft:
     · als Artifact reicht sie die Datei ueber die downloads-Berechtigung an
       die Besucherin weiter, die den Vorgang bestaetigt;
     · als eigenstaendige Datei im Browser genuegt ein Blob-Verweis. */
  function herunterladen(inhalt, name, art) {
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('downloads').then(function (dl) {
        if (!dl) { api.melden(api.t('edNurDatei')); return; }
        dl.save({ filename: name, data: inhalt }).then(
          function () { api.melden(api.t('edGespeichert')); },
          function (fehler) {
            var code = (fehler && fehler.code) || 'unavailable';
            if (code === 'declined') api.melden(api.t('edAbgelehnt'));
            else if (code === 'too_large') api.melden(api.t('edZuGross'));
            else if (code === 'extension_not_enabled' || code === 'rejected_extension') {
              api.melden(api.t('edHtmlNichtHier'));
            } else if (code === 'rate_limited') api.melden(api.t('edAbgelehnt'));
            else api.melden(api.t('edNurDatei'));
          },
        );
      });
      return true;
    }

    try {
      var blob = new Blob([inhalt], { type: art });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) {
      api.melden(api.t('edNurDatei'));
      return false;
    }
  }

  /* ---- Verdrahtung ----------------------------------------------------- */
  function anSchalten(zustand) {
    an = zustand;
    document.body.classList.toggle('bearbeiten', an);
    leisteZeichnen();
    api.neuZeichnen();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-ed]') : null;

    /* Bearbeiten-Knopf auf einer Kachel */
    var stift = e.target.closest ? e.target.closest('.ed-kachel-knopf') : null;
    if (stift) {
      e.preventDefault();
      e.stopPropagation();
      formularOeffnen(stift.dataset.id);
      return;
    }

    if (!el) return;
    var was = el.dataset.ed;

    if (was === 'an') { e.preventDefault(); anSchalten(true); return; }
    if (was === 'aus') { anSchalten(false); return; }
    if (was === 'neu') { formularOeffnen(null); return; }
    if (was === 'form-zu') { formularSchliessen(); return; }

    if (was === 'loeschen') {
      if (!window.confirm(api.t('edLoeschenFrage'))) return;
      objekte = objekte.filter(function (o) { return o.id !== bearbeitet.id; });
      sichere(objekte);
      api.datenSetzen(objekte);
      formularSchliessen();
      leisteZeichnen();
      return;
    }

    if (was === 'verwerfen') {
      if (!window.confirm(api.t('edVerwerfenFrage'))) return;
      verwerfe();
      objekte = JSON.parse(JSON.stringify(D.roh));
      api.datenSetzen(objekte);
      leisteZeichnen();
      return;
    }

    if (was === 'foto-weg') {
      bearbeitet.foto.splice(Number(el.dataset.i), 1);
      fotosZeichnen();
      return;
    }

    if (was === 'standort') {
      var stand = document.getElementById('ed-standort-stand');
      if (!navigator.geolocation) { if (stand) stand.textContent = api.t('edStandortFehler'); return; }
      if (stand) stand.textContent = api.t('edStandortLaeuft');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var form = document.getElementById('ed-eingabe');
          form.lat.value = pos.coords.latitude.toFixed(6);
          form.lng.value = pos.coords.longitude.toFixed(6);
          if (stand) {
            stand.textContent = api.t('edStandortOk', { m: Math.round(pos.coords.accuracy || 0) });
          }
        },
        function () { if (stand) stand.textContent = api.t('edStandortFehler'); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
      return;
    }

    if (was === 'kopieren') {
      var json = alsJson();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(
          function () { api.melden(api.t('edKopiert')); },
          function () { window.prompt(api.t('edKopieren'), json); },
        );
      } else { window.prompt(api.t('edKopieren'), json); }
      return;
    }

    if (was === 'json') { herunterladen(alsJson(), 'objekte.json', 'application/json'); return; }

    if (was === 'html') {
      var doc = '<!doctype html>\n' + document.documentElement.outerHTML;
      herunterladen(doc, 'irsina-prototyp.html', 'text/html');
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    /* Nicht ueber e.target.id pruefen: bei einem Formular ueberdecken die
       benannten Felder die Element-Eigenschaften, form.id liefert also das
       Eingabefeld statt der Zeichenkette. Der Vergleich schlaegt dann immer
       fehl, das Formular wird nativ abgeschickt und die Seite laedt neu. */
    if (!e.target.matches || !e.target.matches('#ed-eingabe')) return;
    e.preventDefault();
    if (uebernehmen(e.target)) {
      formularSchliessen();
      leisteZeichnen();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'ed-datei' || !bearbeitet) return;
    var dateien = Array.prototype.slice.call(e.target.files || []);
    var offen = dateien.length;
    dateien.forEach(function (datei, i) {
      fotoEinlesen(datei, function (datenUrl) {
        if (datenUrl) {
          var name = bearbeitet.id + (bearbeitet.foto.length ? String.fromCharCode(96 + bearbeitet.foto.length + 1) : '') + '.jpg';
          D.fotos[name] = datenUrl;
          bearbeitet.foto.push(name);
        }
        if (--offen === 0) fotosZeichnen();
      });
    });
    e.target.value = '';
  });

  /* Änderungen aus einer früheren Sitzung sofort anwenden. */
  if (lade()) api.datenSetzen(objekte);
  if (location.hash === '#edit') anSchalten(true);

  /* Fuer die automatisierten Tests einsehbar. */
  window.irsinaEditor = {
    anSchalten: anSchalten,
    leisteZeichnen: leisteZeichnen,
    zustand: function () {
      return { an: an, anzahl: objekte.length, offen: geaendert(), objekte: objekte };
    },
    uebernehmen: uebernehmen,
  };
})();
