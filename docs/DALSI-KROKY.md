# Další kroky

Stav k 11. 9. 2026, po dokončení oddělení prostředí. Seřazeno podle toho,
co odblokuje nejvíc dalšího — ne podle velikosti práce.

Zásada, proti které se každý bod poměřuje, je v `CLAUDE.md`: **slaví se
zápis, ne výsledek.** Když je návrh s ní v rozporu, řekne se to nahlas
dřív, než se začne stavět.

---

## 1. Historie zápisů — blokuje Přehled

`seed-data.json` je `[]`. Přehled se zapíná po 30 zapsaných dnech, takže
dokud data nejsou, celý oddíl nemá co ukázat a nejde ověřit, že počítá
správně.

**Nevyřešená otázka: odkud těch 45 dní vzít.** Tohle musí rozhodnout
uživatel, ne já — jsou to jeho skutečné zápisy a vymyslet je by znamenalo
založit Přehled na smyšlených datech.

Možnosti k probrání:
- data existují v původní jednosouborové HTML verzi appky → vyexportovat
  a převést do tvaru `seed-data.json`
- data existují jinde (poznámky, tabulka) → dohodnout převod
- data neexistují → Přehled počká, až se 30 dní nazapisuje běžným během

Až bude zdroj jasný, zbývá vyřešit **zápis do produkce**. Pojistka
`refuseProduction()` seed skripty do produkce nepustí a obcházet se nebude.
Cesta: dočasná chráněná routa v appce, spuštěná jednou a hned smazaná.
Rozmyslet až u toho, ne dopředu.

## 2. Linear — pořádek v projektu

Konektor v adresáři existuje, účet je založený, **připojený zatím není**.

- uživatel: claude.ai → Nastavení → Konektory → Linear → Connect
- uživatel: ověřit, že je konektor zapnutý i pro daný chat
- Claude: založit backlog z tohohle souboru, jeden issue na bod

## 3. Napojení na GitHub — nepovinné, ale ušetří opakovanou práci

Dnes se nasazuje ručně přes Vercel CLI s tokenem. S napojeným repozitářem
by push na `main` nasadil produkci a push na `claude/*` vyrobil preview
proti dev databázi — bez tokenu.

Vercel → Settings → Git → Connect. Asi pět minut. Rozhodnutí uživatele.

## 4. Funkce z plánu rozvoje

Seřazeno podle poměru užitku a práce:

| | co | proč teď |
| --- | --- | --- |
| 4.1 | **Editor otázek v Úpravách** | dnes jde sada měnit jen přes `npm run db:retro`; id se nesmí ztratit, editor musí tuhle podmínku hlídat stejně jako skript |
| 4.2 | **Archivace habitu z Úprav** | `ON DELETE RESTRICT` mazání habitu s historií zakáže — archivace je ta správná odpověď, dnes chybí |
| 4.3 | **Export dat** | vlastní data mají jít dostat ven; zároveň řeší zálohu, kterou teď nemáme |
| 4.4 | **Cíle na habit** | pozor na zásadu: cíl smí být informace, ne podmínka pochvaly |
| 4.5 | **Večerní připomínka** | navazuje na stírací los v 20:00 — připomínka má vyzvat k zápisu, ne ke „splnění" |
| 4.6 | **PWA** | ikona na ploše, offline shell; nejvíc práce, nejmíň naléhavé |

## 5. Přehled — nápady uživatele

Uživatel má vlastní návrhy, které chtěl probrat po nasazení oddílu.
Zatím nezazněly. **Začít tím, že je řekne**, ne mým dalším návrhem.

## 6. Technický dluh

- **`middleware.ts` je v Next 16 zastaralý.** Build hlásí:
  `The "middleware" file convention is deprecated. Please use "proxy" instead.`
  Zatím jen varování, ale PIN a omezování pokusů na tom stojí, takže to
  není místo, které se má řešit až pod tlakem.
- **`scripts/_seedtest.ts`** (27 řádků) vypadá jako pozůstatek z ladění.
  Ověřit, jestli ho něco používá, a když ne, smazat.
- **Chybí testy.** Zatím se všechno ověřuje ručně nebo jednorázovými
  skripty ve scratchpadu. Nejcennější by byly u `lib/domain.ts`,
  `lib/insights.ts` a `coverState()` — čistá logika bez databáze.

---

## Co je hotové a nasazené

Zápis ve třech sekcích, oddíly a konfigurovatelné habity, PIN a sezení,
Historie srovnaná se zásadou, zkrácený zápis (sbalování, proužek,
autosave, oslavy), Deník, Přehled, stírací los na retrospektivní otázku,
oddělení dev a produkční databáze.
