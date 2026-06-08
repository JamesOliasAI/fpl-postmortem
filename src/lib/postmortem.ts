/**
 * FPL Post-Mortem Engine v2
 * -------------------------
 * Pure functions: raw FPL API data -> emotional, shareable season stats + chart series.
 * No network here (lives in fpl.ts). VALIDATED against the live API 2026-06-08.
 *
 * v2 adds (for feature parity with competitors, all from REAL data):
 *   - per-GW series: your points, your overall_rank, the average manager's GW score
 *   - "vs the pack": your total vs the real average-manager season total (sum of
 *     bootstrap event.average_entry_score). HONEST benchmark — NOT a faked projection model.
 *   - luck/volatility heuristic (clearly a heuristic, never presented as a projection)
 *
 * Bug caught earlier & fixed: total player count MUST come from live API, never hardcoded.
 */

// ---- API field subsets we use ----
export interface GwRow {
  event: number;
  points: number;
  total_points: number;
  overall_rank: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}
export interface EntryHistory {
  current: GwRow[];
}
export interface BootstrapEvent {
  id: number;
  average_entry_score: number;
  highest_score: number;
  finished: boolean;
  most_captained: number | null;
}
export interface BootstrapElement {
  id: number;
  web_name: string;
  selected_by_percent: string;
}
export interface Bootstrap {
  total_players: number;
  elements: BootstrapElement[];
  events: BootstrapEvent[];
}
export interface Pick {
  element: number;
  is_captain: boolean;
  multiplier: number;
}
export interface EntryMeta {
  player_first_name: string;
  player_last_name: string;
  name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
}

// ---- Output shapes ----
export interface GwPoint {
  gw: number;
  points: number;
  rank: number;
  avg: number; // average manager's score that GW
  vsAvg: number; // your points minus average
}

export interface PostMortem {
  teamName: string;
  managerName: string;
  totalPoints: number;
  finalRank: number;
  totalPlayers: number;
  beatPercent: number;

  benchTotal: number;
  worstBenchGw: { gw: number; pts: number };
  hitsTotal: number;
  transfersMade: number;
  bestGw: { gw: number; pts: number };
  worstGw: { gw: number; pts: number };

  templatePlayersOwned: number;
  templatePlayersTotal: number;
  templateVerdict: string;

  // v2
  series: GwPoint[];
  avgManagerTotal: number; // the "pack" benchmark (real)
  vsPack: number; // your total - avg manager total
  greenArrows: number; // GWs where overall rank improved
  redArrows: number;
  luckRating: string; // honest heuristic label
  luckBlurb: string;

  headline: string;
}

function templateVerdict(owned: number, total: number): string {
  if (owned >= 8)
    return `You played the template — ${owned}/${total} of the most-popular players. Safe, but you can't climb by following the crowd.`;
  if (owned >= 5)
    return `Half template, half maverick — ${owned}/${total} popular picks. There's rank to be gained by being braver.`;
  return `You backed your own gut — only ${owned}/${total} template players. High risk, high reward.`;
}

/**
 * Luck heuristic — HONEST. We do not have a projection model, so we don't claim one.
 * We measure how "swingy" the season was: big rank gains/drops and how often you beat
 * the average. This is explicitly a vibe/volatility read, labelled as such in the UI.
 */
function luck(series: GwPoint[]): { rating: string; blurb: string } {
  if (series.length < 2) return { rating: "—", blurb: "Not enough data." };
  const beatAvg = series.filter((s) => s.vsAvg > 0).length;
  const pct = beatAvg / series.length;
  // rank swing magnitude
  let maxJump = 0;
  for (let i = 1; i < series.length; i++) {
    const delta = series[i - 1].rank - series[i].rank; // positive = improved
    if (Math.abs(delta) > Math.abs(maxJump)) maxJump = delta;
  }
  if (pct >= 0.6)
    return {
      rating: "On song",
      blurb: `You beat the average manager in ${beatAvg} of ${series.length} gameweeks. Consistent — not lucky, just good.`,
    };
  if (pct <= 0.35)
    return {
      rating: "Rough ride",
      blurb: `You beat the average in only ${beatAvg} of ${series.length} gameweeks. Some of that is variance — but the leaks are fixable.`,
    };
  return {
    rating: "Streaky",
    blurb: `You beat the average in ${beatAvg} of ${series.length} gameweeks. A volatile season — your biggest single move was ${
      maxJump > 0 ? "+" : ""
    }${maxJump.toLocaleString()} rank places.`,
  };
}

export function computePostMortem(
  history: EntryHistory,
  boot: Bootstrap,
  meta: EntryMeta,
  finalSquadPlayerIds: number[]
): PostMortem {
  const gws = history.current ?? [];
  if (gws.length === 0) {
    throw new Error("No gameweek history for this team — has the season started?");
  }

  // Map GW id -> average score from bootstrap (real "pack" figure)
  const avgByGw = new Map<number, number>();
  for (const e of boot.events) avgByGw.set(e.id, e.average_entry_score || 0);

  const series: GwPoint[] = gws.map((g) => {
    const avg = avgByGw.get(g.event) ?? 0;
    return {
      gw: g.event,
      points: g.points,
      rank: g.overall_rank,
      avg,
      vsAvg: g.points - avg,
    };
  });

  const benchTotal = gws.reduce((s, g) => s + (g.points_on_bench || 0), 0);
  const worstBenchGw = gws.reduce(
    (m, g) => (g.points_on_bench > m.pts ? { gw: g.event, pts: g.points_on_bench } : m),
    { gw: 0, pts: -1 }
  );
  const hitsTotal = gws.reduce((s, g) => s + (g.event_transfers_cost || 0), 0);
  const transfersMade = gws.reduce((s, g) => s + (g.event_transfers || 0), 0);

  const finalRow = gws[gws.length - 1];
  const totalPoints = finalRow.total_points;
  const finalRank = finalRow.overall_rank;
  const totalPlayers = boot.total_players;
  const beatPercent = Math.max(0, Math.min(100, 100 * (1 - finalRank / totalPlayers)));

  const bestGw = gws.reduce(
    (m, g) => (g.points > m.pts ? { gw: g.event, pts: g.points } : m),
    { gw: 0, pts: -1 }
  );
  const worstGw = gws.reduce(
    (m, g) => (g.points < m.pts ? { gw: g.event, pts: g.points } : m),
    { gw: 0, pts: 99999 }
  );

  // green/red arrows (rank improved vs prev GW)
  let greenArrows = 0;
  let redArrows = 0;
  for (let i = 1; i < gws.length; i++) {
    if (gws[i].overall_rank < gws[i - 1].overall_rank) greenArrows++;
    else if (gws[i].overall_rank > gws[i - 1].overall_rank) redArrows++;
  }

  // real average-manager season total = sum of finished GW averages
  const avgManagerTotal = boot.events
    .filter((e) => e.finished)
    .reduce((s, e) => s + (e.average_entry_score || 0), 0);
  const vsPack = totalPoints - avgManagerTotal;

  // anti-template
  const top10 = [...boot.elements]
    .sort((a, b) => parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent))
    .slice(0, 10)
    .map((p) => p.id);
  const templatePlayersOwned = top10.filter((id) => finalSquadPlayerIds.includes(id)).length;

  const { rating: luckRating, blurb: luckBlurb } = luck(series);

  const headline =
    vsPack >= 0
      ? `You finished ${vsPack} points above the average manager.`
      : `You finished ${Math.abs(vsPack)} points below the average manager.`;

  return {
    teamName: meta.name,
    managerName: `${meta.player_first_name} ${meta.player_last_name}`.trim(),
    totalPoints,
    finalRank,
    totalPlayers,
    beatPercent,
    benchTotal,
    worstBenchGw,
    hitsTotal,
    transfersMade,
    bestGw,
    worstGw,
    templatePlayersOwned,
    templatePlayersTotal: 10,
    templateVerdict: templateVerdict(templatePlayersOwned, 10),
    series,
    avgManagerTotal,
    vsPack,
    greenArrows,
    redArrows,
    luckRating,
    luckBlurb,
    headline,
  };
}
