import type { RetroQuestion } from './domain';

/**
 * The retrospective prompts, in the order that decides which one falls on
 * which day. Ids are the contract: every stored answer keeps the id of the
 * question it answered, so an id must never be reused for a different
 * question. Rewording a prompt is safe -- the id stays, and old answers
 * follow the new text. Adding or removing one reshuffles which prompt lands
 * on which future date, which is harmless; past answers keep their own.
 */
export const RETRO_QUESTIONS: RetroQuestion[] = [
  { id: 'energie', text: 'Co dneska stálo nejvíc energie — a stálo to za to?' },
  { id: 'nechtelo', text: 'Udělal jsi dnes něco, co se ti nechtělo?' },
  { id: 'odlozil', text: 'Co jsi odložil a proč zrovna to?' },
  { id: 'pochvala', text: 'Za co bys sám sebe dneska pochválil?' },
  { id: 'hrdy', text: 'Za co na sebe můžeš být dnes hrdý?' },
  { id: 'jinak', text: 'Co bys udělal jinak, pokud bys zažil dnešek znovu?' },
  { id: 'slo-samo', text: 'Kdy ti to dneska šlo samo?' },
  { id: 'rozhodilo', text: 'Co tě rozhodilo a jak dlouho trvalo se vrátit?' },
  { id: 'o-sobe', text: 'Co ses dneska dozvěděl o sobě?' },
  { id: 'noveho', text: 'Co ses dneska dozvěděl nového?' },
  { id: 'unava-hlava', text: 'Bránila ti víc únava, nebo hlava?' },
  { id: 'zmenit-jednu', text: 'Pokud bys mohl na dnešku změnit jednu věc, co by to bylo?' },
  { id: 'zitrek', text: 'Kdyby měl být zítřek lepší o jednu jedinou věc, jaká?' },
  { id: 'rekl-ne', text: 'Na co jsi dneska řekl ne?' },
  { id: 'za-tyden', text: 'Co z dneška bude mít smysl ještě za týden?' },
  { id: 'vdecny', text: 'Za co jsi vděčný?' },
  { id: 'obetoval', text: 'Co jsi dnes obětoval pro svůj vysněný život?' },
  { id: 'posledni-den', text: 'Pokud by dnes byl tvůj poslední den, stál by za to?' },
  { id: 'emoce', text: 'Kdy jsi dneska nezvládl svoje emoce?' },
  { id: 'smysluplnost', text: 'Co mi dnes dalo pocit smysluplnosti?' },
  { id: 'automaticky', text: 'Jaké rozhodnutí jsem dnes udělal automaticky, aniž bych ho vědomě zvážil?' },
  { id: 'za-rok', text: 'Co by si o mém dnešním dni myslel člověk, kterým chci za rok být?' },
  { id: 'potvrzeni-zvenci', text: 'Kde jsem dnes hledal potvrzení nebo pochvalu zvenčí místo toho, abych se spolehl na vlastní úsudek?' },
  { id: 'smerovani', text: 'Kdyby dnešek byl jediný ukazatel mého směřování, kam bych podle něj mířil?' },
];
