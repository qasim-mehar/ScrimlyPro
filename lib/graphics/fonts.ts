/** Graphics font stacks. The primary data face always leads with Exo 2, keeps
 *  Rajdhani as the metric fallback and Noto Sans Symbols 2 for the PUBG glyph
 *  set (× · | _ ₛ ≌); Arabic/CJK fall through to system-ui via the browser. */
export const FONTS = '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", sans-serif';

/** Full data-bearing stack used by grunge-red player names — `system-ui`
 *  before the generic fallback keeps Arabic/CJK/katakana glyphs intact. */
export const FONTS_FULL = '"Exo 2", "Rajdhani", "Noto Sans Symbols 2", system-ui, sans-serif';

/** Brush/marker accent face for the grunge-red kills callout. `--font-brush`
 *  is declared by next/font/google in the root layout and self-hosted, so it
 *  is guaranteed present before `document.fonts.ready` resolves on export
 *  (html-to-image captures identical typography). */
export const BRUSH_FONTS = 'var(--font-brush), "Permanent Marker", "Caveat Brush", cursive';
