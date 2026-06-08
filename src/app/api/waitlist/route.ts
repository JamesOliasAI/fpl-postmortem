import { NextRequest, NextResponse } from "next/server";

/**
 * Capture endpoint for ALL validation signals:
 *   kind = "email"          -> soft waitlist signup (the email list)
 *   kind = "click_monthly"  -> clicked the £5/mo pre-order CTA (hard intent)
 *   kind = "click_season"   -> clicked the season-pass CTA (hard intent)
 *
 * Writes to Supabase if configured; otherwise logs to server console so the
 * app still works pre-database. (Stripe pre-orders themselves are tracked in
 * the Stripe dashboard — this just captures intent + the email list.)
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; teamId?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const teamId = (body.teamId || "").toString();
  const kind = body.kind || "email";

  // Validate emails only for the email-signup kind.
  if (kind === "email" && !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    // Graceful fallback: no DB yet. Don't lose data silently — log it.
    console.log("[waitlist:no-db]", { kind, email, teamId, at: new Date().toISOString() });
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    const res = await fetch(`${url}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email: email || null, team_id: teamId, kind }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[waitlist:supabase-error]", res.status, t);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    console.error("[waitlist:exception]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
