/* ==========================================================================
   Dactylo · 4ORLO — koppeling met Google (Classroom en Drive)
   --------------------------------------------------------------------------
   Werkt pas als googleClientId in js/testen.js ingevuld is (een OAuth-client
   van het type "Webapplicatie" in het Cloud-project Dalton Classroom).

   - Aanmelden: Google Identity Services (token-model). Het toegangstoken staat
     alleen in het geheugen van deze pagina en vervalt na ongeveer een uur.
   - Classroom: klaslijsten lezen, een opdracht per test maken, punten zetten
     en teruggeven. Punten zetten kan alleen in een opdracht die deze koppeling
     zelf maakte (regel van de Classroom-API).
   - Drive: één bestand met alle gegevens in Mijn Drive (scope drive.file:
     de tool ziet alleen de bestanden die hij zelf maakte).
   ========================================================================== */
(function () {
  'use strict';

  var SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/drive.file'
  ];
  var CLASSROOM = 'https://classroom.googleapis.com/v1/';
  var DRIVE = 'https://www.googleapis.com/drive/v3/';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3/';
  var BESTANDSNAAM = 'Dactylo 4ORLO - gegevens (niet verwijderen).json';
  var KENMERK = "appProperties has { key='dactylo' and value='4orlo' } and trashed=false";

  var token = null;
  var verloopt = 0;
  var client = null;
  var wachtend = null;

  function fout(code, bericht) { var e = new Error(bericht); e.code = code; return e; }
  function ingesteld() { return !!(window.DACTYLO && window.DACTYLO.googleClientId); }
  function gisKlaar() { return !!(window.google && google.accounts && google.accounts.oauth2); }
  function verbonden() { return !!token && Date.now() < verloopt - 60000; }

  // ---------- aanmelden ----------
  function maakClient() {
    client = google.accounts.oauth2.initTokenClient({
      client_id: window.DACTYLO.googleClientId,
      scope: SCOPES.join(' '),
      callback: function (r) {
        var w = wachtend; wachtend = null;
        if (!w) return;
        if (r.error) { w.nok(fout('aanmelden', r.error_description || r.error)); return; }
        var alles = google.accounts.oauth2.hasGrantedAllScopes.apply(null, [r].concat(SCOPES));
        if (!alles) { w.nok(fout('toestemming', 'Niet alle vinkjes stonden aan. Klik opnieuw op Verbind met Google en sta alles toe.')); return; }
        token = r.access_token;
        verloopt = Date.now() + (Number(r.expires_in) || 3600) * 1000;
        w.ok();
      },
      error_callback: function (e) {
        var w = wachtend; wachtend = null;
        if (!w) return;
        w.nok(fout('aanmelden', e && e.type === 'popup_closed' ? 'Het aanmeldvenster werd gesloten.'
          : e && e.type === 'popup_failed_to_open' ? 'Het aanmeldvenster werd geblokkeerd. Sta pop-ups toe voor deze pagina.'
          : 'Aanmelden bij Google mislukte.'));
      }
    });
  }

  // moet rechtstreeks vanuit een klik worden aangeroepen (anders blokkeert de browser het venster)
  function verbind() {
    return new Promise(function (ok, nok) {
      if (!ingesteld()) { nok(fout('instelling', 'De koppeling met Google is nog niet ingesteld.')); return; }
      if (!gisKlaar()) { nok(fout('laden', 'Google is nog niet geladen. Is er internet?')); return; }
      if (!client) maakClient();
      wachtend = { ok: ok, nok: nok };
      client.requestAccessToken({ prompt: '' });
    });
  }

  function verbreek() {
    if (token && gisKlaar() && google.accounts.oauth2.revoke) google.accounts.oauth2.revoke(token, function () {});
    token = null;
    verloopt = 0;
  }

  // ---------- algemene aanroep ----------
  function api(methode, url, body, inhoudType) {
    if (!verbonden()) return Promise.reject(fout('verlopen', 'De verbinding met Google is verlopen. Klik op Verbind met Google.'));
    var opties = { method: methode, headers: { Authorization: 'Bearer ' + token } };
    if (body !== undefined) {
      opties.headers['Content-Type'] = inhoudType || 'application/json';
      opties.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return fetch(url, opties).then(function (r) {
      if (r.status === 401) { token = null; throw fout('verlopen', 'De verbinding met Google is verlopen. Klik op Verbind met Google.'); }
      if (!r.ok) {
        return r.text().then(function (t) {
          var m;
          try { m = JSON.parse(t).error.message; } catch (e) { m = t.slice(0, 200); }
          throw fout(r.status, m || ('Fout ' + r.status));
        });
      }
      if (r.status === 204) return null;
      return r.text().then(function (t) {
        if (!t) return null;
        try { return JSON.parse(t); } catch (e) { return t; }
      });
    });
  }

  function alle(url, sleutel) {
    var items = [];
    function pagina(tok) {
      var u = url + (tok ? (url.indexOf('?') >= 0 ? '&' : '?') + 'pageToken=' + encodeURIComponent(tok) : '');
      return api('GET', u).then(function (r) {
        items = items.concat((r && r[sleutel]) || []);
        return r && r.nextPageToken ? pagina(r.nextPageToken) : items;
      });
    }
    return pagina(null);
  }

  // ---------- Classroom ----------
  function cursussen() {
    return alle(CLASSROOM + 'courses?teacherId=me&courseStates=ACTIVE&pageSize=100', 'courses');
  }

  function leerlingen(cursusId) {
    return alle(CLASSROOM + 'courses/' + cursusId + '/students?pageSize=100', 'students').then(function (lijst) {
      return lijst.map(function (s) {
        var n = (s.profile && s.profile.name) || {};
        return {
          id: s.userId,
          naam: n.fullName || ((n.givenName || '') + ' ' + (n.familyName || '')).trim() || s.userId,
          familienaam: n.familyName || '',
          voornaam: n.givenName || ''
        };
      }).sort(function (a, b) {
        return (a.familienaam + ' ' + a.voornaam).localeCompare(b.familienaam + ' ' + b.voornaam, 'nl', { sensitivity: 'base' });
      });
    });
  }

  function opdracht(cursusId, opdrachtId) {
    return api('GET', CLASSROOM + 'courses/' + cursusId + '/courseWork/' + opdrachtId).catch(function (e) {
      if (e.code === 404) return null;
      throw e;
    });
  }

  // een eerder door deze koppeling gemaakte opdracht met deze titel (bv. na het wissen van de browser)
  function zoekOpdracht(cursusId, titel) {
    return alle(CLASSROOM + 'courses/' + cursusId + '/courseWork?courseWorkStates=PUBLISHED&pageSize=100', 'courseWork')
      .then(function (lijst) {
        for (var i = 0; i < lijst.length; i++) {
          if (lijst[i].title === titel && lijst[i].associatedWithDeveloper) return lijst[i];
        }
        return null;
      });
  }

  function maakOpdracht(cursusId, titel, beschrijving, maxPunten) {
    return api('POST', CLASSROOM + 'courses/' + cursusId + '/courseWork', {
      title: titel,
      description: beschrijving,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
      maxPoints: maxPunten
    });
  }

  function inzendingen(cursusId, opdrachtId) {
    return alle(CLASSROOM + 'courses/' + cursusId + '/courseWork/' + opdrachtId + '/studentSubmissions?pageSize=100', 'studentSubmissions');
  }

  // punt invullen en teruggeven; teruggeven neemt het concept-punt niet over, dus beide invullen
  function zetPunt(cursusId, opdrachtId, inzendingId, punt) {
    var basis = CLASSROOM + 'courses/' + cursusId + '/courseWork/' + opdrachtId + '/studentSubmissions/' + inzendingId;
    return api('PATCH', basis + '?updateMask=assignedGrade,draftGrade', { assignedGrade: punt, draftGrade: punt })
      .then(function () { return api('POST', basis + ':return', {}); });
  }

  // ---------- Drive ----------
  function gebruiker() {
    return api('GET', DRIVE + 'about?fields=user(displayName,emailAddress)').then(function (r) { return (r && r.user) || {}; });
  }

  function zoekBestand() {
    return api('GET', DRIVE + 'files?spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&q=' + encodeURIComponent(KENMERK))
      .then(function (r) { return (r && r.files && r.files[0]) || null; });
  }

  function leesBestand(id) {
    return api('GET', DRIVE + 'files/' + id + '?alt=media');
  }

  function maakBestand(inhoud) {
    var grens = 'dactylo' + Date.now();
    var meta = {
      name: BESTANDSNAAM,
      mimeType: 'application/json',
      description: 'Klaslijsten en resultaten van de Dactylo-tool voor 4ORLO. Niet verwijderen. Verplaatsen of hernoemen mag: de tool herkent het bestand zelf.',
      appProperties: { dactylo: '4orlo' }
    };
    var body = '--' + grens + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
      '\r\n--' + grens + '\r\nContent-Type: application/json\r\n\r\n' + inhoud + '\r\n--' + grens + '--';
    return api('POST', UPLOAD + 'files?uploadType=multipart&fields=id,modifiedTime', body, 'multipart/related; boundary=' + grens);
  }

  function schrijfBestand(id, inhoud) {
    return api('PATCH', UPLOAD + 'files/' + id + '?uploadType=media&fields=id,modifiedTime', inhoud, 'application/json');
  }

  window.DactyloGoogle = {
    ingesteld: ingesteld,
    klaar: gisKlaar,
    verbonden: verbonden,
    verbind: verbind,
    verbreek: verbreek,
    cursussen: cursussen,
    leerlingen: leerlingen,
    opdracht: opdracht,
    zoekOpdracht: zoekOpdracht,
    maakOpdracht: maakOpdracht,
    inzendingen: inzendingen,
    zetPunt: zetPunt,
    gebruiker: gebruiker,
    zoekBestand: zoekBestand,
    leesBestand: leesBestand,
    maakBestand: maakBestand,
    schrijfBestand: schrijfBestand,
    bestandsnaam: BESTANDSNAAM
  };
})();
