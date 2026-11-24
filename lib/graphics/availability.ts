import { AESTHETIC_IDS, AESTHETICS } from "./aesthetics";
import type { AestheticId, GraphicVariant, TemplateConfig } from "./types";

const VARIANTS: readonly GraphicVariant[] = ["standings", "mvp", "announcement"];

/** A variant is selectable only when it is backed by a real template image.
 *  Gradient backgrounds are internal fallbacks (legacy rows, dev tools), never
 *  an option the user can pick and export. */
export function hasArtForVariant(
  config: TemplateConfig,
  variant: GraphicVariant,
): boolean {
  return config.backgrounds[variant].type === "image";
}

/** True when at least one of the three variants has real art. */
export function hasAnyArt(config: TemplateConfig): boolean {
  return VARIANTS.some((variant) => hasArtForVariant(config, variant));
}

/** The ids that may be offered in the UI. With a variant: only skins that have
 *  art for THAT variant; without one: skins with art for at least one variant. */
export function selectableAestheticIds(variant?: GraphicVariant): AestheticId[] {
  return AESTHETIC_IDS.filter((id) =>
    variant
      ? hasArtForVariant(AESTHETICS[id]!, variant)
      : hasAnyArt(AESTHETICS[id]!),
  );
}

/** Initial selection for a picker — never boots into a hidden gradient skin. */
export function defaultAestheticId(variant?: GraphicVariant): AestheticId {
  return selectableAestheticIds(variant)[0] ?? "dark-gold";
}
