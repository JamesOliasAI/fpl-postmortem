"use client";

import type { GwPoint } from "@/lib/postmortem";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const GREEN = "#34d399";
const RED = "#f87171";
const MUTED = "#52525b";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-400">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      <div className="mt-4 h-64 w-full">{children}</div>
    </div>
  );
}

export function RankJourney({ series }: { series: GwPoint[] }) {
  // overall_rank: lower is better, so invert the Y axis
  return (
    <Card
      title="Your rank journey"
      subtitle="Lower is better. Every green stretch is you climbing the world."
    >
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="gw" stroke={MUTED} fontSize={11} tickLine={false} />
          <YAxis
            reversed
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            width={55}
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`
            }
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a1f",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              color: "#fff",
            }}
            formatter={(v) => [Number(v).toLocaleString(), "Overall rank"]}
            labelFormatter={(l) => `Gameweek ${l}`}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke={GREEN}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function PointsPerGw({ series }: { series: GwPoint[] }) {
  const best = Math.max(...series.map((s) => s.points));
  const worst = Math.min(...series.map((s) => s.points));
  return (
    <Card
      title="Points every gameweek"
      subtitle="Green = your best week, red = your worst. The dashed line is the average manager."
    >
      <ResponsiveContainer>
        <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="gw" stroke={MUTED} fontSize={11} tickLine={false} />
          <YAxis stroke={MUTED} fontSize={11} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{
              background: "#0a0a1f",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              color: "#fff",
            }}
            formatter={(v) => [`${Number(v)} pts`, "Your score"]}
            labelFormatter={(l) => `Gameweek ${l}`}
          />
          <Bar dataKey="points" radius={[3, 3, 0, 0]}>
            {series.map((s) => (
              <Cell
                key={s.gw}
                fill={s.points === best ? GREEN : s.points === worst ? RED : "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function VsPack({
  series,
  totalPoints,
  avgManagerTotal,
}: {
  series: GwPoint[];
  totalPoints: number;
  avgManagerTotal: number;
}) {
  // Cumulative you vs cumulative average manager — the honest "expectation vs reality"
  let cumYou = 0;
  let cumAvg = 0;
  const data = series.map((s) => {
    cumYou += s.points;
    cumAvg += s.avg;
    return { gw: s.gw, you: cumYou, avg: cumAvg };
  });
  return (
    <Card
      title="You vs the average manager"
      subtitle={`Final: ${totalPoints.toLocaleString()} pts vs the pack's ${avgManagerTotal.toLocaleString()}. The gap is how far you pulled ahead — or fell behind.`}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="you" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GREEN} stopOpacity={0.5} />
              <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="gw" stroke={MUTED} fontSize={11} tickLine={false} />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            width={45}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a1f",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              color: "#fff",
            }}
            formatter={(v, name) => [
              `${Number(v).toLocaleString()} pts`,
              name === "you" ? "You" : "Avg manager",
            ]}
            labelFormatter={(l) => `After GW${l}`}
          />
          <Area
            type="monotone"
            dataKey="you"
            stroke={GREEN}
            strokeWidth={2.5}
            fill="url(#you)"
          />
          <Line type="monotone" dataKey="avg" stroke={MUTED} strokeWidth={2} dot={false} />
          <ReferenceLine y={0} stroke={MUTED} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
