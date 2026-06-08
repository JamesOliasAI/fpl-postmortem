import { getPostMortem } from "@/lib/fpl";
import type { PostMortem } from "@/lib/postmortem";
import { ConvertBlock } from "./convert";
import Link from "next/link";

export const dynamic = "force-dynamic"; // always fresh; per-team

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

  const benchIsWorse = pm.benchTotal >= pm.hitsTotal;

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-sm text-zinc-400">Season post-mortem for</p>
        <h1 className="text-3xl font-bold">{pm.teamName}</h1>
        <p className="text-zinc-400">{pm.managerName}</p>

        <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
          <p className="text-lg font-semibold text-emerald-300">
            {pm.headline}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stat
            label="Final points"
            value={pm.totalPoints.toLocaleString()}
            sub={`Beat ${pm.beatPercent.toFixed(1)}% of ${(
              pm.totalPlayers / 1_000_000
            ).toFixed(1)}M managers`}
            accent="green"
          />
          <Stat
            label="Overall rank"
            value={pm.finalRank.toLocaleString()}
          />
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

        {/* Anti-template verdict — the strategic wedge */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-400">
            Template check
          </p>
          <p className="mt-2 text-xl font-bold">
            {pm.templatePlayersOwned}/{pm.templatePlayersTotal}{" "}
            <span className="text-zinc-400 text-base font-normal">
              most-owned players in your squad
            </span>
          </p>
          <p className="mt-2 text-zinc-300">{pm.templateVerdict}</p>
        </div>

        <ConvertBlock teamId={teamId} pm={pm} />

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Check another team
          </Link>
        </p>
      </div>
    </main>
  );
}
