/* ==========================================================================
   Dactylo · 4ORLO — de tool
   De tests en de puntenverdeling staan in js/testen.js.

   Gegevens: alles staat in localStorage van deze browser (sleutel hieronder).
   Er gaat niets naar internet. Back-up = een JSON-bestand dat je downloadt.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.DACTYLO;
  var SLEUTEL = 'dactylo_4orlo_v1';
  var VOORKEUR = 'dactylo_4orlo_voorkeur';
  var BACKUP_NA_DAGEN = 7;

  // ---------- vingers op een AZERTY-toetsenbord ----------
  var RIJEN = [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n']
  ];
  var VINGER = {
    a: 'lp', q: 'lp', w: 'lp',
    z: 'lr', s: 'lr', x: 'lr',
    e: 'lm', d: 'lm', c: 'lm',
    r: 'lw', t: 'lw', f: 'lw', g: 'lw', v: 'lw', b: 'lw',
    y: 'rw', u: 'rw', h: 'rw', j: 'rw', n: 'rw',
    i: 'rm', k: 'rm',
    o: 'rr', l: 'rr',
    p: 'rp', m: 'rp',
    ' ': 'duim'
  };
  var VINGERNAAM = {
    lp: 'linkerpink', lr: 'linker ringvinger', lm: 'linker middelvinger', lw: 'linker wijsvinger',
    rw: 'rechter wijsvinger', rm: 'rechter middelvinger', rr: 'rechter ringvinger', rp: 'rechterpink',
    duim: 'duim'
  };

  // ---------- hulpjes ----------
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function el(tag, cls, tekst) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }
  function komma(x, dec) { return Number(x).toFixed(dec).replace('.', ','); }
  function puntTekst(p) { return (Math.round(p * 10) / 10).toString().replace('.', ','); }
  function datumTekst(iso) {
    try { return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'numeric', year: 'numeric' }); }
    catch (e) { return iso.slice(0, 10); }
  }
  function vandaag() { return new Date().toISOString().slice(0, 10); }

  function toast(tekst) {
    var t = $('#toast');
    t.textContent = tekst;
    t.classList.add('zichtbaar');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('zichtbaar'); }, 3200);
  }

  // ---------- opslag ----------
  var opslagWerkt = true;
  function legeData() {
    var d = { versie: 1, klassen: {}, resultaten: [], laatsteBackup: null };
    CFG.klassen.forEach(function (k) { d.klassen[k] = []; });
    return d;
  }
  function geldig(d) {
    return d && typeof d === 'object' && d.klassen && typeof d.klassen === 'object' && Array.isArray(d.resultaten);
  }
  function laad() {
    var d = legeData();
    try {
      var s = localStorage.getItem(SLEUTEL);
      if (s) {
        var o = JSON.parse(s);
        if (geldig(o)) {
          d.klassen = o.klassen;
          d.resultaten = o.resultaten;
          d.laatsteBackup = o.laatsteBackup || null;
        }
      }
      localStorage.setItem(SLEUTEL + '_test', '1');
      localStorage.removeItem(SLEUTEL + '_test');
    } catch (e) {
      opslagWerkt = false;
    }
    CFG.klassen.forEach(function (k) { if (!Array.isArray(d.klassen[k])) d.klassen[k] = []; });
    return d;
  }
  function bewaar() {
    try {
      localStorage.setItem(SLEUTEL, JSON.stringify(data));
      return true;
    } catch (e) {
      opslagWerkt = false;
      toon($('#melding-opslag'), true);
      return false;
    }
  }
  function laadVoorkeur() {
    try { return JSON.parse(localStorage.getItem(VOORKEUR)) || {}; } catch (e) { return {}; }
  }
  function bewaarVoorkeur() {
    try { localStorage.setItem(VOORKEUR, JSON.stringify(ui)); } catch (e) { /* niet erg */ }
  }

  var data = laad();
  var vk = laadVoorkeur();
  var ui = {
    klas: CFG.klassen.indexOf(vk.klas) >= 0 ? vk.klas : CFG.klassen[0],
    test: CFG.tests.some(function (t) { return t.id === vk.test; }) ? vk.test : CFG.tests[0].id,
    toetsenbord: vk.toetsenbord !== false,
    view: 'leerlingen'
  };

  function toon(e, ja) { e.hidden = !ja; }
  function huidigeTest() {
    for (var i = 0; i < CFG.tests.length; i++) if (CFG.tests[i].id === ui.test) return CFG.tests[i];
    return CFG.tests[0];
  }

  // ---------- punten ----------
  function puntVoor(waarde, drempels) {
    for (var i = 0; i < drempels.length; i++) if (waarde >= drempels[i][0]) return drempels[i][1];
    return 0;
  }
  function maxVan(drempels) { return drempels.length ? drempels[0][1] : 0; }
  function techniekMax() {
    return CFG.vragen.reduce(function (s, v) {
      return s + Math.max.apply(null, v.opties.map(function (o) { return o[1]; }));
    }, 0);
  }
  function totaalMax(test) { return maxVan(test.snelheid) + maxVan(test.nauwkeurigheid) + techniekMax(); }

  // ---------- resultaten opzoeken ----------
  function pogingen(klas, naam, testId) {
    return data.resultaten.filter(function (r) {
      return r.klas === klas && r.leerling === naam && (!testId || r.test === testId);
    }).sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
  }
  function laatste(klas, naam, testId) {
    var p = pogingen(klas, naam, testId);
    return p.length ? p[p.length - 1] : null;
  }

  // ---------- views ----------
  function zetView(naam) {
    if (test.actief && naam !== 'test') stopTest();
    ui.view = naam;
    $$('.view').forEach(function (v) { toon(v, v.id === 'v-' + naam); });
    $$('.nav-knop').forEach(function (k) {
      var actief = k.getAttribute('data-view') === naam || (naam === 'test' || naam === 'beoordeling') && k.getAttribute('data-view') === 'leerlingen';
      k.classList.toggle('actief', actief);
      if (actief) k.setAttribute('aria-current', 'page'); else k.removeAttribute('aria-current');
    });
    toonBackupHerinnering();
    if (naam === 'leerlingen') tekenLijst();
    if (naam === 'resultaten') tekenResultaten();
    if (naam === 'gegevens') tekenGegevens();
    window.scrollTo(0, 0);
  }

  function tekenTabs() {
    $$('.klas-tabs').forEach(function (box) {
      box.innerHTML = '';
      CFG.klassen.forEach(function (k) {
        var b = el('button', 'tab' + (k === ui.klas ? ' actief' : ''), k);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', k === ui.klas ? 'true' : 'false');
        b.addEventListener('click', function () {
          ui.klas = k; bewaarVoorkeur(); tekenTabs();
          if (ui.view === 'leerlingen') tekenLijst();
          if (ui.view === 'resultaten') tekenResultaten();
        });
        box.appendChild(b);
      });
    });
  }

  function tekenTestKeuze() {
    var s = $('#test-kies');
    s.innerHTML = '';
    CFG.tests.forEach(function (t) {
      var o = el('option', '', t.titel);
      o.value = t.id;
      if (t.id === ui.test) o.selected = true;
      s.appendChild(o);
    });
  }

  // ---------- leerlingenlijst ----------
  function tekenLijst() {
    var t = huidigeTest();
    $('#test-uitleg-lijst').textContent = t.titel + ' — ' + t.uitleg + ' Klik op een naam om de test te starten.';
    var box = $('#leerling-lijst');
    box.innerHTML = '';
    var namen = data.klassen[ui.klas] || [];
    toon($('#lijst-leeg'), namen.length === 0);
    namen.forEach(function (naam) {
      var r = laatste(ui.klas, naam, t.id);
      var b = el('button', 'leerling' + (r ? ' getest' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'leerling-naam', naam));
      b.appendChild(el('span', 'leerling-status', r ? puntTekst(r.punten) + ' / 20 · ' + datumTekst(r.datum) : 'nog niet getest'));
      b.addEventListener('click', function () { startVoor(naam); });
      box.appendChild(b);
    });
  }

  // ---------- het toetsenbord op het scherm ----------
  function tekenToetsenbord(test) {
    var box = $('#toetsenbord');
    box.innerHTML = '';
    RIJEN.forEach(function (rij, ri) {
      var r = el('div', 'kb-rij kb-rij-' + ri);
      rij.forEach(function (c) {
        var k = el('span', 'kb-toets v-' + VINGER[c], c);
        k.setAttribute('data-toets', c);
        if (test.toetsen.indexOf(c) < 0) k.classList.add('kb-uit');
        if (c === 'f' || c === 'j') k.classList.add('kb-streep');
        r.appendChild(k);
      });
      box.appendChild(r);
    });
    var sp = el('div', 'kb-rij kb-rij-3');
    var spatie = el('span', 'kb-toets kb-spatie v-duim', 'spatie');
    spatie.setAttribute('data-toets', ' ');
    sp.appendChild(spatie);
    box.appendChild(sp);
  }
  function markeerToets(c) {
    $$('.kb-toets.kb-nu').forEach(function (k) { k.classList.remove('kb-nu'); });
    var k = document.querySelector('.kb-toets[data-toets="' + (c === ' ' ? ' ' : c) + '"]');
    if (k) k.classList.add('kb-nu');
    $('#volgende').innerHTML = '';
    if (c === undefined) return;
    var v = $('#volgende');
    v.appendChild(document.createTextNode('Volgende toets: '));
    v.appendChild(el('strong', '', c === ' ' ? 'spatie' : c));
    v.appendChild(document.createTextNode(' · ' + VINGERNAAM[VINGER[c]]));
  }

  // ---------- de test ----------
  var test = {};
  var tekens = [];

  function nieuweToestand(t, naam) {
    return {
      cfg: t, naam: naam, klas: ui.klas, tekst: t.tekst.replace(/\s+/g, ' ').trim(),
      actief: true, gestart: false, klaar: false,
      pos: 0, juist: 0, fout: 0, foutPerToets: {}, start: 0, timer: null, eindTijd: 0
    };
  }

  function startVoor(naam) {
    var t = huidigeTest();
    test = nieuweToestand(t, naam);
    $('#test-titel').textContent = t.titel + ' · ' + ui.klas;
    $('#test-naam').textContent = naam;
    tekenToetsenbord(t);
    bouwTekst(test.tekst);
    zetKlok(t.duur, 0);
    toon($('#instructie'), true);
    toon($('#waarschuw-caps'), false);
    toon($('#waarschuw-qwerty'), false);
    $('#toon-toetsenbord').checked = ui.toetsenbord;
    toon($('#toetsenbord-blok'), ui.toetsenbord);
    zetView('test');
    // de kop van de pagina wegscrollen, zodat de hele test op een laptopscherm past
    var top = $('#v-test').getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo(0, Math.max(0, top));
    markeerHuidig();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function bouwTekst(tekst) {
    var box = $('#tekst');
    box.innerHTML = '';
    box.scrollTop = 0;
    tekens = [];
    var woorden = tekst.split(' ');
    woorden.forEach(function (w, wi) {
      var ws = el('span', 'woord');
      for (var i = 0; i < w.length; i++) {
        var s = el('span', 'teken', w[i]);
        ws.appendChild(s);
        tekens.push(s);
      }
      box.appendChild(ws);
      if (wi < woorden.length - 1) {
        var sp = el('span', 'teken spatie', ' ');
        box.appendChild(sp);
        tekens.push(sp);
      }
    });
  }

  function markeerHuidig() {
    tekens.forEach(function (s) { s.classList.remove('nu'); });
    var s = tekens[test.pos];
    if (!s) { markeerToets(undefined); return; }
    s.classList.add('nu');
    markeerToets(test.tekst[test.pos]);
    // de huidige regel als tweede regel tonen, zodat de vorige regel nog zichtbaar is
    var box = $('#tekst');
    var regel = parseFloat(getComputedStyle(box).lineHeight) || 48;
    box.scrollTop = Math.max(0, s.offsetTop - regel);
  }

  function zetKlok(rest, fractie) {
    $('#klok-tijd').textContent = Math.ceil(rest);
    $('#klok-balk').style.width = (Math.min(1, fractie) * 100) + '%';
  }

  function startKlok() {
    test.gestart = true;
    test.start = performance.now();
    test.timer = setInterval(function () {
      var verstreken = (performance.now() - test.start) / 1000;
      zetKlok(Math.max(0, test.cfg.duur - verstreken), verstreken / test.cfg.duur);
      if (verstreken >= test.cfg.duur) eindeTest();
    }, 100);
  }

  function stopTest() {
    clearInterval(test.timer);
    test.actief = false;
  }

  function opnieuw() {
    if (!test.cfg) return;
    clearInterval(test.timer);
    startVoor(test.naam);
  }

  function controleerIndeling(e) {
    if (!e.code) return;
    var k = e.key.toLowerCase();
    var qwerty = (e.code === 'KeyQ' && k === 'q') || (e.code === 'KeyA' && k === 'a') ||
                 (e.code === 'KeyW' && k === 'w') || (e.code === 'KeyZ' && k === 'z');
    var azerty = (e.code === 'KeyA' && k === 'q') || (e.code === 'KeyQ' && k === 'a') ||
                 (e.code === 'Semicolon' && k === 'm');
    if (qwerty) toon($('#waarschuw-qwerty'), true);
    if (azerty) toon($('#waarschuw-qwerty'), false);
  }

  function opToets(e) {
    if (ui.view !== 'test' || !test.actief || test.klaar) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') return;
    if (e.key.length !== 1) return;          // Shift, Backspace, pijltjes … tellen niet
    e.preventDefault();
    var caps = e.getModifierState && e.getModifierState('CapsLock');
    toon($('#waarschuw-caps'), !!caps);
    if (caps) return;
    controleerIndeling(e);
    if (!test.gestart) startKlok();
    var verwacht = test.tekst[test.pos];
    var s = tekens[test.pos];
    if (e.key === verwacht) {
      s.classList.remove('fout');
      s.classList.add('ok');
      test.juist++;
      test.pos++;
      if (test.pos >= test.tekst.length) { eindeTest(); return; }
      markeerHuidig();
    } else {
      test.fout++;
      test.foutPerToets[verwacht] = (test.foutPerToets[verwacht] || 0) + 1;
      s.classList.remove('fout');
      void s.offsetWidth;                   // animatie opnieuw laten starten
      s.classList.add('fout');
    }
  }

  function eindeTest() {
    if (test.klaar) return;
    test.klaar = true;
    stopTest();
    var duur = Math.min(test.cfg.duur, (performance.now() - test.start) / 1000);
    var aanslagen = test.juist + test.fout;
    var res = {
      wpm: duur > 0 ? (test.juist / 5) / (duur / 60) : 0,
      nauwkeurigheid: aanslagen ? test.juist / aanslagen * 100 : 0,
      juist: test.juist,
      fout: test.fout,
      duur: Math.round(duur * 10) / 10,
      tekstAf: test.pos >= test.tekst.length,
      foutPerToets: test.foutPerToets
    };
    zetKlok(0, 1);
    toonBeoordeling(res);
  }

  // ---------- beoordeling ----------
  var beoordeling = null;

  function toonBeoordeling(res) {
    var t = test.cfg;
    beoordeling = {
      res: res,
      snelheid: puntVoor(res.wpm, t.snelheid),
      nauwkeurigheid: puntVoor(Math.floor(res.nauwkeurigheid), t.nauwkeurigheid),
      antwoorden: {}
    };
    $('#beoordeling-titel').textContent = t.titel + ' · ' + test.klas;
    $('#beoordeling-naam').textContent = test.naam;

    var stats = $('#stats');
    stats.innerHTML = '';
    stats.appendChild(statKaart('Snelheid', komma(res.wpm, 1), 'woorden per minuut',
      beoordeling.snelheid + ' / ' + maxVan(t.snelheid) + ' punten · alle punten vanaf ' + t.snelheid[0][0]));
    stats.appendChild(statKaart('Nauwkeurigheid', Math.floor(res.nauwkeurigheid) + ' %', res.juist + ' juist, ' + res.fout + ' fout',
      beoordeling.nauwkeurigheid + ' / ' + maxVan(t.nauwkeurigheid) + ' punten · alle punten vanaf ' + t.nauwkeurigheid[0][0] + ' %'));
    stats.appendChild(statKaart('Tijd', komma(res.duur, 0) + ' s', res.tekstAf ? 'de tekst was af' : 'van de ' + t.duur + ' seconden', ''));

    var fouten = Object.keys(res.foutPerToets).map(function (k) { return [k, res.foutPerToets[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
    $('#probleemtoetsen').textContent = fouten.length
      ? 'Meeste fouten bij: ' + fouten.map(function (f) { return (f[0] === ' ' ? 'spatie' : f[0]) + ' (' + f[1] + '×, ' + VINGERNAAM[VINGER[f[0]]] + ')'; }).join(' · ')
      : 'Geen enkele fout. Knap!';

    var box = $('#vragen');
    box.innerHTML = '';
    CFG.vragen.forEach(function (v, vi) {
      var fs = el('fieldset', 'vraag');
      fs.appendChild(el('legend', '', (vi + 1) + '. ' + v.vraag));
      var opts = el('div', 'opties');
      v.opties.forEach(function (o, oi) {
        var lab = el('label', 'optie');
        var inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'vraag-' + v.id;
        inp.value = String(oi);
        inp.addEventListener('change', function () {
          beoordeling.antwoorden[v.id] = { antwoord: o[0], punten: o[1] };
          tekenTotaal();
        });
        lab.appendChild(inp);
        lab.appendChild(el('span', '', o[0]));
        opts.appendChild(lab);
      });
      fs.appendChild(opts);
      box.appendChild(fs);
    });
    $('#opmerking').value = '';
    tekenTotaal();
    zetView('beoordeling');
  }

  function statKaart(titel, waarde, onder, punten) {
    var k = el('div', 'stat');
    k.appendChild(el('p', 'stat-titel', titel));
    k.appendChild(el('p', 'stat-waarde', waarde));
    k.appendChild(el('p', 'stat-onder', onder));
    if (punten) k.appendChild(el('p', 'stat-punten', punten));
    return k;
  }

  function berekenPunt() {
    var t = test.cfg;
    var techniek = 0, beantwoord = 0;
    CFG.vragen.forEach(function (v) {
      var a = beoordeling.antwoorden[v.id];
      if (a) { techniek += a.punten; beantwoord++; }
    });
    var som = beoordeling.snelheid + beoordeling.nauwkeurigheid + techniek;
    var max = totaalMax(t);
    return {
      techniek: techniek,
      som: som,
      max: max,
      punt: max ? Math.round(som / max * 20 * 10) / 10 : 0,
      volledig: beantwoord === CFG.vragen.length
    };
  }

  function tekenTotaal() {
    var t = test.cfg;
    var p = berekenPunt();
    var box = $('#totaal');
    box.innerHTML = '';
    var rij = el('div', 'totaal-rij');
    rij.appendChild(el('span', '', 'Snelheid ' + beoordeling.snelheid + '/' + maxVan(t.snelheid)));
    rij.appendChild(el('span', '', 'Nauwkeurigheid ' + beoordeling.nauwkeurigheid + '/' + maxVan(t.nauwkeurigheid)));
    rij.appendChild(el('span', '', 'Techniek ' + p.techniek + '/' + techniekMax()));
    box.appendChild(rij);
    var groot = el('p', 'totaal-punt');
    groot.appendChild(el('strong', '', puntTekst(p.punt)));
    groot.appendChild(document.createTextNode(' / 20'));
    box.appendChild(groot);
    if (!p.volledig) box.appendChild(el('p', 'hint', 'Beantwoord eerst alle vragen.'));
    $('#knop-bewaar').disabled = !p.volledig;
  }

  function bewaarResultaat() {
    var p = berekenPunt();
    if (!p.volledig) return;
    var r = beoordeling.res;
    data.resultaten.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      klas: test.klas,
      leerling: test.naam,
      test: test.cfg.id,
      datum: new Date().toISOString(),
      wpm: Math.round(r.wpm * 10) / 10,
      nauwkeurigheid: Math.floor(r.nauwkeurigheid),
      juist: r.juist,
      fout: r.fout,
      duur: r.duur,
      foutPerToets: r.foutPerToets,
      puntenSnelheid: beoordeling.snelheid,
      puntenNauwkeurigheid: beoordeling.nauwkeurigheid,
      puntenTechniek: p.techniek,
      antwoorden: beoordeling.antwoorden,
      punten: p.punt,
      opmerking: $('#opmerking').value.trim()
    });
    if (bewaar()) toast('Bewaard: ' + test.naam + ' — ' + puntTekst(p.punt) + ' / 20');
    else toast('Niet bewaard: deze browser blokkeert de opslag.');
    test = {};
    zetView('leerlingen');
    toonBackupHerinnering();
  }

  // ---------- resultaten ----------
  function tekenResultaten() {
    var t = huidigeTest();
    var tab = $('#tabel');
    tab.innerHTML = '';
    var kop = el('thead');
    var kr = el('tr');
    ['Leerling', 'Datum', 'Woorden/min', 'Nauwkeurig', 'Techniek', 'Punt /20', 'Pogingen'].forEach(function (h) { kr.appendChild(el('th', '', h)); });
    kop.appendChild(kr);
    tab.appendChild(kop);
    var body = el('tbody');
    var namen = data.klassen[ui.klas] || [];
    var som = 0, n = 0;
    namen.forEach(function (naam) {
      var alle = pogingen(ui.klas, naam, t.id);
      var r = alle[alle.length - 1];
      var tr = el('tr', r ? '' : 'niet-getest');
      var td = el('td');
      var b = el('button', 'link', naam);
      b.type = 'button';
      b.addEventListener('click', function () { toonDetail(naam); });
      td.appendChild(b);
      tr.appendChild(td);
      if (r) {
        som += r.punten; n++;
        tr.appendChild(el('td', '', datumTekst(r.datum)));
        tr.appendChild(el('td', 'getal', komma(r.wpm, 1)));
        tr.appendChild(el('td', 'getal', r.nauwkeurigheid + ' %'));
        tr.appendChild(el('td', 'getal', r.puntenTechniek + '/' + techniekMax()));
        tr.appendChild(el('td', 'getal sterk', puntTekst(r.punten)));
        tr.appendChild(el('td', 'getal', String(alle.length)));
      } else {
        var leeg = el('td', 'hint', 'nog niet getest');
        leeg.colSpan = 6;
        tr.appendChild(leeg);
      }
      body.appendChild(tr);
    });
    tab.appendChild(body);
    if (namen.length) {
      var voet = el('tfoot');
      var vr = el('tr');
      vr.appendChild(el('td', '', n + ' van ' + namen.length + ' getest'));
      var gem = el('td', 'getal', n ? 'Gemiddelde: ' + komma(som / n, 1) + ' / 20' : '');
      gem.colSpan = 6;
      vr.appendChild(gem);
      voet.appendChild(vr);
      tab.appendChild(voet);
    } else {
      var leegRij = el('tr');
      var c = el('td', 'hint', 'Nog geen klaslijst voor ' + ui.klas + '.');
      c.colSpan = 7;
      leegRij.appendChild(c);
      body.appendChild(leegRij);
    }
  }

  function toonDetail(naam) {
    var d = $('#detail');
    $('#detail-titel').textContent = naam + ' · ' + ui.klas;
    var inh = $('#detail-inhoud');
    inh.innerHTML = '';
    var alle = pogingen(ui.klas, naam, null);
    if (!alle.length) {
      inh.appendChild(el('p', 'hint', 'Nog geen pogingen.'));
    }
    CFG.tests.forEach(function (t) {
      var p = alle.filter(function (r) { return r.test === t.id; });
      if (!p.length) return;
      inh.appendChild(el('h3', 'blok-titel', t.titel));
      var tab = el('table', 'tabel klein');
      var kr = el('tr');
      ['Datum', 'Woorden/min', 'Nauwkeurig', 'Techniek', 'Punt', ''].forEach(function (h) { kr.appendChild(el('th', '', h)); });
      tab.appendChild(kr);
      p.forEach(function (r, i) {
        var tr = el('tr');
        tr.appendChild(el('td', '', datumTekst(r.datum) + (i === p.length - 1 ? ' (telt)' : '')));
        tr.appendChild(el('td', 'getal', komma(r.wpm, 1)));
        tr.appendChild(el('td', 'getal', r.nauwkeurigheid + ' %'));
        tr.appendChild(el('td', 'getal', r.puntenTechniek + '/' + techniekMax()));
        tr.appendChild(el('td', 'getal sterk', puntTekst(r.punten) + ' / 20'));
        var td = el('td');
        var w = el('button', 'btn btn-klein', 'Wissen');
        w.type = 'button';
        w.addEventListener('click', function () {
          if (!confirm('Deze poging van ' + naam + ' (' + datumTekst(r.datum) + ', ' + puntTekst(r.punten) + '/20) wissen?')) return;
          data.resultaten = data.resultaten.filter(function (x) { return x.id !== r.id; });
          bewaar();
          toonDetail(naam);
          tekenResultaten();
        });
        td.appendChild(w);
        tr.appendChild(td);
        tab.appendChild(tr);
        if (r.opmerking) {
          var or = el('tr', 'opm-rij');
          var oc = el('td', 'hint', 'Opmerking: ' + r.opmerking);
          oc.colSpan = 6;
          or.appendChild(oc);
          tab.appendChild(or);
        }
      });
      inh.appendChild(tab);
    });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }

  // ---------- export ----------
  function puntenLijst() {
    var t = huidigeTest();
    return (data.klassen[ui.klas] || []).map(function (naam) {
      return { naam: naam, r: laatste(ui.klas, naam, t.id) };
    });
  }

  function kopieer(tekst, gelukt) {
    function oud() {
      var ta = document.createElement('textarea');
      ta.value = tekst;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) toast(gelukt); else toonKopieerVenster(tekst);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(tekst).then(function () { toast(gelukt); }, oud);
    } else {
      oud();
    }
  }

  // laatste redmiddel: de tekst geselecteerd tonen, zodat je zelf Ctrl + C drukt
  function toonKopieerVenster(tekst) {
    var d = $('#detail');
    $('#detail-titel').textContent = 'Kopieer met Ctrl + C';
    var inh = $('#detail-inhoud');
    inh.innerHTML = '';
    inh.appendChild(el('p', 'hint', 'De browser liet het kopiëren niet toe. De tekst hieronder is al geselecteerd: druk op Ctrl + C (Mac: Cmd + C).'));
    var ta = document.createElement('textarea');
    ta.rows = 12;
    ta.value = tekst;
    inh.appendChild(ta);
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    ta.focus();
    ta.select();
  }

  function download(naam, inhoud, type) {
    var blob = new Blob([inhoud], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = naam;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function csvVeld(x) {
    var s = String(x === undefined || x === null ? '' : x);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv() {
    var t = huidigeTest();
    var rijen = [['Klas', 'Leerling', 'Test', 'Datum', 'Woorden per minuut', 'Nauwkeurigheid (%)', 'Fouten',
      'Snelheid (/' + maxVan(t.snelheid) + ')', 'Nauwkeurigheid (/' + maxVan(t.nauwkeurigheid) + ')',
      'Techniek (/' + techniekMax() + ')', 'Punt (/20)', 'Opmerking']];
    puntenLijst().forEach(function (x) {
      var r = x.r;
      rijen.push(r
        ? [ui.klas, x.naam, t.titel, datumTekst(r.datum), komma(r.wpm, 1), r.nauwkeurigheid, r.fout,
           r.puntenSnelheid, r.puntenNauwkeurigheid, r.puntenTechniek, puntTekst(r.punten), r.opmerking]
        : [ui.klas, x.naam, t.titel, '', '', '', '', '', '', '', '', 'nog niet getest']);
    });
    var inhoud = '﻿' + rijen.map(function (r) { return r.map(csvVeld).join(';'); }).join('\r\n') + '\r\n';
    var titel = t.titel.replace(/\s*·\s*/g, ' - ').replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim();
    download('Dactylo ' + ui.klas + ' - ' + titel + ' - ' + vandaag() + '.csv', inhoud, 'text/csv;charset=utf-8');
    toast('Het bestand staat in je map Downloads.');
  }

  // ---------- klaslijsten en back-up ----------
  function tekenGegevens() {
    var box = $('#klaslijsten');
    box.innerHTML = '';
    CFG.klassen.forEach(function (k) {
      var lab = el('label', 'klaslijst');
      lab.appendChild(el('span', 'klaslijst-titel', k + ' (' + (data.klassen[k] || []).length + ' leerlingen)'));
      var ta = document.createElement('textarea');
      ta.rows = 12;
      ta.setAttribute('data-klas', k);
      ta.placeholder = 'Familienaam Voornaam\nFamilienaam Voornaam\n…';
      ta.value = (data.klassen[k] || []).join('\n');
      lab.appendChild(ta);
      box.appendChild(lab);
    });
    $('#backup-info').textContent = data.laatsteBackup
      ? 'Laatste back-up: ' + datumTekst(data.laatsteBackup) + '. ' + data.resultaten.length + ' pogingen bewaard.'
      : 'Nog geen back-up gemaakt. ' + data.resultaten.length + ' pogingen bewaard.';
  }

  function bewaarLijsten() {
    var dubbel = [];
    var weg = [];
    $$('#klaslijsten textarea').forEach(function (ta) {
      var k = ta.getAttribute('data-klas');
      var namen = ta.value.split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
        .filter(function (s) { return s.length; });
      var gezien = {};
      namen = namen.filter(function (s) {
        if (gezien[s]) { dubbel.push(s); return false; }
        gezien[s] = true; return true;
      });
      (data.klassen[k] || []).forEach(function (oud) {
        if (namen.indexOf(oud) < 0 && pogingen(k, oud, null).length) weg.push(oud);
      });
      data.klassen[k] = namen;
    });
    bewaar();
    tekenGegevens();
    var m = 'Klaslijsten bewaard.';
    if (dubbel.length) m += ' Dubbele naam weggelaten: ' + dubbel.join(', ') + '.';
    if (weg.length) m += ' Let op: ' + weg.join(', ') + ' staat niet meer in de lijst; de resultaten blijven bewaard.';
    toast(m);
  }

  function backup() {
    data.laatsteBackup = new Date().toISOString();
    bewaar();
    download('dactylo-4orlo-backup-' + vandaag() + '.json', JSON.stringify(data, null, 1), 'application/json');
    toast('Back-up staat in je map Downloads.');
    toonBackupHerinnering();
    if (ui.view === 'gegevens') tekenGegevens();
  }

  function zetBackupTerug(bestand) {
    var lezer = new FileReader();
    lezer.onload = function () {
      var d;
      try { d = JSON.parse(lezer.result); } catch (e) { d = null; }
      if (!geldig(d)) { toast('Dit is geen back-up van deze tool.'); return; }
      var n = d.resultaten.length;
      if (!confirm('Back-up terugzetten? Daarin staan ' + n + ' pogingen. Wat nu in deze browser staat, wordt vervangen.')) return;
      data = legeData();
      data.klassen = d.klassen;
      CFG.klassen.forEach(function (k) { if (!Array.isArray(data.klassen[k])) data.klassen[k] = []; });
      data.resultaten = d.resultaten;
      data.laatsteBackup = d.laatsteBackup || null;
      bewaar();
      tekenGegevens();
      toonBackupHerinnering();
      toast('Back-up teruggezet: ' + n + ' pogingen.');
    };
    lezer.readAsText(bestand);
  }

  function toonBackupHerinnering() {
    var b = $('#melding-backup');
    // niet tijdens een test: dan leidt de melding alleen af
    if (!data.resultaten.length || ui.view === 'test' || ui.view === 'beoordeling') { toon(b, false); return; }
    var nieuwste = data.resultaten.reduce(function (m, r) { return r.datum > m ? r.datum : m; }, '');
    var oud = !data.laatsteBackup || data.laatsteBackup < nieuwste &&
      (Date.now() - new Date(data.laatsteBackup).getTime()) / 86400000 >= BACKUP_NA_DAGEN;
    var nooit = !data.laatsteBackup;
    toon(b, nooit || oud);
    $('#melding-backup-tekst').textContent = nooit
      ? 'Er staan resultaten in deze browser, maar nog geen back-up.'
      : 'Je laatste back-up is ouder dan ' + BACKUP_NA_DAGEN + ' dagen en er zijn nieuwe resultaten.';
  }

  // ---------- klikken en toetsen ----------
  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]');
    if (v) { zetView(v.getAttribute('data-view')); return; }
    var a = e.target.closest('[data-actie]');
    if (!a) return;
    switch (a.getAttribute('data-actie')) {
      case 'terug-lijst': stopTest(); zetView('leerlingen'); break;
      case 'opnieuw': opnieuw(); break;
      case 'bewaar': bewaarResultaat(); break;
      case 'niet-bewaren':
        if (confirm('Deze test niet bewaren?')) { test = {}; zetView('leerlingen'); }
        break;
      case 'kopieer-punten':
        kopieer(puntenLijst().map(function (x) { return x.r ? puntTekst(x.r.punten) : ''; }).join('\n'),
          'De punten van ' + ui.klas + ' staan op het klembord, één per regel.');
        break;
      case 'kopieer-naam-punt':
        kopieer(puntenLijst().map(function (x) { return x.naam + '\t' + (x.r ? puntTekst(x.r.punten) : ''); }).join('\n'),
          'Namen en punten van ' + ui.klas + ' staan op het klembord.');
        break;
      case 'csv': exportCsv(); break;
      case 'bewaar-lijsten': bewaarLijsten(); break;
      case 'backup': backup(); break;
      case 'sluit-detail': $('#detail').close(); break;
    }
  });
  document.addEventListener('keydown', opToets);

  $('#test-kies').addEventListener('change', function () {
    ui.test = this.value; bewaarVoorkeur();
    if (ui.view === 'test' || ui.view === 'beoordeling') { stopTest(); zetView('leerlingen'); }
    else zetView(ui.view);
  });
  $('#toon-toetsenbord').addEventListener('change', function () {
    ui.toetsenbord = this.checked; bewaarVoorkeur();
    toon($('#toetsenbord-blok'), this.checked);
    this.blur();
  });
  $('#backup-bestand').addEventListener('change', function () {
    if (this.files && this.files[0]) zetBackupTerug(this.files[0]);
    this.value = '';
  });
  window.addEventListener('beforeunload', function (e) {
    if (ui.view === 'beoordeling' || (ui.view === 'test' && test.gestart && !test.klaar)) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- start ----------
  toon($('#melding-opslag'), !opslagWerkt);
  tekenTestKeuze();
  tekenTabs();
  zetView('leerlingen');
  toonBackupHerinnering();
})();
