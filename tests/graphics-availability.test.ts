import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AESTHETICS,
  AESTHETIC_IDS,
  defaultAestheticId,
  getTemplate,
  selectableAestheticIds,
  type AestheticId,
  type GraphicVariant,
} from "@/lib/graphics";

const ART_IDS: Record<GraphicVariant, string[]> = {
  standings: [
    "pmpl-light",
    "neon-green",
    "challengers-red",
    "ewc-yellow",
    "onyx-green",
    "pmgc-crimson",
    "pmgc-aqua",
    "pmwi-violet",
    "pmsl-cobalt",
    "ewc-teal",
  ],
  mvp: [
    "challengers-red",
    "grunge-red",
    "esports-clash",
    "court-orange",
    "dusk-amber",
    "cardinal-gold",
    "apex-blaze",
    "urban-slate",
  ],
  announcement: [
    "pmpl-light",
    "onyx-green",
    "rundown-orange",
    "royal-blue",
    "varsity-yellow",
    "cardinal-gold",
    "varsity-purple",
    "varsity-orange",
  ],
};

const GRADIENT_ONLY = ["dark-gold", "purple-butterfly", "pink-blossom"];

describe("art-backed option lists", () => {
  it.each(["standings", "mvp", "announcement"] as const)(
    "%s offers only the skins with a template image",
    (variant) => {
      const actual = selectableAestheticIds(variant);
      // Every pinned id keeps its art; parallel template waves may add more
      // art-backed skins without needing to rewrite this list every time.
      for (const id of ART_IDS[variant]) expect(actual).toContain(id);
      for (const id of actual) {
        expect(AESTHETICS[id]!.backgrounds[variant].type).toBe("image");
      }
    },
  );

  it("does not offer a skin for a variant that lacks its art", () => {
    expect(selectableAestheticIds("mvp")).not.toContain("pmgc-aqua");
    expect(selectableAestheticIds("announcement")).not.toContain("pmgc-aqua");
    expect(selectableAestheticIds("standings")).toContain("pmgc-aqua");
  });

  it("hides gradient-only skins everywhere", () => {
    const all = selectableAestheticIds();
    expect(all.length).toBeGreaterThanOrEqual(21);
    for (const id of GRADIENT_ONLY) {
      expect(all).not.toContain(id);
      for (const variant of ["standings", "mvp", "announcement"] as const) {
        expect(selectableAestheticIds(variant)).not.toContain(id);
      }
    }
  });

  it("every selectable id is registered and every default is selectable", () => {
    for (const variant of ["standings", "mvp", "announcement"] as const) {
      const ids = selectableAestheticIds(variant);
      expect(defaultAestheticId(variant)).toBe(ids[0]);
      for (const id of ids) {
        expect(AESTHETIC_IDS).toContain(id);
      }
    }
    expect(AESTHETIC_IDS).toContain(defaultAestheticId());
  });

  it("every declared image background points at a real file", () => {
    for (const config of Object.values(AESTHETICS)) {
      for (const bg of Object.values(config.backgrounds)) {
        if (bg.type === "image") {
          expect(existsSync(`public${bg.src}`)).toBe(true);
        }
      }
    }
  });

  it("keeps the internal fallback for legacy sessions", () => {
    expect(getTemplate("dev-dark-gold" as AestheticId).id).toBe("dark-gold");
    expect(getTemplate("dark-gold").id).toBe("dark-gold");
  });
});
