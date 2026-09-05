import { authenticateSession, ensureUser } from "./auth";
import { getCalorieToday } from "./calorie";
import { getToday } from "./domains";
import { getLiveSummary } from "./live";

export const PRODUCTS = [
  {
    id: "live",
    name: "Live",
    category: "Life list",
    description: "Plan places, hobbies, side quests, and experiences across a lifetime.",
    href: "https://live.significanthobbies.com",
    color: "#f4df52",
  },
  {
    id: "journal",
    name: "Journal",
    category: "Reflection",
    description: "Write private morning and evening pages, plus anything worth remembering.",
    href: "https://journal.significanthobbies.com",
    color: "#c9afe5",
  },
  {
    id: "calorie",
    name: "Calorie",
    category: "Health record",
    description: "Keep a private record of food, water, medicine, weight, and daily totals.",
    href: "https://calorie.significanthobbies.com",
    color: "#b9d19d",
  },
  {
    id: "setline",
    name: "Setline",
    category: "Practice",
    description: "Log training and the progress that is easy to miss from one day to the next.",
    href: "https://setline.significanthobbies.com",
    color: "#e9b88f",
  },
  {
    id: "kith",
    name: "Kith",
    category: "Relationships",
    description: "Remember the people you care about and when you last made time for them.",
    href: "https://kith.significanthobbies.com",
    color: "#e8a992",
  },
  {
    id: "anchor",
    name: "Anchor",
    category: "Daily focus",
    description: "Plan the day, work in focused sessions, and review what interrupted the plan.",
    href: "https://anchor.significanthobbies.com",
    color: "#9fbfd1",
  },
] as const;

export const HOME_MARKDOWN = `---
title: Significant Hobbies
description: The private Hub for six independently owned personal apps.
canonical: https://significanthobbies.com/
updated: 2026-08-27
---

# Significant Hobbies

Significant Hobbies is the shared home and privacy-aware control plane for six independently owned personal apps: Live, Journal, Calorie, Setline, Kith, and Anchor.

## Choose an app

- [Live](https://live.significanthobbies.com): Places, hobbies, side quests, and experiences.
- [Journal](https://journal.significanthobbies.com): Private morning and evening reflection.
- [Calorie](https://calorie.significanthobbies.com): Food, water, medicine, weight, and daily totals.
- [Setline](https://setline.significanthobbies.com): Practice, training, and progress.
- [Kith](https://kith.significanthobbies.com): People and relationship follow-through.
- [Anchor](https://anchor.significanthobbies.com): Daily plans, focused work, interruptions, and review.

Each app keeps its own interface and immediate data. The owner-only Hub is currently read-only, has no public signup or checkout, and is still completing real-owner sync verification across all six apps.

Habits was absorbed into Anchor. Historical Habits records and compatibility contracts remain, but Habits is not a seventh maintained product.
`;

export async function handleHub(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = publicOrigin(request, url);
  if (pathname === "/") {
    if (wantsMarkdown(request) || url.searchParams.get("mode") === "agent") {
      return markdown(HOME_MARKDOWN.replace("https://significanthobbies.com/", `${origin}/`));
    }
    return html(page(null, origin));
  }
  const user = await authenticateSession(request, env);
  if (!user) return Response.redirect(new URL("/login?returnTo=%2Fhub", request.url).toString(), 302);
  await ensureUser(env, user);
  const [platform, live, calorie] = await Promise.all([
    getToday(env, user.id),
    getLiveSummary(request, env, user),
    getCalorieToday(request, env, user),
  ]);
  const entries = [...platform.summaries, live, calorie] as Array<Record<string, unknown>>;
  const summaries = new Map<string, Record<string, unknown>>(
    entries.map((summary) => [String(summary.domain), summary]),
  );
  return html(page(summaries, origin), { "Cache-Control": "private, no-store" });
}

function page(summaries: Map<string, Record<string, unknown>> | null, origin: string): string {
  const cards = PRODUCTS.map((product, index) => {
    const summary = summaries?.get(product.id);
    const count = typeof summary?.activeCount === "number" ? `${summary.activeCount} records` : null;
    const state = summaries
      ? count ?? (summary?.status === "unavailable" ? "Unavailable" : "Connected")
      : "View product";
    const updated =
      typeof summary?.lastUpdatedAt === "string"
        ? ` · updated ${escapeHtml(summary.lastUpdatedAt.slice(0, 10))}`
        : "";
    return `<a class="product-card" href="${product.href}" style="--tone:${product.color}" aria-label="View ${product.name}">
      <span class="product-number" aria-hidden="true">0${index + 1}</span>
      <span class="product-mark" aria-hidden="true">${product.name[0]}</span>
      <div class="product-copy">
        <p class="product-category">${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
      </div>
      <span class="product-state">${state}${updated}<span aria-hidden="true"> ↗</span></span>
    </a>`;
  }).join("");
  const hubAction = summaries
    ? '<span class="status-chip">Private read-only Hub</span>'
    : '<a class="button button-primary" href="/hub">Open private Hub <span aria-hidden="true">→</span></a>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#f2efe6">
    <title>Significant Hobbies — Six Personal Apps</title>
    <meta name="description" content="Six independently owned personal apps for planning, reflection, health, relationships, and progress, connected by a private read-only Hub.">
    <link rel="canonical" href="${origin}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Significant Hobbies">
    <meta property="og:title" content="Significant Hobbies — Six Personal Apps">
    <meta property="og:description" content="Six independently owned personal apps, connected by a private read-only Hub.">
    <meta property="og:url" content="${origin}/">
    <meta property="og:image" content="${origin}/hub-opengraph-image">
    <meta property="og:image:alt" content="Significant Hobbies personal apps">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Significant Hobbies — Six Personal Apps">
    <meta name="twitter:description" content="Six independently owned personal apps, connected by a private read-only Hub.">
    <meta name="twitter:image" content="${origin}/hub-opengraph-image">
    <script type="application/ld+json">${structuredData(origin)}</script>
    <style>${CSS}</style>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <nav class="site-nav" aria-label="Primary">
      <a class="wordmark" href="/" aria-current="page"><span class="wordmark-dot" aria-hidden="true"></span>Significant Hobbies</a>
      <div class="nav-meta"><span>Six apps</span><a href="/hub">Private Hub</a></div>
    </nav>
    <main id="main">
      <header class="hero">
        <div class="hero-index" aria-hidden="true">SH<br>06</div>
        <div class="hero-copy">
          <p class="eyebrow">A connected personal system</p>
          <h1>Six personal apps. One quiet place to see how they fit.</h1>
          <p class="lede">Live, Journal, Calorie, Setline, Kith, and Anchor each do one job and keep ownership of their own experience. The Hub brings their privacy-safe summaries together without turning them into one oversized app.</p>
          <div class="hero-actions">
            ${hubAction}
            <a class="button button-secondary" href="#apps">Meet the six apps <span aria-hidden="true">↓</span></a>
          </div>
          <p class="access-note"><strong>Owner-only system.</strong> The Hub has no public signup or checkout. Real-owner sync verification across all six apps is still in progress.</p>
        </div>
      </header>

      <section class="products" id="apps" aria-labelledby="apps-title">
        <div class="section-heading">
          <div><p class="eyebrow">The collection</p><h2 id="apps-title">A separate place for each part of life.</h2></div>
          <p>Every app remains useful on its own. Choose the one that matches what you need to do now.</p>
        </div>
        <div class="product-grid">${cards}</div>
      </section>

      <section class="connection" aria-labelledby="connection-title">
        <div class="connection-intro">
          <p class="eyebrow">How the Hub works</p>
          <h2 id="connection-title">Connection without a takeover.</h2>
          <p>Each product keeps its immediate data and interface. Shared contracts carry only the summaries and documented actions the Hub needs.</p>
        </div>
        <ol class="connection-steps">
          <li><span>01</span><div><h3>Keep the original record</h3><p>A journal entry stays with Journal. A focus session stays with Anchor. The Hub does not replace the app that created it.</p></div></li>
          <li><span>02</span><div><h3>Exchange a typed summary</h3><p>PersonalSyncKit and the shared backend use explicit domain contracts instead of passing around an unbounded copy of personal data.</p></div></li>
          <li><span>03</span><div><h3>See the day together</h3><p>The current Hub is a private, read-only view of safe summaries. Cross-app actions will expand only after real-owner sync is verified.</p></div></li>
        </ol>
      </section>

      <section class="proof" aria-labelledby="proof-title">
        <div class="proof-heading"><p class="eyebrow">Current product truth</p><h2 id="proof-title">Built as a system, kept honest as six products.</h2></div>
        <dl class="proof-grid">
          <div><dt>06</dt><dd>maintained personal apps</dd></div>
          <div><dt>01</dt><dd>shared typed sync package</dd></div>
          <div><dt>Private</dt><dd>read-only Hub access</dd></div>
          <div><dt>Retained</dt><dd>Habits compatibility data</dd></div>
        </dl>
        <p class="proof-note">Habits was absorbed into Anchor. Its historical records and compatibility contracts remain intact, but it is not a seventh maintained product.</p>
      </section>
    </main>

    <footer class="site-footer">
      <div class="footer-lead"><span class="wordmark-dot" aria-hidden="true"></span><p>Six independently useful apps, connected only where the connection earns its place.</p></div>
      <div class="footer-columns">
        <div><p class="footer-label">Product</p><a href="#apps">The six apps</a><a href="/hub">Private Hub</a></div>
        <div><p class="footer-label">Project</p><a href="https://github.com/Significant-Hobbies/significanthobbies">Source code</a><a href="https://github.com/Significant-Hobbies/significanthobbies/issues">Roadmap</a></div>
        <div><p class="footer-label">Current state</p><span>Owner-only</span><span>No public checkout</span><span>Sync verification in progress</span></div>
      </div>
      <p class="footer-fineprint">Each app owns its interface and immediate data. The Hub shows privacy-safe summaries through documented contracts.</p>
    </footer>
    <script src="https://sassmaker.com/project-strip.js" data-project="significanthobbies" defer></script>
    <script src="https://sassmaker.com/ai-chat-footer.js" data-name="Significant Hobbies" data-compose="false" defer></script>
  </body>
</html>`;
}

function html(body: string, extra: HeadersInit = {}): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Link":
        '</index.md>; rel="alternate"; type="text/markdown", </api/ai>; rel="service-desc"; type="application/json", </agents.md>; rel="help"; type="text/markdown"',
      "Vary": "Accept",
      ...extra,
    },
  });
}

function markdown(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Link": '</index.md>; rel="alternate"; type="text/markdown"',
      "Vary": "Accept",
    },
  });
}

function wantsMarkdown(request: Request): boolean {
  const accept = (request.headers.get("Accept") ?? "").toLowerCase();
  if (!accept.includes("text/markdown")) return false;
  if (!accept.includes("text/html")) return true;
  return accept.indexOf("text/markdown") < accept.indexOf("text/html");
}

function publicOrigin(request: Request, url: URL): string {
  const forwardedHost = request.headers.get("X-Forwarded-Host")?.toLowerCase();
  const isPreviewHost =
    forwardedHost?.endsWith(".trycloudflare.com") ||
    forwardedHost?.endsWith(".ngrok-free.app") ||
    forwardedHost?.startsWith("127.0.0.1") ||
    forwardedHost?.startsWith("localhost");
  if (!forwardedHost || !isPreviewHost) return url.origin;
  const protocol = request.headers.get("X-Forwarded-Proto") === "http" ? "http" : "https";
  return `${protocol}://${forwardedHost}`;
}

function structuredData(origin: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Significant Hobbies",
        url: `${origin}/`,
        description:
          "The private Hub for six independently owned personal apps: Live, Journal, Calorie, Setline, Kith, and Anchor.",
        isAccessibleForFree: true,
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Significant Hobbies",
        url: `${origin}/`,
        description:
          "The project organization for a private Hub and six independently owned personal apps.",
        sameAs: ["https://github.com/Significant-Hobbies/significanthobbies"],
      },
      {
        "@type": "ItemList",
        "@id": `${origin}/#products`,
        name: "Significant Hobbies personal apps",
        numberOfItems: PRODUCTS.length,
        itemListElement: PRODUCTS.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: product.href,
          description: product.description,
        })),
      },
    ],
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
:root{font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:#1b1b16;background:#f2efe6;color-scheme:light;--ink:#1b1b16;--muted:#66645c;--paper:#f2efe6;--line:#c9c4b7;--accent:#dc5b3f}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);background-image:linear-gradient(90deg,transparent calc(100% - 1px),rgba(27,27,22,.045) 1px);background-size:min(8vw,96px) 100%;overflow-x:hidden}
a{color:inherit}
.skip-link{position:fixed;z-index:20;top:12px;left:12px;padding:10px 14px;background:var(--ink);color:#fff;transform:translateY(-160%)}
.skip-link:focus{transform:translateY(0)}
.site-nav{max-width:1320px;margin:0 auto;min-height:82px;padding:0 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}
.wordmark{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.wordmark-dot{width:10px;height:10px;background:var(--accent);border-radius:50%;box-shadow:18px 0 0 #f1c945,36px 0 0 #7da99c;margin-right:36px}
.nav-meta{display:flex;align-items:center;gap:28px;font-size:.78rem;font-weight:700;letter-spacing:.04em}
.nav-meta span{color:var(--muted)}
.nav-meta a{text-underline-offset:4px}
main{max-width:1320px;margin:0 auto;border-inline:1px solid var(--line)}
.hero{min-height:720px;display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,4.5fr);border-bottom:1px solid var(--line)}
.hero-index{padding:42px 32px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,4vw,4.5rem);line-height:.9;color:#77746a;border-right:1px solid var(--line)}
.hero-copy{padding:clamp(64px,9vw,126px) clamp(28px,7vw,100px) 72px;display:flex;flex-direction:column;align-items:flex-start}
.eyebrow,.product-category,.footer-label{margin:0 0 20px;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#5d5a52}
h1,h2,h3,p{margin-top:0}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif;font-weight:500}
h1{max-width:970px;margin-bottom:34px;font-size:clamp(3.5rem,7vw,7rem);line-height:.93;letter-spacing:-.055em}
.lede{max-width:770px;margin-bottom:0;font-size:clamp(1.12rem,1.55vw,1.38rem);line-height:1.62;color:#4f4d46}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:36px}
.button,.status-chip{min-height:50px;padding:0 19px;border:1px solid var(--ink);display:inline-flex;align-items:center;justify-content:center;gap:14px;text-decoration:none;font-size:.82rem;font-weight:800}
.button-primary{background:var(--ink);color:#fff}
.button-secondary{background:transparent}
.status-chip{background:#ddd8ca;color:#494740}
.button:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.access-note{max-width:680px;margin:28px 0 0;padding-left:16px;border-left:3px solid var(--accent);font-size:.84rem;line-height:1.55;color:#625f56}
.products{padding:clamp(70px,8vw,112px) clamp(22px,5vw,72px);border-bottom:1px solid var(--line)}
.section-heading{display:grid;grid-template-columns:1.5fr 1fr;align-items:end;gap:60px;margin-bottom:52px}
.section-heading h2,.connection h2,.proof h2{max-width:740px;margin:0;font-size:clamp(2.5rem,5vw,5rem);line-height:.98;letter-spacing:-.04em}
.section-heading>p{max-width:430px;margin:0;color:var(--muted);font-size:1rem;line-height:1.65}
.product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.product-card{position:relative;min-height:390px;padding:24px;background:#f7f4ec;color:inherit;text-decoration:none;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:column;overflow:hidden;transition:background-color .18s ease,color .18s ease}
.product-card::before{content:"";position:absolute;inset:0 0 auto;height:7px;background:var(--tone)}
.product-card:hover,.product-card:focus-visible{background:var(--tone);outline:0}
.product-number{align-self:flex-end;font-size:.7rem;font-weight:800;letter-spacing:.12em}
.product-mark{width:54px;height:54px;margin-top:24px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font-family:Georgia,"Times New Roman",serif;font-size:1.5rem}
.product-copy{margin:auto 0 26px}
.product-category{margin-bottom:10px}
.product-card h3{margin:0 0 10px;font-size:2.25rem;letter-spacing:-.035em}
.product-card p:not(.product-category){max-width:290px;margin:0;color:#4c4a43;line-height:1.52}
.product-state{padding-top:16px;border-top:1px solid currentColor;font-size:.75rem;font-weight:800}
.connection{display:grid;grid-template-columns:1fr 1.35fr;border-bottom:1px solid var(--line)}
.connection-intro{padding:clamp(66px,8vw,108px) clamp(26px,5vw,72px);border-right:1px solid var(--line)}
.connection-intro>p:last-child{max-width:520px;margin:28px 0 0;color:var(--muted);line-height:1.65}
.connection-steps{list-style:none;margin:0;padding:0}
.connection-steps li{min-height:190px;padding:32px clamp(26px,5vw,64px);display:grid;grid-template-columns:54px 1fr;gap:22px;border-bottom:1px solid var(--line)}
.connection-steps li:last-child{border-bottom:0}
.connection-steps li>span{font-size:.72rem;font-weight:800;letter-spacing:.12em;color:var(--accent)}
.connection-steps h3{margin:0 0 10px;font-size:1.5rem}
.connection-steps p{max-width:590px;margin:0;color:var(--muted);line-height:1.6}
.proof{padding:clamp(70px,8vw,112px) clamp(22px,5vw,72px);background:#1c1c18;color:#f2efe6}
.proof .eyebrow{color:#aaa69b}
.proof-heading{display:grid;grid-template-columns:1fr 2fr;gap:48px;align-items:start}
.proof-grid{display:grid;grid-template-columns:repeat(4,1fr);margin:64px 0 0;border-top:1px solid #57564f;border-left:1px solid #57564f}
.proof-grid div{min-height:170px;padding:24px;border-right:1px solid #57564f;border-bottom:1px solid #57564f;display:flex;flex-direction:column;justify-content:space-between}
.proof-grid dt{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,3.5vw,3.6rem);color:#f1c945}
.proof-grid dd{margin:0;max-width:150px;color:#bbb8ae;font-size:.8rem;line-height:1.45}
.proof-note{max-width:710px;margin:30px 0 0;color:#aaa69b;font-size:.84rem;line-height:1.6}
.site-footer{max-width:1320px;margin:0 auto;padding:64px 32px 28px;border-inline:1px solid var(--line)}
.footer-lead{display:flex;align-items:flex-start;gap:12px;max-width:600px}
.footer-lead p{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.8rem,3vw,3rem);line-height:1.08;letter-spacing:-.035em}
.footer-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin:64px 0 54px;padding-top:28px;border-top:1px solid var(--line)}
.footer-columns>div{display:flex;flex-direction:column;align-items:flex-start;gap:10px;font-size:.85rem}
.footer-columns .footer-label{margin-bottom:7px}
.footer-columns a{text-underline-offset:4px}
.footer-columns span{color:var(--muted)}
.footer-fineprint{margin:0;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:.75rem;line-height:1.55}
a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
@media(max-width:900px){
  .hero{grid-template-columns:96px 1fr}.hero-index{padding-inline:20px}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.connection{grid-template-columns:1fr}.connection-intro{border-right:0;border-bottom:1px solid var(--line)}.proof-heading{grid-template-columns:1fr}.proof-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:620px){
  html{scroll-behavior:auto}.site-nav{min-height:70px;padding:0 18px}.nav-meta span{display:none}.hero{display:block;min-height:0}.hero-index{display:none}.hero-copy{padding:64px 20px 58px}h1{font-size:clamp(3.15rem,15.2vw,4.8rem)}.lede{font-size:1.03rem}.hero-actions{width:100%;flex-direction:column}.button,.status-chip{width:100%}.section-heading{grid-template-columns:1fr;gap:22px}.products{padding-inline:16px}.product-grid{grid-template-columns:1fr}.product-card{min-height:330px}.connection-intro,.connection-steps li{padding-inline:20px}.connection-steps li{grid-template-columns:38px 1fr}.proof{padding-inline:20px}.proof-grid{grid-template-columns:1fr 1fr}.proof-grid div{min-height:145px;padding:18px}.site-footer{padding:52px 20px 24px}.footer-lead{display:block}.footer-lead .wordmark-dot{display:block;margin-bottom:30px}.footer-columns{grid-template-columns:1fr 1fr}.footer-columns>div:last-child{grid-column:1/-1}
}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;
