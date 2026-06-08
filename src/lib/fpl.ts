/**
 * FPL API data layer.
 * Server-only. Fetches the three endpoints we validated and runs the engine.
 *
 * Endpoints (all public, no auth, validated 2026-06-08):
 *   GET /api/bootstrap-static/         -> total_players, elements (ownership)
 *   GET /api/entry/{id}/               -> manager meta (name, team name)
 *   GET /api/entry/{id}/history/       -> per-GW history
 *   GET /api/entry/{id}/event/{gw}/picks/ -> final squad (for anti-template)
 */
import {
  computePostMortem,
  type Bootstrap,
  type EntryHistory,
  type EntryMeta,
  type Pick,
  type PostMortem,
} from "./postmortem";

const BASE = "https://fantasy.premierleague.com/api";

// ---- Leaderboard: the global "Overall" league (id 314) = best managers in the world ----
export interface LeaderRow {
  rank: number;
  teamName: string;
  manager: string;
  total: number;
  entry: number;
}

export async function getTopManagers(limit = 25): Promise<LeaderRow[]> {
  try {
    const d = await fplFetch<{
      standings: {
        results: {
          rank: number;
          entry_name: string;
          player_name: string;
          total: number;
          entry: number;
        }[];
      };
    }>("/leagues-classic/314/standings/", 3600);
    return (d.standings?.results ?? []).slice(0, limit).map((r) => ({
      rank: r.rank,
      teamName: r.entry_name,
      manager: r.player_name,
      total: r.total,
      entry: r.entry,
    }));
  } catch {
    return []; // non-fatal: leaderboard just hides if it fails
  }
}


// FPL occasionally needs a browser-like UA. Cache bootstrap for 1h (it's big & shared).
async function fplFetch<T>(path: string, revalidateSeconds = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": "Mozilla/5.0 (FPL Post-Mortem)" },
    // `next.revalidate` is a Next.js fetch extension; cast keeps it type-safe.
    next: { revalidate: revalidateSeconds },
  } as RequestInit & { next: { revalidate: number } });
  if (!res.ok) {
    throw new Error(`FPL API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Find the last finished gameweek from history (the "final" squad we analyse). */
function lastGwId(history: EntryHistory): number {
  const gws = history.current ?? [];
  return gws.length ? gws[gws.length - 1].event : 0;
}

export async function getPostMortem(teamId: number): Promise<PostMortem> {
  // Bootstrap is large and identical for everyone -> cache 1h.
  const boot = await fplFetch<Bootstrap>("/bootstrap-static/", 3600);
  const [meta, history] = await Promise.all([
    fplFetch<EntryMeta>(`/entry/${teamId}/`),
    fplFetch<EntryHistory>(`/entry/${teamId}/history/`),
  ]);

  const finalGw = lastGwId(history);
  let finalSquadIds: number[] = [];
  if (finalGw > 0) {
    try {
      const picks = await fplFetch<{ picks: Pick[] }>(
        `/entry/${teamId}/event/${finalGw}/picks/`
      );
      // Only count starters + captain (multiplier > 0) as "owned" for template calc.
      finalSquadIds = picks.picks
        .filter((p) => p.multiplier > 0)
        .map((p) => p.element);
    } catch {
      // Non-fatal: if picks fail, anti-template just shows 0/10.
      finalSquadIds = [];
    }
  }

  return computePostMortem(history, boot, meta, finalSquadIds);
}
