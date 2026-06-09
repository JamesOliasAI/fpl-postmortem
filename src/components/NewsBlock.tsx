"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  id: string;
  headline: string;
  detail: string;
  angle: string;
  tier: 1 | 2 | 3;
  tags: string[];
  engagementScore: number;
}

const ANGLE_ICONS: Record<string, string> = {
  stat_anomaly: "📊",
  ownership_shift: "📈",
  template_contra: "🎯",
  captaincy_debate: "⚔️",
  hot_take: "🔥",
  poll_hook: "📋",
  post_mortem_hook: "💀",
};

const TIER_COLORS: Record<number, string> = {
  1: "border-emerald-400/40 bg-emerald-400/5",
  2: "border-amber-400/40 bg-amber-400/5",
  3: "border-zinc-400/40 bg-zinc-400/5",
};

export default function NewsBlock() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/content?type=news&count=5")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
        else setError("No content available");
      })
      .catch(() => setError("Failed to load insights"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mt-16 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-zinc-300">⚡ FPL Insights</h2>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) return null;

  return (
    <section className="mt-16 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <span className="text-emerald-400">⚡</span> FPL Stats &amp; Insights
        </h2>
        <span className="text-xs text-zinc-500">Live from FPL data</span>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Trending stats, anomalies, and talking points from this season&apos;s data.
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-4 transition hover:border-white/20 ${TIER_COLORS[item.tier] || TIER_COLORS[3]}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{ANGLE_ICONS[item.angle] || "📊"}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-white leading-snug">{item.headline}</h3>
                <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{item.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
