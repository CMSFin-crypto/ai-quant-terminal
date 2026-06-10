import { macroScore } from "@/lib/macroIntelligence";
import type { TerminalOption } from "@/lib/workstation";

export type AnalystVerdict = {
  stance: "Aggressive Bullish" | "Bullish" | "Neutral" | "Defensive" | "Bearish";
  action: "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WATCH" | "AVOID";
  bias: "Bullish" | "Bearish" | "Neutral";
  structure: string;
  riskLabel: "Low" | "Medium" | "High" | "Very High";
  maxRiskText: string;
  maxRewardText: string;
  confidence: number;
  summary: string;
  reasons: string[];
  risks: string[];
  checklist: string[];
  // Albanian-language recommendation fields (standard literary Albanian)
  actionAl: string;        // "Çfarë të bësh" - action in Albanian
  whyAl: string;          // "Pse" - why do this, in Albanian
  howAl: string;          // "Si ta bësh" - how to execute, in Albanian
  riskAl: string;         // Risk summary in Albanian
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function analyzeHistorically(option: TerminalOption): AnalystVerdict {
  const historical = option.historical;
  const macro = macroScore(option);
  const ivHvSpread = option.iv - historical.realizedVol30;
  const dataPenalty = option.dataQuality < 50 ? -20 : option.dataQuality < 70 ? -8 : 0;
  const trendScore =
    historical.trend === "Uptrend" ? 16 : historical.trend === "Downtrend" ? -12 : 2;
  const momentumScore = historical.momentum30 > 0 ? 6 : historical.momentum30 < 0 ? -6 : 0;
  const volatilityScore = ivHvSpread < -0.05 ? 10 : ivHvSpread > 0.12 ? -8 : 4;
  const drawdownScore =
    historical.maxDrawdown < -0.35 ? -12 : historical.maxDrawdown < -0.22 ? -6 : 3;
  const optionScore = option.signal.score - 50;
  const macroPenalty = macro.riskScore >= 80 ? -8 : macro.riskScore >= 65 ? -4 : 0;
  const total = 50 + trendScore + momentumScore + volatilityScore + drawdownScore + optionScore + macroPenalty + dataPenalty;
  const confidence = Math.max(0, Math.min(100, Math.round(total)));

  let stance: AnalystVerdict["stance"] = "Neutral";
  if (confidence >= 72) stance = "Aggressive Bullish";
  else if (confidence >= 58) stance = "Bullish";
  else if (confidence <= 28) stance = "Bearish";
  else if (confidence <= 40) stance = "Defensive";

  const expensiveVol = option.iv > historical.realizedVol30 * 1.35 && option.iv > 0.35;
  const cheapVol = option.iv < historical.realizedVol30 * 0.85 || option.iv < 0.28;
  const highMacroRisk = macro.riskScore >= 75;

  let action: AnalystVerdict["action"] = "WATCH";
  if (option.dataQuality < 40) action = "AVOID";
  else if (option.dataQuality < 60) action = "WATCH";
  else if (stance === "Aggressive Bullish" && cheapVol) action = "BUY CALL";
  else if ((stance === "Bullish" || stance === "Aggressive Bullish") && expensiveVol) action = "SELL PUT";
  else if (stance === "Aggressive Bullish") action = "BUY CALL";
  else if (stance === "Bullish") action = "BUY CALL";
  else if (stance === "Neutral" && cheapVol) action = "BUY CALL";
  else if (stance === "Neutral") action = "WATCH";
  else if (stance === "Bearish" && cheapVol) action = "BUY PUT";
  else if (stance === "Bearish" && expensiveVol) action = "SELL CALL";
  else if (stance === "Bearish") action = "BUY PUT";
  else if (stance === "Defensive" && expensiveVol) action = "SELL CALL";
  else if (stance === "Defensive") action = "WATCH";

  const bias: AnalystVerdict["bias"] =
    action.includes("CALL") && action.startsWith("BUY")
      ? "Bullish"
      : action === "SELL PUT"
        ? "Bullish"
        : action.includes("PUT") && action.startsWith("BUY")
          ? "Bearish"
          : action === "SELL CALL"
            ? "Bearish"
            : "Neutral";

  const structure =
    action === "BUY CALL"
      ? "Long call or call debit spread"
      : action === "SELL PUT"
        ? "Cash-secured put or put credit spread"
        : action === "BUY PUT"
          ? "Long put or put debit spread"
          : action === "SELL CALL"
            ? "Covered call or call credit spread"
            : action === "WATCH"
              ? "Monitor for entry — conditions not yet aligned"
              : "Reduce exposure — risk factors elevated";

  const riskLabel: AnalystVerdict["riskLabel"] =
    option.dataQuality < 40
      ? "Very High"
      : action.startsWith("SELL")
        ? "High"
        : macro.riskScore >= 80 && Math.abs(historical.maxDrawdown) > 0.25
          ? "High"
        : option.iv > 0.55 || Math.abs(historical.maxDrawdown) > 0.25
          ? "Medium"
          : "Low";

  const maxRiskText =
    action === "BUY CALL" || action === "BUY PUT"
      ? `Premium paid, about $${(option.price * 100).toFixed(0)} per contract.`
      : action === "SELL PUT" || action === "SELL CALL"
        ? "Undefined if naked. Prefer defined-risk spread or covered/cash-secured setup."
        : "Waiting for a clearer setup before recommending entry.";

  const maxRewardText =
    action === "BUY CALL"
      ? "Theoretical upside is high, but probability depends on move size and time decay."
      : action === "BUY PUT"
        ? "Reward rises if the stock falls below strike before expiry."
        : action === "SELL PUT" || action === "SELL CALL"
          ? `Premium income, about $${(option.price * 100).toFixed(0)} per contract before spread caps.`
          : "Evaluating conditions for a potential entry point.";

  const reasons = [
    `${historical.trend} regime with 30D momentum at ${pct(historical.momentum30)} and 90D momentum at ${pct(historical.momentum90)}.`,
    `30D historical volatility is ${pct(historical.realizedVol30)} versus option IV at ${pct(option.iv)}.`,
    `Model edge versus fair value is ${option.edge.toFixed(1)}%, while the AI options score is ${option.signal.score}/100.`,
    `Macro risk is ${macro.riskScore}/100, data quality is ${option.dataQuality}/100, and suggested position scale is ${macro.positionScale}.`
  ];

  const risks = [
    `Historical max drawdown is ${pct(historical.maxDrawdown)}, so downside gaps must be sized conservatively.`,
    `Daily 95% VaR is around ${pct(historical.var95)}, based on the available return history.`,
    option.dataSource === "synthetic-options"
      ? "Options data is synthetic — treat fair value and model price as estimates until a live feed is connected."
      : "Options data is live from the market feed.",
    option.theta < -0.05
      ? `Theta decay is elevated at ${option.theta.toFixed(3)}, so time risk matters.`
      : `Theta decay is contained at ${option.theta.toFixed(3)}, but it still compounds every day.`
  ];

  const checklist = [
    "Confirm the next earnings date before entering.",
    "Use spreads for SELL CALL or SELL PUT unless the position is covered or cash-secured.",
    "Avoid full size when macro risk is above 65.",
    "Prefer defined-risk structures when IV is above historical volatility.",
    "Recheck the signal after the next daily close."
  ];

  const summary =
    `${option.symbol} is classified as ${stance.toLowerCase()} with ${confidence}/100 confidence. ` +
    `The model favors ${action} because historical trend, IV/HV, drawdown, macro pressure, and options edge are aligned at this level.`;

  // ─── Rekomandime në shqipen standarde letrare ─────────────────────────
  const actionAlMap: Record<AnalystVerdict["action"], string> = {
    "BUY CALL": "BLEJNI CALL — Pritet që çmimi i aksionit të rritet. Kur blini Call, fitoni nëse aksioni ngrihet mbi Strike + Premium deri në skadim.",
    "SELL CALL": "SHISNI CALL (Covered Call) — Pritet që çmimi të qëndrojë i qetë ose të bjerë. Kur shisni Call (kurse i keni aksionet), mbani premium-in edhe nëse aksioni nuk lëviz.",
    "BUY PUT": "BLEJNI PUT — Pritet që çmimi i aksionit të bjerë. Kur blini Put, fitoni nëse aksioni bie nën Strike - Premium deri në skadim.",
    "SELL PUT": "SHISNI PUT (Cash-Secured Put) — Pritet që çmimi të qëndrojë i qetë ose të rritet. Kur shisni Put, mbani premium-in nëse aksioni qëndron mbi Strike. Nëse bie nën Strike, duhet të blini aksionin me çmim Strike.",
    "WATCH": "PRITNI DHE VËZHGONI — Kushtet nuk janë ende të qarta për hyrje. Prisni derisa sinjali të forcohet ose IV të bjerë për një hyrje më të lirë.",
    "AVOID": "SHMANGNI — Cilësia e të dhënave është shumë e ulët ose rreziku është i lartë. Mos hyni në tregti me këtë stok derisa kushtet të përmirësohen."
  };

  const whyAlMap: Record<AnalystVerdict["action"], string> = {
    "BUY CALL": `Modeli tregon se ${option.symbol} ka trend ${historical.trend === "Uptrend" ? "në rritje" : historical.trend === "Downtrend" ? "në rënie" : "të qetë"} me momentin 30-ditor në ${pct(historical.momentum30)}. IV është ${(option.iv < historical.realizedVol30 * 0.85 ? "e ulët (opsionet janë të lira)" : "në nivel normal")}, dhe sinjali i opsioneve është ${option.signal.score}/100. Kombinimi i këtyre faktorëve favorizon blerjen e Call.`,
    "SELL CALL": `IV është e lartë (${pct(option.iv)}) krahasuar me HV (${pct(historical.realizedVol30)}), çka do të thotë se opsionet janë të shtrenjta. Si shitës i Call, përfitoni nga premium-i i lartë dhe nga rënia e IV (IV crush). Nëse aksioni nuk lëviz shumë, mbani gjithë premium-in.`,
    "BUY PUT": `Modeli tregon se ${option.symbol} ka trend ${historical.trend === "Downtrend" ? "në rënie" : "të dobët"} me momentin në ${pct(historical.momentum30)}. IV është ${(option.iv < historical.realizedVol30 * 0.85 ? "e ulët — opsionet janë të lira, kohë e mirë për t'u blerë" : "në nivel normal")}. Rreziku makro është ${macro.riskScore}/100, çka shton mundësinë e lëvizjeve në ulje.`,
    "SELL PUT": `IV është e lartë (${pct(option.iv)}) krahasuar me HV (${pct(historical.realizedVol30)}). Si shitës i Put, mbani premium-in nëse aksioni qëndron mbi Strike. Nëse bie nën Strike, e blini aksionin me çmim të zvogëluar (me zbritje nga premium-i). Kjo është strategji që përdoret kur jeni neutral-bullish.`,
    "WATCH": `Sinjali është ${option.signal.score}/100 (mesatar) dhe IV është ${pct(option.iv)}. Trendi është ${historical.trend}. Nuk ka konfirmim të mjaftueshëm për hyrje tani. Prisni derisa: (1) Score të kalojë 65+, (2) IV të bjerë nën HV, ose (3) Trendi të forcohet me volum më të lartë.`,
    "AVOID": `Cilësia e të dhënave është ${option.dataQuality}/100 — shumë e ulët për vendime. ${option.dataSource === "synthetic-options" ? "Opsionet janë sintetike, jo nga tregu real." : "Rreziku makro është shumë i lartë."} Mos rrezikoni kapital derisa kushtet të përmirësohen.`
  };

  const howAlMap: Record<AnalystVerdict["action"], string> = {
    "BUY CALL": `1. Zgjidhni Call me Strike afër ATM (Delta 0.45-0.60) dhe DTE 30-45. 2. Hyni me madhësi pozicioni ${macro.positionScale} (ose më të vogël). 3. Vendosni Stop Loss nëse çmimi bie 15-20% nga premium. 4. Merreni fitimin nëse opsioni bëhet 2x premium-i. 5. Mbyllni para skadimit javën e fundit (rrezik gamma).`,
    "SELL CALL": `1. Sigurohuni që keni 100 aksione për covered call (ose përdorni spread). 2. Zgjidhni Strike OTM 5-10% mbi çmimin aktual. 3. DTE 30-45 për ekuilibër midis premium dhe rrezikut. 4. Mbyllni nëse aksioni ngrihet afër Strike. 5. Mos i shisni Call lakuriq (naked) — rrezik i pakufizuar.`,
    "BUY PUT": `1. Zgjidhni Put me Strike afër ATM (Delta -0.45 deri -0.60) dhe DTE 30-45. 2. Hyni me madhësi ${macro.positionScale}. 3. Vendosni Stop Loss nëse çmimi nuk bie brenda 7-10 ditëve. 4. Merreni fitimin nëse opsioni bëhet 2x premium-i. 5. Përdorni Put Debit Spread për të ulur rrezikun.`,
    "SELL PUT": `1. Sigurohuni që keni kapital për 100 aksione (cash-secured). 2. Zgjidhni Strike OTM 5-10% nën çmimin aktual. 3. DTE 30-45. 4. Nëse aksioni bie nën Strike, blini me zbritje. 5. Nëse aksioni qëndron mbi Strike, mbani premium-in (fitim 100%). 6. Përdorni Put Credit Spread për rrezik të përcaktuar.`,
    "WATCH": `1. Shtojeni ${option.symbol} në listën e vëzhgimit. 2. Kontrolloni çdo ditë ndryshimin e Score dhe IV. 3. Hyni vetëm kur Score > 65 dhe IV < HV. 4. Kontrolloni datën e earnings para se të hyni. 5. Mos u nënshtrohuni FOMO-së — tregti më të mira vijnë me durim.`,
    "AVOID": `1. Mos hyni në asnjë pozicion me këtë stok tani. 2. Prisni derisa Data Quality të kalojë 60+. 3. Kontrolloni përsëri pas ditës tjetër të tregtimit. 4. Nëse duhet ekspozim në sektor, kërkoni stok me Score më të lartë. 5. Konsideroni stok të ngjashëm me cilësi më të mirë të dhënash.`
  };

  const riskAlMap: Record<AnalystVerdict["riskLabel"], string> = {
    "Low": `Rrezik i ulët — trendi është i qartë, IV është e arsyeshme, dhe cilësia e të dhënave është e mirë. Megjithatë, gjithmonë përdorni Stop Loss dhe mos rrezikoni më shumë se 2-3% të portofolit.`,
    "Medium": `Rrezik mesatar — IV është relativisht e lartë (${pct(option.iv)}) ose maksimumi i rënies është ${pct(historical.maxDrawdown)}. Përdorni pozicione më të vogla, spread-e për rrezik të përcaktuar, dhe kontrolloni datën e earnings.`,
    "High": `Rrezik i lartë — IV është shumë e lartë (${pct(option.iv)}), rreziku makro është ${macro.riskScore}/100, ose jeni duke shitur opsione lakuriq. PËRDORNI VETËM SPREAD-E ME RREZIK TË PËRCAKTUAR. Mos i shisni lakuriq.`,
    "Very High": `RREZIK SHUMË I LARTË — cilësia e të dhënave është ${option.dataQuality}/100, çka do të thotë se të gjitha metrikat janë të pasakta ose sintetike. MOS TREGTONI me këtë stok me para reale. Përdorni vetëm për demonstrim.`
  };

  return {
    stance,
    action,
    bias,
    structure,
    riskLabel,
    maxRiskText,
    maxRewardText,
    confidence,
    summary,
    reasons,
    risks,
    checklist,
    actionAl: actionAlMap[action],
    whyAl: whyAlMap[action],
    howAl: howAlMap[action],
    riskAl: riskAlMap[riskLabel]
  };
}
