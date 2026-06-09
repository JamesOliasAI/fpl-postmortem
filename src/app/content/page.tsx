"use client";

import { useEffect, useState } from "react";

interface SocialItem {
  id: string;
  tweet: string;
  redditTitle: string;
  redditBody: string;
  angle: string;
  tier: 1 | 2 | 3;
  tags: string[];
  pollQuestion?: string;
  pollOptions?: string[];
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1 — Post Now", color: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30" },
  2: { label: "Tier 2 — Strong", color: "bg-amber-400/20 text-amber-300 border-amber-400/30" },
  3: { label: "Tier 3 — Maintenance", color: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30" },
};

const ANGLE_LABELS: Record<string, string> = {
  stat_anomaly: "📊 Stat Anomaly",
  ownership_shift: "📈 Ownership Shift",
  template_contra: "🎯 Template Contrarian",
  captaincy_debate: "⚔️ Captaincy Debate",
  hot_take: "🔥 Hot Take",
  poll_hook: "📋 Poll / Engagement",
  post_mortem_hook: "💀 Post-Mortem Hook",
};

export default function ContentDashboard() {
  const [items, setItems] = useState<SocialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [filter, setFilter] = useState<1 | 2 | 3 | 0>(0); // 0 = all

  useEffect(() => {
    fetch("/api/content?type=social&count=15")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
        else setError("No content generated yet");
      })
      .catch(() => setError("Failed to load content"))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    });
  };

  const filtered = filter === 0 ? items : items.filter((i) => i.tier === filter);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center px-5 py-12">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-bold">Content Dashboard</h1>
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-bold">Content Dashboard</h1>
        <p className="mt-2 text-zinc-400">{error}</p>
        <p className="mt-1 text-sm text-zinc-500">
          The content engine generates insights from live FPL data. Try refreshing in a moment.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <div className="w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Ready-to-post tweets &amp; Reddit content from live FPL data. Copy, paste, post.
            </p>
          </div>
          <div className="flex gap-2">
            {([0, 1, 2, 3] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === t
                    ? "bg-emerald-400 text-[#0a0a1f]"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                {t === 0 ? "All" : `T${t}`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
          <span>T1 = Post these first (highest engagement)</span>
          <span>T2 = Strong backup content</span>
          <span>T3 = Fill/poll content</span>
        </div>

        <div className="mt-6 space-y-6">
          {filtered.map((item) => {
            const tierInfo = TIER_LABELS[item.tier];
            const copied = copiedId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400">
                    {ANGLE_LABELS[item.angle] || item.angle}
                  </span>
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-zinc-500">#{tag}</span>
                  ))}
                </div>

                {/* Tweet */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      🐦 Tweet
                    </h3>
                    <button
                      onClick={() => copyToClipboard(item.tweet, item.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        copied
                          ? "bg-emerald-400 text-[#0a0a1f]"
                          : "bg-white/10 text-zinc-300 hover:bg-white/20"
                      }`}
                    >
                      {copied ? "✓ Copied!" : "Copy Tweet"}
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm leading-relaxed text-zinc-200 font-sans">
                    {item.tweet}
                  </pre>
                </div>

                {/* Reddit */}
                <div className="border-t border-white/5 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      📕 Reddit
                    </h3>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `**${item.redditTitle}**\n\n${item.redditBody}`,
                          `reddit-${item.id}`
                        )
                      }
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        copiedId === `reddit-${item.id}`
                          ? "bg-emerald-400 text-[#0a0a1f]"
                          : "bg-white/10 text-zinc-300 hover:bg-white/20"
                      }`}
                    >
                      {copiedId === `reddit-${item.id}` ? "✓ Copied!" : "Copy Reddit"}
                    </button>
                  </div>
                  <p className="mt-2 font-semibold text-white">{item.redditTitle}</p>
                  <pre className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-sans">
                    {item.redditBody}
                  </pre>
                </div>

                {/* Poll (if applicable) */}
                {item.pollQuestion && item.pollOptions && (
                  <div className="border-t border-white/5 px-5 py-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      📋 Poll
                    </h3>
                    <p className="mt-2 font-medium text-white">{item.pollQuestion}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.pollOptions.map((opt) => (
                        <span
                          key={opt}
                          className="rounded-lg bg-white/5 px-3 py-1 text-sm text-zinc-300"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 text-center text-zinc-500">
            <p>No content items for this filter. Try &quot;All&quot;.</p>
          </div>
        )}

        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold text-emerald-400">📋 How to use this</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li>• <strong>Tier 1</strong> content is your highest-engagement material. Post these first.</li>
            <li>• <strong>Copy Tweet</strong> → paste into Twitter/X. Add #FPL + #FantasyPL.</li>
            <li>• <strong>Copy Reddit</strong> → paste into r/FantasyPL. Add flair if required.</li>
            <li>• <strong>Polls</strong> create 2-5x more impressions than text tweets.</li>
            <li>• Space posts 2-3 hours apart. Don&apos;t post everything at once.</li>
            <li>• Content refreshes hourly from live FPL data. Come back for fresh angles.</li>
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          <a href="/" className="text-zinc-400 hover:text-white">← Back to post-mortem</a>
        </p>
      </div>
    </main>
  );
}
