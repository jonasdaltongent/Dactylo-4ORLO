# Dactylo · 4ORLO — typetest met de juiste vingerzetting

Een tool voor het Dactylo-uur in **4ORLOa en 4ORLOb**. Je roept de leerlingen één voor één bij je.
De leerling doet de test op jouw computer. Daarna vul je samen de vragen over de techniek in, en de
tool berekent automatisch een **punt op 20**. Alle resultaten blijven bewaard, zodat je de
vooruitgang per leerling kunt volgen.

**Test 1: de middelste rij** van een AZERTY-toetsenbord (`q s d f g h j k l m` en de spatiebalk).

---

## 1. Openen

De tool staat op **[jonasdaltongent.github.io/Dactylo-4ORLO](https://jonasdaltongent.github.io/Dactylo-4ORLO/)**.
Zet dat adres als bladwijzer op de computer in je lokaal. De pagina zelf bevat geen namen of
punten. Een nieuwe test die erbij komt, verschijnt daar vanzelf.

## 2. Bij het begin van elk Dactylo-uur: Verbind met Google

Klik rechtsboven op **Verbind met Google** en kies je schoolaccount. De eerste keer vraagt Google
of de tool je klassen, je klaslijsten en de opdrachten mag beheren, en bestanden in je Drive mag
maken. Sta alles toe.

Daarna doet de tool drie dingen:

- hij haalt de **klaslijsten van 4ORLOa en 4ORLOb uit Classroom**, gesorteerd op familienaam;
- hij laadt je **resultaten uit één bestand in je Google Drive**
  (*Dactylo 4ORLO - gegevens (niet verwijderen).json*, in Mijn Drive);
- hij bewaart elke wijziging meteen opnieuw in dat bestand. Rechtsboven staat dan
  "✓ Verbonden · opgeslagen in Drive om …".

De verbinding vervalt na ongeveer een uur. De tool meldt dat, en wat nog niet in Drive staat,
blijft in de browser tot je opnieuw op **Verbind met Google** klikt. Komt er een leerling bij in
Classroom, klik dan bij *Klaslijsten en back-up* op **Vernieuw de klaslijsten uit Classroom**.

## 3. Een leerling testen

1. Kies bovenaan de test en de klas, en klik op de naam van de leerling.
2. De leerling legt de wijsvingers op F en J en kijkt naar het scherm. **De tijd (60 seconden)
   start bij de eerste toets.**
3. Een verkeerde toets wordt rood en telt als fout. De leerling typt dan gewoon de juiste letter.
   Hoofdletters tellen niet. Staat Caps Lock aan, of typt het toetsenbord in QWERTY, dan meldt de
   tool het.
4. Het toetsenbord op het scherm toont de volgende toets in de kleur van de vinger die erbij hoort.
   Je kunt het verbergen met **Toetsenbord tonen**.
5. Na 60 seconden (of als de tekst af is) zie je de snelheid, de nauwkeurigheid en de toetsen met de
   meeste fouten. **Vul samen de zes vragen in.** Daarna verschijnt het punt, en klik je op
   **Bewaar het punt**.
6. Wordt een test verstoord, klik dan op **Opnieuw beginnen**. Bij een herkansing telt de
   **laatste** poging; de vorige blijven zichtbaar.

## 4. Het punt op 20

| Onderdeel | Punten | Hoe |
|---|---|---|
| Snelheid | 4 | woorden per minuut (1 woord = 5 tekens, spaties inbegrepen): **≥ 8 → 4** · ≥ 6 → 3 · ≥ 4 → 2 · ≥ 2 → 1 |
| Nauwkeurigheid | 4 | juiste aanslagen: **≥ 95 % → 4** · ≥ 90 % → 3 · ≥ 85 % → 2 · ≥ 80 % → 1 |
| Techniek | 12 | de zes vragen, samen ingevuld |

De zes vragen over de techniek:

| Vraag | Punten |
|---|---|
| Keek je naar je vingers of naar het toetsenbord? | Nooit 3 · Soms 2 · Vaak 1 · Bijna altijd 0 |
| Gebruikte je voor elke toets de juiste vinger? | Altijd 3 · Meestal 2 · Soms 1 · Zelden 0 |
| Typte je met twee handen: q s d f g links, h j k l m rechts? | Ja 2 · Deels 1 · Nee 0 |
| Lagen je wijsvingers op F en J, en gingen je vingers telkens terug naar de middelste rij? | Ja 2 · Deels 1 · Nee 0 |
| Drukte je de spatiebalk in met je duim? | Ja 1 · Nee 0 |
| Zat je rechtop, met je polsen los van de tafel? | Ja 1 · Nee 0 |

De techniek weegt het zwaarst (12 van de 20), omdat de vingerzetting het doel is. De snelheid is
bewust laag gehouden: 8 woorden per minuut is 40 tekens per minuut.

Alles staat in `js/testen.js`: de drempels, de vragen, de tijd en de tekst. Pas het daar aan.

## 5. Naar Smartschool, via Classroom

1. Klik op **Resultaten**, kies de klas en klik op **Zet de punten in Classroom**.
   - De eerste keer maakt de tool in die klas de opdracht **Dactylo — Test 1 · De middelste rij**
     (op 20, zonder deadline). De leerlingen zien die opdracht, met de uitleg dat ze niets moeten
     inleveren.
   - De punten worden ingevuld en **teruggegeven**: elke leerling ziet zijn of haar punt in
     Classroom.
   - Alleen wie getest is, krijgt een punt. In de tabel zie je per leerling "✓ staat erin".
2. In Skore: klik op **+** › **Resultaten importeren** › **Google Classroom** en kies die opdracht.

Na een herkansing zie je "nog niet" bij die leerling. Klik dan opnieuw op **Zet de punten in
Classroom**: alleen de gewijzigde punten gaan mee, naar dezelfde opdracht.

Punten zetten kan alleen in een opdracht die de tool zelf maakte (zo werkt de Classroom-API).
Maak de dactylo-opdracht dus niet zelf aan in Classroom.

*Andere manieren* (onder de knop): de punten kopiëren in de volgorde van de klaslijst, naam + punt
kopiëren, of een bestand voor Excel met alle details.

## 6. Gegevens en privacy

- Namen en punten staan in **je eigen Google Drive** (het bestand uit §2) en, als kopie, in de
  browser van de computer waarop je werkt. Ze staan **niet op GitHub**: daar staat alleen de lege
  tool.
- Het toegangsbewijs van Google staat alleen in het geheugen van de pagina en vervalt na een uur.
  De tool ziet in Drive alleen de bestanden die hij zelf maakte.
- Ook op een andere computer zie je alles terug: open het adres en klik op **Verbind met Google**.
  Wat in die browser stond, wordt samengevoegd met het bestand in Drive; er gaat niets verloren.
- **Back-up downloaden** (*Klaslijsten en back-up*) maakt een extra kopie als bestand. Met **Back-up
  terugzetten** voeg je die weer toe.
- Is het bestand in Drive ooit onleesbaar, dan overschrijft de tool het niet en meldt hij het. Zet
  het dan in de prullenbak van Drive en verbind opnieuw: de tool maakt een nieuw bestand met wat in
  de browser staat.
- **Zonder Google** (als `googleClientId` in `js/testen.js` leeg is) plak je de klaslijsten zelf,
  en staat alles alleen in de browser. Maak dan geregeld een back-up.

## 7. Een nieuwe test toevoegen

Kopieer in `js/testen.js` het blok van test 1, geef het een nieuwe `id` (bijvoorbeeld
`bovenste-rij`) en pas `titel`, `toetsen`, `tekst` en de drempels aan. De test verschijnt vanzelf
in de keuzelijst bovenaan. Verander de `id` van een test niet meer zodra er resultaten mee bewaard
zijn.

## 8. De koppeling met Google instellen (eenmalig)

De tool gebruikt het Cloud-project **Dalton Classroom** (`spatial-ship-509917-q2`), hetzelfde als
`_tools/zet_opdracht_klaar.py`. Die koppeling heeft een sleutel van het type *Desktop*. Een webpagina
heeft een eigen sleutel van het type **Webapplicatie** nodig:

1. Ga naar [Google Auth Platform › Clients](https://console.cloud.google.com/auth/clients?project=spatial-ship-509917-q2)
   en meld je aan met je schoolaccount.
2. Klik op **Create client** en kies bij **Application type** **Web application**. Geef een naam,
   bijvoorbeeld *Dactylo 4ORLO*.
3. Klik onder **Authorized JavaScript origins** op **Add URI** en voeg toe:
   `https://jonasdaltongent.github.io` en `http://localhost:8732` (om te testen).
4. Klik op **Create** en kopieer de **Client ID** (eindigt op `.apps.googleusercontent.com`).
5. Zet die tussen de aanhalingstekens bij `googleClientId` in `js/testen.js` en publiceer opnieuw.

Een client-ID is niet geheim; een *client secret* gebruikt deze tool niet. De knopnamen komen uit
de [Google-handleiding](https://developers.google.com/workspace/guides/create-credentials) (Engelse
versie, nagelezen op 4 oktober 2026); in een Nederlandse console kunnen ze anders heten.

## 9. Wat de tool niet kan

- De **vingerzetting** zelf kan een computer niet zien. Daarom vul je de techniekvragen samen in,
  terwijl je meekijkt.
- AZERTY of QWERTY herkent de tool aan de toetsen q, a, z, w en m. Op een vreemd toetsenbord kan die
  melding een keer onterecht verschijnen.

---

*Gemaakt op 4 oktober 2026. Getest in Chrome met gesimuleerde AZERTY-aanslagen, op 1366×768,
1024×768 en een smal scherm. De koppeling met Google is getest tegen een nagebootste Classroom en
Drive (verbinden, klaslijsten, opslaan, andere computer, herkansing, verlopen verbinding, onleesbaar
bestand), nog niet met de echte. Nog niet met een klas gebruikt.*
