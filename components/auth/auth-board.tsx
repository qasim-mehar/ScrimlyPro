import s from "./auth-console.module.css";

/**
 * Decorative standings board for the auth console. It is a schematic of the
 * product's own output — not a real session — and is hidden from assistive
 * tech. The data is the project's deterministic demo top five.
 */
const ROWS = [
  { rank: "01", team: "TF SQUAD", kills: 27, total: 43 },
  { rank: "02", team: "STRAIGHT FORWARD", kills: 26, total: 42 },
  { rank: "03", team: "BULL", kills: 22, total: 38 },
  { rank: "04", team: "JAZZ", kills: 20, total: 35 },
  { rank: "05", team: "SHADOW", kills: 17, total: 31 },
] as const;

export function AuthBoard() {
  return (
    <svg
      className={s.boardSvg}
      viewBox="0 0 520 560"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className={s.boardFrame} x="1" y="1" width="518" height="558" rx="22" />
      <text className={s.boardBrand} x="32" y="50">
        SCRIMLYPRO
      </text>
      <text className={s.boardCaption} x="488" y="50" textAnchor="end">
        SAMPLE STANDINGS
      </text>
      <path className={s.boardSpark} d="M12 1.7l2.5 7.8 7.8 2.5-7.8 2.5L12 22.3l-2.5-7.8-7.8-2.5 7.8-2.5z" transform="translate(464 22) scale(0.72)" />
      <path className={s.boardRule} d="M32 76h456" />

      <text className={s.boardHead} x="32" y="108">
        RANK
      </text>
      <text className={s.boardHead} x="96" y="108">
        TEAM
      </text>
      <text className={s.boardHead} x="356" y="108" textAnchor="end">
        KP
      </text>
      <text className={s.boardHead} x="488" y="108" textAnchor="end">
        TOTAL
      </text>

      {ROWS.map((row, index) => {
        const y = 146 + index * 72;
        return (
          <g key={row.rank} className={index === 0 ? s.boardRowWin : s.boardRow}>
            <rect className={s.boardRowPlate} x="24" y={y - 26} width="472" height="58" rx="10" />
            <text className={s.boardRank} x="32" y={y + 6}>
              {row.rank}
            </text>
            <text className={s.boardTeam} x="96" y={y + 6}>
              {row.team}
            </text>
            <text className={s.boardValue} x="356" y={y + 6} textAnchor="end">
              {row.kills}
            </text>
            <rect className={s.boardBar} x="386" y={y - 7} width={(row.total / 43) * 58} height="8" rx="4" />
            <text className={s.boardTotal} x="488" y={y + 6} textAnchor="end">
              {row.total}
            </text>
          </g>
        );
      })}

      <path className={s.boardRule} d="M32 454h456" />
      <text className={s.boardCaption} x="32" y="488">
        AFTER MATCH 06 · SUPER RULESET
      </text>
      <text className={s.boardCaption} x="488" y="488" textAnchor="end">
        16 SQUADS
      </text>
      <rect className={s.boardScan} x="32" y="90" width="456" height="2" rx="1" />
    </svg>
  );
}
