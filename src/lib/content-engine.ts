/**
 * FPL Content Intelligence Engine
 * --------------------------------
 * Researches live FPL data to find stat anomalies, trending players,
 * controversy points, and engagement hooks for social media + website news block.
 *
 * All data from public FPL API — no auth needed.
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface PlayerProfile {
  id: number;
  name: string;
  team: string;
  position: string;
  ownership: number;
  price: number;
  totalPoints: number;
  pointsPerGame: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  minutes: number;
  yellowCards: number;
  redCards: number;
  expectedGoals: number;
  expectedAssists: number;
  expectedGoalInvolvements: number;
  creativity: number;
  threat: number;
  influence: number;
  form: number;
  ictIndex: number;
  transfersIn: number;
  transfersOut: number;
  netTransfers: number;
}

export type ContentAngle =
  | "stat_anomaly"
  | "ownership_shift"
  | "template_contra"
  | "captaincy_debate"
  | "hot_take"
  | "poll_hook"
  | "post_mortem_hook";

export interface ContentItem {
  id: string;
  angle: ContentAngle;
  tier: 1 | 2 | 3;
  headline: string;
  detail: string;
  statValue: string;
  statContext: string;
  playerIds: number[];
  teamIds: number[];
  controversyScore: number;
  engagementScore: number;
  formats: {
    tweet: string;
    redditTitle: string;
    redditBody: string;
    newsBlock: string;
    pollQuestion?: string;
    pollOptions?: string[];
  };
  tags: string[];
}

export interface ContentBatch {
  generatedAt: string;
  gameweek: number;
  season: string;
  items: ContentItem[];
  summary: {
    totalItems: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    topAngles: string[];
    suggestedPostingOrder: string[];
  };
}

// ─── FPL API ──────────────────────────────────────────────────────────────────

const BASE = "https://fantasy.premierleague.com/api";
const UA = "Mozilla/5.0 (FPL Content Engine)";

async function fplFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA },
    next: { revalidate },
  } as RequestInit & { next: { revalidate: number } });
  if (!res.ok) throw new Error(`FPL API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface BootstrapElement {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  selected_by_percent: string;
  now_cost: number;
  total_points: number;
  points_per_game: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  minutes: number;
  yellow_cards: number;
  red_cards: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  creativity: string;
  threat: string;
  influence: string;
  form: string;
  ict_index: string;
  transfers_in_event: number;
  transfers_out_event: number;
}

interface BootstrapEvent {
  id: number;
  average_entry_score: number;
  highest_score: number;
  finished: boolean;
  most_captained: number;
  top_element?: number;
  top_element_info?: { id: number; points: number };
}

interface BootstrapTeam {
  id: number;
  name: string;
  short_name: string;
}

interface BootstrapData {
  elements: BootstrapElement[];
  teams: BootstrapTeam[];
  events: BootstrapEvent[];
  total_players: number;
  element_types: Array<{ id: number; plural_name_short: string }>;
}

const POS_MAP: Record<number, string> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

function buildPlayers(boot: BootstrapData): PlayerProfile[] {
  const teamMap = new Map(boot.teams.map((t) => [t.id, t.name]));
  return boot.elements.map((el) => ({
    id: el.id,
    name: el.web_name,
    team: teamMap.get(el.team) ?? "Unknown",
    position: POS_MAP[el.element_type] ?? "UNK",
    ownership: parseFloat(el.selected_by_percent),
    price: el.now_cost / 10,
    totalPoints: el.total_points,
    pointsPerGame: parseFloat(el.points_per_game) || 0,
    goals: el.goals_scored,
    assists: el.assists,
    cleanSheets: el.clean_sheets,
    bonus: el.bonus,
    minutes: el.minutes,
    yellowCards: el.yellow_cards,
    redCards: el.red_cards,
    expectedGoals: parseFloat(el.expected_goals) || 0,
    expectedAssists: parseFloat(el.expected_assists) || 0,
    expectedGoalInvolvements: parseFloat(el.expected_goal_involvements) || 0,
    creativity: parseFloat(el.creativity) || 0,
    threat: parseFloat(el.threat) || 0,
    influence: parseFloat(el.influence) || 0,
    form: parseFloat(el.form) || 0,
    ictIndex: parseFloat(el.ict_index) || 0,
    transfersIn: el.transfers_in_event || 0,
    transfersOut: el.transfers_out_event || 0,
    netTransfers: (el.transfers_in_event || 0) - (el.transfers_out_event || 0),
  }));
}

// ─── Research: Stat Anomalies ─────────────────────────────────────────────────

function findStatAnomalies(players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];
  const active = players.filter((p) => p.minutes > 500);

  // xG overperformers
  const overperformers = active
    .filter((p) => p.expectedGoals > 2)
    .map((p) => ({ p, diff: p.goals - p.expectedGoals, ratio: p.expectedGoals > 0 ? p.goals / p.expectedGoals : 0 }))
    .filter((x) => x.diff >= 3)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  for (const { p, diff, ratio } of overperformers) {
    items.push({
      id: `xg-over-${p.id}`,
      angle: "stat_anomaly",
      tier: 1,
      headline: `${p.name}: ${p.goals} goals from ${p.expectedGoals.toFixed(1)} xG`,
      detail: `${p.name} has overperformed xG by ${diff.toFixed(1)} goals (${ratio.toFixed(1)}x ratio). Historically unsustainable — regression incoming or genuinely clinical?`,
      statValue: `${p.goals}G from ${p.expectedGoals.toFixed(1)} xG`,
      statContext: `+${diff.toFixed(1)} overperformance`,
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 7,
      engagementScore: 8,
      formats: {
        tweet: `${p.name}: ${p.goals} goals from ${p.expectedGoals.toFixed(1)} xG this season.\n\nThat's ${diff.toFixed(1)} goals more than expected.\n\nRegression incoming or is he just that clinical? 🤔`,
        redditTitle: `${p.name} has scored ${p.goals} goals from just ${p.expectedGoals.toFixed(1)} xG — is regression coming?`,
        redditBody: `${p.name} has massively overperformed his xG: ${p.goals} goals from ${p.expectedGoals.toFixed(1)} xG (${ratio.toFixed(1)}x ratio).\n\nHistorically this regresses. Either his finishing is elite or he's been lucky.\n\nThoughts?`,
        newsBlock: `📊 Stat Anomaly: ${p.name} — ${p.goals} goals from ${p.expectedGoals.toFixed(1)} xG (+${diff.toFixed(1)}). Regression risk?`,
      },
      tags: ["xg", "regression", p.name.toLowerCase().split(" ")[0]],
    });
  }

  // xG underperformers
  const underperformers = active
    .filter((p) => p.expectedGoals > 4)
    .map((p) => ({ p, diff: p.expectedGoals - p.goals }))
    .filter((x) => x.diff >= 3)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  for (const { p, diff } of underperformers) {
    items.push({
      id: `xg-under-${p.id}`,
      angle: "stat_anomaly",
      tier: 2,
      headline: `${p.name}: ${p.expectedGoals.toFixed(1)} xG but only ${p.goals} goals`,
      detail: `${p.name} has underperformed xG by ${diff.toFixed(1)} goals. Getting into great positions but not finishing. Tends to correct — sneaky buy next season.`,
      statValue: `${p.goals}G from ${p.expectedGoals.toFixed(1)} xG`,
      statContext: `-${diff.toFixed(1)} underperformance`,
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 5,
      engagementScore: 7,
      formats: {
        tweet: `${p.name}: ${p.expectedGoals.toFixed(1)} xG but only ${p.goals} goals.\n\nGetting into the right positions but the ball won't go in.\n\nThat tends to correct. Sneaky buy for next season? 👀`,
        redditTitle: `${p.name} has ${p.expectedGoals.toFixed(1)} xG but only ${p.goals} goals — buy for next season?`,
        redditBody: `${p.name} has been unlucky: ${p.expectedGoals.toFixed(1)} xG but only ${p.goals} goals (${diff.toFixed(1)} under).\n\nUnderlying numbers say he's getting into great positions. Finishing regresses to the mean. Could be a sneaky differential.`,
        newsBlock: `📊 Stat Anomaly: ${p.name} — ${p.expectedGoals.toFixed(1)} xG but only ${p.goals} goals. Due a haul?`,
      },
      tags: ["xg", "buy", p.name.toLowerCase().split(" ")[0]],
    });
  }

  // Hidden gems: high bonus, low ownership
  const gems = active
    .filter((p) => p.ownership < 10 && p.bonus > 8 && p.minutes > 1000)
    .sort((a, b) => b.bonus - a.bonus)
    .slice(0, 3);

  for (const p of gems) {
    items.push({
      id: `gem-${p.id}`,
      angle: "template_contra",
      tier: 2,
      headline: `${p.name}: ${p.bonus} bonus points but only ${p.ownership}% owned`,
      detail: `${p.name} has ${p.bonus} bonus points (top tier BPS) but only ${p.ownership}% ownership. Flying under the radar.`,
      statValue: `${p.bonus} bonus / ${p.ownership}% owned`,
      statContext: "High impact, low ownership",
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 6,
      engagementScore: 7,
      formats: {
        tweet: `${p.name} — ${p.bonus} bonus points this season.\n\nOnly ${p.ownership}% ownership.\n\nEveryone's sleeping on him. 💎`,
        redditTitle: `${p.name} has ${p.bonus} bonus points but only ${p.ownership}% ownership — why is nobody talking about him?`,
        redditBody: `${p.name} has ${p.bonus} bonus points — elite tier. But ownership is only ${p.ownership}%. Players with similar bonus totals are usually 20-30%+ owned. What am I missing?`,
        newsBlock: `💎 Hidden Gem: ${p.name} — ${p.bonus} bonus points but only ${p.ownership}% owned.`,
      },
      tags: ["bonus", "differential", p.name.toLowerCase().split(" ")[0]],
    });
  }

  return items;
}

// ─── Research: Ownership Shifts ───────────────────────────────────────────────

function findOwnershipShifts(players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];

  const netIn = players
    .filter((p) => p.netTransfers > 50000)
    .sort((a, b) => b.netTransfers - a.netTransfers)
    .slice(0, 3);

  for (const p of netIn) {
    const k = (p.netTransfers / 1000).toFixed(0);
    items.push({
      id: `net-in-${p.id}`,
      angle: "ownership_shift",
      tier: 1,
      headline: `${p.name}: ${k}k net transfers in this GW`,
      detail: `${p.name} gained ${k}k net transfers this gameweek. Ownership now ${p.ownership}%. Bandwagon or smart money?`,
      statValue: `${k}k net in`,
      statContext: `Ownership now ${p.ownership}%`,
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 6,
      engagementScore: 8,
      formats: {
        tweet: `${p.name}: ${k}k net transfers in this gameweek.\n\nOwnership now ${p.ownership}%.\n\nBandwagon or smart money? 🤔`,
        redditTitle: `${p.name} gained ${k}k transfers this GW — bandwagon or legit?`,
        redditBody: `${p.name} is the most transferred-in player: ${k}k net transfers. Ownership now ${p.ownership}%.\n\nForm: ${p.pointsPerGame} PPG, ${p.form} form rating.\n\nBandwagon or managers onto something?`,
        newsBlock: `📈 Trending: ${p.name} — ${k}k net transfers in. Ownership now ${p.ownership}%.`,
        pollQuestion: `Is ${p.name} a must-own?`,
        pollOptions: ["Yes, essential", "Yes, not urgent", "No, overpriced", "No, bad fixtures"],
      },
      tags: ["transfers", "trending", p.name.toLowerCase().split(" ")[0]],
    });
  }

  const netOut = players
    .filter((p) => p.netTransfers < -50000 && p.ownership > 5)
    .sort((a, b) => a.netTransfers - b.netTransfers)
    .slice(0, 2);

  for (const p of netOut) {
    const k = (Math.abs(p.netTransfers) / 1000).toFixed(0);
    items.push({
      id: `net-out-${p.id}`,
      angle: "ownership_shift",
      tier: 2,
      headline: `${p.name}: ${k}k net transfers OUT`,
      detail: `${p.name} is being dumped — ${k}k net transfers out despite ${p.ownership}% ownership. Injury? Rotation? Or overreaction?`,
      statValue: `${k}k net out`,
      statContext: `Still ${p.ownership}% owned`,
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 7,
      engagementScore: 7,
      formats: {
        tweet: `${p.name}: ${k}k managers sold this GW.\n\nStill ${p.ownership}% owned.\n\nPanic sell or smart money? 📉`,
        redditTitle: `${p.name} — ${k}k transfers out this GW. What's happening?`,
        redditBody: `${p.name} is the most sold player: ${k}k net transfers out. Still ${p.ownership}% owned though. What do the sellers know that the majority don't?`,
        newsBlock: `📉 Sell Alert: ${p.name} — ${k}k net transfers out. Still ${p.ownership}% owned.`,
      },
      tags: ["transfers", "sell", p.name.toLowerCase().split(" ")[0]],
    });
  }

  return items;
}

// ─── Research: Captaincy Debates ──────────────────────────────────────────────

function findCaptaincyDebates(players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];
  const top2 = players.sort((a, b) => b.ownership - a.ownership).slice(0, 2);
  if (top2.length < 2) return items;

  const [a, b] = top2;
  items.push({
    id: "captaincy-debate",
    angle: "captaincy_debate",
    tier: 1,
    headline: `${a.name} (${a.ownership}%) vs ${b.name} (${b.ownership}%) — who captains?`,
    detail: `Top 2 captaincy choices: ${a.name} (${a.totalPoints}pts, ${a.ownership}%) vs ${b.name} (${b.totalPoints}pts, ${b.ownership}%).`,
    statValue: `${a.name} ${a.totalPoints}pts vs ${b.name} ${b.totalPoints}pts`,
    statContext: "Top 2 by ownership",
    playerIds: [a.id, b.id],
    teamIds: [],
    controversyScore: 9,
    engagementScore: 10,
    formats: {
      tweet: `Captaincy debate: ${a.name} vs ${b.name}\n\n📊 ${a.name}: ${a.totalPoints}pts | ${a.pointsPerGame} PPG | ${a.ownership}%\n📊 ${b.name}: ${b.totalPoints}pts | ${b.pointsPerGame} PPG | ${b.ownership}%\n\nWho are you captaining? 👇`,
      redditTitle: `Captaincy analysis: ${a.name} vs ${b.name} — the data says...`,
      redditBody: `**${a.name}**: ${a.totalPoints}pts, ${a.pointsPerGame} PPG, ${a.ownership}% owned, form ${a.form}\n\n**${b.name}**: ${b.totalPoints}pts, ${b.pointsPerGame} PPG, ${b.ownership}% owned, form ${b.form}\n\nWho are you captaining and why?`,
      newsBlock: `⚔️ Captaincy Debate: ${a.name} (${a.totalPoints}pts) vs ${b.name} (${b.totalPoints}pts)`,
      pollQuestion: "Who's your captain?",
      pollOptions: [a.name, b.name, "Someone else"],
    },
    tags: ["captaincy", "debate", "template"],
  });

  return items;
}

// ─── Research: Post-Mortem Hooks ──────────────────────────────────────────────

function findPostMortemHooks(boot: BootstrapData, players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];
  const finished = boot.events.filter((e) => e.finished);
  if (finished.length === 0) return items;

  const avgTotal = finished.reduce((s, e) => s + e.average_entry_score, 0);
  const totalP = boot.total_players;

  items.push({
    id: "pm-average",
    angle: "post_mortem_hook",
    tier: 1,
    headline: `The average FPL manager scored ${avgTotal.toFixed(0)} points`,
    detail: `Across ${totalP.toLocaleString()} managers, the average was ${avgTotal.toFixed(0)} points. Where did you finish?`,
    statValue: `${avgTotal.toFixed(0)} pts average`,
    statContext: `${totalP.toLocaleString()} managers`,
    playerIds: [],
    teamIds: [],
    controversyScore: 3,
    engagementScore: 9,
    formats: {
      tweet: `The average FPL manager scored ${avgTotal.toFixed(0)} points this season.\n\n${totalP.toLocaleString()} managers. Half above, half below.\n\nWhere did you finish? 📊\n\nFree post-mortem → [link]`,
      redditTitle: `The average FPL manager scored ${avgTotal.toFixed(0)} points — where did you finish?`,
      redditBody: `The average FPL manager scored **${avgTotal.toFixed(0)} points** this season across ${totalP.toLocaleString()} managers.\n\nHow many points did YOU leave on your bench? What did your -4 hits cost you?\n\nI built a free tool that breaks this down — link in comments.`,
      newsBlock: `📊 Season Stat: Average manager scored ${avgTotal.toFixed(0)} pts. ${totalP.toLocaleString()} managers. Where did YOU finish?`,
    },
    tags: ["post-mortem", "season-review"],
  });

  // Highest GW
  const bestGW = finished.reduce((max, e) => (e.highest_score > max.highest_score ? e : max), finished[0]);
  if (bestGW) {
    const pct = ((bestGW.highest_score / bestGW.average_entry_score - 1) * 100).toFixed(0);
    items.push({
      id: `pm-gw-${bestGW.id}`,
      angle: "post_mortem_hook",
      tier: 2,
      headline: `GW${bestGW.id}: Highest score was ${bestGW.highest_score} points`,
      detail: `GW${bestGW.id} was explosive — top score ${bestGW.highest_score}, average was ${bestGW.average_entry_score}. ${pct}% gap.`,
      statValue: `GW${bestGW.id}: ${bestGW.highest_score} pts`,
      statContext: `Average: ${bestGW.average_entry_score}`,
      playerIds: [],
      teamIds: [],
      controversyScore: 2,
      engagementScore: 7,
      formats: {
        tweet: `GW${bestGW.id} highest score: ${bestGW.highest_score} points.\n\nAverage that week: ${bestGW.average_entry_score}.\n\n${pct}% gap.\n\nWas this your best or worst GW? 😅`,
        redditTitle: `GW${bestGW.id} — highest score was ${bestGW.highest_score} points. What made it so explosive?`,
        redditBody: `GW${bestGW.id}:\n- Highest: **${bestGW.highest_score}** points\n- Average: **${bestGW.average_entry_score}** points\n- Gap: **${pct}%**\n\nWhat made this week so explosive?`,
        newsBlock: `🔥 GW${bestGW.id} Flashback: ${bestGW.highest_score} pts (avg: ${bestGW.average_entry_score}). ${pct}% gap.`,
      },
      tags: ["gameweek", "season-review"],
    });
  }

  // Template check
  const top10 = players.sort((a, b) => b.ownership - a.ownership).slice(0, 10);
  const top10List = top10.map((p) => `${p.name} (${p.ownership}%)`).join(", ");
  items.push({
    id: "pm-template",
    angle: "template_contra",
    tier: 1,
    headline: `The 10 most-owned players — how template was YOUR team?`,
    detail: `Template: ${top10List}. How many did you own? 8+ = template. 5-7 = half maverick. <5 = full differential.`,
    statValue: "Top 10 most-owned",
    statContext: "Template check",
    playerIds: top10.map((p) => p.id),
    teamIds: [],
    controversyScore: 5,
    engagementScore: 9,
    formats: {
      tweet: `The FPL template this season:\n\n${top10.slice(0, 5).map((p) => `• ${p.name} (${p.ownership}%)`).join("\n")}\n\nHow many did you own?\n8+ = template follower\n5-7 = half maverick\n<5 = full differential\n\nFree post-mortem → [link]`,
      redditTitle: `The 10 most-owned players — how template was YOUR team?`,
      redditBody: `${top10.map((p, i) => `${i + 1}. **${p.name}** — ${p.ownership}%, ${p.totalPoints}pts`).join("\n")}\n\n**Template check:**\n- 8+ owned = followed the crowd\n- 5-7 = half maverick\n- <5 = backed yourself\n\nHow many did you have?`,
      newsBlock: `📋 Template Check: Top 10 most-owned players. How many did YOU have? Free post-mortem breaks it down.`,
      pollQuestion: "How many of the top 10 did you own?",
      pollOptions: ["8+ (full template)", "5-7 (half maverick)", "3-4 (mostly diff)", "0-2 (full diff)"],
    },
    tags: ["template", "ownership", "post-mortem"],
  });

  return items;
}

// ─── Research: Hot Takes ──────────────────────────────────────────────────────

function findHotTakes(players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];
  const contrarian = players
    .filter((p) => p.ownership < 15 && p.ictIndex > 100 && p.minutes > 1000)
    .sort((a, b) => b.ictIndex - a.ictIndex)
    .slice(0, 2);

  for (const p of contrarian) {
    items.push({
      id: `hot-${p.id}`,
      angle: "hot_take",
      tier: 1,
      headline: `${p.name} is the most undervalued player in FPL`,
      detail: `${p.name}: ICT ${p.ictIndex.toFixed(0)} (elite), ${p.totalPoints}pts, but only ${p.ownership}% owned. Why isn't everyone talking about him?`,
      statValue: `ICT ${p.ictIndex.toFixed(0)} | ${p.ownership}% owned`,
      statContext: "Elite underlying, low ownership",
      playerIds: [p.id],
      teamIds: [],
      controversyScore: 8,
      engagementScore: 9,
      formats: {
        tweet: `Hot take: ${p.name} is the most undervalued player in FPL.\n\n• ICT: ${p.ictIndex.toFixed(0)} (elite)\n• ${p.totalPoints}pts | ${p.pointsPerGame} PPG\n• Only ${p.ownership}% owned\n\nWhy isn't he in every team? 🤔`,
        redditTitle: `Hot take: ${p.name} is the most undervalued player — the data proves it`,
        redditBody: `${p.name}:\n- ICT: ${p.ictIndex.toFixed(0)} (elite)\n- ${p.totalPoints}pts (${p.pointsPerGame} PPG)\n- xG: ${p.expectedGoals.toFixed(1)}, xA: ${p.expectedAssists.toFixed(1)}\n- Only **${p.ownership}%** owned\n\nPlayers with similar ICT are usually 25-40%+ owned. What's the disconnect?`,
        newsBlock: `🔥 Hot Take: ${p.name} — ICT ${p.ictIndex.toFixed(0)} but only ${p.ownership}% owned. Most undervalued?`,
      },
      tags: ["hot-take", "undervalued", p.name.toLowerCase().split(" ")[0]],
    });
  }

  return items;
}

// ─── Research: Poll Hooks ─────────────────────────────────────────────────────

function findPollHooks(players: PlayerProfile[]): ContentItem[] {
  const items: ContentItem[] = [];

  items.push({
    id: "poll-formation",
    angle: "poll_hook",
    tier: 3,
    headline: "What's the best FPL formation?",
    detail: "The eternal debate. 3-4-3, 4-4-2, 3-5-2, or 5-3-2?",
    statValue: "Formation debate",
    statContext: "Community poll",
    playerIds: [],
    teamIds: [],
    controversyScore: 8,
    engagementScore: 8,
    formats: {
      tweet: `Best FPL formation?\n\nA) 3-4-3\nB) 4-4-2\nC) 3-5-2\nD) 5-3-2\n\nVote 👇`,
      redditTitle: `What formation are you using and why?`,
      redditBody: `Every season the formation debate comes up. What are you running?\n\n**3-4-3**: Max attacking, exposed at back\n**4-4-2**: Balanced\n**3-5-2**: Midfield dominance\n**5-3-2**: Defensive solidity`,
      newsBlock: `📊 Poll: Best FPL formation? Vote and see what others think.`,
      pollQuestion: "Best FPL formation?",
      pollOptions: ["3-4-3", "4-4-2", "3-5-2", "5-3-2"],
    },
    tags: ["poll", "formation"],
  });

  const budget = players
    .filter((p) => p.price <= 5.5 && p.totalPoints > 50 && p.minutes > 500)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 4);

  if (budget.length >= 2) {
    items.push({
      id: "poll-budget",
      angle: "poll_hook",
      tier: 2,
      headline: `Best budget enabler: ${budget[0].name} vs ${budget[1].name}?`,
      detail: `Both delivered massive value. Who's the better budget pick?`,
      statValue: `${budget[0].name} £${budget[0].price} vs ${budget[1].name} £${budget[1].price}`,
      statContext: "Budget value comparison",
      playerIds: budget.map((p) => p.id),
      teamIds: [],
      controversyScore: 7,
      engagementScore: 8,
      formats: {
        tweet: `Best budget enabler?\n\nA) ${budget[0].name} (£${budget[0].price}) — ${budget[0].totalPoints}pts\nB) ${budget[1].name} (£${budget[1].price}) — ${budget[1].totalPoints}pts\nC) ${budget[2]?.name || "Other"} (£${budget[2]?.price || "?"}) — ${budget[2]?.totalPoints || "?"}pts\nD) ${budget[3]?.name || "Someone else"}\n\nVote 👇`,
        redditTitle: `Best budget enabler: ${budget[0].name} or ${budget[1].name}?`,
        redditBody: `**${budget[0].name}** (£${budget[0].price}): ${budget[0].totalPoints}pts, ${budget[0].pointsPerGame} PPG\n\n**${budget[1].name}** (£${budget[1].price}): ${budget[1].totalPoints}pts, ${budget[1].pointsPerGame} PPG\n\nBoth incredible value. If you could only pick one?`,
        newsBlock: `💰 Budget Battle: ${budget[0].name} vs ${budget[1].name} — best value pick?`,
        pollQuestion: "Best budget enabler?",
        pollOptions: budget.slice(0, 4).map((p) => `${p.name} (£${p.price})`),
      },
      tags: ["poll", "budget", "value"],
    });
  }

  return items;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function generateContentBatch(): Promise<ContentBatch> {
  const boot = await fplFetch<BootstrapData>("/bootstrap-static/", 3600);
  const players = buildPlayers(boot);

  const finished = boot.events.filter((e) => e.finished);
  const currentGW = finished.length > 0 ? finished[finished.length - 1].id : 0;

  const allItems: ContentItem[] = [
    ...findStatAnomalies(players),
    ...findOwnershipShifts(players),
    ...findCaptaincyDebates(players),
    ...findPostMortemHooks(boot, players),
    ...findHotTakes(players),
    ...findPollHooks(players),
  ];

  // Sort: tier first, then engagement
  allItems.sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : b.engagementScore - a.engagementScore);

  const t1 = allItems.filter((i) => i.tier === 1);
  const t2 = allItems.filter((i) => i.tier === 2);
  const t3 = allItems.filter((i) => i.tier === 3);

  // Interleave for posting order
  const order: string[] = [];
  let i1 = 0, i2 = 0, i3 = 0;
  for (let i = 0; i < allItems.length; i++) {
    if (i % 3 === 0 && i1 < t1.length) order.push(t1[i1++].id);
    else if (i % 3 === 1 && i2 < t2.length) order.push(t2[i2++].id);
    else if (i3 < t3.length) order.push(t3[i3++].id);
    else if (i1 < t1.length) order.push(t1[i1++].id);
    else if (i2 < t2.length) order.push(t2[i2++].id);
  }

  const angleSet: string[] = [];
  for (const item of allItems) {
    if (!angleSet.includes(item.angle)) angleSet.push(item.angle);
  }

  return {
    generatedAt: new Date().toISOString(),
    gameweek: currentGW,
    season: "2025/26",
    items: allItems,
    summary: {
      totalItems: allItems.length,
      tier1Count: t1.length,
      tier2Count: t2.length,
      tier3Count: t3.length,
      topAngles: angleSet.slice(0, 5),
      suggestedPostingOrder: order,
    },
  };
}

// ─── Output Formatters ────────────────────────────────────────────────────────

export function getNewsBlockItems(batch: ContentBatch, count = 5) {
  return batch.items
    .filter((i) => i.tier === 1 || i.tier === 2)
    .slice(0, count)
    .map((i) => ({
      id: i.id,
      headline: i.headline,
      detail: i.formats.newsBlock,
      angle: i.angle,
      tier: i.tier,
      tags: i.tags,
      engagementScore: i.engagementScore,
    }));
}

export function getSocialBatch(batch: ContentBatch, count = 10) {
  return batch.items.slice(0, count).map((i) => ({
    id: i.id,
    tweet: i.formats.tweet,
    redditTitle: i.formats.redditTitle,
    redditBody: i.formats.redditBody,
    angle: i.angle,
    tier: i.tier,
    tags: i.tags,
    pollQuestion: i.formats.pollQuestion,
    pollOptions: i.formats.pollOptions,
  }));
}
