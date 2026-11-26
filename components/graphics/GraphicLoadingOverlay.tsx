/**
 * Poster-shaped skeleton shown over GraphicCanvas until the selected
 * template art is decoded. The canvas keeps its 1080×1620 box while loading,
 * so the skeleton is a percentage-based, opaque layer: the previews' live
 * text/palette swap happens underneath it and is never seen half-rendered.
 *
 * Purely decorative (aria-hidden); GraphicCanvas announces the busy state.
 */
const ROW_TOPS = [23, 28.7, 34.4, 40.1, 45.8, 51.5, 57.2, 62.9, 68.6, 74.3, 80];
const ROW_WIDTHS = [76, 62, 71, 58, 79, 66, 73, 60, 77, 65, 55];

export function GraphicLoadingOverlay({ loading }: { loading: boolean }) {
  return (
    <div className="graphic-skeleton" data-loading={loading} aria-hidden="true">
      <div className="graphic-skeleton__block graphic-skeleton__title" />
      <div className="graphic-skeleton__block graphic-skeleton__subtitle" />
      <div className="graphic-skeleton__rule" />
      {ROW_TOPS.map((top, index) => (
        <div
          key={top}
          className="graphic-skeleton__block graphic-skeleton__row"
          style={{ top: `${top}%`, width: `${ROW_WIDTHS[index]}%` }}
        />
      ))}
      <div className="graphic-skeleton__block graphic-skeleton__footer" />
      <div className="graphic-skeleton__sheen" />
    </div>
  );
}
