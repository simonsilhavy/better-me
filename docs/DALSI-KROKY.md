# Další kroky

Stav k 15. 9. 2026. Seřazeno podle toho, co odblokuje nejvíc dalšího —
ne podle velikosti práce.

Zásada, proti které se každý bod poměřuje, je v `CLAUDE.md`: **slaví se
zápis, ne výsledek.** Když je návrh s ní v rozporu, řekne se to nahlas
dřív, než se začne stavět.

---

## 1. Export dat — jediná chybějící záloha

Dnes visí uživatelova data na dvou věcech: na Neonu a na tom, že se při
zásahu do produkce nic nepokazí. Vlastní kopii, kterou by měl v ruce bez
kohokoli dalšího, nemá.

Nejde o funkci navíc, ale o zálohu. Proto je první.

- tlačítko v Úpravách, stáhne JSON ve stejném tvaru, jaký přijímá
  `PUT /api/entries/:date` — co appka vydá, to umí i přijmout zpátky
- musí obsahovat i to, co je **nevyplněné**, jinak se z exportu nedá
  obnovit rozdíl mezi „nezodpovězeno" a „vědomě žádné"
- k odpovědím patří `id` otázky, na kterou odpovídaly

## 2. Zapomenutý PIN — chybí cesta zpět

Když uživatel zapomene PIN, appka nenabízí nic. Jediné východisko vede
přes Vercel (nastavit nový `APP_PIN`, nasadit) a přes SQL v Neonu
(`delete from login_attempts`). Stalo se to 14. 9. a bez téhle konverzace
by se uživatel dovnitř nedostal.

Sepsat jako postup do `docs/DOKUMENTACE.md`. Není to kód, je to návod —
ale musí existovat dřív, než bude potřeba.

## 3. Editor otázek v Úpravách

Sada jde dnes měnit jen přes `npm run db:retro`, tedy přes commit
a nasazení. Jedno sezení se tím strávilo na přeformulování pěti otázek.

Editor musí hlídat tytéž tři podmínky co skript:

- text se měnit smí, **`id` nikdy**
- otázku s uloženou odpovědí nejde smazat
- nová otázka nesmí dostat už použité `id`

Sada zůstává na 36 — přidat znamená nahradit, aby se nerozmělnila
kadence návratu.

## 4. Archivace habitu z Úprav

`entry_values.habit_id` je `ON DELETE RESTRICT`, takže databáze smazání
habitu s historií odmítne. Archivace je správná odpověď a chybí.

## 5. Výměna API tokenu

Odloženo uživatelem. Token je od 14. 9. zúžený jen na `/api/`, takže
rozhraní appky už neodemyká. Zbývá ho vyměnit a novou hodnotu nesdílet —
tím skončí Claudeův přístup k produkčním datům.

## 6. Ostatní funkce z plánu rozvoje

| | co | poznámka |
| --- | --- | --- |
| 6.1 | Cíle na habit | cíl smí být informace, ne podmínka pochvaly |
| 6.2 | Večerní připomínka | navazuje na los ve 20:00; vyzývá k zápisu, ne ke „splnění" |
| 6.3 | PWA | ikona na ploše, offline shell; nejvíc práce, nejmíň naléhavé |

## 7. Přehled — nápady uživatele

Uživatel má vlastní návrhy, které chtěl probrat po nasazení oddílu.
Zatím nezazněly. **Začít tím, že je řekne**, ne dalším návrhem.

Teď už je na čem — v produkci je 48 skutečných dní, takže Přehled
poprvé ukazuje reálná čísla.

## 8. Linear

Konektor v adresáři existuje, účet je založený, **připojený není**.

- uživatel: claude.ai → Nastavení → Konektory → Linear → Connect
- uživatel: ověřit, že je zapnutý i pro daný chat
- Claude: založit backlog z tohohle souboru

## 9. Napojení na GitHub — nepovinné

Push na `main` by nasadil produkci, push na `claude/*` vyrobil preview
proti dev databázi. Odpadl by tím Vercel token a jeho rotace.
Vercel → Settings → Git → Connect.

## 10. Technický dluh

- **`middleware.ts` je v Next 16 zastaralý.** Build hlásí, že se má použít
  `proxy`. Zatím jen varování, ale stojí na tom PIN i omezování pokusů,
  takže to není místo, které se řeší až pod tlakem.
- **`scripts/_seedtest.ts`** (27 řádků) vypadá jako pozůstatek z ladění.
  Ověřit, jestli ho něco používá, a když ne, smazat.
- **Chybí testy.** Nejcennější by byly u `lib/domain.ts`, `lib/insights.ts`
  a `coverState()` — čistá logika bez databáze. Vymyšlená data v dev mají
  zasazený signál, proti kterému jde ověřit i Přehled.

---

## Hotové a nasazené

Zápis ve třech sekcích, oddíly a konfigurovatelné habity, PIN a sezení,
Historie srovnaná se zásadou, zkrácený zápis (sbalování, proužek,
autosave, oslavy), Deník, Přehled, stírací los na retrospektivní otázku.

Z bezpečnostního bloku: oddělení dev a produkční databáze, migrace
z buildu, pojistka `refuseProduction()`, `seed-data.json` mimo veřejný
repozitář, vymyšlená data v dev, API token zúžený na `/api/`.

Data: 48 dní historie ze staré appky je v produkci, ověřeno proti zdroji
pole po poli.
