/* ==========================================================================
   Dactylo · 4ORLO — de tests en de puntenverdeling
   --------------------------------------------------------------------------
   Hier pas je de tests aan. De rest van de tool (js/dactylo.js) hoef je niet
   aan te raken.

   Een test toevoegen: kopieer het blok van test 1, geef het een nieuwe "id"
   en pas de rest aan. Verander de "id" van een test nooit meer nadat er
   resultaten mee bewaard zijn: de resultaten hangen aan die id.

   Puntenverdeling per test (samen 20):
     snelheid        4 punten  (woorden per minuut, 1 woord = 5 tekens)
     nauwkeurigheid  4 punten  (% juiste aanslagen)
     techniek       12 punten  (de vragen hieronder, samen met de leerling)
   Telt het maximum niet op tot 20, dan rekent de tool het om naar 20.
   ========================================================================== */
window.DACTYLO = {
  klassen: ['4ORLOa', '4ORLOb'],

  tests: [
    {
      id: 'middelste-rij',
      titel: 'Test 1 · De middelste rij',
      toetsen: 'qsdfghjklm',
      uitleg: 'Alleen de middelste rij van het AZERTY-toetsenbord (q s d f g h j k l m) en de spatiebalk.',
      duur: 60, // seconden; de tijd start bij de eerste toets
      // Dezelfde tekst voor iedereen, zodat de resultaten te vergelijken zijn.
      tekst:
        'fff jjj fjf jfj ddd kkk dkd kdk sss lll sls lsl qqq mmm qmq mqm ggg hhh fgf jhj ' +
        'fdsq jklm qsdf mlkj fjdk slqm gfhj dfgh jklm qsdf hjkl gfds ' +
        'ff jj dd kk ss ll qq mm gg hh fj dk sl qm gh fg hj ' +
        'sdf lkj dfg hjk qsd klm fgh jkl djfk slqm fgjh dksl qmfj hgdk ' +
        'fjf dkd sls qmq fgf jhj qsdf jklm gfds hjkl',
      // [minimum, punten]: van hoog naar laag. Heel haalbaar: 8 woorden per minuut = alle punten.
      snelheid: [[8, 4], [6, 3], [4, 2], [2, 1]],
      nauwkeurigheid: [[95, 4], [90, 3], [85, 2], [80, 1]]
    }
  ],

  // Na de test vul je deze vragen samen met de leerling in. Samen 12 punten.
  vragen: [
    {
      id: 'kijken',
      vraag: 'Keek je naar je vingers of naar het toetsenbord?',
      opties: [['Nooit', 3], ['Soms', 2], ['Vaak', 1], ['Bijna altijd', 0]]
    },
    {
      id: 'vingers',
      vraag: 'Gebruikte je voor elke toets de juiste vinger?',
      opties: [['Altijd', 3], ['Meestal', 2], ['Soms', 1], ['Zelden', 0]]
    },
    {
      id: 'handen',
      vraag: 'Typte je met twee handen: q s d f g links, h j k l m rechts?',
      opties: [['Ja', 2], ['Deels', 1], ['Nee', 0]]
    },
    {
      id: 'basis',
      vraag: 'Lagen je wijsvingers op F en J, en gingen je vingers telkens terug naar de middelste rij?',
      opties: [['Ja', 2], ['Deels', 1], ['Nee', 0]]
    },
    {
      id: 'duim',
      vraag: 'Drukte je de spatiebalk in met je duim?',
      opties: [['Ja', 1], ['Nee', 0]]
    },
    {
      id: 'houding',
      vraag: 'Zat je rechtop, met je polsen los van de tafel?',
      opties: [['Ja', 1], ['Nee', 0]]
    }
  ]
};
