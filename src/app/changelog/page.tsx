import type { Metadata } from 'next';
import Link from 'next/link';

const repository = 'https://github.com/Significant-Hobbies/significanthobbies';

const releases = [
  {
    date: '2026-07-31',
    title: 'Public journeys became more honest',
    outcomes: [
      'Profiles and timelines now focus on the journey itself instead of follows, likes, and comments that had no notification or return loop.',
      'Explore now ranks public timelines by their own phases, hobbies, and recency rather than engagement counts.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'Your life in weeks became a public starting point',
    outcomes: [
      'Anyone can enter a birth year and see a private life grid without creating an account.',
      'Weeks remaining now use age-conditional life expectancy everywhere instead of a fixed 4,000-week frame.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'More possibilities became searchable',
    outcomes: [
      'The public experience library expanded to 322 ideas, each with its own readable page.',
      'Hobby discovery gained twelve practical facets, making combinations such as gentle, cheap, and screen-free answerable.',
    ],
  },
  {
    date: '2026-07-25',
    title: 'Guest journeys became more useful and private',
    outcomes: [
      'Daily and trajectory pages now offer a read-only sample instead of stopping at a sign-in wall.',
      'Sign-in returns people to the page they intended to use, while two privacy leaks and misleading progress surfaces were removed.',
    ],
  },
] as const;

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Meaningful improvements to SignificantHobbies, from daily reflection to hobby discovery and life planning.',
  alternates: {
    canonical: '/changelog',
  },
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
      <header className="max-w-2xl">
        <Link
          href="/"
          prefetch={false}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← SignificantHobbies
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Product history
        </p>
        <h1 className="mt-3 text-4xl text-foreground sm:text-5xl">Changelog</h1>
        <p className="mt-5 max-w-[62ch] text-base leading-7 text-muted-foreground sm:text-lg">
          Meaningful improvements to daily reflection, hobby discovery, and planning a finite life.
        </p>
        <nav className="mt-7 flex flex-wrap gap-5 text-sm" aria-label="Project links">
          <a
            href={`${repository}/issues`}
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Roadmap
          </a>
          <a
            href={repository}
            aria-label="GitHub repository"
            title="GitHub repository"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            <svg
              viewBox="0 0 16 16"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
              className="inline-block"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </nav>
      </header>

      <ol className="mt-12 space-y-5">
        {releases.map((release) => (
          <li key={`${release.date}-${release.title}`}>
            <article className="rounded-2xl border border-border bg-card/60 p-6 shadow-soft sm:p-8">
              <time
                dateTime={release.date}
                className="text-xs font-medium uppercase tracking-[0.12em] text-subtle"
              >
                {new Date(`${release.date}T00:00:00`).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <h2 className="mt-3 text-2xl text-foreground">{release.title}</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
                {release.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
