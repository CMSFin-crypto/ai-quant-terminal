"use client";

import { BrainCircuit, GraduationCap, BookOpen, Shield, AlertTriangle, Lightbulb, HelpCircle } from "lucide-react";
import type { TerminalOption } from "@/lib/workstation";
import type { AnalystVerdict } from "@/lib/aiHistoricalAnalyst";
import { Panel } from "./Panel";
import { Metric } from "./Metric";
import { StrategyPlan } from "./StrategyPlan";
import { AnalystList } from "./AnalystList";

interface AIAnalystTabProps {
  selectedOption: TerminalOption;
  selectedAnalysis: AnalystVerdict;
}

export function AIAnalystTab({ selectedOption, selectedAnalysis }: AIAnalystTabProps) {
  return (
    <Panel title="AI Edukues — Shpjego Strategjinë" icon={<GraduationCap size={17} />}>
      {/* Education-first disclaimer */}
      <div className="rounded border border-terminal-cyan/40 bg-terminal-cyan/[0.08] p-3 flex items-start gap-2.5">
        <BookOpen size={15} className="text-terminal-cyan shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-bold text-terminal-cyan">Mëso, Mos Ndiq Verbërisht</span>
          <p className="text-xs leading-5 text-terminal-text/85 mt-1">
            Ky analist shpjegon ÇFARË do të thotë strategjia, PSE funksionon, dhe SI ta kuptoni rrezikun.
            Nuk jep këshilla blerjeje — jep njohuri që ju ndihmon të vendosni vetë me bazë.
          </p>
        </div>
      </div>

      {/* Market condition summary */}
      <div className="mt-3 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
        <Metric label="Gjendja" value={selectedAnalysis.stance} accent="cyan" />
        <Metric label="Strategjia" value={selectedAnalysis.structure.split(" or ")[0]} accent="green" />
        <Metric label="Besimi" value={`${selectedAnalysis.confidence}/100`} accent="amber" />
      </div>

      {/* ─── STRATEGY EDUCATION SECTION ─── */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-terminal-cyan" />
          <h3 className="text-sm font-bold text-terminal-cyan uppercase tracking-wider">
            Shpjegim i Strategjisë
          </h3>
        </div>

        {/* What is this strategy? */}
        <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/[0.05] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle size={16} className="text-terminal-cyan" />
            <span className="text-sm font-bold text-terminal-cyan">ÇFARË ËSHTË KJO STRATEGJI?</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{selectedAnalysis.actionAl}</p>
          <div className="mt-2 rounded bg-black/20 p-2.5 text-xs text-terminal-text/70 leading-5">
            <b>Në terma të thjeshtë:</b> {getStrategyExplanation(selectedAnalysis.action, selectedOption)}
          </div>
        </div>

        {/* Why would someone use it? */}
        <div className="rounded border border-terminal-green/30 bg-terminal-green/[0.05] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-terminal-green" />
            <span className="text-sm font-bold text-terminal-green">PSE DIKUSH DO TA PËRDORË?</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{selectedAnalysis.whyAl}</p>
        </div>

        {/* How does it work mechanically? */}
        <div className="rounded border border-terminal-amber/30 bg-terminal-amber/[0.05] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-terminal-amber" />
            <span className="text-sm font-bold text-terminal-amber">SI FUNKSIONON MEKANIKISHT?</span>
          </div>
          <div className="text-xs sm:text-sm leading-6 text-terminal-text/90">
            {selectedAnalysis.howAl.split(/\n/).filter(Boolean).map((step, i) => (
              <div key={i} className="flex gap-2 mb-0.5">
                <span className="shrink-0 text-terminal-amber/60 font-bold">{i + 1}.</span>
                <span>{step.trim()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What are the risks? */}
        <div className={`rounded border p-3.5 ${
          selectedAnalysis.riskLabel === "Very High" ? "border-red-500/40 bg-red-500/[0.08]" :
          selectedAnalysis.riskLabel === "High" ? "border-terminal-amber/40 bg-terminal-amber/[0.08]" :
          selectedAnalysis.riskLabel === "Medium" ? "border-yellow-500/30 bg-yellow-500/[0.05]" :
          "border-terminal-green/30 bg-terminal-green/[0.05]"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className={
              selectedAnalysis.riskLabel === "Very High" ? "text-red-400" :
              selectedAnalysis.riskLabel === "High" ? "text-terminal-amber" :
              selectedAnalysis.riskLabel === "Medium" ? "text-yellow-500" :
              "text-terminal-green"
            } />
            <span className={`text-sm font-bold ${
              selectedAnalysis.riskLabel === "Very High" ? "text-red-400" :
              selectedAnalysis.riskLabel === "High" ? "text-terminal-amber" :
              selectedAnalysis.riskLabel === "Medium" ? "text-yellow-500" :
              "text-terminal-green"
            }`}>RREZIKU: {selectedAnalysis.riskLabel === "Low" ? "I Ulët" : selectedAnalysis.riskLabel === "Medium" ? "Mesatar" : selectedAnalysis.riskLabel === "High" ? "I Lartë" : "Shumë I Lartë"}</span>
          </div>
          <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">{selectedAnalysis.riskAl}</p>
        </div>
      </div>

      {/* Technical analysis details (educational) */}
      <div className="mt-4 rounded border border-terminal-edge bg-black/20 p-3 sm:p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-terminal-muted mb-2">
          Analiza Teknike — Pse Këto Metrika Kanë Rëndësi
        </div>
        <p className="mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-terminal-text">{selectedAnalysis.summary}</p>
        <div className="mt-2 text-xs text-terminal-text/60 leading-5">
          <b>IV {(selectedOption.iv * 100).toFixed(1)}%</b> = Volatiliteti i nënkuptuar — sa lëvizje priton tregu.
          {" "}<b>HV {(selectedOption.historical.realizedVol30 * 100).toFixed(1)}%</b> = Volatiliteti historik — sa ka lëvizur realisht.
          {" "}<b>Delta {selectedOption.delta.toFixed(2)}</b> = Sa ndryshon opsioni për $1 lëvizje të aksionit.
          {" "}<b>Edge {selectedOption.edge.toFixed(1)}%</b> = Dallimi midis çmimit të tregut dhe vlerës së modelit.
        </div>
      </div>

      {/* Detailed analysis sections */}
      <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StrategyPlan analysis={selectedAnalysis} />
        <AnalystList title="Pse (Detaje)" items={selectedAnalysis.reasons} tone="green" />
        <AnalystList title="Rrezqe (Detaje)" items={selectedAnalysis.risks} tone="amber" />
      </div>
      <div className="mt-3 sm:mt-4">
        <AnalystList title="Kontrollistë Para Hyrjes" items={selectedAnalysis.checklist} tone="cyan" />
      </div>

      {/* Key educational takeaway */}
      <div className="mt-4 rounded border-2 border-terminal-cyan/30 bg-terminal-cyan/[0.04] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap size={16} className="text-terminal-cyan" />
          <span className="text-sm font-bold text-terminal-cyan">MËSIMI KRYESOR</span>
        </div>
        <p className="text-xs sm:text-sm leading-6 text-terminal-text/90">
          {getEducationalTakeaway(selectedAnalysis, selectedOption)}
        </p>
      </div>
    </Panel>
  );
}

/** Generate a plain-language explanation of the strategy type */
function getStrategyExplanation(action: AnalystVerdict["action"], option: TerminalOption): string {
  const strike = option.strike;
  const premium = option.price;
  const spot = option.underlyingPrice;

  switch (action) {
    case "BUY CALL":
      return `Ju paguani $${(premium * 100).toFixed(0)} për kontratë për të blerë të drejtën (por jo detyrimin) për të blerë 100 aksione me çmim $${strike} deri në skadim. Sikur sigurimi i një opsioni blerjeje — nëse aksioni ngrihet shumë, fitoni; nëse nuk ngrihet mjaftueshëm, humbni vetëm premiumin.`;

    case "SELL CALL":
      return `Ju merrni $${(premium * 100).toFixed(0)} për kontratë, por jeni të detyruar të shisni 100 aksione me çmim $${strike} nëse blerësi i opsionit ushtron të drejtën. Si të kishit shitur sigurim — nëse aksioni nuk ngrihet mbi $${strike}, mbani paratë. Nëse ngrihet, humbni diferencën.`;

    case "BUY PUT":
      return `Ju paguani $${(premium * 100).toFixed(0)} për kontratë për të blerë të drejtën (por jo detyrimin) për të shitur 100 aksione me çmim $${strike} deri në skadim. Kjo është si sigurimi i portofolit tuaj — nëse aksioni bie, fitoni; nëse nuk bie, humbni vetëm premiumin.`;

    case "SELL PUT":
      return `Ju merrni $${(premium * 100).toFixed(0)} për kontratë, por jeni të detyruar të blini 100 aksione me çmim $${strike} nëse blerësi i opsionit ushtron të drejtën. Kjo është si të premtosh se do të blini aksionin me zbritje — nëse çmimi qëndron lart, mbani premiumin. Nëse bie, e blini aksionin (me zbritje nga premiumi).`;

    case "WATCH":
      return `Kushtet nuk janë ende të qarta për ndonjë strategji me avantazh të qartë. Ndonjëherë pozicioni më i mirë është të mos bësh asgjë. Prisni derisa IV të bjerë ose sinjali të forcohet.`;

    case "AVOID":
      return `Të dhënat nuk janë të mjaftueshme për të marrë vendim të informuar. Aspekti më i rëndësishëm i tregtisë është të dish kur të MOS tregtosh.`;
  }
}

/** Generate an educational takeaway based on the analysis */
function getEducationalTakeaway(analysis: AnalystVerdict, option: TerminalOption): string {
  const ivHvSpread = option.iv - option.historical.realizedVol30;
  const ivExpensive = ivHvSpread > 0.05;
  const ivCheap = ivHvSpread < -0.03;

  if (option.dataQuality < 50) {
    return `Kujdes: Cilësia e të dhënave është vetëm ${option.dataQuality}/100. Pa të dhëna të besueshme, asnjë strategji nuk mund të vlerësohet saktë. Mësimi: gjithmonë kontrolloni cilësinë e të dhënave para se të besoni ndonjë numër.`;
  }

  if (ivExpensive) {
    return `IV është shumë më e lartë se HV (${(ivHvSpread * 100).toFixed(1)}% spread). Kjo do të thotë se tregu po paguan "shtesë" për opsionet. Strategjitë e shitjes (SELL CALL, SELL PUT, credit spreads) kanë avantazh statistikor sepse IV zakonisht kthehet drejt HV. Por kjo nuk do të thotë që IV nuk mund të rritet edhe më para se të bjerë. Mësimi: kur IV është e lartë, shitësit e opsioneve kanë erën në shpinë.`;
  }

  if (ivCheap) {
    return `IV është më e ulët se HV (${(Math.abs(ivHvSpread) * 100).toFixed(1)}% nën). Opsionet janë relativisht të lira. Strategjitë e blerjes (BUY CALL, BUY PUT) kanë më pak rrezik sepse koha (theta) nuk po kushton shumë. Por kjo nuk do të thotë që opsionet do të bëhen fitimprurëse automatikisht. Mësimi: kur IV është e ulët, blerësit e opsioneve marrin më pak rrezik nga IV crush.`;
  }

  return `IV dhe HV janë afër njëra-tjetrës — tregu po vlerëson opsionet në mënyrë të arsyeshme. Në këtë mjedis, asnjëra anë (blerja apo shitja) nuk ka avantazh të qartë nga volatiliteti. Fokusohuni në drejtimin e trendit, grekët, dhe menaxhimin e rrezikut. Mësimi: kur IV/HV janë të balancuara, drejtimi i tregut (delta) është më i rëndësishëm se sa IV/HV spread.`;
}
