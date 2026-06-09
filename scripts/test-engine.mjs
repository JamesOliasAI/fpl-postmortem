// Quick test: run the content engine standalone
async function test() {
  console.log("Testing FPL Content Engine...\n");

  try {
    const bootRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const boot = await bootRes.json();

    console.log(`✅ Bootstrap: ${boot.elements.length} players, ${boot.events.length} GWs, ${boot.total_players} total managers`);

    // Find some stat anomalies
    const players = boot.elements.filter((p) => p.minutes > 500);

    // xG overperformers
    const over = players
      .filter((p) => parseFloat(p.expected_goals) > 2)
      .map((p) => ({ name: p.web_name, goals: p.goals_scored, xg: parseFloat(p.expected_goals) }))
      .map((p) => ({ ...p, diff: p.goals - p.xg }))
      .filter((p) => p.diff >= 2)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);

    console.log("\n📊 xG Overperformers:");
    over.forEach((p) => console.log(`  ${p.name}: ${p.goals}G from ${p.xg.toFixed(1)} xG (+${p.diff.toFixed(1)})`));

    // Top owned
    const topOwned = [...boot.elements]
      .sort((a, b) => parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent))
      .slice(0, 5);

    console.log("\n🏆 Top 5 Owned:");
    topOwned.forEach((p) => console.log(`  ${p.web_name}: ${p.selected_by_percent}%`));

    // GW stats
    const finished = boot.events.filter((e) => e.finished);
    const avgTotal = finished.reduce((s, e) => s + e.average_entry_score, 0);
    console.log(`\n📈 Average manager total: ${avgTotal.toFixed(0)} points across ${finished.length} GWs`);

    console.log("\n✅ Content engine test passed — data pipeline works");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

test();
