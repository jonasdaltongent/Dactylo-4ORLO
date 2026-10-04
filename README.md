# Dactylo · 4ORLO — typetest met de juiste vingerzetting

Een tool voor het Dactylo-uur in **4ORLOa en 4ORLOb**. Je roept de leerlingen één voor één bij je.
De leerling doet de test op jouw computer. Daarna vul je samen de vragen over de techniek in, en de
tool berekent automatisch een **punt op 20**. Alle resultaten blijven bewaard, zodat je de
vooruitgang per leerling kunt volgen.

**Test 1: de middelste rij** van een AZERTY-toetsenbord (`q s d f g h j k l m` en de spatiebalk).

---

## 1. Openen

- Dubbelklik op `index.html`; de tool opent in je browser. Er is geen internet nodig.
- Wil je de tool via een webadres openen, dan kan dat via GitHub Pages (nog niet gepubliceerd). De
  pagina bevat geen namen. Die tik je zelf in, en ze blijven in je browser.
- **Gebruik altijd dezelfde computer, dezelfde browser en dezelfde manier van openen.** De gegevens
  staan in de browser (zie §6). Opent hij op een andere manier, dan zie je een lege tool.

## 2. Eerste keer: de klaslijsten

Klik op **Klaslijsten en back-up** en plak per klas de namen, **één per regel**. Gebruik
**dezelfde volgorde als in je Skore-puntenboek** (meestal alfabetisch op familienaam). De export
naar Smartschool volgt die volgorde. Klik op **Bewaar de klaslijsten**.

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

## 5. Naar Smartschool

Klik op **Resultaten** en kies de klas. De punten staan in de volgorde van je klaslijst, en wie nog
niet getest is, krijgt een lege regel.

- **Kopieer de punten**: één punt per regel, om in Skore over te nemen of te plakken.
- **Kopieer naam + punt**: om in een rekenblad te plakken.
- **Download voor Excel (.csv)**: alle details per leerling (snelheid, nauwkeurigheid, techniek,
  opmerking).

Maak in Skore de evaluatie aan (op 20) en zet de punten erin, van boven naar onder.

> [!NOTE]
> **Nog na te gaan in Skore:** kun je een gekopieerde kolom plakken in de eerste cel van een
> evaluatie? Dat staat nergens in de documentatie.
>
> **Rechtstreeks kan wél via Google Classroom.** Smartschool kan de punten van een
> Classroom-opdracht met één klik in Skore importeren (**+** › **Resultaten importeren**). Dat moet
> de school wel geactiveerd hebben, en dan moet *Google Classroom* in die lijst staan. Staat het er,
> dan kan deze tool de punten in een Classroom-opdracht zetten. Dat is nog niet gebouwd.

## 6. Gegevens en privacy

- Namen en punten staan **alleen in de browser van deze computer** (localStorage, sleutel
  `dactylo_4orlo_v1`). Ze gaan niet naar internet en staan niet in git.
- **Maak geregeld een back-up** (*Klaslijsten en back-up* › **Back-up downloaden**). Je krijgt een
  JSON-bestand in Downloads. Met **Back-up terugzetten** zet je het op een andere computer of na
  het wissen van de browsergegevens terug. De tool herinnert je eraan als er nieuwe resultaten zijn
  zonder back-up.
- Wis je in de browser de site-gegevens of de geschiedenis met cookies, dan zijn de resultaten weg
  (behalve in je back-up). Een privévenster bewaart niets; de tool waarschuwt dan.
- Een naam wijzigen in de klaslijst koppelt de oude resultaten los: ze blijven bewaard onder de oude
  naam.

## 7. Een nieuwe test toevoegen

Kopieer in `js/testen.js` het blok van test 1, geef het een nieuwe `id` (bijvoorbeeld
`bovenste-rij`) en pas `titel`, `toetsen`, `tekst` en de drempels aan. De test verschijnt vanzelf
in de keuzelijst bovenaan. Verander de `id` van een test niet meer zodra er resultaten mee bewaard
zijn.

## 8. Wat de tool niet kan

- De **vingerzetting** zelf kan een computer niet zien. Daarom vul je de techniekvragen samen in,
  terwijl je meekijkt.
- AZERTY of QWERTY herkent de tool aan de toetsen q, a, z, w en m. Op een vreemd toetsenbord kan die
  melding een keer onterecht verschijnen.

---

*Gemaakt op 4 oktober 2026. Getest in Chrome met gesimuleerde AZERTY-aanslagen, op 1366×768,
1024×768 en een smal scherm. Nog niet met een klas gebruikt.*
