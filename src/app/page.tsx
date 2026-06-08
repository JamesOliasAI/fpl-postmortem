"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const id = teamId.trim().replace(/[^0-9]/g, "");
    if (!id) {
      setError("Enter your numeric FPL Team ID.");
      return;
    }
    setLoading(true);
    router.push(`/r/${id}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12 sm:py-20">
      <div className="w-full max-w-xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-400">
          Free season report
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          How did your FPL season{" "}
          <span className="text-emerald-400">really</span> go?
        </h1>
        <p className="mt-5 text-lg text-zinc-300">
          The points you left on your bench. What your{" "}
          <span className="font-semibold text-white">−4 hits</span> actually
          cost you. Whether you just played the template like everyone else.
          Enter your Team ID for the brutally honest verdict.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            inputMode="numeric"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="Your FPL Team ID (e.g. 1234567)"
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-lg outline-none placeholder:text-zinc-500 focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-400 px-6 py-3 text-lg font-semibold text-[#0a0a1f] transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {loading ? "Reading…" : "Reveal it →"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <details className="mt-5 text-sm text-zinc-400">
          <summary className="cursor-pointer text-zinc-300 hover:text-white">
            Where do I find my Team ID?
          </summary>
          <p className="mt-2 leading-relaxed">
            Log in to the official Fantasy Premier League site, click{" "}
            <span className="text-white">Points</span> or{" "}
            <span className="text-white">Pick Team</span>, and look at the URL:
            it contains <code className="text-emerald-300">/entry/XXXXXX/</code>.
            That number is your Team ID.
          </p>
        </details>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Bench regret", "The points you watched score from your bench."],
            ["Hit damage", "What chasing transfers really cost you."],
            ["Template check", "Did you follow the crowd — or back yourself?"],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="font-semibold text-emerald-400">{t}</p>
              <p className="mt-1 text-sm text-zinc-400">{d}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-zinc-500">
          Not affiliated with the Premier League. Uses public FPL data. We never
          ask for your login.
        </p>
      </div>
    </main>
  );
}
