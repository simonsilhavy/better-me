import type { RetroQuestion } from './domain';

/**
 * The retrospective prompts, in the order that decides which one falls on
 * which day.
 *
 * The set is deliberately small. With one question a day, the length of this
 * list *is* how often a question comes back: 36 entries means roughly monthly,
 * about ten answers a year to the same prompt — enough for the diary's
 * per-question filter to show a line rather than a handful of scattered notes.
 * A hundred prompts looked generous and gave three answers a year to each,
 * which is not a series you can read. Prefer rewording a prompt over adding
 * another one.
 *
 * Ids are the contract: every stored answer keeps the id of the question it
 * answered, so an id must never be reused for a different question. Rewording
 * is safe — the id stays and old answers follow the new text. Removing one is
 * only free while nothing has answered it; `npm run db:retro` refuses the
 * write otherwise.
 */
export const RETRO_QUESTIONS: RetroQuestion[] = [
  { id: 'energie', text: 'Co dneska stálo nejvíc energie — a stálo to za to?' },
  { id: 'radost-komu', text: 'Komu jsi dneska udělal radost?' },
  { id: 'neutratil', text: 'Za co jsi dneska nakonec neutratil peníze, i když jsi o tom přemýšlel?' },
  { id: 'rozhodilo', text: 'Co tě rozhodilo a jak dlouho trvalo se vrátit?' },
  { id: 'za-tyden', text: 'Co z dneška bude mít smysl ještě za týden?' },
  { id: 'slo-samo', text: 'Kdy ti to dneska šlo samo?' },
  { id: 'dotahl', text: 'Co jsi dneska dotáhl do konce?' },
  { id: 'neco-nerekl', text: 'Co jsi dneska neřekl, i když jsi měl?' },
  { id: 'rozptyleni', text: 'Co ti dneska sebralo nejvíc pozornosti?' },
  { id: 'pochvala', text: 'Za co se můžeš dnes pochválit?' },
  { id: 'o-sobe', text: 'Co ses dneska dozvěděl o sobě?' },
  { id: 'vdecny', text: 'Za co jsi vděčný?' },
  { id: 'nejistota', text: 'Do čeho ses dneska pustil, i když sis nebyl jistý?' },
  { id: 'unava-hlava', text: 'Bránila ti víc únava, nebo hlava?' },
  { id: 'podekovat', text: 'Komu jsi dneska měl poděkovat?' },
  { id: 'setrvacnost', text: 'Kolik z dneška bylo tvoje rozhodnutí a kolik setrvačnost?' },
  { id: 'obetoval', text: 'Co jsi dneska obětoval pro svůj vysněný život?' },
  { id: 'sebeovladani', text: 'Co tě dneska stálo nejvíc sebekontroly?' },
  { id: 'neozval', text: 'Na koho sis dneska vzpomněl a neozval ses mu?' },
  { id: 'nechtelo', text: 'Udělal jsi dneska něco, co se ti nechtělo?' },
  { id: 'lepsi-nez-loni', text: 'V čem jsi dneska byl lepší než před rokem?' },
  { id: 'smysluplnost', text: 'Co ti dneska dalo pocit smysluplnosti?' },
  { id: 'noveho', text: 'Co ses dneska dozvěděl nového?' },
  { id: 'nikdo-nekontroloval', text: 'Co jsi dneska udělal, i když to nikdo nekontroloval?' },
  { id: 'zustalo-v-tobe', text: 'Co ti dneska někdo řekl a zanechalo to na tobě stopu?' },
  { id: 'pokazil', text: 'Co jsi dneska pokazil a jak to napravíš?' },
  { id: 'strach-realita', text: 'Čeho ses dneska bál a co se opravdu stalo?' },
  { id: 'za-rok', text: 'Co by si o tvém dnešním dni myslel člověk, kterým chceš za rok být?' },
  { id: 'sam-sebou', text: 'Kdy ses dneska cítil nejvíc sám sebou?' },
  { id: 'rekl-ne', text: 'Na co jsi dneska řekl ne?' },
  { id: 'jinak', text: 'Co bys udělal jinak, pokud bys zažil dnešek znovu?' },
  { id: 'potvrzeni-zvenci', text: 'Kde jsi dneska hledal potvrzení nebo pochvalu zvenčí místo toho, aby ses spolehl na vlastní úsudek?' },
  { id: 'na-zitra', text: 'Co sis odložil na zítra, i když bys to zvládl dneska?' },
  { id: 'zapamatovat', text: 'Co si z dneška chceš zapamatovat?' },
  { id: 'neco-videl', text: 'Co jsi dneska udělal jen proto, aby to někdo viděl?' },
  { id: 'posledni-den', text: 'Pokud by dneska byl tvůj poslední den, stál by za to?' },
];
