# BetterMe — kompletní dokumentace

Tenhle dokument je psaný tak, aby podle něj šlo aplikaci postavit od nuly:
obsahuje jak myšlenky, na kterých stojí, tak všechny technické podrobnosti
a přesné postupy. Když si někdy v budoucnu nebudeš jistý, *proč* je něco
uděláno takhle, hledej odpověď nejdřív v části 1 — většina rozhodnutí z ní
plyne.

- [1. Proč to existuje a na čem to stojí](#1-proč-to-existuje-a-na-čem-to-stojí)
- [2. Co uživatel vidí](#2-co-uživatel-vidí)
- [3. Retrospektivní otázky](#3-retrospektivní-otázky)
- [4. Datový model](#4-datový-model)
- [5. Doménový model](#5-doménový-model)
- [6. Chování obrazovky Zápis](#6-chování-obrazovky-zápis)
- [7. Historie](#7-historie)
- [8. Deník](#8-deník)
- [9. Přehled](#9-přehled)
- [10. Přístup a bezpečnost](#10-přístup-a-bezpečnost)
- [11. API](#11-api)
- [12. Postavení od nuly](#12-postavení-od-nuly)
- [13. Migrace](#13-migrace)
- [14. Skripty](#14-skripty)
- [15. Provozní pasti](#15-provozní-pasti)
- [16. Vědomá rozhodnutí](#16-vědomá-rozhodnutí)
- [17. Co je otevřené](#17-co-je-otevřené)

---

## 1. Proč to existuje a na čem to stojí

BetterMe je osobní denní tracker pro jednoho uživatele. Vznikl jako náhrada
jednosouborového HTML artefaktu, kde byla data natvrdo v kódu.

### Zásada, na které to celé stojí

> **Slavit se smí to, že uživatel den zapsal — nikdy to, co v tom dni stálo.**
> Odměna patří poctivosti zápisu, ne výsledku.

Aplikace, která oslavuje výhru, splněný habit nebo dlouhou sérii úspěchů,
zdražuje přiznání špatného dne. Kdo má za sebou dvanáct výher v řadě, je
motivovaný třináctý den trochu přibarvit — a v ten moment si aplikace kazí
vlastní data. Data, na kterých pak stojí všechny pohledy v části 9.

**Nejhorší podoba té chyby je, když nezapsaný den vypadá líp než poctivě
zapsaný špatný den.** Přesně to aplikace dělala: kalendář barvil výhru zeleně,
prohru červeně a nezapsaný den nechával prázdný. Poctivě přiznaný špatný den
svítil červeně přes celý přehled roku, kdežto den, který uživatel radši
zamlčel, nesvítil nijak. Mlčení vypadalo líp než upřímnost — a bylo to na
nejviditelnější obrazovce. To je ta past, kvůli které zásada existuje.

### Co z toho plyne

| Smí se zvýrazňovat | Nesmí se zvýrazňovat |
| --- | --- |
| kolik dní je zapsaných | počet výher |
| jak dlouho se zapisuje v kuse | série výher |
| kolik habitů dne je vyplněných | „skóre dne“ |
| že je zápis hotový | cokoli, co dělá z dobrého výsledku podmínku pochvaly |

Výsledky se ukazovat **smí a mají** — ale jako informace k přečtení, ne jako
odměna nebo trest. Verdikt a barvy voleb v zápisu popisují skutečnost;
neodměňují ani netrestají uživatele, a proto jsou v pořádku. Objeví se navíc
až *poté*, co uživatel odpoví, takže nic nenapovídají dopředu.

### Jedna vědomá výjimka

U oddílu Cvičení se spouští drobná animace (💪), když je při dokončení oddílu
aspoň jedna hodnota vyšší než nula. Formálně je to odměna za výsledek, ale
obstojí, a to ze dvou důvodů:

1. **Odměňuje se, že se něco dělo, ne kolik.** Jeden klik a sto kliků spustí
   úplně stejnou animaci.
2. **Práh je tak nízko, že poctivost je levnější než lež.** Jeden klik uděláš
   dřív, než stihneš napsat jedničku, kterou jsi neudělal. Pasti, které svádějí
   ke lhaní, jsou vysoké prahy — ne ty na nule.

Výjimka platí jen potud, pokud se odměna **neškáluje**. Ve chvíli, kdy by se
při lepších číslech zvětšovala, měnila nebo přidávala, zásada padá. Zápis
nulového dne zůstává potvrzený běžnou cestou (`✓ hotovo`), takže poctivost
není nikdy bez odezvy — emotikon je bonus navrch, ne jediné potvrzení.

### Pravidlo pro další vývoj

Každý nový návrh se poměřuje touhle zásadou. Když je s ní v rozporu, řekne se
to nahlas dřív, než se začne stavět.

---

## 2. Co uživatel vidí

Pět obrazovek, všechny za PIN bránou.

| Trasa | K čemu je |
| --- | --- |
| `/` | Zápis dnešního dne |
| `/den/[datum]` | Kterýkoli konkrétní den, s šipkami na sousední dny |
| `/historie` | Kalendář, statistiky zápisu, trend u každého habitu |
| `/historie/[key]` | Detail jednoho habitu: graf, čísla za období, dny |
| `/denik` | Všechno napsané, hledání, filtr podle otázky |
| `/prehled` | Dva analytické pohledy; zapne se po 30 zapsaných dnech |
| `/nastaveni` | Oddíly a habity: tvorba, přejmenování, pořadí, přesun, archivace |
| `/login` | Číselná klávesnice pro PIN |

Jazyk rozhraní je čeština, kód a komentáře jsou anglicky.

### Výchozí struktura

Osm oddílů, šestnáct habitů. Všechno je konfigurovatelné v Úpravách — tohle je
jen to, co nasype seed.

| Oddíl | Habity |
| --- | --- |
| Energie | Energie ráno, Energie využitá (scale 0–100 %, krok 10) |
| Cvičení 💪 | Kliky, Dřepy (counter 0–250, krok 5), Uběhnuto (counter 0–30 km, krok 0,1) |
| Zdraví | Protahování (Žádné/Horní/Dolní/Celé), Studená sprcha (Žádná/Částečná/Celá) |
| Strava | Protein shake (0/1/2), Odpolední protein (✓/✗) |
| Principy | Instagram (✓/✗, nápověda „pravidlo drženo do 17:00“), Co otevřu, dořeším (✓/✗) |
| Práce | Daňová Pohoda, BetterMe (duration 0–480 min, krok 15) |
| Retrospektiva | Retrospektiva (kind `retro`) |
| Uzávěrka dne | Verdikt (Výhra/Prohra, role `verdict`), Poznámka (text, role `note`) |

---

## 3. Retrospektivní otázky

Každý den položí aplikace jednu otázku k sebereflexi a nabídne pole na odpověď.
Tohle je jediná část aplikace, která má vlastní netriviální návrh, tak stojí za
podrobný popis.

### Kolik jich má být — výpočet

Otázka se vybírá deterministicky podle data:

```ts
index = |dní od 2026-01-01 k dnešku| % počet_otázek
```

Z toho plyne zásadní věc: **délka seznamu je zároveň to, jak často se otázka
vrátí.** Není to volný parametr, je to to nejdůležitější číslo v celém návrhu.

| Otázek | Vrací se po | Odpovědí na tutéž otázku za rok |
| ---: | ---: | ---: |
| 100 | 100 dnech | 3,6× |
| 50 | 50 dnech | 7,3× |
| **36** | **36 dnech** | **10,1×** |
| 30 | 30 dnech | 12,2× |
| 25 | 25 dnech | 14,6× |

Smyslem sady není rozmanitost sama o sobě. Smyslem je, aby se ke každé otázce
dalo po čase vrátit a **přečíst si vlastní odpovědi jako řadu** — jak se mění
to, za co jsi vděčný, čeho se bojíš, co odkládáš. Tři odpovědi ročně řada
nejsou. Deset už ano.

Sada měla v jedné fázi 100 otázek. Vypadalo to štědře a byla to chyba: vyrábělo
to 3,6 odpovědi ročně na otázku, tedy hromádku nesouvisejících střípků. Zúžení
na **36** dává návrat po měsíci — dost dlouho, aby otázka nezevšedněla, dost
často, aby si člověk při čtení vzpomněl, co říkal minule.

**Pravidlo pro budoucnost: než přidávat další otázku, přeformuluj některou
stávající.** Každá přidaná otázka ředí všechny ostatní.

### Podle čeho se otázky vybírají

1. **Jde ji zodpovědět kterýkoli den.** Otázka, na kterou je odpověď většinou
   „nic“ (např. „Kdy jsi dneska cítil závist?“), vyrábí prázdné záznamy a žádný
   trend.
2. **Odpověď se v čase může měnit.** Ptá se na stav nebo vzorec, ne na
   jednorázový fakt.
3. **Neduplikuje jinou otázku.** Při 36 slotech je každý překryv plýtvání —
   dvakrát měsíčně odpovídáš skoro na totéž. Ze sady takhle vypadly dvojice
   jako „Co bys udělal jinak“ / „Co bys změnil“ nebo „Za co bys se pochválil“ /
   „Za co můžeš být hrdý“.
4. **Oslovení je jednotné** — celá sada tyká a používá hovorové „dneska“
   a „nejvíc“, aby seděla ke zbytku aplikace.

### Poctivá cesta: ke každé odpovědi se ukládá otázka

Ke každé odpovědi se do `entry_values.meta` uloží `{"q": "<id otázky>"}`.
Vypadá to jako detail, ale je to nosná věc:

- Filtr v Deníku podle otázky je pak prostá rovnost — všechny odpovědi na
  „Za co jsi vděčný?“ se seřadí za sebe napříč měsíci.
- Funguje to i po **přeformulování** otázky. Zobrazuje se vždy dnešní znění,
  takže opravený překlep se propíše i do starých záznamů.
- Odpověď zapsaná přes API jako holý řetězec (chat relay neví, jaká otázka
  padla) dostane otázku daného dne doplněnou automaticky při zápisu.

### Stírací los: otázka je do večera zamčená

Otázka dne je zakrytá stíracím losem a **setřít ji jde až po 20:00**.

**Proč:** kdo zná otázku ráno, může si den zařídit tak, aby na ni měl dobrou
odpověď. Je to stejné zkreslení jako honit se za výhrou, jen jemnější a hůř
viditelné — místo aby odpověď popisovala den, začne den sloužit odpovědi.
Retrospektiva patří na konec dne, ne do plánu u snídaně, a zámek to říká
natvrdo místo aby to jen doporučoval.

**Tři stavy (`coverState()` v `lib/retro.ts`):**

| Stav | Co to znamená |
| --- | --- |
| `locked` | pod losem, který nejde setřít — plátno nebere vstup a nese 🔒 |
| `scratchable` | pod losem, který jde rozetřít prstem nebo myší |
| `open` | otázka je čitelná |

| Situace | Stav |
| --- | --- |
| dnešek před 20:00 | `locked` |
| dnešek od 20:00 | `scratchable` |
| dnešek, už setřeno | `open` — pamatuje se to |
| dnešek, už je odpověď | `open` — co jsi napsal, nejde odenevědět |
| minulý den | `open` — den je pryč, není co zařizovat |
| budoucí den | `locked`, **a neodemkne se ani ve 23:00** |

Ten poslední řádek je důležitý: kdyby se budoucí dny odemykaly podle hodiny,
měl bys každý večer volný přístup k zítřejší otázce — tedy přesně to, čemu
má zámek bránit, jen o den posunuté.

**Jak to vypadá:** plátno s broušeným kovem a diagonálním leskem. Zamčené
a odemčené vypadají stejně — rozdíl nese text, ne barva. Zamčené říká
*„Počkej do večera / Setřít ji půjde po 20:00"*, odemčené *„Dnešní otázka /
Setři ji a odkryj"* a má v rohu tlačítko *Odkrýt rovnou* pro ty, kdo stírat
nechtějí, a pro ovládání klávesnicí. Po setření zhruba 45 % zbytek sám odplyne.

Otevřená stránka se kontroluje každých 30 vteřin, takže se ve 20:00 odemkne
sama i na kartě, která zůstala celý večer na obrazovce.

Že je karta setřená, si pamatuje `localStorage` pod klíčem
`bm-retro-revealed-<datum>` — stejně jako sbalený oddíl je to věc zařízení,
ne dat. Na druhém zařízení se setře znovu.

**Důsledek, se kterým se počítá:** retrospektivu nejde vyplnit před 20:00,
takže ani **celý den nejde dokončit dřív** — oslava konce dne (část 6) se
před osmou nespustí. Je to záměr, ne vedlejší efekt: den není hotový, dokud
se nad ním člověk nezastavil.

**Známá mez:** text otázky je pod plátnem přítomný v DOM. Před čtečkou
obrazovky i před tabulátorem je schovaný (`inert`), ale kdo se podívá do
vývojářských nástrojů, přečte si ho. Bránit tomuhle by znamenalo otázku
nevykreslovat vůbec — a pak by stírání neodkrývalo nic a ztratilo smysl.
Proti tomu, co má zámek řešit (nevidět ji omylem a pak na ni celý den
myslet), je to nepodstatné.

### Smlouva o id

**Id se nikdy nesmí použít pro jinou otázku a nesmí zmizet, dokud na něj
odkazuje uložená odpověď.** Text měnit lze a je to bezpečné.

`npm run db:retro` nahraje sadu do databáze, ale nejdřív ověří, že žádné id
v použití nezmizelo. Když by zmizelo, **odmítne zápis a skončí s kódem 1**.

Z toho plyne praktický důsledek: **zúžení sady je zadarmo jen dokud na otázky
neexistují odpovědi.** Potom už odebrání otázky znamená osiřelé odpovědi.
Pokud se sada má výrazně měnit, je na to jediná vhodná chvíle — na začátku.

### Finální sada (36)

V pořadí, ve kterém se vracejí. Prostřídané tak, aby po sobě nešla dvě podobná
témata.

```
 1. Co dneska stálo nejvíc energie — a stálo to za to?
 2. Komu jsi dneska udělal radost?
 3. Za co jsi dneska nakonec neutratil peníze, i když jsi o tom přemýšlel?
 4. Co tě rozhodilo a jak dlouho trvalo se vrátit?
 5. Co z dneška bude mít smysl ještě za týden?
 6. Kdy ti to dneska šlo samo?
 7. Co jsi dneska dotáhl do konce?
 8. Co jsi dneska neřekl, i když jsi měl?
 9. Co ti dneska sebralo nejvíc pozornosti?
10. Za co bys sám sebe dneska pochválil?
11. Co ses dneska dozvěděl o sobě?
12. Za co jsi vděčný?
13. Do čeho ses dneska pustil, i když sis nebyl jistý?
14. Bránila ti víc únava, nebo hlava?
15. Komu jsi dneska měl poděkovat?
16. Kolik z dneška bylo tvoje rozhodnutí a kolik setrvačnost?
17. Co jsi dneska obětoval pro svůj vysněný život?
18. Co tě dneska stálo nejvíc sebekontroly?
19. Na koho sis dneska vzpomněl a neozval ses mu?
20. Udělal jsi dneska něco, co se ti nechtělo?
21. V čem jsi dneska byl lepší než před rokem?
22. Co ti dneska dalo pocit smysluplnosti?
23. Co ses dneska dozvěděl nového?
24. Co jsi dneska udělal, i když to nikdo nekontroloval?
25. Co ti dneska někdo řekl a zanechalo to na tobě stopu?
26. Co jsi dneska pokazil a jak to napravíš?
27. Čeho ses dneska bál a co se opravdu stalo?
28. Co by si o tvém dnešním dni myslel člověk, kterým chceš za rok být?
29. Kdy ses dneska cítil nejvíc sám sebou?
30. Na co jsi dneska řekl ne?
31. Co bys udělal jinak, pokud bys zažil dnešek znovu?
32. Kde jsi dneska hledal potvrzení nebo pochvalu zvenčí místo toho, aby ses spolehl na vlastní úsudek?
33. Co sis odložil na zítra, i když bys to zvládl dneska?
34. Co si z dneška chceš zapamatovat?
35. Co jsi dneska udělal jen proto, aby to někdo viděl?
36. Pokud by dneska byl tvůj poslední den, stál by za to?
```

Pokrytá témata: energie a tělo · lidé kolem tebe · pozornost a odkládání ·
emoce · smysl a směr · lehkost a autenticita · uznání a integrita · učení
a chyby · vděk a paměť · úsilí a hranice · peníze.

Jediný zdroj je `lib/retro-questions.ts`; oba seed skripty ho importují.

---

## 4. Datový model

Šest tabulek, definice v `db/schema.ts`.

### Obsahové tabulky

| Tabulka | Co drží |
| --- | --- |
| `habit_groups` | pojmenované oddíly — `key`, `label`, `position`, `config`, `archived_at` |
| `habits` | co se sleduje — `key`, `label`, `kind`, `config`, `group_id`, `role`, `position`, `archived_at` |
| `entries` | jeden řádek za každý den, kterého se někdo dotkl |
| `entry_values` | jedna zapsaná hodnota na den a habit — `num`, `txt`, `flag`, `meta` |

### Provozní tabulky

| Tabulka | Co drží |
| --- | --- |
| `sessions` | `id`, `tag`, `expires_at` — přihlášení žije na serveru, ne v cookie |
| `login_attempts` | `key` (IP nebo `__global__`), `fails`, `locked_until`, `window_start` |

### Rozhodnutí, která nese schéma

**Hodnoty se odkazují na habit, nikdy na oddíl.** Přesun habitu mezi oddíly
tak změní jedno pole v `habits` a nedotkne se ani jediného zapsaného řádku.
Tohle bylo ověřeno na 3 756 řádcích: snapshot před přesunem a po přesunu byl
identický řádek po řádku.

**`entry_values.habit_id` je `ON DELETE RESTRICT`.** Databáze odmítne smazat
habit, na kterém visí historie. Data tak jdou ztratit jedině vědomým,
potvrzeným smazáním — nikdy jako vedlejší účinek něčeho jiného.

**Ukládá se každý odpovězený habit, i když se hodnota rovná výchozí.** Vědomě
zvolené „Žádné“ je odpověď a je potřeba ji odlišit od habitu, kterého se
uživatel nedotkl. Habit bez řádku je habit, který jsi přeskočil — a jen díky
tomu jde zodpovědět otázka „kolik z dneška mám vyplněno“.

**`habit_groups.config`** nese nastavení vzhledu oddílu, zatím jen `emoji`.
Je to vlastnost oddílu, ne zadrátované jméno, takže přežije přejmenování.

---

## 5. Doménový model

Všechno v `lib/domain.ts`.

### Typy habitů

| `kind` | Ovládání | Sloupec | Konfigurace |
| --- | --- | --- | --- |
| `scale` | posuvník | `num` | `min`, `max`, `step`, `unit` |
| `counter` | posuvník | `num` | `min`, `max`, `step`, `unit` |
| `duration` | posuvník, zobrazuje se v hodinách | `num` | `min`, `max`, `step` |
| `choice` | segmentovaná tlačítka | `txt` | `options[]`, `clearable` |
| `boolean` | přepínač | `flag` | — |
| `text` | volný text | `txt` | `maxLength`, `placeholder`, `hideLabel` |
| `retro` | otázka + odpověď | `txt` + `meta` | `maxLength`, `hideLabel`, `questions[]` |

`options[]` má `value`, `label` a `tone` (`good` / `partial` / `bad`), který
řídí barvu tlačítka — zelená, žlutá, červená. Barva se objeví **až po
odpovědi**; dokud se uživatel tlačítka nedotkne, je neutrálně modré.

### Role

`habits.role` označuje habit, o který se opírají statistiky:

- `verdict` — z něj se počítají výhry a prohry
- `note` — zobrazuje se v seznamech historie

Oba jsou obyčejné, odstranitelné habity. Když verdikt chybí, obrazovky se
degradují (dlaždice zmizí) místo aby vykreslily nuly, které by vypadaly jako
skutečné výsledky.

### Převod hodnot

`coerceValue()` přijme cokoli — tělo API požadavku, seed soubor, formulář —
a udělá z toho hodnotu, kterou habit umí držet:

- čísla se ořežou na `min`/`max` a přichytí ke kroku
- **potom se zaokrouhlí na přesnost toho kroku.** Přichytávání k desetinnému
  kroku po sobě nechává binární zbytky (`3 * 0.1` je `0.30000000000000004`),
  které by se jinak uložily i zobrazily tak, jak jsou
- neznámá volba spadne na výchozí hodnotu habitu
- klíč, který neodpovídá žádnému habitu, se vrátí v `ignoredKeys` — nikdy se
  tiše nezahodí

### Dvě pomocné funkce, na kterých záleží

**`hasActivity(habit, value)`** — dělo se něco? Číslo > 0, přepínač zapnutý,
volba s tónem `good`. Používá se na dvou místech: pro spuštění emotikonu
u oddílu a pro rozdělení dnů v pohledu „Co táhne výhru“.

**`summarize(habit, value)`** — hodnota v co nejmenším počtu znaků, pro jediný
řádek, který po sobě nechá sbalený oddíl.

---

## 6. Chování obrazovky Zápis

Zápis je nejdelší obrazovka aplikace — šestnáct karet pod sebou. Všechno
v téhle části útočí na totéž: zkrátit cestu od otevření k hotovu.

### Hotový oddíl se sám sbalí

Jakmile oddíl dosáhne plného počtu, po `FOLD_DELAY_MS` (1 100 ms) se sbalí
a nechá po sobě jeden řádek s tím, co je v něm zapsané. Stránka se během
vyplňování zkracuje místo aby stála.

Pauza existuje proto, aby se oddíl nesbalil pod prstem, který ještě pracuje:
každá další změna ji restartuje. **Ruční sbalení nebo rozbalení má vždycky
přednost** — od té chvíle se automatika u toho oddílu vypne.

Který oddíl je sbalený, je věc zařízení, ne dat — žije to v `localStorage`
a čte se to až po mountu, protože server o tom nemůže nic vědět.

### Proužek postupu

Pod hlavičkou je 3 px vysoká linka přes celou šířku, přilepená nahoře. Plní se
zleva doprava podle počtu vyplněných habitů, po dokončení zezelená.

Proti větě „0 z 16 vyplněno“ má dvě výhody: délka se čte okamžitě a bez
soustředění, a při scrollování nezmizí z očí. Hlavně ale dává zápisu
**viditelný konec**, ke kterému se jde dojít.

Počítá totéž co počítadla u oddílů — zodpovězené habity, ne dotčené. Jinak by
ukazoval postup, který neodpovídá tomu, co se uloží.

### Automatické ukládání

Zápis se uloží 1 500 ms po poslední změně. Tlačítko *Uložit* zůstává pro pocit
tečky a jako způsob, jak to zopakovat po chybě.

Co se napíše během probíhajícího ukládání, se pořád hlásí jako neuložené —
hlídá to čítač revizí, takže lišta netvrdí čistý stav, který nemá.

Rozepsaný koncept se pořád zrcadlí do `localStorage`. Po zavedení autosave je
to už jen záchranná síť pro nečekaný odchod, ne hlavní mechanismus.

### Potvrzení dokončení — tři vrstvy

Každá se spouští s jinou četností, takže si navzájem neberou váhu:

| Vrstva | Kdy | Co se stane |
| --- | --- | --- |
| **A** | každý oddíl, při dokončení | počítadlo se překlopí na `✓ hotovo`, hlavička dostane jemný zelený nádech |
| **B** | **jen Cvičení**, při dokončení s nenulovou hodnotou | z počítadla vylétne 💪 a cestou nahoru zmizí |
| **C** | jednou denně, po vyplnění posledního habitu | přes spodek obrazovky: „🎯 Dobrá práce. Máš to celé.“ |

#### Přesná pravidla pro emotikon (vrstva B)

Tohle je místo, kde se testuje zásada z části 1, tak je to popsané do detailu.

**Spouští se na hraně** do stavu „hotovo a něco se dělo“ — což není totéž co
hrana dokončení. Zvednutí hodnoty z nuly v oddílu, který už je hotový, ho
zaslouží taky. Naopak **otevření dne, který to zasloužil před týdny, ho
nespustí**: první ustálené vykreslení jen zaznamená výchozí stav.

**Čeká na ustálení hodnoty** (`SETTLE_MS`, 700 ms). Důvod je subtilní a bez
něj by celá věc byla špatně: posuvník, který už stojí na nule, jde odpovědět
jedině tak, že se s ním hne a vrátí. Každé poctivé „dneska nic“ tedy cestou
projde skutečnými čísly. Bez té pauzy by emotikon vyskakoval i v den
odpočinku, za hodnoty, kterými se jen prošlo.

**Nesmí se škálovat.** Viz část 1.

Oslava konce dne (C) má stejnou pojistku proti spuštění při pouhém otevření
hotového dne.

### Rostoucí textová pole

Retrospektiva a poznámka rostou s obsahem. Pevné čtyři řádky ukrajovaly na
telefonu konec delších odpovědí — tedy přesně tam, kde delší odpovědi vznikají.

---

## 7. Historie

### Kalendář

Barva odpovídá na otázku „zapsal jsem to?“, nikdy „dopadlo to dobře?“. Verdikt
se pořád ukazuje — jako malá tečka v rohu a v popisku —, ale nikdy neřídí
barvu čtverce.

Po téhle změně platí, že **každý zapsaný den vypadá líp než nezapsaný**, bez
ohledu na to, jak dopadl. Viz část 1.

### Dlaždice

Nahoře v barvě loga: *Zapsáno v období* a *Zapsáno v kuse*. Pod nimi
v klidnější barvě: *Výhry*, *Prohry*, *Sledovaných habitů*. Pořadí říká, co je
podle aplikace důležité.

**Série počítá dny zapsané v kuse, ne výhry.** Mechanika, která táhne, zůstala,
ale míří na to, co se odměňovat smí. Nedopsaný dnešek sérii neukončí — počítá
se od včerejška, protože rozdělaný den není zameškaný den.

### Čísla za období

Čítače a doby se za období sčítají; procento se průměruje přes dny, kdy bylo
zapsané; volby a přepínače nemají škálu, takže se u nich počítá, kolik dní byly
vůbec zapsané. Každé období se porovnává s oknem stejné délky těsně před ním —
proto zůstává procentuální změna smysluplná i při přepnutí ze 7 dní na 90.

**Součty za oddíl tam schválně nejsou.** Habit přesunutý mezi oddíly by tentýž
minulý měsíc sečetl jinak, protože oddíly se čtou tak, jak vypadají teď, ne jak
vypadaly tehdy. Každé číslo v Historii proto patří jednomu habitu.

---

## 8. Deník

Poznámky a retrospektivní odpovědi se dlouho daly jen psát — aplikace se každý
večer na něco zeptala a odpověď pak neměla kde ukázat. To byla největší díra
v celé aplikaci.

`/denik` je jejich chronologický výpis, nejnovější nahoře, s fulltextovým
hledáním. **Otázka nad každou odpovědí je odkaz na všechny odpovědi na ni** —
jedno klepnutí a čteš celou řadu zpátky v čase. To je odměna za poctivou cestu
z části 3.

Nahoře je nabídka otázek, na které už existuje odpověď, i s počty.

---

## 9. Přehled

Dva pohledy, každý na jeden průchod daty, bez knihovny na grafy.

**Co táhne výhru** — podíl výher ve dnech, kdy habit vykazoval činnost, proti
dnům, kdy ne. Seřazeno podle rozdílu v procentních bodech. Výpočet byl ověřen
proti nezávislému SQL dotazu na 83 dnech: obojí dalo shodně +22,7 pb.

**Den v týdnu** — totéž po dnech týdne.

### Tři pojistky

Obojí je korelace a nic víc, což se snadno zapomene, jakmile je číslo na
obrazovce. Proto:

1. Celá stránka se **nezapne dřív než po 30 zapsaných dnech** (`MIN_TOTAL_DAYS`)
2. Habit s méně než **10 dny na kterékoli straně** (`MIN_GROUP_DAYS`) se vypíše
   jen jménem pod grafem, bez čísla
3. Text mluví o tom, že věci **spolu souvisí**, nikdy že jedna způsobuje druhou

**Den bez zapsané hodnoty se nepočítá ani na jednu stranu.** Nezapsaný habit
není tvrzení, že se nedělal.

---

## 10. Přístup a bezpečnost

Jeden uživatel, žádné účty — jeden PIN, nebo žádný.

Brána se zapne, až když jsou nastavené **obě** proměnné `APP_PIN`
a `SESSION_SECRET`. Když jedna chybí, aplikace je otevřená komukoli s odkazem.
Middleware přesměruje neautentizované na `/login` a `/api/*` odpoví `401`.

### Omezování pokusů

Šest číslic je jen milion kombinací, takže `login_attempts` brzdí ve dvou
vrstvách (`lib/throttle.ts`):

| Vrstva | Pravidlo |
| --- | --- |
| **Na IP** | 2 pokusy zdarma, pak zámek zdvojnásobující se z 30 s na hodinu; zapomíná se po 30 minutách klidu |
| **Globálně** | nejvýš 2 selhání za hodinu napříč všemi klienty, pak 15 minut zámek |

Globální vrstva existuje proto, že IP klienta si klient hlásí sám a pool proxy
dává útočníkovi neomezeně identit — vrstva na IP proto nemůže být poslední
obranou. Globální strop omezuje celkový počet hádání bez ohledu na zdroj:
pár desítek denně proti milionu kombinací.

**Správný PIN vynuluje oba čítače, i ten globální.** Dokazuje, že u klávesnice
stojí majitel, což retiruje otázku, na kterou se globální strop ptá. Bez toho
se běžné překlepy hromadily napříč úspěšnými přihlášeními, až nevinná chyba
spustila zámek bez viditelné příčiny.

Čítač se zvyšuje uvnitř `ON CONFLICT DO UPDATE`, kde Postgres drží zámek řádku,
takže dávka paralelních hádání nemůže přečíst tutéž zastaralou hodnotu
a proklouznout společně.

**Kompromis je vědomý a při 2 za hodinu ostrý:** tři špatné pokusy od kohokoli
zamknou aplikaci všem, takže cizí člověk s odkazem může majitele držet venku.
U osobního trackeru je odepření služby lepší než vyzrazení.

### Sezení

Sezení žije v tabulce `sessions`, cookie nese jen neprůhledné id. Podepsaná
cookie, která nese vše v sobě, nejde odvolat — a prohlížeče session cookies
obnovují („pokračovat, kde jsi přestal“), takže zavření prohlížeče sezení
ve skutečnosti neukončilo.

Sezení vydrží **3 minuty** bez tepu (`SESSION_TTL_MS`); otevřená stránka tepe
každou minutu (`HEARTBEAT_MS`) a znovu ve chvíli, kdy se stane viditelnou.
Zavřením se sezení do toho okna ztratí.

**To okno je poctivá mez: návrat do ~3 minut tě pustí dovnitř bez PINu.**
Kratší být nemůže — prohlížeče na pozadí brzdí a nakonec zmrazí časovače,
takže okno v řádu sekund ukončovalo sezení ve chvíli, kdy byla aplikace jen
na okamžik za jinou aplikací.

Dřívější verze posílala při zavření ještě `pagehide` beacon, aby sezení skončilo
okamžitě. Byla odstraněna: `pagehide` se spouští i při běžné navigaci v témže
panelu, kde rušil sezení, které si příchozí stránka právě chtěla vzít — a jelikož
se cookies sdílejí napříč stránkami původu, odcházející stránka nedokázala
spolehlivě rozlišit svoje sezení od nástupcova. Náhodné odhlašování uprostřed
práce je horší než krátké předvídatelné okno.

Požadavek s hlavičkou `Authorization: Bearer $API_TOKEN` bránu obchází, takže
skripty a chat relay fungují dál, zatímco rozhraní zůstává soukromé.

---

## 11. API

Zápisy vyžadují token. Čtení je otevřené jen dokud je brána vypnutá — jakmile
se zapne, potřebuje token každý požadavek na `/api/*`.

```
GET  /api/entries                              # všechny dny, nejnovější první
GET  /api/entries?from=2026-07-01&to=2026-07-31
GET  /api/entries/2026-09-02
PUT  /api/entries/2026-09-02                   # upsert, Authorization: Bearer $API_TOKEN
```

Pole v těle jsou klíče habitů, všechna nepovinná:

```bash
curl -X PUT https://<app>.vercel.app/api/entries/2026-09-02 \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"energyMorning":70,"kliky":60,"beh":4.2,"verdict":"win","note":"ok"}'
```

Odpověď vždy nese všechny aktivní habity, zapsané i ne, takže den jde přečíst,
upravit a zapsat celý zpátky. Klíče, které neodpovídají žádnému habitu, se
vrátí v `ignoredKeys`. Když `API_TOKEN` není nastavený, `PUT` vrátí `503`.

Retrospektivu lze poslat jako holý řetězec (`"retro": "text"`) — otázka daného
dne se doplní automaticky.

---

## 12. Postavení od nuly

### Předpoklady

Node 20+, účet na Neonu, účet na Vercelu.

### Lokálně

```bash
npm install
cp .env.example .env.local        # vyplnit DATABASE_URL
npm run db:migrate                # vytvoří tabulky
npm run db:seed:habits            # 8 oddílů a 16 habitů
npm run db:retro                  # 36 otázek do habitu retro
npm run dev
```

Pro zapnutí brány dopsat do `.env.local`:

```bash
APP_PIN="481920"                            # šest číslic
SESSION_SECRET="$(openssl rand -hex 32)"
API_TOKEN="$(openssl rand -hex 32)"         # nepovinné, pro API zápisy
```

### Nasazení na Vercel

1. Naimportovat repozitář ve Vercelu
2. Vercel → **Storage → Neon** — integrace vloží `DATABASE_URL`
3. Přidat `API_TOKEN`, `APP_PIN` a `SESSION_SECRET` jako produkční proměnné
4. Jednou proti produkčnímu `DATABASE_URL` spustit `db:migrate`,
   `db:seed:habits` a `db:retro`

Nasazení z příkazové řádky:

```bash
export NODE_USE_ENV_PROXY=1
export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Produkční adresa je `better-me-kohl.vercel.app`.

### Ověření, že to celé sedí

Přehrání od nuly bylo nacvičeno: zahodit všechny tabulky, přehrát `drizzle/`
a naseedovat reprodukuje **přesně tentýž stav** — 8 oddílů, 16 habitů, 💪
u Cvičení, 36 otázek, krok 0,1 km. Všechny seed skripty jsou idempotentní,
opakované spuštění nic nezmění.

---

## 13. Migrace

Změny schématu jsou verzované soubory v `drizzle/`.

```bash
set -a; . ./.env.local; set +a     # drizzle-kit potřebuje DATABASE_URL v prostředí
npm run db:generate                # po úpravě db/schema.ts
# vygenerovaný soubor přejmenovat na mluvící název,
# včetně položky tag v drizzle/meta/_journal.json
npm run db:migrate
```

SQL si před spuštěním přečti.

| Soubor | Co dělá |
| --- | --- |
| `0000_init_habits.sql` | základní schéma |
| `0001_session_tag.sql` | `sessions.tag` |
| `0002_value_meta.sql` | `entry_values.meta` — nosič otázky u retro odpovědí |
| `0003_group_config.sql` | `habit_groups.config` — emotikon oddílu |

---

## 14. Skripty

| Příkaz | Co dělá |
| --- | --- |
| `npm run dev` | vývojový server |
| `npm run build` | produkční build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | vygeneruje migraci ze schématu |
| `npm run db:migrate` | přehraje migrace |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed:habits` | oddíly a habity, idempotentní |
| `npm run db:seed` | dny ze `seed-data.json` |
| `npm run db:retro` | nahraje sadu otázek, s pojistkou proti osiření odpovědí |

**Před každým commitem:**

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Skripty `db:update:tones`, `db:principles` a `db:restructure` jsou jednorázové
migrace obsahu z dřívějších přestaveb. Jsou idempotentní, ale už není důvod je
spouštět.

---

## 15. Provozní pasti

Věci, které stály čas a je škoda na ně přijít znovu.

**Posuvník s hodnotou 0 nejde odpovědět tím, že se nastaví znovu na 0.** React
událost nevydá, když se hodnota nezměnila. Platí to i pro uživatele — musí
s posuvníkem hnout a vrátit ho. Na tom stojí pauza na ustálení u emotikonu
(část 6).

V testech s Playwrightem navíc `fill()` odmítne hodnotu, která nesedí na `step`
(„Malformed value“). Posuvník se ovládá přes nativní setter:

```js
el.evaluate((e, v) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(e, String(v));
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true }));
}, hodnota);
```

**`pkill -f next-server` zabije i vlastní shell**, pokud je hledaný řetězec
v tomtéž příkazu — cmdline toho shellu ho totiž obsahuje. Skript, který server
restartuje, se musí vytvořit jiným příkazem, než kterým se spouští.

**Nasazení na Vercel občas spadne na „fetch failed“.** Je to přechodné, stačí
opakovat. Když ale hlásí `Not authorized: ... scope`, vypršel token a musí
přijít nový — chybová hláška to napoprvé maskuje jako síťový problém.

**`psql` a přímé TCP spojení na Neon přes proxy nefungují.** Pracuje se přes
HTTPS driver `@neondatabase/serverless`.

**Čeština počítá dny ve třech tvarech** — 1 den / 2–4 dny / 5+ dní. Na to je
`czDays()` v `lib/date.ts`. Obdobně `czCount()` v Deníku pro odpovědi.

---

## 16. Vědomá rozhodnutí

Věci, které vypadají jako nedodělek, ale jsou schválně.

**Žádné skóre dne.** Jedno souhrnné číslo svádí k optimalizaci toho čísla místo
života za ním. Verdikt výhra/prohra plní tu roli líp, protože si ho určuje
uživatel sám.

**Série se nezvýrazňuje na obrazovce zápisu.** Patří do historie, kde se na ni
člověk dívá zpětně — ne do zápisu, kde se rozhoduje o verdiktu.

**Při vyplňování se neukazuje minulá odpověď na tutéž otázku.** Bylo by to
lákavé, ale viděná minulá odpověď kotví tu novou a přestane se odpovídat
čerstvě. Změnu má smysl číst zpětně v Deníku, ne mít ji před očima ve chvíli
psaní.

**Barvy voleb v zápisu zůstávají.** Zvažovalo se, jestli zelená a červená na
„Splněno / Nesplněno“ neporušují zásadu. Neporušují: objeví se až *po*
odpovědi, popisují skutečnost a nikoho neodměňují ani netrestají.

**Předvyplnění „jako včera“ se nepostavilo.** Zkrátilo by zápis nejvíc ze všeho,
ale jde proti poctivosti dat. Kdyby se stavělo, tak jedině ve verzi, kde
předvyplněné hodnoty zůstanou vizuálně nepotvrzené, dokud se jich uživatel
nedotkne.

---

## 17. Co je otevřené

Z plánu rozvoje zbývá:

- **Editor otázek v Úpravách** — sada se dnes mění jedině úpravou
  `lib/retro-questions.ts`. Editor musí mít tutéž pojistku jako `db:retro`:
  otázku, na kterou existuje odpověď, nesmí smazat.
- **Export dat** — CSV/JSON ke stažení; API pro to už existuje, jde jen o obal
- **Cíle na habit** — „3× týdně studená sprcha“, kroužek postupu v Historii
- **Archivace habitu z Úprav** — databáze to umí od začátku, chybí tlačítko
- **PWA** — ikona na ploše, offline zápis
- **Večerní připomínka** — nejdražší položka; než do ní jít, stojí za zkoušku
  obyčejná připomínka v telefonu

**Stále chybí 45 dní historických zápisů.** `seed-data.json` je `[]`. Bez nich
se Přehled zapne až po 30 dnech běžného zapisování.
