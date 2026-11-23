import type { Metadata } from 'next';
import Link from 'next/link';
import { getXiPages } from '../../content/xiPages';
import { IconArrowLeft, IconArrowRight } from '../../components/career/GameIcons';

export const metadata: Metadata = {
  title: 'Football Draft Ideas',
  description:
    'Browse club, era and nation draft ideas for MY-11: Liverpool, Manchester United, the 2000s Premier League, Brazil and more.',
  alternates: { canonical: 'https://my-11.com/drafts' },
};

const GROUPS = [
  { kind: 'club' as const, title: 'Club drafts', description: 'Build the greatest XI for a club.' },
  { kind: 'era' as const, title: 'Era drafts', description: 'Pick a decade and settle the argument.' },
  { kind: 'nation' as const, title: 'Nation drafts', description: 'Build a national team from every era.' },
];

export default function DraftsIndexPage() {
  const pages = getXiPages();

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
        <section className="office-floating-card rounded-xl p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--ink-primary)]">
            Start with a debate
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mt-1">
            Every page opens a draft limited to that club, era or nation. See the strongest XI, then pick your
            own and simulate the season.
          </p>
        </section>

        {GROUPS.map((group) => {
          const groupPages = pages.filter((page) => page.kind === group.kind);
          if (groupPages.length === 0) return null;
          return (
            <section key={group.kind} className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] p-4 sm:p-5">
              <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">{group.title}</h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-0.5">{group.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {groupPages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/xi/${page.slug}`}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subcard)] px-3 py-2.5 hover:bg-[var(--surface-card)] hover:border-[var(--border-crisp)] transition-colors"
                  >
                    <span className="block text-sm font-medium text-[var(--ink-primary)] truncate">
                      {page.subject}
                    </span>
                    <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
                      {page.poolSize} player seasons
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <div className="office-floating-card rounded-xl p-5 text-center">
          <p className="text-sm text-[var(--ink-secondary)]">Want a blank page instead?</p>
          <Link
            href="/draft?mode=classic"
            className="inline-flex items-center gap-2 min-h-11 px-5 rounded-lg office-action-btn-primary font-semibold text-sm mt-3"
          >
            Start a classic draft
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
