/**
 * FPL Post-Mortem Engine
 * -----------------------
 * Pure functions that turn raw FPL API data into the emotional, shareable
 * "season post-mortem" stats. No network calls here on purpose — networking
 * lives in the API route, calculation lives here so it's easy to test.
 *
 * VALIDATED against the real FPL API on 2026-06-08:
 *   - bootstrap-static/  -> total_players = 13,107,732, top-owned players
 *   - entry/{id}/history/ -> per-GW points, points_on_bench, event_transfers_cost, overall_rank
 *
 * Bug we already caught & fixed in validation:
 *   total player count MUST come from the live API (bootstrap.total_players),
 *   never hardcoded — a stale guess produces impossible negative percentiles
 *   when a manager's final rank exceeds the guess.
 */

// ---- Types describing only the API fields we actually use ----
export interface GwRow {
  event: number;
  points: number;
  total_points: number;
  overall_rank: number;
  event_transfers: number;
  event_transfers_cost: number; // points lost to -4 hits
  points_on_bench: number;
}

export interface EntryHistory {
  current: GwRow[];
}

export interface BootstrapElement {
  id: number;
  web_name: string;
  selected_by_percent: string; // e.g. "62.5"
}

export interface Bootstrap {
  total_players: number;
  elements: BootstrapElement[];
}

export interface Pick {
  element: number; // player id
  is_captain: boolean;
  multiplier: number; // 0 = benched, 1 = playing, 2 = captain, 3 = triple captain
}

export interface EntryMeta {
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_points: number;
  summary_overall_rank: number;
}

// ---- The shape we hand to the UI ----
export interface PostMortem {
  teamName: string;
  managerName: string;
  totalPoints: number;
  finalRank: number;
  totalPlayers: number;
  beatPercent: number;      // % of all managers you finished above
  benchTotal: number;       // points left on bench all season
  worstBenchGw: { gw: number; pts: number };
  hitsTotal: number;        // points lost to -4 transfer hits
  transfersMade: number;
  bestGw: { gw: number; pts: number };
  worstGw: { gw: number; pts: number };
  templatePlayersOwned: number;   // how many of top-10 owned players were in final squad
  templatePlayersTotal: number;   // = 10
  templateVerdict: string;        // the anti-template headline
  headline: string;               // the one-liner for the share card
}

/** Build the anti-template verdict — the strategic wedge from our roadmap. */
function templateVerdict(owned: number, total: number): string {
  if (owned >= 8) return `You played the template — ${owned}/${total} of the most-popular players. Safe, but you can't climb by following the crowd.`;
  if (owned >= 5) return `Half template, half maverick — ${owned}/${total} popular picks. There's rank to be gained by being braver.`;
  return `You backed your own gut — only ${owned}/${total} template players. High risk, high reward.`;
}

/**
 * Compute the full post-mortem.
 * @param history  /api/entry/{id}/history/
 * @param boot     /api/bootstrap-static/
 * @param meta     /api/entry/{id}/
 * @param finalSquadPlayerIds player ids in the manager's final-GW squad (from picks endpoint)
 */
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
  // % of managers you finished ABOVE. Clamp to [0,100] for safety.
  const beatPercent = Math.max(
    0,
    Math.min(100, 100 * (1 - finalRank / totalPlayers))
  );

  const bestGw = gws.reduce(
    (m, g) => (g.points > m.pts ? { gw: g.event, pts: g.points } : m),
    { gw: 0, pts: -1 }
  );
  const worstGw = gws.reduce(
    (m, g) => (g.points < m.pts ? { gw: g.event, pts: g.points } : m),
    { gw: 0, pts: 99999 }
  );

  // Anti-template: how many of the 10 most-owned players were in the final squad
  const top10 = [...boot.elements]
    .sort(
      (a, b) =>
        parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent)
    )
    .slice(0, 10)
    .map((p) => p.id);
  const templatePlayersOwned = top10.filter((id) =>
    finalSquadPlayerIds.includes(id)
  ).length;

  const headline =
    benchTotal >= hitsTotal && benchTotal > 0
      ? `You left ${benchTotal} points on your bench this season.`
      : hitsTotal > 0
      ? `Your transfer hits cost you ${hitsTotal} points.`
      : `You finished on ${totalPoints} points — beating ${beatPercent.toFixed(1)}% of the world.`;

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
    headline,
  };
}
