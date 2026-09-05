import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { APEX_ORIGIN, SITE_NAME } from "../src/agent-surfaces";

const CONTRACT_PATHS = [
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/index.md",
  "/api/ai",
  "/api-ai.json",
  "/.well-known/security.txt",
];

// No Authorization header: a crawler has none, and these must answer anyway.
function anonymous(path: string, init: RequestInit = {}): Promise<Response> {
  return exports.default.fetch(`https://significanthobbies.com${path}`, init);
}

describe("apex crawler and agent contract", () => {
  it.each(CONTRACT_PATHS)("serves %s to an anonymous crawler", async (path) => {
    const response = await anonymous(path);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toBe("");
  });

  it.each(CONTRACT_PATHS)("answers HEAD %s", async (path) => {
    const response = await anonymous(path, { method: "HEAD" });
    expect(response.status).toBe(200);
  });

  it("names Significant Hobbies, never one of the six apps, in every channel", async () => {
    const catalog = (await (await anonymous("/api/ai")).json()) as Record<string, unknown>;
    expect(catalog.name).toBe(SITE_NAME);
    expect(catalog.url).toBe(APEX_ORIGIN);

    const llms = await (await anonymous("/llms.txt")).text();
    expect(llms.startsWith(`# ${SITE_NAME}\n`)).toBe(true);
    expect(llms).not.toMatch(/^# Live\b/m);

    const index = await (await anonymous("/index.md")).text();
    expect(index).toContain("title: Significant Hobbies");
  });

  it("advertises a sitemap on its own host", async () => {
    const robots = await (await anonymous("/robots.txt")).text();
    const sitemaps = robots.match(/^Sitemap: \S+$/gm) ?? [];
    expect(sitemaps).toEqual([`Sitemap: ${APEX_ORIGIN}/sitemap.xml`]);
  });

  it("lists apex URLs only in the sitemap", async () => {
    const response = await anonymous("/sitemap.xml");
    expect(response.headers.get("Content-Type")).toContain("xml");
    const locations = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => String(match[1]),
    );
    expect(locations.length).toBeGreaterThan(0);
    expect(locations).toContain(`${APEX_ORIGIN}/`);
    for (const location of locations) {
      expect(new URL(location).origin).toBe(APEX_ORIGIN);
    }
  });

  it("keeps every catalog surface absolute, apex-owned and in the sitemap", async () => {
    const catalog = (await (await anonymous("/api/ai")).json()) as {
      surfaces: Array<{ url: string; md: string }>;
      sitemap: string;
      llms: string;
    };
    const sitemap = await (await anonymous("/sitemap.xml")).text();

    expect(catalog.surfaces.length).toBeGreaterThan(0);
    for (const surface of catalog.surfaces) {
      expect(new URL(surface.url).origin).toBe(APEX_ORIGIN);
      expect(new URL(surface.md).origin).toBe(APEX_ORIGIN);
      expect(sitemap).toContain(`<loc>${surface.url}</loc>`);
      expect((await anonymous(new URL(surface.md).pathname)).status).toBe(200);
    }
    expect(catalog.sitemap).toBe(`${APEX_ORIGIN}/sitemap.xml`);
    expect(catalog.llms).toBe(`${APEX_ORIGIN}/llms.txt`);
  });

  it("advertises the six apps outside surfaces, since they are other origins", async () => {
    const catalog = (await (await anonymous("/api/ai")).json()) as {
      apps: Array<{ id: string; url: string }>;
    };
    expect(catalog.apps.map((app) => app.id)).toEqual([
      "live",
      "journal",
      "calorie",
      "setline",
      "kith",
      "anchor",
    ]);
    for (const app of catalog.apps) {
      expect(new URL(app.url).hostname.endsWith(".significanthobbies.com")).toBe(true);
    }
  });

  it("serves the same catalog from the /api-ai.json mirror", async () => {
    const [catalog, mirror] = await Promise.all([
      (await anonymous("/api/ai")).text(),
      (await anonymous("/api-ai.json")).text(),
    ]);
    expect(mirror).toBe(catalog);
  });

  it("claims the apex as the canonical security.txt", async () => {
    const security = await (await anonymous("/.well-known/security.txt")).text();
    expect(security).toContain(`Canonical: ${APEX_ORIGIN}/.well-known/security.txt`);
    expect(security).toMatch(/^Contact: /m);
  });

  it("leaves unknown paths to the normal 401, so the edge redirect still governs them", async () => {
    expect((await anonymous("/blog/side-quests")).status).toBe(401);
  });
});
