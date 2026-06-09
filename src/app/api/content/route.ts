import { NextResponse } from "next/server";
import { generateContentBatch, getNewsBlockItems, getSocialBatch } from "../../../lib/content-engine";

export const revalidate = 3600; // Cache for 1 hour — content refreshes hourly

/**
 * GET /api/content
 *
 * Query params:
 *   ?type=news     → website news block items (default, count=5)
 *   ?type=social   → social media content batch (count=10)
 *   ?type=full     → full content batch with all items + summary
 *   ?count=N       → override default count
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "news";
    const count = parseInt(searchParams.get("count") || "0", 10) || undefined;

    const batch = await generateContentBatch();

    switch (type) {
      case "news":
        return NextResponse.json({
          items: getNewsBlockItems(batch, count || 5),
          generatedAt: batch.generatedAt,
          gameweek: batch.gameweek,
        });
      case "social":
        return NextResponse.json({
          items: getSocialBatch(batch, count || 10),
          generatedAt: batch.generatedAt,
          gameweek: batch.gameweek,
        });
      case "full":
        return NextResponse.json(batch);
      default:
        return NextResponse.json({ error: "Invalid type. Use news, social, or full." }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
