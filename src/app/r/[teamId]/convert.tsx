"use client";

import { useState } from "react";
import type { PostMortem } from "@/lib/postmortem";

const MONTHLY = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_URL || "";
const SEASON = process.env.NEXT_PUBLIC_STRIPE_SEASON_URL || "";

export function ConvertBlock({
  teamId,
  pm,
}: {
  teamId: string;
  pm: PostMortem;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [shareMsg, setShareMsg] = useState("");

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, teamId, kind: "email" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  function logIntent(plan: string) {
    // Fire-and-forget: record paid-CTA click before redirecting to Stripe.
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", teamId, kind: `click_${plan}` }),
    }).catch(() => {});
  }

  async function share() {
    const url = `${window.location.origin}/r/${teamId}`;
    const text = `My FPL season verdict: left ${pm.benchTotal} pts on the bench, ${pm.templatePlayersOwned}/10 template players. Check yours 👇`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My FPL Post-Mortem", text, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setShareMsg("Copied! Paste it anywhere.");
    setTimeout(() => setShareMsg(""), 2500);
  }

  return (
    <div className="mt-8">
      <button
        onClick={share}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-medium hover:bg-white/10"
      >
        📲 Share my verdict
      </button>
      {shareMsg && (
        <p className="mt-2 text-center text-sm text-emerald-400">{shareMsg}</p>
      )}

      {/* The pitch — positioned around consequences + beating the template */}
      <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-400/10 to-transparent p-6">
        <h2 className="text-2xl font-bold">Next season, stop the leaks.</h2>
        <p className="mt-2 text-zinc-300">
          We&apos;re building an FPL assistant that doesn&apos;t just tell you
          what to do — it shows you the{" "}
          <span className="font-semibold text-white">consequences</span> of
          every move, built around <em>your</em> goal (chasing rank vs. winning
          your mini-league) and how to beat the template instead of following
          it.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href={MONTHLY || "#"}
            onClick={() => logIntent("monthly")}
            className={`rounded-xl bg-emerald-400 px-5 py-4 text-center font-semibold text-[#0a0a1f] transition hover:bg-emerald-300 ${
              MONTHLY ? "" : "pointer-events-none opacity-60"
            }`}
          >
            Reserve early access
            <span className="block text-sm font-normal">£5 / month</span>
          </a>
          <a
            href={SEASON || "#"}
            onClick={() => logIntent("season")}
            className={`rounded-xl border border-emerald-400 px-5 py-4 text-center font-semibold text-emerald-300 transition hover:bg-emerald-400/10 ${
              SEASON ? "" : "pointer-events-none opacity-60"
            }`}
          >
            Season pass
            <span className="block text-sm font-normal">
              £35 / season — save 30%
            </span>
          </a>
        </div>
        {!MONTHLY && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            (Checkout links go live at launch — add NEXT_PUBLIC_STRIPE_* env
            vars to enable.)
          </p>
        )}

        {/* Soft signal */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-sm text-zinc-400">
            Not ready to commit? Get notified at launch + a free season-prep
            guide:
          </p>
          {status === "done" ? (
            <p className="mt-3 font-medium text-emerald-400">
              You&apos;re on the list. See you next season. ⚽
            </p>
          ) : (
            <form onSubmit={joinWaitlist} className="mt-3 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 outline-none placeholder:text-zinc-500 focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-xl bg-white/10 px-5 py-2.5 font-medium hover:bg-white/20 disabled:opacity-60"
              >
                {status === "loading" ? "…" : "Notify me"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="mt-2 text-sm text-red-400">
              Enter a valid email and try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
