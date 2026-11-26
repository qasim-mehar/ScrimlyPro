import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GraphicCanvas } from "@/components/graphics/GraphicCanvas";
import { getTemplate } from "@/lib/graphics";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("graphic art loading skeleton (SSR)", () => {
  it("covers an art-backed canvas immediately, outside the export stage", () => {
    const html = renderToStaticMarkup(
      h(GraphicCanvas, {
        config: getTemplate("pmpl-light"),
        variant: "standings",
      }),
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('class="graphic-skeleton" data-loading="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading graphic background…");
    expect(html).toContain('src="/templates/pmpl-light/overall.png"');
    expect((html.match(/graphic-skeleton__row/g) ?? []).length).toBe(11);
    // The overlay comes AFTER the stage (which ends with the watermark), so
    // html-to-image's stage clone cannot capture it.
    expect(html.indexOf("graphic-skeleton")).toBeGreaterThan(
      html.indexOf("scrimlypro.com"),
    );
  });

  it("never shows a skeleton or status for a gradient-only template", () => {
    const html = renderToStaticMarkup(
      h(GraphicCanvas, {
        config: getTemplate("dark-gold"),
        variant: "standings",
      }),
    );

    expect(html).not.toContain('aria-busy="true"');
    expect(html).toContain('class="graphic-skeleton" data-loading="false"');
    expect(html).not.toContain("Loading graphic background…");
    expect(html).not.toContain("<img");
  });

  it("keeps the live region mounted so announcements are reliable", () => {
    const html = renderToStaticMarkup(
      h(GraphicCanvas, {
        config: getTemplate("dark-gold"),
        variant: "standings",
      }),
    );
    expect((html.match(/role="status"/g) ?? []).length).toBe(1);
  });
});

describe("graphic art loading guarantees (source)", () => {
  it("holds PNG export until art settles and aborts stale captures", () => {
    const src = read("components/graphics/export.ts");
    expect(src).toContain("EXPORT_SUPERSEDED");
    expect(src).toContain("art.naturalWidth === 0");
    expect(src).toContain('addEventListener("load"');
    expect(src).toContain('addEventListener("error"');
    expect(src).toContain("await art.decode()");
    expect(src).toContain("width: EXPORT_W");
    expect(src).toContain("height: EXPORT_H");
  });

  it("disables every preview's download while art loads", () => {
    for (const file of [
      "StandingsPreview.tsx",
      "AnnouncementPreview.tsx",
      "MvpPreview.tsx",
      "ShareStandingsPreview.tsx",
    ]) {
      const src = read(`components/graphics/${file}`);
      expect(src, file).toContain("disabled={artLoading}");
      expect(src, file).toContain("onLoadingChange={setArtLoading}");
    }
    const button = read("components/graphics/DownloadPngButton.tsx");
    expect(button).toContain("disabled={busy || disabled}");
    expect(button).toContain("EXPORT_SUPERSEDED");
  });

  it("prefetches art once per src on hover and focus", () => {
    const src = read("components/graphics/AestheticChips.tsx");
    expect(src).toContain("onMouseEnter={() => prefetch(id)}");
    expect(src).toContain("onFocus={() => prefetch(id)}");
    expect(src).toContain("prefetchedSrcs.has(background.src)");
  });

  it("parks the share panel and its header anchor behind one flag", () => {
    const src = read("components/session/SessionView.tsx");
    expect(src).toContain("const SHOW_SHARE_PANEL = false");
    expect((src.match(/SHOW_SHARE_PANEL/g) ?? []).length).toBe(3);
    expect(src).toMatch(/SHOW_SHARE_PANEL \? \(\s*<a href="#share"/);
    expect(src).toMatch(/SHOW_SHARE_PANEL \? \(\s*<SharePanel sessionId=/);
  });
});
