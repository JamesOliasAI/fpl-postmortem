import { getPostMortem, getTopManagers } from "@/lib/fpl";
import type { PostMortem } from "@/lib/postmortem";
import { ConvertBlock } from "./convert";
import { RankJourney, PointsPerGw, VsPack } from "./charts";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "red" | "green" | "default";
}) {
  const color =
    accent === "red"
      ? "text-red-400"
      : accent === "green"
      ? "text-emerald-400"
      : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-zinc-400">{sub}</p>}
    </div>
  );
}

export default async function Results({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  let pm: PostMortem | null = null;
  let err = "";
  try {
    pm = await getPostMortem(Number(teamId));
  } catch (e) {
    err = e instanceof Error ? e.message : "Something went wrong.";
  }

  if (!pm) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-bold">Couldn&apos;t read that team</h1>
        <p className="mt-2 max-w-md text-zinc-400">
          {err} Double-check your Team ID (the number in your FPL URL after{" "}
          <code className="text-emerald-300">/entry/</code>).
        </p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-emerald-400 px-5 py-2.5 font-semibold text-[#0a0a1f]"
        >
          ← Try again
        </Link>
      </main>
    );
  }

  const leaders = await getTopManagers(25);
  const benchIsWorse = pm.benchTotal >= pm.hitsTotal;
  const aheadOfPack = pm.vsPack >= 0;

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-sm text-zinc-400">Season post-mortem for</p>
        <h1 className="text-3xl font-bold">{pm.teamName}</h1>
        <p className="text-zinc-400">{pm.managerName}</p>

        {/* HERO: vs the pack + luck */}
        <div
          className={`mt-6 rounded-2xl border p-6 ${
            aheadOfPack
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-red-400/30 bg-red-400/10"
          }`}
        >
          <p
            className={`text-2xl font-bold ${
              aheadOfPack ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {pm.headline}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
            <span>
              Verdict:{" "}
              <span className="font-semibold text-white">{pm.luckRating}</span>
            </span>
            <span>🟢 {pm.greenArrows} green arrows</span>
            <span>🔴 {pm.redArrows} red arrows</span>
          </div>
          <p className="mt-3 text-sm text-zinc-300">{pm.luckBlurb}</p>
        </div>

        {/* Key stat grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stat
            label="Final points"
            value={pm.totalPoints.toLocaleString()}
            sub={`Beat ${pm.beatPercent.toFixed(1)}% of ${(
              pm.totalPlayers / 1_000_000
            ).toFixed(1)}M managers`}
            accent="green"
          />
          <Stat label="Overall rank" value={pm.finalRank.toLocaleString()} />
          <Stat
            label="Points left on bench"
            value={pm.benchTotal.toString()}
            sub={`Worst: GW${pm.worstBenchGw.gw} (${pm.worstBenchGw.pts} pts benched)`}
            accent={benchIsWorse ? "red" : "default"}
          />
          <Stat
            label="Lost to −4 hits"
            value={pm.hitsTotal.toString()}
            sub={`${pm.transfersMade} transfers made`}
            accent={!benchIsWorse && pm.hitsTotal > 0 ? "red" : "default"}
          />
          <Stat
            label="Best gameweek"
            value={`GW${pm.bestGw.gw}`}
            sub={`${pm.bestGw.pts} points`}
            accent="green"
          />
          <Stat
            label="Worst gameweek"
            value={`GW${pm.worstGw.gw}`}
            sub={`${pm.worstGw.pts} points`}
            accent="red"
          />
        </div>

        {/* Charts */}
        <VsPack
          series={pm.series}
          totalPoints={pm.totalPoints}
          avgManagerTotal={pm.avgManagerTotal}
        />
        <RankJourney series={pm.series} />
        <PointsPerGw series={pm.series} />

        {/* Anti-template verdict */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-400">
            Template check
          </p>
          <p className="mt-2 text-xl font-bold">
            {pm.templatePlayersOwned}/{pm.templatePlayersTotal}{" "}
            <span className="text-base font-normal text-zinc-400">
              most-owned players in your squad
            </span>
          </p>
          <p className="mt-2 text-zinc-300">{pm.templateVerdict}</p>
        </div>

        <ConvertBlock teamId={teamId} pm={pm} />

        {/* Leaderboard: best managers in the world */}
        {leaders.length > 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-400">
              The best managers in the world this season
            </p>
            <div className="mt-3 divide-y divide-white/5">
              {leaders.map((r) => (
                <Link
                  key={r.entry}
                  href={`/r/${r.entry}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-emerald-300"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-right text-zinc-500">{r.rank}</span>
                    <span className="font-medium">{r.teamName}</span>
                    <span className="text-zinc-500">{r.manager}</span>
                  </span>
                  <span className="font-semibold">{r.total.toLocaleString()}</span>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Tap any team to see their post-mortem. Public FPL data.
            </p>
          </div>
        )}

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Check another team
          </Link>
        </p>
      </div>
    </main>
  );
}
