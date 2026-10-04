/* ==========================================================================
   Dactylo · 4ORLO — de tool
   De tests en de puntenverdeling staan in js/testen.js; de koppeling met
   Google (Classroom en Drive) staat in js/google.js.

   Gegevens:
   - altijd in localStorage van deze browser (sleutel hieronder);
   - verbonden met Google: ook in één bestand in Mijn Drive, na elke wijziging;
   - back-up = een JSON-bestand dat je downloadt en terugzet.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.DACTYLO;
  var G = window.DactyloGoogle;
  var SLEUTEL = 'dactylo_4orlo_v1';
  var VOORKEUR = 'dactylo_4orlo_voorkeur';
  var BACKUP_NA_DAGEN = 7;
  var MAX_PUNTEN = 20;

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
    catch (e) { return String(iso).slice(0, 10); }
  }
  function uurTekst(d) { return d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }); }
  function vandaag() { return new Date().toISOString().slice(0, 10); }
  function toon(e, ja) { if (e) e.hidden = !ja; }

  function toast(tekst, lang) {
    var t = $('#toast');
    t.textContent = tekst;
    t.classList.add('zichtbaar');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('zichtbaar'); }, lang ? 9000 : 3600);
  }

  // ---------- gegevens ----------
  // klassen[k] = [{ naam, id }]; id = Classroom-gebruikers-id (null als je de lijst zelf plakte)
  function legeData() {
    var d = {
      versie: 2, klassen: {}, klassenDatum: '', cursussen: {}, resultaten: [], gewist: [],
      classroom: {}, gesynct: {}, laatsteBackup: null, laatsteDriveOpslag: null
    };
    CFG.klassen.forEach(function (k) { d.klassen[k] = []; });
    return d;
  }

  // leest versie 1 (namen als tekst) en versie 2; null als het geen gegevens van deze tool zijn
  function normaliseer(o) {
    if (!o || typeof o !== 'object' || !o.klassen || typeof o.klassen !== 'object' || !Array.isArray(o.resultaten)) return null;
    var d = legeData();
    Object.keys(o.klassen).forEach(function (k) {
      var lijst = Array.isArray(o.klassen[k]) ? o.klassen[k] : [];
      d.klassen[k] = lijst.map(function (x) {
        return typeof x === 'string' ? { naam: x, id: null } : { naam: String(x.naam || ''), id: x.id || null };
      }).filter(function (x) { return x.naam; });
    });
    CFG.klassen.forEach(function (k) { if (!Array.isArray(d.klassen[k])) d.klassen[k] = []; });
    d.resultaten = o.resultaten.filter(function (r) { return r && r.id && r.klas && r.leerling && r.test; });
    d.gewist = Array.isArray(o.gewist) ? o.gewist : [];
    d.klassenDatum = o.klassenDatum || '';
    d.cursussen = o.cursussen && typeof o.cursussen === 'object' ? o.cursussen : {};
    d.classroom = o.classroom && typeof o.classroom === 'object' ? o.classroom : {};
    d.gesynct = o.gesynct && typeof o.gesynct === 'object' ? o.gesynct : {};
    d.laatsteBackup = o.laatsteBackup || null;
    d.laatsteDriveOpslag = o.laatsteDriveOpslag || null;
    return d;
  }

  // twee versies samenvoegen (deze browser en het bestand in Drive): niets gaat verloren
  function samenvoegen(a, b) {
    var d = legeData();
    var gewist = {};
    a.gewist.concat(b.gewist).forEach(function (id) { gewist[id] = true; });
    d.gewist = Object.keys(gewist);
    var perId = {};
    b.resultaten.concat(a.resultaten).forEach(function (r) { if (!gewist[r.id]) perId[r.id] = r; });
    d.resultaten = Object.keys(perId).map(function (id) { return perId[id]; })
      .sort(function (x, y) { return x.datum < y.datum ? -1 : 1; });
    var nieuwst = (a.klassenDatum || '') >= (b.klassenDatum || '') ? a : b;
    d.klassen = nieuwst.klassen;
    d.klassenDatum = nieuwst.klassenDatum;
    d.cursussen = Object.assign({}, b.cursussen, a.cursussen);
    CFG.klassen.concat(Object.keys(b.classroom), Object.keys(a.classroom)).forEach(function (k) {
      if (b.classroom[k] || a.classroom[k]) d.classroom[k] = Object.assign({}, b.classroom[k], a.classroom[k]);
    });
    d.gesynct = Object.assign({}, b.gesynct);
    Object.keys(a.gesynct).forEach(function (id) {
      if (!d.gesynct[id] || d.gesynct[id].datum < a.gesynct[id].datum) d.gesynct[id] = a.gesynct[id];
    });
    d.laatsteBackup = [a.laatsteBackup, b.laatsteBackup].filter(Boolean).sort().pop() || null;
    d.laatsteDriveOpslag = [a.laatsteDriveOpslag, b.laatsteDriveOpslag].filter(Boolean).sort().pop() || null;
    return d;
  }

  var opslagWerkt = true;
  function laad() {
    var d = legeData();
    try {
      var s = localStorage.getItem(SLEUTEL);
      if (s) d = normaliseer(JSON.parse(s)) || d;
      localStorage.setItem(SLEUTEL + '_test', '1');
      localStorage.removeItem(SLEUTEL + '_test');
    } catch (e) {
      opslagWerkt = false;
    }
    return d;
  }
  function bewaarLokaal() {
    try {
      localStorage.setItem(SLEUTEL, JSON.stringify(data));
      return true;
    } catch (e) {
      opslagWerkt = false;
      toon($('#melding-opslag'), true);
      return false;
    }
  }
  // na elke wijziging: lokaal bewaren en (verbonden) ook in Drive
  function bewaar() {
    var ok = bewaarLokaal();
    drive.vuil = true;
    planDrive();
    return ok;
  }
  function laadVoorkeur() {
    try { return JSON.parse(localStorage.getItem(VOORKEUR)) || {}; } catch (e) { return {}; }
  }
  function bewaarVoorkeur() {
    try { localStorage.setItem(VOORKEUR, JSON.stringify({ klas: ui.klas, test: ui.test, toetsenbord: ui.toetsenbord })); } catch (e) { /* niet erg */ }
  }

  var data = laad();
  var vk = laadVoorkeur();
  var ui = {
    klas: CFG.klassen.indexOf(vk.klas) >= 0 ? vk.klas : CFG.klassen[0],
    test: CFG.tests.some(function (t) { return t.id === vk.test; }) ? vk.test : CFG.tests[0].id,
    toetsenbord: vk.toetsenbord !== false,
    view: 'leerlingen'
  };
  var drive = { id: null, vuil: false, bezig: false, opnieuw: false, laatst: null, fout: null, probleem: '', timer: null };
  var google = { bezig: '', gebruiker: '' };

  function huidigeTest() {
    for (var i = 0; i < CFG.tests.length; i++) if (CFG.tests[i].id === ui.test) return CFG.tests[i];
    return CFG.tests[0];
  }
  function klaslijst(klas) { return data.klassen[klas] || []; }

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
  function hoortBij(r, klas, l) {
    if (r.klas !== klas) return false;
    if (l.id && r.leerlingId) return r.leerlingId === l.id;
    return r.leerling === l.naam;
  }
  function pogingen(klas, l, testId) {
    return data.resultaten.filter(function (r) {
      return hoortBij(r, klas, l) && (!testId || r.test === testId);
    }).sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
  }
  function laatste(klas, l, testId) {
    var p = pogingen(klas, l, testId);
    return p.length ? p[p.length - 1] : null;
  }
  // resultaten zonder Classroom-id koppelen aan een leerling met dezelfde naam
  function koppelResultaten(klas) {
    klaslijst(klas).forEach(function (l) {
      if (!l.id) return;
      data.resultaten.forEach(function (r) {
        if (r.klas === klas && !r.leerlingId && r.leerling === l.naam) r.leerlingId = l.id;
      });
    });
  }
  function inClassroom(r) {
    var s = data.gesynct[r.id];
    return !!s && s.punt === r.punten;
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
  function herteken() {
    tekenGoogle();
    if (ui.view === 'leerlingen') tekenLijst();
    if (ui.view === 'resultaten') tekenResultaten();
    if (ui.view === 'gegevens') tekenGegevens();
    toonBackupHerinnering();
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
    var lijst = klaslijst(ui.klas);
    toon($('#lijst-leeg'), lijst.length === 0);
    lijst.forEach(function (l) {
      var r = laatste(ui.klas, l, t.id);
      var b = el('button', 'leerling' + (r ? ' getest' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'leerling-naam', l.naam));
      b.appendChild(el('span', 'leerling-status', r ? puntTekst(r.punten) + ' / 20 · ' + datumTekst(r.datum) : 'nog niet getest'));
      b.addEventListener('click', function () { startVoor(l); });
      box.appendChild(b);
    });
  }

  // ---------- het toetsenbord op het scherm ----------
  function tekenToetsenbord(t) {
    var box = $('#toetsenbord');
    box.innerHTML = '';
    RIJEN.forEach(function (rij, ri) {
      var r = el('div', 'kb-rij kb-rij-' + ri);
      rij.forEach(function (c) {
        var k = el('span', 'kb-toets v-' + VINGER[c], c);
        k.setAttribute('data-toets', c);
        if (t.toetsen.indexOf(c) < 0) k.classList.add('kb-uit');
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
    var v = $('#volgende');
    v.innerHTML = '';
    if (c === undefined) return;
    var k = document.querySelector('.kb-toets[data-toets="' + c + '"]');
    if (k) k.classList.add('kb-nu');
    v.appendChild(document.createTextNode('Volgende toets: '));
    v.appendChild(el('strong', '', c === ' ' ? 'spatie' : c));
    v.appendChild(document.createTextNode(' · ' + VINGERNAAM[VINGER[c]]));
  }

  // ---------- de test ----------
  var test = {};
  var tekens = [];

  function startVoor(l) {
    var t = huidigeTest();
    test = {
      cfg: t, leerling: l, klas: ui.klas, tekst: t.tekst.replace(/\s+/g, ' ').trim(),
      actief: true, gestart: false, klaar: false,
      pos: 0, juist: 0, fout: 0, foutPerToets: {}, start: 0, timer: null
    };
    $('#test-titel').textContent = t.titel + ' · ' + ui.klas;
    $('#test-naam').textContent = l.naam;
    tekenToetsenbord(t);
    bouwTekst(test.tekst);
    zetKlok(t.duur, 0);
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
    startVoor(test.leerling);
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
    zetKlok(0, 1);
    toonBeoordeling({
      wpm: duur > 0 ? (test.juist / 5) / (duur / 60) : 0,
      nauwkeurigheid: aanslagen ? test.juist / aanslagen * 100 : 0,
      juist: test.juist,
      fout: test.fout,
      duur: Math.round(duur * 10) / 10,
      tekstAf: test.pos >= test.tekst.length,
      foutPerToets: test.foutPerToets
    });
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
    $('#beoordeling-naam').textContent = test.leerling.naam;

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
    var techniek = 0, beantwoord = 0;
    CFG.vragen.forEach(function (v) {
      var a = beoordeling.antwoorden[v.id];
      if (a) { techniek += a.punten; beantwoord++; }
    });
    var som = beoordeling.snelheid + beoordeling.nauwkeurigheid + techniek;
    var max = totaalMax(test.cfg);
    return {
      techniek: techniek,
      punt: max ? Math.round(som / max * MAX_PUNTEN * 10) / 10 : 0,
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
      leerling: test.leerling.naam,
      leerlingId: test.leerling.id || null,
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
    if (bewaar()) toast('Bewaard: ' + test.leerling.naam + ' — ' + puntTekst(p.punt) + ' / 20');
    else toast('Niet bewaard: deze browser blokkeert de opslag.');
    test = {};
    zetView('leerlingen');
  }

  // ---------- resultaten ----------
  function classroomTitel(t) { return 'Dactylo — ' + t.titel; }

  function teSturen(klas, t) {
    var lijst = [], zonderId = [];
    klaslijst(klas).forEach(function (l) {
      var r = laatste(klas, l, t.id);
      if (!r) return;
      if (!l.id) { zonderId.push(l.naam); return; }
      if (!inClassroom(r)) lijst.push({ leerling: l, r: r });
    });
    return { lijst: lijst, zonderId: zonderId };
  }

  function tekenResultaten() {
    var t = huidigeTest();
    var metGoogle = G.ingesteld();
    var tab = $('#tabel');
    tab.innerHTML = '';
    var kop = el('thead');
    var kr = el('tr');
    var koppen = ['Leerling', 'Datum', 'Woorden/min', 'Nauwkeurig', 'Techniek', 'Punt /20', 'Pogingen'];
    if (metGoogle) koppen.push('Classroom');
    koppen.forEach(function (h) { kr.appendChild(el('th', '', h)); });
    kop.appendChild(kr);
    tab.appendChild(kop);
    var body = el('tbody');
    var lijst = klaslijst(ui.klas);
    var som = 0, n = 0;
    lijst.forEach(function (l) {
      var alle = pogingen(ui.klas, l, t.id);
      var r = alle[alle.length - 1];
      var tr = el('tr', r ? '' : 'niet-getest');
      var td = el('td');
      var b = el('button', 'link', l.naam);
      b.type = 'button';
      b.addEventListener('click', function () { toonDetail(l); });
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
        if (metGoogle) {
          tr.appendChild(!l.id ? el('td', 'hint', 'niet uit Classroom')
            : inClassroom(r) ? el('td', 'cr-ok', '✓ staat erin') : el('td', 'cr-nog', 'nog niet'));
        }
      } else {
        var leeg = el('td', 'hint', 'nog niet getest');
        leeg.colSpan = metGoogle ? 7 : 6;
        tr.appendChild(leeg);
      }
      body.appendChild(tr);
    });
    tab.appendChild(body);
    if (lijst.length) {
      var voet = el('tfoot');
      var vr = el('tr');
      vr.appendChild(el('td', '', n + ' van ' + lijst.length + ' getest'));
      var gem = el('td', 'getal', n ? 'Gemiddelde: ' + komma(som / n, 1) + ' / 20' : '');
      gem.colSpan = metGoogle ? 7 : 6;
      vr.appendChild(gem);
      voet.appendChild(vr);
      tab.appendChild(voet);
    } else {
      var leegRij = el('tr');
      var c = el('td', 'hint', 'Nog geen klaslijst voor ' + ui.klas + '.');
      c.colSpan = koppen.length;
      leegRij.appendChild(c);
      body.appendChild(leegRij);
    }
    if (metGoogle) tekenClassroomInfo(t);
  }

  function tekenClassroomInfo(t) {
    $('#classroom-titel').textContent = classroomTitel(t);
    var info = $('#classroom-info');
    if (G.bezigMet) return;
    info.innerHTML = '';
    var s = teSturen(ui.klas, t);
    var tekst = s.lijst.length ? s.lijst.length + (s.lijst.length === 1 ? ' punt moet nog naar Classroom.' : ' punten moeten nog naar Classroom.')
      : 'Alle punten van ' + ui.klas + ' staan in Classroom.';
    if (!pogingenVanTest(ui.klas, t).length) tekst = 'Nog geen resultaten in ' + ui.klas + '.';
    if (s.zonderId.length) tekst += ' ' + s.zonderId.length + ' leerling(en) komen niet uit Classroom; vernieuw de klaslijsten.';
    info.appendChild(document.createTextNode(tekst + ' '));
    var cr = data.classroom[ui.klas] && data.classroom[ui.klas][t.id];
    if (cr && cr.link) {
      var a = el('a', '', 'Open de opdracht in Classroom');
      a.href = cr.link;
      a.target = '_blank';
      a.rel = 'noopener';
      info.appendChild(a);
    }
  }
  function pogingenVanTest(klas, t) {
    return data.resultaten.filter(function (r) { return r.klas === klas && r.test === t.id; });
  }

  function toonDetail(l) {
    var d = $('#detail');
    $('#detail-titel').textContent = l.naam + ' · ' + ui.klas;
    var inh = $('#detail-inhoud');
    inh.innerHTML = '';
    var alle = pogingen(ui.klas, l, null);
    if (!alle.length) inh.appendChild(el('p', 'hint', 'Nog geen pogingen.'));
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
          var vraag = 'Deze poging van ' + l.naam + ' (' + datumTekst(r.datum) + ', ' + puntTekst(r.punten) + '/20) wissen?';
          if (data.gesynct[r.id]) vraag += '\n\nDit punt staat al in Classroom. Daar verandert niets: pas het daar zo nodig zelf aan.';
          if (!confirm(vraag)) return;
          data.resultaten = data.resultaten.filter(function (x) { return x.id !== r.id; });
          data.gewist.push(r.id);
          bewaar();
          toonDetail(l);
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
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  }

  // ---------- export ----------
  function puntenLijst() {
    var t = huidigeTest();
    return klaslijst(ui.klas).map(function (l) { return { naam: l.naam, r: laatste(ui.klas, l, t.id) }; });
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
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
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

  // ---------- Google: verbinden, klaslijsten, Drive ----------
  function tekenGoogle() {
    var aan = G.ingesteld();
    document.body.classList.toggle('google-aan', aan);
    toon($('#google-blok'), aan);
    if (!aan) return;
    var v = G.verbonden();
    var knop = $('#knop-google');
    toon(knop, (!v || !!drive.probleem) && !google.bezig);
    knop.textContent = v ? 'Opnieuw verbinden' : 'Verbind met Google';
    knop.classList.toggle('btn-primair', !v);
    var st = $('#google-status');
    var tekst, fout = false;
    if (google.bezig) tekst = google.bezig;
    else if (!v) { tekst = drive.vuil && drive.id ? 'Verbinding verlopen: wijzigingen staan nog niet in Drive' : ''; fout = !!(drive.vuil && drive.id); }
    else if (drive.probleem) { tekst = drive.probleem; fout = true; }
    else if (drive.fout) { tekst = 'Opslaan in Drive mislukt: ' + drive.fout; fout = true; }
    else if (drive.bezig || (drive.vuil && drive.id)) tekst = 'Opslaan in Drive…';
    else if (drive.laatst) tekst = '✓ Verbonden · opgeslagen in Drive om ' + uurTekst(drive.laatst);
    else tekst = '✓ Verbonden';
    st.textContent = tekst;
    st.classList.toggle('fout', fout);
    if (google.gebruiker && v) st.title = 'Verbonden als ' + google.gebruiker; else st.removeAttribute('title');
  }

  function zetBezig(tekst) { google.bezig = tekst; tekenGoogle(); }

  // vanuit een klik (anders blokkeert de browser het aanmeldvenster)
  function verbindKlik(daarna) {
    zetBezig('Verbinden…');
    G.verbind()
      .then(function () {
        return G.gebruiker().then(function (u) { google.gebruiker = u.emailAddress || u.displayName || ''; }, function () {});
      })
      .then(function () { zetBezig('Klaslijsten ophalen uit Classroom…'); return vernieuwKlassen(); })
      .then(function () { zetBezig('Gegevens laden uit Drive…'); return laadUitDrive(); })
      .then(function () {
        zetBezig('');
        herteken();
        toast('Verbonden met Google. De klaslijsten komen uit Classroom en alles wordt bewaard in je Drive.');
        if (daarna) daarna();
      })
      .catch(function (e) {
        zetBezig('');
        herteken();
        toast(e.message, true);
      });
  }

  function vernieuwKlassen() {
    return G.cursussen().then(function (lijst) {
      var ontbreekt = [];
      return CFG.klassen.reduce(function (p, k) {
        return p.then(function () {
          var c = lijst.filter(function (x) { return x.name === k || x.name.indexOf(k + ' ') === 0; })[0];
          if (!c) { ontbreekt.push(k); return; }
          data.cursussen[k] = { id: c.id, naam: c.name };
          return G.leerlingen(c.id).then(function (ll) {
            data.klassen[k] = ll.map(function (l) { return { naam: l.naam, id: l.id }; });
            koppelResultaten(k);
          });
        });
      }, Promise.resolve()).then(function () {
        data.klassenDatum = new Date().toISOString();
        bewaar();
        if (ontbreekt.length) toast('Geen actieve Classroom-klas gevonden voor ' + ontbreekt.join(', ') + '.', true);
      });
    });
  }

  function laadUitDrive() {
    return G.zoekBestand().then(function (f) {
      if (!f) {
        drive.probleem = '';
        var inhoud = JSON.stringify(data);
        drive.vuil = false;
        return G.maakBestand(inhoud).then(function (r) { drive.id = r.id; naDriveOpslag(); },
          function (e) { drive.vuil = true; throw e; });
      }
      return G.leesBestand(f.id).then(function (inhoud) {
        var o = null;
        try { o = normaliseer(typeof inhoud === 'string' ? JSON.parse(inhoud) : inhoud); } catch (e) { o = null; }
        if (!o) {
          drive.id = null;   // niets overschrijven
          drive.probleem = 'Verbonden, maar het bestand in je Drive is onleesbaar: er wordt niets in Drive opgeslagen.';
          throw new Error('Het gegevensbestand in je Drive is onleesbaar. Er is niets overschreven; je werkt nu alleen in deze browser. ' +
            'Zet dat bestand in de prullenbak van Drive en verbind opnieuw: dan maakt de tool een nieuw bestand.');
        }
        drive.probleem = '';
        drive.id = f.id;
        data = samenvoegen(data, o);
        CFG.klassen.forEach(koppelResultaten);
        bewaarLokaal();
        drive.vuil = false;
        return G.schrijfBestand(drive.id, JSON.stringify(data)).then(naDriveOpslag);
      });
    });
  }

  function planDrive() {
    if (!G.verbonden() || !drive.id) { tekenGoogle(); return; }
    clearTimeout(drive.timer);
    drive.timer = setTimeout(slaOpInDrive, 800);
    tekenGoogle();
  }

  function slaOpInDrive() {
    if (!G.verbonden() || !drive.id) { tekenGoogle(); return; }
    if (drive.bezig) { drive.opnieuw = true; return; }
    drive.bezig = true;
    drive.fout = null;
    drive.vuil = false;            // wijzigingen tijdens het opslaan maken het opnieuw "vuil"
    tekenGoogle();
    G.schrijfBestand(drive.id, JSON.stringify(data))
      .then(naDriveOpslag, function (e) { drive.vuil = true; drive.fout = e.message; })
      .then(function () {
        drive.bezig = false;
        if (drive.opnieuw || drive.vuil && !drive.fout) { drive.opnieuw = false; planDrive(); }
        tekenGoogle();
        toonBackupHerinnering();
      });
  }

  function naDriveOpslag() {
    drive.fout = null;
    drive.laatst = new Date();
    data.laatsteDriveOpslag = drive.laatst.toISOString();
    bewaarLokaal();
  }

  // ---------- Google: punten naar Classroom ----------
  var GESTOPT = {};

  function puntenNaarClassroom() {
    if (!G.verbonden()) { verbindKlik(puntenNaarClassroom); return; }
    var t = huidigeTest();
    var klas = ui.klas;
    var cursus = data.cursussen[klas];
    if (!cursus) { toast('Er is geen Classroom-klas gekoppeld aan ' + klas + '. Klik bij Klaslijsten op Vernieuw.', true); return; }
    var s = teSturen(klas, t);
    if (!s.lijst.length) {
      toast(s.zonderId.length ? 'Deze leerlingen komen niet uit Classroom: ' + s.zonderId.join(', ') + '. Vernieuw de klaslijsten.'
        : 'Alle punten van ' + klas + ' staan al in Classroom.', true);
      return;
    }
    var titel = classroomTitel(t);
    var bekend = data.classroom[klas] && data.classroom[klas][t.id];
    var knop = $('#knop-classroom');
    var info = $('#classroom-info');
    var opdracht = null;
    knop.disabled = true;
    G.bezigMet = true;
    info.textContent = 'Opdracht zoeken in Classroom…';

    (bekend ? G.opdracht(cursus.id, bekend.opdrachtId) : Promise.resolve(null))
      .then(function (o) { return o || G.zoekOpdracht(cursus.id, titel); })
      .then(function (o) {
        var n = s.lijst.length;
        var vraag = (o
          ? 'De punten gaan naar de opdracht "' + titel + '" in ' + cursus.naam + '.'
          : 'In ' + cursus.naam + ' komt een nieuwe opdracht "' + titel + '" (op 20, zonder deadline). De leerlingen zien die opdracht in Classroom.') +
          '\n\nDe punten van ' + n + (n === 1 ? ' leerling worden' : ' leerlingen worden') + ' ingevuld en teruggegeven: ze zien hun punt in Classroom.' +
          (s.zonderId.length ? '\n\nNiet mee (niet uit Classroom): ' + s.zonderId.join(', ') + '.' : '') + '\n\nDoorgaan?';
        if (!confirm(vraag)) throw GESTOPT;
        if (o) return o;
        info.textContent = 'Opdracht maken in Classroom…';
        return G.maakOpdracht(cursus.id, titel,
          'Dactylotest bij je leraar: snelheid, nauwkeurigheid en techniek (de juiste vingerzetting). Je hoeft hier niets in te leveren. Je punt verschijnt hier na de test.',
          MAX_PUNTEN);
      })
      .then(function (o) {
        opdracht = o;
        data.classroom[klas] = data.classroom[klas] || {};
        data.classroom[klas][t.id] = { opdrachtId: o.id, cursusId: cursus.id, titel: titel, link: o.alternateLink || '' };
        bewaar();
        return G.inzendingen(cursus.id, o.id);
      })
      .then(function (inz) {
        var perLeerling = {};
        inz.forEach(function (x) { perLeerling[x.userId] = x; });
        var klaar = 0, mislukt = [];
        return s.lijst.reduce(function (p, x, i) {
          return p.then(function () {
            info.textContent = 'Punten invullen… ' + (i + 1) + ' van ' + s.lijst.length;
            var sub = perLeerling[x.leerling.id];
            if (!sub) { mislukt.push(x.leerling.naam + ' (zit niet in deze opdracht)'); return; }
            return G.zetPunt(cursus.id, opdracht.id, sub.id, x.r.punten).then(function () {
              klaar++;
              data.gesynct[x.r.id] = { punt: x.r.punten, datum: new Date().toISOString() };
            }, function (e) {
              if (e.code === 'verlopen') throw e;
              mislukt.push(x.leerling.naam + ' (' + e.message + ')');
            });
          });
        }, Promise.resolve()).then(function () { return { klaar: klaar, mislukt: mislukt }; });
      })
      .then(function (res) {
        bewaar();
        G.bezigMet = false;
        tekenResultaten();
        var m = res.klaar + (res.klaar === 1 ? ' punt staat' : ' punten staan') + ' in Classroom. In Skore: + › Resultaten importeren › Google Classroom › "' + titel + '".';
        if (res.mislukt.length) m += ' Niet gelukt: ' + res.mislukt.join('; ') + '.';
        toast(m, true);
      })
      .catch(function (e) {
        bewaar();
        G.bezigMet = false;
        tekenResultaten();
        if (e !== GESTOPT) toast(e.message, true);
      })
      .then(function () { knop.disabled = false; });
  }

  // ---------- klaslijsten en back-up ----------
  function tekenGegevens() {
    var box = $('#klaslijsten');
    box.innerHTML = '';
    CFG.klassen.forEach(function (k) {
      var lab = el('label', 'klaslijst');
      lab.appendChild(el('span', 'klaslijst-titel', k + ' (' + klaslijst(k).length + ' leerlingen)'));
      var ta = document.createElement('textarea');
      ta.rows = 12;
      ta.setAttribute('data-klas', k);
      ta.placeholder = 'Familienaam Voornaam\nFamilienaam Voornaam\n…';
      ta.value = klaslijst(k).map(function (l) { return l.naam; }).join('\n');
      lab.appendChild(ta);
      box.appendChild(lab);
    });
    $('#handmatig').open = !G.ingesteld();
    var ck = $('#classroom-klassen');
    ck.innerHTML = '';
    CFG.klassen.forEach(function (k) {
      var c = data.cursussen[k];
      var heeftIds = klaslijst(k).some(function (l) { return l.id; });
      ck.appendChild(el('p', '', k + ': ' + (c && heeftIds ? c.naam + ' in Classroom · ' + klaslijst(k).length + ' leerlingen' : 'nog niet uit Classroom geladen')));
    });
    if (data.klassenDatum) ck.appendChild(el('p', '', 'Laatst vernieuwd: ' + datumTekst(data.klassenDatum) + '.'));
    $('#drive-naam').textContent = G.bestandsnaam;
    $('#backup-info').textContent = (data.laatsteBackup ? 'Laatste back-up: ' + datumTekst(data.laatsteBackup) + '. ' : 'Nog geen back-up gemaakt. ') +
      data.resultaten.length + ' pogingen bewaard.';
  }

  function bewaarLijsten() {
    var dubbel = [], weg = [];
    $$('#klaslijsten textarea').forEach(function (ta) {
      var k = ta.getAttribute('data-klas');
      var oud = klaslijst(k);
      var idVan = {};
      oud.forEach(function (l) { idVan[l.naam] = l.id; });
      var gezien = {};
      var nieuw = ta.value.split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
        .filter(function (s) {
          if (!s.length) return false;
          if (gezien[s]) { dubbel.push(s); return false; }
          gezien[s] = true; return true;
        })
        .map(function (s) { return { naam: s, id: idVan[s] || null }; });
      oud.forEach(function (l) {
        if (!gezien[l.naam] && pogingen(k, l, null).length) weg.push(l.naam);
      });
      data.klassen[k] = nieuw;
    });
    data.klassenDatum = new Date().toISOString();
    bewaar();
    tekenGegevens();
    var m = 'Klaslijsten bewaard.';
    if (dubbel.length) m += ' Dubbele naam weggelaten: ' + dubbel.join(', ') + '.';
    if (weg.length) m += ' Let op: ' + weg.join(', ') + ' staat niet meer in de lijst; de resultaten blijven bewaard.';
    toast(m, dubbel.length || weg.length);
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
      var d = null;
      try { d = normaliseer(JSON.parse(lezer.result)); } catch (e) { d = null; }
      if (!d) { toast('Dit is geen back-up van deze tool.'); return; }
      var n = d.resultaten.length;
      var vraag = 'Back-up terugzetten? Daarin staan ' + n + ' pogingen.\n\n' +
        (G.verbonden() && drive.id ? 'Ze worden samengevoegd met wat er nu is (er gaat niets verloren).' : 'Wat nu in deze browser staat, wordt vervangen.');
      if (!confirm(vraag)) return;
      data = G.verbonden() && drive.id ? samenvoegen(data, d) : d;
      CFG.klassen.forEach(koppelResultaten);
      bewaar();
      herteken();
      toast('Back-up teruggezet: ' + n + ' pogingen.');
    };
    lezer.readAsText(bestand);
  }

  function toonBackupHerinnering() {
    var b = $('#melding-backup');
    // niet tijdens een test (leidt af) en niet als alles al in Drive staat
    if (!data.resultaten.length || ui.view === 'test' || ui.view === 'beoordeling') { toon(b, false); return; }
    var nieuwste = data.resultaten.reduce(function (m, r) { return r.datum > m ? r.datum : m; }, '');
    if (data.laatsteDriveOpslag && data.laatsteDriveOpslag >= nieuwste && !drive.vuil) { toon(b, false); return; }
    var nooit = !data.laatsteBackup;
    var oud = !nooit && data.laatsteBackup < nieuwste &&
      (Date.now() - new Date(data.laatsteBackup).getTime()) / 86400000 >= BACKUP_NA_DAGEN;
    toon(b, nooit || oud);
    $('#melding-backup-tekst').textContent = nooit
      ? (G.ingesteld() ? 'Er staan resultaten in deze browser die nog niet in je Drive staan. Verbind met Google of maak een back-up.'
        : 'Er staan resultaten in deze browser, maar nog geen back-up.')
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
      case 'verbind': verbindKlik(); break;
      case 'classroom': puntenNaarClassroom(); break;
      case 'vernieuw-klassen':
        if (!G.verbonden()) { verbindKlik(); break; }
        zetBezig('Klaslijsten ophalen uit Classroom…');
        vernieuwKlassen().then(function () { toast('Klaslijsten vernieuwd uit Classroom.'); },
          function (e) { toast(e.message, true); })
          .then(function () { zetBezig(''); herteken(); });
        break;
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
    var bezigeTest = ui.view === 'beoordeling' || (ui.view === 'test' && test.gestart && !test.klaar);
    var nietInDrive = G.verbonden() && drive.id && (drive.vuil || drive.bezig);
    if (bezigeTest || nietInDrive) { e.preventDefault(); e.returnValue = ''; }
  });
  setInterval(tekenGoogle, 30000);   // laat zien wanneer de verbinding verloopt

  // ---------- start ----------
  toon($('#melding-opslag'), !opslagWerkt);
  tekenTestKeuze();
  tekenTabs();
  tekenGoogle();
  zetView('leerlingen');

  // voor het testen in de browser
  window.Dactylo = { herteken: herteken, gegevens: function () { return data; } };
})();
