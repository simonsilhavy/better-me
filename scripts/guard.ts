/**
 * Refuses to let a script touch anything but the development database.
 *
 * Development happens against the Neon `dev` branch; production holds real
 * entries that nothing here should be able to overwrite by accident. The two
 * differ only in the endpoint inside DATABASE_URL, which is easy to get wrong
 * — a stale `.env.local`, a copied shell, a forgotten export — and the damage
 * from getting it wrong is not undone by rerunning the script.
 *
 * The check matches positively: the target has to be the host named by
 * DEV_DB_HOST in `.env.local`, and everything else is refused. A blocklist of
 * known production endpoints would pass any database nobody thought to list,
 * and would put the project's hostnames in a public repository for no gain.
 *
 * Deliberate runs against another database are still possible, they just have
 * to say so out loud:
 *
 *     ALLOW_PRODUCTION=1 npm run db:seed
 *
 * Migrations are not guarded. They run from the Vercel build, where the
 * platform supplies the right DATABASE_URL for each environment, so the
 * production password never has to exist outside Vercel.
 */

/**
 * Stops the process unless the current DATABASE_URL points at the dev branch.
 *
 * Fails closed at every step: an unset URL, an unset DEV_DB_HOST, or anything
 * unparseable is refused, because "I could not tell" and "it is fine" are not
 * the same answer.
 */
export function refuseProduction(what: string): void {
  if (process.env.ALLOW_PRODUCTION === '1') {
    console.warn(`! ${what} may run against a non-development database — ALLOW_PRODUCTION=1 was set.`);
    return;
  }

  const refuse = (why: string): never => {
    console.error(`${what} refused: ${why}`);
    console.error(
      'Point DATABASE_URL at the dev branch and set DEV_DB_HOST to its host, ' +
        'or rerun with ALLOW_PRODUCTION=1 if another database is really the target.',
    );
    process.exit(1);
  };

  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) refuse('DATABASE_URL is not set.');

  const expected = process.env.DEV_DB_HOST;
  if (!expected) refuse('DEV_DB_HOST is not set, so the target cannot be verified.');

  let host: string;
  try {
    host = new URL(url!).hostname;
  } catch {
    return void refuse('DATABASE_URL could not be parsed.');
  }

  if (host !== expected) refuse(`${host} is not the development database.`);
}
