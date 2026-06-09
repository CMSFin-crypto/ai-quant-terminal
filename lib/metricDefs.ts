"use client";

/**
 * IBKR metric definitions — explanations for every indicator shown in the terminal.
 * Used by ScannerTab headers and MiniStat tooltips.
 */

export interface MetricDef {
  term: string;       // IBKR term shown
  full: string;       // Full name
  desc: string;       // What it measures
  use: string;        // How traders use it
  tip: string;        // Practical tip
}

export const METRICS: Record<string, MetricDef> = {
  Symbol: {
    term: "Symbol",
    full: "Ticker Symbol",
    desc: "Identifikuesi unik i aksionit në bursë (p.sh. AMD, NVDA, MSFT).",
    use: "Përdoret për të gjetur dhe filtruar aksionet specifike në scanner.",
    tip: "Kliko mbi simbolin për të parë detaje të plota të kontratës."
  },
  Undl: {
    term: "Undl",
    full: "Underlying Price",
    desc: "Çmimi aktual i aksionit në treg. P.sh. nëse AMD tregtohet në $465.62, ky është çmimi Underlying.",
    use: "Krahason me Strike për të përcaktuar nëse opsioni është ITM, ATM, apo OTM. Dallimi Undl - Strike = Intrinsic Value për Call.",
    tip: "Nëse Undl > Strike për Call → opsioni është ITM (ka vlerë të brendshme)."
  },
  Right: {
    term: "Right",
    full: "Option Right (Call/Put)",
    desc: "Lloji i opsionit: CALL jep të drejtën të BLERËSH aksionin me çmim Strike. PUT jep të drejtën të SHESËSH aksionin me çmim Strike.",
    use: "BUY CALL = pritje që çmimi të rritet. BUY PUT = pritje që çmimi të bjerë. SELL CALL/PUT = të ardhura nga premium.",
    tip: "ITM/ATM/OTM tregon sa afër është çmimi i tregut me Strike. ATM ka Delta ~0.50."
  },
  Mark: {
    term: "Mark",
    full: "Mark Price (Theoretical Value)",
    desc: "Çmimi teorik i opsionit sipas modelit Black-Scholes me IV të tregut. Në IBKR quhet 'Mark Price' dhe llogaritet si mesatare midis Bid dhe Ask.",
    use: "Krahason me Last për të parë nëse tregtohet mbi apo nën vlerën teorike. Nëse Mark > Last → opsioni mund të jetë i lirë.",
    tip: "Mark = Intrinsic + Extrinsic. Për ATM, Intrinsic ≈ 0, kështu Mark ≈ Extrinsic (time value)."
  },
  Last: {
    term: "Last",
    full: "Last Traded Price",
    desc: "Çmimi i fundit në të cilin u ekzekutua një tregti për këtë kontratë opsioni. Nuk përfshin Bid-Ask spread.",
    use: "Tregon çmimin real që paguan/merrsh. Dallimi Last vs Mark tregon nëse tregu po paguan më shumë apo më pak se vlera teorike.",
    tip: "Nëse Last është shumë larg Mark → likuiditet i ulët apo tregtim i rrallë. Kontrollo Vol/OI."
  },
  Intrinsic: {
    term: "Intrinsic",
    full: "Intrinsic Value",
    desc: "Vlera e brendshme e opsionit nëse do të ushthehej tani. Call: max(Undl - Strike, 0). Put: max(Strike - Undl, 0).",
    use: "Tregon sa vlen opsioni 'realisht' pa marrë parasysh kohën. Një opsion ATM ka Intrinsic = 0 ose afër zeros.",
    tip: "Intrinsic nuk mund të jetë negativ. Nëse Intrinsic = 0, opsioni është OTM dhe e gjithë premium është Extrinsic."
  },
  Extrinsic: {
    term: "Extrinsic",
    full: "Extrinsic Value (Time Value)",
    desc: "Pjesa e premium-s mbi Intrinsic Value. Përfshin vlerën e kohës (sa më shumë DTE, aq më e lartë) dhe volatilitetin e pritur. Zvogëlohet çdo ditë (theta decay).",
    use: "Tregon sa po paguan për 'kohë' dhe 'mundësi'. Nëse Extrinsic është e lartë, opsioni është i shtrenjtë. Shitisit e opsioneve duan Extrinsic të lartë.",
    tip: "Extrinsic = Mark - Intrinsic. Para expiry, Extrinsic → 0. Kjo është arsyeja pse opsionet humbin vlerë me kalimin e kohës."
  },
  "Break Even": {
    term: "Break Even",
    full: "Break-Even Price",
    desc: "Çmimi që aksioni duhet të arrijë në expiry që të mbulosh kostën e premium-s. Call: Strike + Premium. Put: Strike - Premium.",
    use: "Tregon nivelin minimale që aksioni duhet të lëvizë që të jesh në profit. Sa më larg Break Even, aq më i vështirë të fitosh.",
    tip: "Për BUY CALL me Strike $465 dhe Premium $3.90, Break Even = $468.90. Aksioni duhet të ngrihet mbi $468.90 që të fitosh."
  },
  IV: {
    term: "IV",
    full: "Implied Volatility",
    desc: "Volatiliteti i nënkuptuar nga çmimi i opsionit në treg. Tregon sa lëvizje të mëdha prit tregu për aksionin. IV e lartë = pritje lëvizjesh të mëdha, IV e ulët = pritje stabiliteti.",
    use: "Krahano me HV (Historical Vol) për të parë nëse opsionet janë të shtrenjta apo të lira. Nëse IV > HV → opsionet janë relativisht të shtrenjta.",
    tip: "IV llogaritet nga çmimi i opsionit, jo nga lëvizjet historike. IV Rank dhe IV Percentile tregojnë nëse IV është e lartë apo e ulët krahasuar me të shkuarën."
  },
  "HV 30D": {
    term: "HV 30D",
    full: "30-Day Historical Volatility",
    desc: "Volatiliteti aktual i realizuar gjatë 30 ditëve të fundit, i llogaritur nga lëvizjet ditore të çmimit. Kjo është ajo që ka ndodhur realisht.",
    use: "Krahano me IV. Nëse IV >> HV → tregu prit lëvizje më të mëdha se çka ka treguar historia → opsionet janë të shtrenjta (kandidat për SELL).",
    tip: "IV - HV = Volatility Risk Premium. Nëse ky dallim është i madh, shitiit e opsioneve kanë avantazh statistikor."
  },
  "IV/HV": {
    term: "IV/HV",
    full: "Implied vs Historical Volatility Ratio",
    desc: "Raporti midis IV (çfarë prit tregu) dhe HV (çka ka ndodhur realisht). Tregon nëse opsionet janë të çmuara apo të lira.",
    use: "IV/HV > 1.2 → opsionet janë të shtrenjta, konsidero SELL. IV/HV < 0.9 → opsionet janë të lira, konsidero BUY.",
    tip: "Kjo është metrika kryesore për 'volatility arbitrage'. Tregtarët profesionistë kërkojnë dallime të mëdha midis IV dhe HV."
  },
  Delta: {
    term: "Delta",
    full: "Delta (Δ)",
    desc: "Sa ndryshon çmimi i opsionit kur aksioni lëviz $1. Delta e Call është 0 deri në 1, Delta e Put është -1 deri në 0. P.sh. Delta 0.55 do të thotë: nëse aksioni ngrihet $1, opsioni ngrihet $0.55.",
    use: "Delta ≈ probabiliteti që opsioni të përfundojë ITM. Delta 0.55 → ~55% shansë. Përdoret gjithashtu për hedging: 100 kontrate me Delta 0.55 = 55 aksione ekuivalente.",
    tip: "ATM opsionet kanë Delta ~0.50. ITM kanë Delta > 0.50. OTM kanë Delta < 0.50. Delta tregon edhe 'directional exposure'."
  },
  Gamma: {
    term: "Gamma",
    full: "Gamma (Γ)",
    desc: "Sa shpejt ndryshon Delta kur aksioni lëviz $1. Gamma është më e lartë për opsionet ATM dhe afër expiry. Tregon 'acceleration' e Delta-s.",
    use: "Gamma e lartë = Delta ndryshon shpejt = rrezik më i madh për market makers. Gamma risk është arsyeja pse opsionet ATM afër expiry janë të volatshme.",
    tip: "Nëse ke Short Gamma, lëvizje të mëdha të aksionit mund të kthehen në humbje të mëdha shpejt. Long Gamma = ke mbrojtje nga lëvizje të mëdha."
  },
  Theta: {
    term: "Theta",
    full: "Theta (Θ)",
    desc: "Sa vlerë humbet opsioni çdo ditë nga kalimi i kohës (time decay). Theta është gjithmonë negative për blerësit. P.sh. Theta -0.654 do të thotë opsioni humbet $0.654/ditë.",
    use: "Theta tregon koston ditore të mbajtjes së opsionit. Shitiit e opsioneve fitojnë nga Theta. Blerësit e opsioneve humbasin nga Theta.",
    tip: "Theta rritet drastikisht në javën e fundit para expiry. Opsionet ATM me DTE të ulët kanë Theta më të lartë → më i shtrenjtë për t'u mbajtur."
  },
  Vega: {
    term: "Vega",
    full: "Vega (ν)",
    desc: "Sa ndryshon çmimi i opsionit kur IV ndryshon 1%. P.sh. Vega 0.5283 do të thotë: nëse IV rritet 1%, opsioni rritet $0.5283.",
    use: "Vega tregon ndjeshmërinë ndaj ndryshimeve të volatilitetit. Nëse pritni IV të rritet → doni Vega pozitive (long options). Nëse pritni IV të bjerë → doni Vega negative (short options).",
    tip: "Pas earnings, IV zakonisht bie (IV crush). Kjo dëmton blerësit e opsioneve. Shitiit përfitojnë nga IV crush."
  },
  Rho: {
    term: "Rho",
    full: "Rho (ρ)",
    desc: "Sa ndryshon çmimi i opsionit kur norma e interesit ndryshon 1%. P.sh. Rho 0.1785 do të thotë: nëse normat rriten 1%, çmimi i Call rritet $0.1785.",
    use: "Për opsionet afatshkurtra, Rho është e papërfillshme. Bëhet e rëndësishme vetëm për LEAPS (opsione afatgjata > 1 vit).",
    tip: "Shumica e tregtarëve nuk e konsiderojnë Rho për opsionet me DTE < 60. Përputhet me terminologjinë IBKR ku Rho shfaqet por zakonisht injorohet."
  },
  POP: {
    term: "POP",
    full: "Probability of Profit",
    desc: "Probabiliteti që tregtia të jetë fitimprurëse në expiry, i llogaritur me simulime Monte Carlo. P.sh. POP 44.1% do të thotë se në 44.1% të skenareve, opsioni do të përfundojë me profit.",
    use: "Krahason risk/reward. POP e lartë me premium të ulët → fitim i vogël por i sigurt. POP e ulët me premium të lartë → rrezik i madh por fitim potencial i lartë.",
    tip: "Në përgjithësi, SELL opsione kanë POP > 50% (por humbjet mund të jenë të mëdha). BUY opsione kanë POP < 50% (por fitimet mund të jenë të mëdha)."
  },
  Score: {
    term: "Score",
    full: "Opportunity Score",
    desc: "Vlerësim i kombinuar 0-100 që merr parasysh: sinjal teknikal (28%), probabilitet fitimi (22%), edge (16%), momentin 30D (14%), potencial lëvizjeje (12%), dhe rrezik makro (8%).",
    use: "Score të lartë (>75) = mundësi e fortë me konfirmime të shumta. Score mesatar (50-75) = mundësi mesatare. Score i ulët (<50) = shmang ose kujdes.",
    tip: "Score kombinon shumë faktorë. Një Score i lartë me Data Quality të ulët nuk është i besueshëm. Kontrollo gjithmonë Feed dhe Hist."
  },
  "Vol/OI": {
    term: "Vol/OI",
    full: "Volume / Open Interest",
    desc: "Volume = numri i kontratave të tregtuara sot. OI (Open Interest) = numri total i kontratave aktive. Raporti Vol/OI tregon aktivitetin e sotëm krahasuar me pozicionet ekzistuese.",
    use: "Vol/OI > 1 → aktivitet i papërshtatshëm zakonisht = interes i ri i madh. OI në rritje = pozicione të reja po hapen. OI në rënie = pozicione po mbyllen.",
    tip: "Volume i lartë me OI të ulët = tregtim i ri, mund të jetë spekulativ. OI i lartë me Volume të ulët = pozicione ekzistuese por pa aktivitet të ri."
  },
  DTE: {
    term: "DTE",
    full: "Days to Expiration",
    desc: "Numri i ditëve deri në skadimin e kontratës së opsionit. Pasi DTE = 0, opsioni skadon dhe humbet çdo vlerë ekstrinsike.",
    use: "DTE përcakton sa kohë ke për t'u fituar. DTE e ulët = Theta decay më i shpejtë. DTE e lartë = më shumë kohë por premium më i lartë.",
    tip: "Rreth 30 DTE është 'sweet spot' për shumë strategjive — balance midis time value dhe theta decay. < 7 DTE = rrezik i lartë gamma."
  },
  Feed: {
    term: "Feed",
    full: "Data Feed Source",
    desc: "Burimi i të dhënave të opsioneve. 'Live' = të dhëna reale nga bursa (përmes Polygon.io). 'Synthetic' = të dhëna të simuluar kur nuk ka feed të disponueshëm.",
    use: "Feed 'Live' = të dhëna të besueshme. Feed 'Synthetic' = përdor vetëm për ide, jo për tregtim real.",
    tip: "Gjithmonë kontrollo Feed para se të marrësh vendime tregtimi. Synthetic data mund të ketë vlera të pasakta."
  },
  Hist: {
    term: "Hist",
    full: "Historical Data Source",
    desc: "Burimi i të dhënave historike për llogaritjen e volatilitetit, momentit, dhe treguesve teknikë. Yahoo Finance = të dhëna reale. Simulated = të dhëna të prodhuar artificialisht.",
    use: "Yahoo Finance = HV, trend, dhe momentum të besueshëm. Simulated = këto metrika janë të pasakta dhe nuk duhen përdorur për vendime.",
    tip: "Nëse Hist = Simulated, Score dhe sinjalet nuk janë të besueshme. Prit deri sa Hist të bëhet Yahoo Finance ose Polygon."
  },
  Quality: {
    term: "Quality",
    full: "Data Quality Score",
    desc: "Vlerësim 0-100 i cilësisë së të dhënave. -25 pikë për opsione sintetike, -40 pikë për histori simuluar. 100/100 = të dhëna komplet live.",
    use: "Quality > 75 = besueshme. 50-75 = mesatare, verifiko manualisht. < 50 = përdor vetëm si referencë, jo për tregtim.",
    tip: "Quality varet nga Feed + Hist. Nëse ke Live Feed + Yahoo History = 100. Nëse ke Synthetic + Simulated = 35."
  }
};

/** Get metric definition, with fallback for unknown keys */
export function getMetricDef(key: string): MetricDef | undefined {
  return METRICS[key];
}

/** All keys that have definitions */
export const METRIC_KEYS = Object.keys(METRICS);
