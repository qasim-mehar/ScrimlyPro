// TEMPORARY scaffold check page — replaced by session flow in C4.

const GLYPHS =
  "TRB HANAN · TF×MAₛOOR · 4NM | BROKEN · TFxMA_SODOR · AKM≌Dasim";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold tracking-widest text-gold">
        SCRIMLY PRO
      </h1>
      <p className="text-sm text-muted">scaffold ready — chunk C1.1</p>
      <div className="w-full rounded-lg border border-line bg-surface p-4">
        <p className="font-display text-2xl break-words leading-relaxed">
          {GLYPHS}
        </p>
      </div>
      <p className="text-xs text-muted">
        If every character above renders (no □ tofu boxes), fonts are correct.
      </p>
    </main>
  );
}
