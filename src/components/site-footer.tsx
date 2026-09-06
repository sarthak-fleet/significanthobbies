import Link from 'next/link';

const groups = [
  {
    title: 'Start here',
    links: [
      ['Find your hobby', '/find-your-hobby'],
      ['Onboarding', '/onboarding'],
      ['Why this exists', '/manifesto'],
    ],
  },
  {
    title: 'Possibilities',
    links: [
      ['Things to try', '/experiences'],
      ['Bucket list ideas', '/bucket-list-ideas'],
      ['Life Bingo', '/life-bingo'],
      ['Side quests', '/side-quests'],
    ],
  },
  {
    title: 'Explore',
    links: [
      ['Life in weeks', '/life-in-weeks'],
      ['Hobbies for adults', '/hobbies-for-adults'],
      ['Cheap hobbies', '/cheap-hobbies'],
      ['Travel bucket list', '/travel-bucket-list'],
    ],
  },
  {
    title: 'About',
    links: [
      ['Blog', '/blog'],
      ['Manifesto', '/manifesto'],
      ['Changelog', '/changelog'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer data-site-footer className="bg-[#f7e957] px-4 py-10 text-[#211e18]">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#d4c74c] bg-[#fffdf8] shadow-[0_18px_45px_rgba(80,67,23,0.10)]">
        <div className="grid gap-9 p-7 sm:p-10 lg:grid-cols-[1.25fr_3fr]">
          <div>
            <div className="flex size-11 items-center justify-center rounded-full bg-[#f7e957] font-serif text-xl font-bold">
              SH
            </div>
            <p className="mt-4 font-serif text-2xl font-semibold">Significant Hobbies</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#625b50]">
              A companion for living intentionally—because life is finite and the rest is still
              unwritten.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-bold">{group.title}</p>
                <ul className="mt-4 space-y-3 text-sm text-[#625b50]">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center hover:text-[#211e18] hover:underline hover:underline-offset-4 sm:min-h-0"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-[#e4dccb] bg-[#f7f1e7] px-7 py-5 text-xs text-[#625b50] sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>
            Made by{' '}
            <a
              href="https://sarthakagrawal.dev"
              className="font-semibold text-[#211e18] hover:underline"
            >
              Sarthak
            </a>
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a
              href="https://github.com/Significant-Hobbies/significanthobbies/issues"
              className="inline-flex min-h-11 items-center hover:text-[#211e18] sm:min-h-0"
            >
              Roadmap
            </a>
            <a
              href="https://github.com/Significant-Hobbies/significanthobbies"
              aria-label="GitHub repository"
              title="GitHub repository"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center hover:text-[#211e18] sm:min-h-0"
            >
              <svg
                viewBox="0 0 16 16"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
