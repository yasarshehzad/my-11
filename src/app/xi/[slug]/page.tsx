import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getXiPage, getXiPageSlugs } from '../../../content/xiPages';
import { IconArrowLeft, IconArrowRight, IconStar, IconTrophy } from '../../../components/career/GameIcons';

export const dynamicParams = false;

export function generateStaticParams() {
  return getXiPageSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getXiPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `https://my-11.com/xi/${page.slug}` },
    openGraph: {
      title: `${page.title} | MY-11`,
      description: page.description,
      url: `https://my-11.com/xi/${page.slug}`,
      type: 'article',
    },
  };
}

export default async function XiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getXiPage(slug);
  if (!page) notFound();

  const kindLabel =
    page.kind === 'club' ? 'Club draft' : page.kind === 'era' ? 'Era draft' : 'Nation draft';

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5">
      <header className="office-floating-card w-full max-w-3xl mx-auto rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-10 px-2 rounded-lg text-sm font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)]"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">Draft ideas</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto space-y-4 pb-10">
        <article className="office-floating-card rounded-xl p-5 sm:p-6 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--ink-primary)] leading-tight">
            {page.title}
          </h1>
          <p className="text-xs text-[var(--ink-muted)]">
            {kindLabel}, {page.poolSize} player seasons
          </p>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">{page.intro}</p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg bg-[var(--surface-subcard)] p-2.5 text-center">
              <span className="block text-xs text-[var(--ink-muted)]">Player seasons</span>
              <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                {page.poolSize}
              </span>
            </div>
            <div className="rounded-lg bg-[var(--surface-subcard)] p-2.5 text-center">
              <span className="block text-xs text-[var(--ink-muted)]">Eras</span>
              <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                {page.eraCount}
              </span>
            </div>
            <div className="rounded-lg bg-[var(--surface-subcard)] p-2.5 text-center">
              <span className="block text-xs text-[var(--ink-muted)]">Top rating</span>
              <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                {page.topPlayer.rating}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <Link
              href={page.href}
              className="office-action-btn-primary inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg font-semibold text-sm"
            >
              <span>Play this draft</span>
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>

        <section className="office-floating-card rounded-xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <IconTrophy className="w-4 h-4 text-[var(--ink-secondary)]" />
            <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">The strongest XI</h2>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Highest-rated player at each position, one season per player, 4-3-3. Not a claim that football
            history agrees.
          </p>
          <ol className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {page.bestXI.map(({ slot, player }, index) => (
              <li key={`${slot}-${player.id}`} className="py-2.5 flex items-center gap-3">
                <span className="w-8 text-xs font-semibold text-[var(--ink-muted)] tabular-nums shrink-0">
                  {index + 1}
                </span>
                <span className="w-9 text-xs font-semibold text-[var(--ink-secondary)] shrink-0">{slot}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--ink-primary)] truncate">
                    {player.playerName}
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)] truncate">
                    {player.club}, {player.season}
                  </p>
                </div>
                <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">
                  {player.rating}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="office-floating-card rounded-xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <IconStar className="w-4 h-4 text-[var(--ink-secondary)]" />
            <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">Top of the pool</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {page.topPlayers.map((player) => (
              <li
                key={player.id}
                className="rounded-lg bg-[var(--surface-subcard)] px-3 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink-primary)] truncate">{player.playerName}</p>
                  <p className="text-xs text-[var(--ink-secondary)] truncate">
                    {player.primaryPosition}, {player.club}, {player.season}
                  </p>
                </div>
                <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">
                  {player.rating}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="office-floating-card rounded-xl p-5 sm:p-6 space-y-3">
          <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">Questions</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-[var(--ink-primary)]">How is this XI chosen?</h3>
              <p className="text-[var(--ink-secondary)]">
                The database picks the highest-rated player for each 4-3-3 slot, using primary and secondary
                positions. Each player appears once, using their best available season.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ink-primary)]">Can I pick someone else?</h3>
              <p className="text-[var(--ink-secondary)]">
                Yes. The draft opens with the {page.subject}{' '}pool, and you choose every pick. The XI above is
                only the computer&apos;s opening argument.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ink-primary)]">Is it free?</h3>
              <p className="text-[var(--ink-secondary)]">
                Yes. No sign-up, no download. Draft the XI, simulate the season, then challenge a friend with
                the link.
              </p>
            </div>
          </div>
        </section>

        {page.related.length > 0 && (
          <section className="office-floating-card rounded-xl p-5 sm:p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">More draft ideas</h2>
            <div className="grid grid-cols-2 gap-2">
              {page.related.map((relatedSlug) => {
                const related = getXiPage(relatedSlug);
                if (!related) return null;
                return (
                  <Link
                    key={related.slug}
                    href={`/xi/${related.slug}`}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subcard)] px-3 py-2.5 hover:bg-[var(--surface-card)] hover:border-[var(--border-crisp)] transition-colors"
                  >
                    <span className="block text-sm font-medium text-[var(--ink-primary)] truncate">
                      {related.subject}
                    </span>
                    <span className="block text-xs text-[var(--ink-secondary)] capitalize">{related.kind} XI</span>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/drafts"
              className="inline-flex items-center gap-1 min-h-10 text-sm font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            >
              Browse every draft idea
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>
        )}

        <p className="text-xs text-[var(--ink-muted)] text-center leading-relaxed px-4">
          MY-11 is an unofficial, independent football draft and management simulation game. Not affiliated
          with any club, league or governing body.
        </p>
      </main>
    </div>
  );
}
