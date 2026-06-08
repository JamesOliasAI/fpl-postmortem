import { ImageResponse } from "next/og";
import { getPostMortem } from "@/lib/fpl";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FPL Post-Mortem season report";

export default async function OgImage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  let line1 = "How did your FPL";
  let line2 = "season really go?";
  let stat = "";
  let team = "";
  try {
    const pm = await getPostMortem(Number(teamId));
    team = pm.teamName;
    line1 =
      pm.vsPack >= 0
        ? `${pm.vsPack} pts above average.`
        : `${Math.abs(pm.vsPack)} pts below average.`;
    line2 = `${pm.benchTotal} left on the bench · ${pm.luckRating}.`;
    stat = `${pm.totalPoints.toLocaleString()} pts · beat ${pm.beatPercent.toFixed(
      0
    )}% of the world`;
  } catch {
    /* use defaults */
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px",
          background: "linear-gradient(135deg,#0a0a1f 0%,#1a1040 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#34d399", letterSpacing: 4 }}>
          FPL POST-MORTEM
        </div>
        {team && (
          <div style={{ fontSize: 34, color: "#a1a1aa", marginTop: 10 }}>
            {team}
          </div>
        )}
        <div style={{ fontSize: 68, fontWeight: 800, marginTop: 24, lineHeight: 1.1 }}>
          {line1}
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: "#34d399",
            lineHeight: 1.1,
          }}
        >
          {line2}
        </div>
        {stat && (
          <div style={{ fontSize: 32, color: "#d4d4d8", marginTop: 30 }}>
            {stat}
          </div>
        )}
        <div style={{ fontSize: 26, color: "#71717a", marginTop: 40 }}>
          Check yours free → fpl-postmortem.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
