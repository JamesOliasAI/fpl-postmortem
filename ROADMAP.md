# FPL Post-Mortem → AI FPL Assistant — Product Roadmap

> **North-star positioning (from strategy doc):** Don't build a tool that DECIDES FOR the user.
> Build one that helps them DECIDE BETTER, ON THEIR TERMS — and beat the template.
> The winning message is "here are the CONSEQUENCES of every move," not "here's the best move."
> Core complaints we exploit: (1) everyone gets the same template team, (2) "the AI tells me
> what to do," (3) AI feels gimmicky/untrustworthy, (4) optimisation kills the fun/skill.

---

## NOW — Validation Vehicle (this build, NOT the paid product)
Free **Season Post-Mortem**: enter Team ID → emotional, shareable recap.
- Points left on bench (season + worst GW)
- Points lost to −4 hits
- Final overall rank + percentile ("you beat X% of 13M")
- Best / worst gameweek
- Captaincy points won/lost
- **Anti-template preview**: "You owned 9 of the 10 most-popular players — you played the template."
- Shareable OG image card (the viral unit)
- Dual capture: Stripe pre-order (£5/mo or £35/season) + soft email waitlist
- **Pass signal: 25+ real paid commitments. Then — and only then — build paid v1.**

## PAID v1 (only after validation passes)
- **L5 Explainable reasoning** — every suggestion shows WHY (xGI, fixture, ownership, rank impact)
- **L2 Goal-aware scenarios** — "if chasing top 100k → X; if winning your mini-league → Y"
- One onboarding question (L1-lite): "chasing rank or protecting it?"

## v1.5 — Signature differentiator
- **L3 Anti-Template Engine** — optimise **Expected RANK gain** (factoring ownership), not raw xPoints.
  This is the technical embodiment of the positioning. Highest-value defensible feature.
- **L1 full** — personal manager profile (risk appetite, chip style, preferred clubs, differential tolerance)

## v2 — Mini-League Warfare (real-data version)
- Rival team **transparency**: pull rivals' current/past squads via API, "what beats their squad."
- ⚠️ Rival *prediction* ("87% likely to captain Haaland") ONLY if accuracy is proven.
  Shaky predictions destroy trust — the #1 thing the doc warns against. Don't fake confidence.

## PARKED — Moonshot (needs revenue + a data-science hire)
- **L6 Simulation Universe** — run 100k simulated seasons/GW, "in sims where you finish top 1k,
  73% owned Isak by GW12." Brilliant, but infinitely deep, compute-heavy, and YEARS premature.
  Do NOT let this bloat any earlier phase. Revisit only with paying users + resources.

---

### Competitive landscape (from doc)
Fantasy Football Hub · FPL Review · FPL Copilot · official FPL Assistant features.
All converging on: Data → Projection → Optimiser → Recommendation. **Our wedge: consequences +
personalisation + anti-template + explainability, NOT another optimiser.**

### Discipline note
Biggest failure modes: (1) building the wrong thing, (2) building the magnificent thing before
validating the minimum thing. This roadmap exists so the deep layers are NOT LOST — and NOT
built early. Validate £5/mo demand first. Everything below v1 waits for that signal.
