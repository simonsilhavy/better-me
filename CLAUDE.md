# BetterMe

## Zásada, na které appka stojí

**Slavit se smí to, že uživatel den zapsal — nikdy to, co v tom dni stálo.**
Odměna patří poctivosti zápisu, ne výsledku.

Appka, která oslavuje výhru, splněný habit nebo dlouhou sérii úspěchů,
zdražuje přiznání špatného dne — a tím si kazí vlastní data. Nejhorší
podoba téhle chyby je, když nezapsaný den vypadá líp než poctivě zapsaný
špatný den.

Z toho plyne, co se smí zvýrazňovat:

- **ano** — kolik dní je zapsaných, jak dlouho se zapisuje v kuse,
  kolik habitů dne je vyplněných, dokončení zápisu
- **ne** — počet výher, série výher, „skóre dne“, cokoli, co dělá
  z dobrého výsledku podmínku pochvaly

Výsledky se ukazovat smí a mají — ale jako **informace k přečtení**,
ne jako odměna nebo trest. Verdikt a barvy voleb v zápisu jsou popis
skutečnosti, ne hodnocení uživatele; ty jsou v pořádku.

Každý nový návrh se poměřuje touhle zásadou. Když je s ní v rozporu,
řekni to nahlas dřív, než ho začneš stavět.

**Jedna vědomá výjimka:** u oddílu Cvičení se drobná animace spouští,
když je aspoň jedna hodnota vyšší než nula. Odměňuje se tím *že se něco
dělo*, ne kolik — a práh na nule je tak nízký, že splnit ho poctivě je
levnější než si ho vylhat. Výjimka platí jen potud, pokud se odměna
**neškáluje**: jeden klik a sto kliků musí spustit úplně totéž. Zápis
nulového dne zůstává potvrzený běžnou cestou, takže poctivost není
nikdy bez odezvy.

## Jazyk

Komunikace s uživatelem probíhá česky.

**Pravopis v textech od uživatele:** když uživatel dodá text, který se
zobrazí v aplikaci (otázky, popisky, výzvy), oprav v něm pravopisné
a gramatické chyby — a **vždy ho na opravu upozorni**: co bylo špatně,
jak to teď zní a proč. Nikdy chybu neopravuj tiše.

Opravuj jen skutečné chyby. Styl, tón, oslovení ani formulaci neměň
bez zeptání — to je autorské rozhodnutí uživatele, ne chyba.

## Retrospektivní otázky

Jediný zdroj je `lib/retro-questions.ts`; skripty ho importují.

**Sada je záměrně malá — 36 otázek.** Délka seznamu je zároveň to, jak
často se otázka vrátí: 36 znamená zhruba měsíčně, asi desetkrát do roka
na tutéž otázku. Teprve tolik odpovědí je řada, ve které jde číst změnu.
Stovka otázek vypadala štědře a dávala tři odpovědi ročně, což řada
není. Než přidávat další otázku, přeformuluj některou stávající.

**Otázka dne je pod stíracím losem a setřít ji jde až po 20:00**
(`coverState()` v `lib/retro.ts`, `components/ScratchCard.tsx`).
Kdo zná otázku ráno, může si den zařídit tak, aby na ni měl dobrou
odpověď — to je stejné zkreslení jako honit se za výhrou. Tři stavy:
`locked` (nejde setřít), `scratchable` (od 20:00), `open`. Budoucí den
se neodemkne ani v noci, minulý je vždy otevřený. Důsledek, se kterým
se počítá: před 20:00 nejde dokončit celý den.

**Tři otázky jsou záměrně bez „dneska"** — č. 4 (`rozhodilo`),
12 (`vdecny`) a 14 (`unava-hlava`). Není to nedodělek; uživatel to tak
chce a rozhodl o tom výslovně. Neupozorňuj na to jako na nesrovnalost.

Odpovědi se na otázky odkazují přes `id`, které se ukládá do
`entry_values.meta`. **Id se nikdy nesmí použít pro jinou otázku
a nesmí zmizet**, dokud na něj odkazuje uložená odpověď — text měnit
lze. `npm run db:retro` sadu nahraje do databáze a tuhle podmínku
před zápisem sám ověří.

## Kde co je

Kompletní dokumentace včetně myšlenek za návrhem a postupu, jak appku
postavit od nuly, je v `docs/DOKUMENTACE.md`. Tenhle soubor je jen
provozní výtah — když se něco rozchází, platí DOKUMENTACE.md.

| Oblast | Soubory |
| --- | --- |
| Doménové typy, převody hodnot, `hasActivity`, `summarize` | `lib/domain.ts` |
| Čtení a zápis dnů, `getStats`, série zápisů | `lib/entries.ts` |
| Deník (výpis napsaného, filtr podle otázky) | `lib/diary.ts` |
| Přehled („Co táhne výhru", „Den v týdnu") | `lib/insights.ts` |
| Losování otázky podle data | `lib/retro.ts` |
| Sada otázek — jediný zdroj | `lib/retro-questions.ts` |
| Sezení, PIN, omezování pokusů | `lib/session.ts`, `middleware.ts` |
| Formulář zápisu, autosave, oslava dne | `components/EntryForm.tsx` |
| Sbalování oddílu, potvrzení, emotikon | `components/GroupPanel.tsx` |
| Schéma databáze | `db/schema.ts`, migrace v `drizzle/` |

## Dvě databáze

Neon má dvě větve a nikdy se nemíchají:

| větev | kde se používá |
| --- | --- |
| `production` | Vercel Production, reálné zápisy |
| `dev` | `.env.local`, Vercel Preview i Development |

**Produkční heslo Claude nemá a mít nemá.** Žije jen v Neonu a ve Vercel
Production. Proto se migrace a sada otázek pouštějí z buildu, kde si Vercel
dosadí správné `DATABASE_URL` sám podle prostředí:

```json
"build": "tsx scripts/migrate.ts && tsx scripts/update-retro-questions.ts && next build"
```

Obojí je idempotentní — drizzle si vede žurnál aplikovaných migrací a sada
otázek se přepíše toutéž hodnotou. Rozbitá migrace shodí celý deploy; to je
záměr, nasazovat kód bez jeho schématu nemá smysl.

Ostatní zapisující skripty mají pojistku `refuseProduction()`
(`scripts/guard.ts`). Ověřuje **pozitivně**: cíl musí být host uvedený
v `DEV_DB_HOST` v `.env.local`, všechno ostatní odmítne. Seznam zakázaných
endpointů by propustil databázi, na kterou nikdo nepomyslel — a hostname
projektu nemá co dělat ve veřejném repozitáři. Fail-closed: chybějící
`DATABASE_URL`, chybějící `DEV_DB_HOST` i nerozparsovatelná adresa znamenají
odmítnutí. Vědomý běh jinam: `ALLOW_PRODUCTION=1 npm run db:seed`.

Jednorázové naplnění produkce daty (45 dní historie) tudy nepůjde — až na to
dojde, řeší se zvlášť, ne obcházením pojistky.

**Repozitář je veřejný.** Do commitu nesmí heslo, token, connection string
ani hostname databáze. Ověřeno, že v historii zatím nic takového není.

## Pracovní postup

```bash
npx tsc --noEmit && npx eslint . && npm run build   # před každým commitem
```

`npm run build` sám aplikuje migrace na tu databázi, na kterou míří
`DATABASE_URL` — lokálně tedy na dev. Samostatné `npm run db:migrate`
zůstává pro případ, že je potřeba migrovat bez buildu.

Migrace se generují `npm run db:generate` a soubor se přejmenovává na
mluvící název (i v `drizzle/meta/_journal.json`). Drizzle-kit potřebuje
`DATABASE_URL` v prostředí — `set -a; . ./.env.local; set +a`.

Nasazení: `npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"`
s `NODE_USE_ENV_PROXY=1` a `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
Produkční adresa je `better-me-kohl.vercel.app`. Nasazení občas spadne
na „fetch failed" — opakuj. Pokud hlásí `Not authorized`, vypršel token
a musí ho poslat uživatel.

## Na co si dát pozor

- **Posuvník s hodnotou 0 nejde odpovědět tím, že se nastaví znovu na 0.**
  React událost nevydá, když se hodnota nezměnila. Platí to i pro testy
  v Playwrightu: `fill()` navíc odmítne hodnotu mimo `step`. Nastavuj
  hodnotu přes nativní setter a `dispatchEvent('input')`.
- **`pkill -f next-server` zabije i vlastní shell**, pokud je hledaný
  řetězec v tomtéž příkazu. Používej `scratchpad/restart.sh`.
- Ukládá se **každý odpovězený habit**, i když se hodnota rovná výchozí.
  Rozdíl mezi „nezodpovězeno" a „vědomě Žádné" je nosný.
- `entry_values.habit_id` je `ON DELETE RESTRICT` — databáze odmítne
  smazat habit s historií. Je to pojistka, ne překážka.

## Stav a co dál

**Plán dalších kroků je v `docs/DALSI-KROKY.md`** — seřazený podle toho,
co odblokuje nejvíc dalšího, včetně nevyřešených otázek, které patří
uživateli. Tenhle oddíl je jen shrnutí.

Hotové a nasazené: srovnání Historie se zásadou, zkrácení zápisu
(sbalování, proužek, autosave, oslavy), Deník, Přehled, stírací los,
oddělení dev a produkční databáze.

Nejbližší blokující věc: **45 dní historických zápisů** — `seed-data.json`
je `[]` a bez nich Přehled nemá co ukázat (zapíná se po 30 zapsaných
dnech). Odkud data vzít, rozhoduje uživatel.
