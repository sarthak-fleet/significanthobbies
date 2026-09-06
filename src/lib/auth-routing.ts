/**
 * Where sign-in sends people, and where it lets them go instead.
 *
 * Auth in this product is optional: it exists to *save* work, not to unlock it.
 * The login page already accepted and validated a `callbackUrl` search param,
 * but every route guard called a bare `redirect('/login')` — so signing in from
 * /trajectory landed you on /dashboard. Auth interrupted you and then lost your
 * place, which is the opposite of the intent.
 *
 * These helpers are pure so the redirect contract is unit-testable; the
 * open-redirect validation itself stayed in the (now-removed, pre-split)
 * src/app/login/page.tsx, which was the boundary that received untrusted
 * input.
 */

/** Sign-in URL that returns the visitor to `callbackUrl` once authenticated. */
export function loginPath(callbackUrl: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Keep sign-in redirects on this origin and fall back to the public directory. */
export function safeCallbackUrl(value: string | undefined): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export type GuestRoute = {
  /** Anonymous surface closest to what the visitor was trying to reach. */
  href: string;
  /** Honest description of what they get without an account. */
  label: string;
};

/**
 * The anonymous equivalent of a guarded surface, if one exists.
 *
 * Only the single-session surfaces have real guest equivalents: /life-bingo
 * builds a board, /timeline/new builds a timeline, the quiz returns a result —
 * each delivers its whole value before you ever sign in. The longitudinal
 * surfaces (/journal, /habits, /trajectory, /history) have no guest twin, because their
 * value *is* accumulated history; the quiz is the honest destination for
 * someone not ready to commit an account.
 */
export function guestRouteFor(callbackUrl: string): GuestRoute {
  if (callbackUrl.startsWith('/bucket-list') || callbackUrl.startsWith('/life-bingo')) {
    return { href: '/life-bingo', label: 'build a board without an account' };
  }
  if (callbackUrl.startsWith('/timeline')) {
    return { href: '/timeline/new', label: 'build and export without an account' };
  }
  return { href: '/find-your-hobby', label: 'take the 2-minute quiz instead' };
}
