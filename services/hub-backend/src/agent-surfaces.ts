// Apex crawler + agent contract — public, no auth required.
//
// significanthobbies.com is the Hub over six apps, but the apex used to
// redirect /robots.txt, /sitemap.xml, /llms.txt and /api/ai to
// live.significanthobbies.com. Every crawler and model that followed those
// files was told, authoritatively, that this domain is Live — one of the six
// apps it hosts — and the apex advertised no sitemap of its own, so nothing on
// it was discoverable beyond the homepage.
//
// These handlers give the apex its own contract, declaring Significant
// Hobbies. Content paths (/blog/side-quests, /compare, …) are genuinely owned
// by Live and keep their 308 at the edge — see hub-routing.mjs in the Live
// repository, which decides what reaches this Worker.
//
// Background: Significant-Hobbies/live#7 and
// Significant-Hobbies/significanthobbies#148.

import { HOME_MARKDOWN, PRODUCTS } from "./hub";

/**
 * Contract files are canonical on the apex, never on www or a preview host,
 * so every URL they advertise is pinned to the apex origin rather than being
 * rebound to the request host. A crawler that reaches this Worker through any
 * other name is told where the canonical copy lives.
 */
export const APEX_ORIGIN = "https://significanthobbies.com";

/** The entity that owns this host. Not "Live" — Live is one of the six apps. */
export const SITE_NAME = "Significant Hobbies";

/**
 * Matches the deployed apex <title>/JSON-LD and the HOME_MARKDOWN front
 * matter. All three channels have to name the same entity or the identity
 * audit sees a handover again.
 */
export const SITE_SUMMARY =
  "The private Hub for six independently owned personal apps: Live, Journal, Calorie, Setline, Kith, and Anchor.";

/** Public, indexable, apex-owned routes. The sitemap is exactly this list. */
const PUBLIC_ROUTES = [
  {
    id: "home",
    path: "/",
    markdown: "/index.md",
    description: "Hub home — the six apps and how they connect",
    changefreq: "weekly",
    priority: "1.0",
  },
];

const SECURITY_CONTACT = "mailto:sarthakagrawal927@gmail.com";
const SECURITY_EXPIRES = "2027-04-27T00:00:00Z";

const ROBOTS_TXT = `# ${SITE_NAME} — ${SITE_SUMMARY}
# Machine-readable index: ${APEX_ORIGIN}/llms.txt

User-agent: *
Allow: /

# The Hub itself is owner-only. Nothing behind a session is agent-indexed.
Disallow: /hub
Disallow: /login
Disallow: /mcp
Disallow: /v1/

# Agent indexing
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /index.md
Allow: /api/ai
Allow: /api-ai.json
Allow: /.well-known/agent-skills/

Sitemap: ${APEX_ORIGIN}/sitemap.xml
`;

const APP_LINES = PRODUCTS.map(
  (product) => `- [${product.name}](${product.href}): ${product.description}`,
).join("\n");

const LLMS_TXT = `# ${SITE_NAME}

> ${SITE_SUMMARY}

## The six apps

${APP_LINES}

Each app is a separate origin with its own agent index. ${SITE_NAME} is the hub
over them, not a seventh app, and not any one of them.

## Machine surfaces

- [Agent catalog](${APEX_ORIGIN}/api/ai): JSON inventory of public apex surfaces
- [Homepage markdown](${APEX_ORIGIN}/index.md): Hub brief without JavaScript
- [Full agent brief](${APEX_ORIGIN}/llms-full.txt): This index plus the homepage brief
- [Agent skills](${APEX_ORIGIN}/.well-known/agent-skills/index.json): agentskills.io 0.2.0 discovery
- [Sitemap](${APEX_ORIGIN}/sitemap.xml): Public apex routes
- [This index](${APEX_ORIGIN}/llms.txt)

## Notes for agents

- The Hub is owner-only and read-only. There is no public signup, checkout, or
  open API; \`/hub\`, \`/mcp\` and \`/v1/*\` require the owner's session.
- Each product keeps its own interface and immediate data. The Hub exchanges
  typed summaries and documented actions, it does not merge app data stores.
- Habits was absorbed into Anchor. The habits domain survives for historical
  data compatibility, not as a seventh maintained product.

## CLI

\`\`\`bash
# Fetch the agent catalog
curl -s ${APEX_ORIGIN}/api/ai | jq .

# Fetch the homepage as markdown
curl -s -H 'Accept: text/markdown' ${APEX_ORIGIN}/
\`\`\`
`;

const LLMS_FULL_TXT = `# ${SITE_NAME} — full agent brief

> ${SITE_SUMMARY}

## Index

${LLMS_TXT}

## Homepage

${HOME_MARKDOWN}`;

const SECURITY_TXT = `Contact: ${SECURITY_CONTACT}
Expires: ${SECURITY_EXPIRES}
Preferred-Languages: en
Acknowledgments: https://github.com/sarthakagrawal927
Canonical: ${APEX_ORIGIN}/.well-known/security.txt
`;

function sitemapXml(): string {
  const entries = PUBLIC_ROUTES.map(
    (route) => `  <url>
    <loc>${APEX_ORIGIN}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

/**
 * Only apex-owned routes belong in `surfaces`. The six apps live on their own
 * origins and are advertised separately as `apps`, because the catalog audit
 * requires every surface URL to be same-origin and present in this host's
 * sitemap — and because cross-listing another host's routes here is the
 * duplicate-signal problem this contract exists to undo.
 */
function catalog(): Record<string, unknown> {
  return {
    name: SITE_NAME,
    version: "1",
    url: APEX_ORIGIN,
    description: SITE_SUMMARY,
    llms: `${APEX_ORIGIN}/llms.txt`,
    llmsFull: `${APEX_ORIGIN}/llms-full.txt`,
    sitemap: `${APEX_ORIGIN}/sitemap.xml`,
    robots: `${APEX_ORIGIN}/robots.txt`,
    markdown: { suffix: ".md", negotiation: true },
    surfaces: PUBLIC_ROUTES.map((route) => ({
      id: route.id,
      url: `${APEX_ORIGIN}${route.path}`,
      md: `${APEX_ORIGIN}${route.markdown}`,
      kind: "static",
      description: route.description,
    })),
    apps: PRODUCTS.map((product) => ({
      id: product.id,
      name: product.name,
      url: product.href,
      category: product.category,
      description: product.description,
    })),
    auth: {
      public: true,
      notes:
        "Public surfaces are read-only and unauthenticated. The Hub itself is owner-only: /hub, /mcp and /v1/* require the owner's session and are not agent-indexed.",
    },
  };
}

function body(
  request: Request,
  content: string,
  contentType: string,
  extra: Record<string, string> = {},
): Response {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300",
    ...extra,
  });
  return new Response(request.method === "HEAD" ? null : content, { headers });
}

/**
 * @returns a response for an apex contract path, or null so the caller can
 *   carry on routing.
 */
export function handleAgentSurfaces(request: Request, url: URL): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const catalogJson = () =>
    body(request, `${JSON.stringify(catalog(), null, 2)}\n`, "application/json; charset=utf-8");

  switch (url.pathname) {
    case "/robots.txt":
      return body(request, ROBOTS_TXT, "text/plain; charset=utf-8");
    case "/sitemap.xml":
      return body(request, sitemapXml(), "application/xml; charset=utf-8");
    case "/llms.txt":
      return body(request, LLMS_TXT, "text/plain; charset=utf-8");
    case "/llms-full.txt":
      return body(request, LLMS_FULL_TXT, "text/plain; charset=utf-8");
    case "/index.md":
      return body(request, HOME_MARKDOWN, "text/markdown; charset=utf-8");
    case "/api/ai":
    case "/api-ai.json":
      return catalogJson();
    case "/.well-known/security.txt":
      return body(request, SECURITY_TXT, "text/plain; charset=utf-8");
    default:
      return null;
  }
}
