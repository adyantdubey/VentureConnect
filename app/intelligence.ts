import { demoMembers, investors, startups, type Investor, type Startup } from "./synthetic-data";
import matchModel from "./match-model.json";

export const MATCH_MODEL_VERSION = "fayvar-match-v1.0";
export const MATCH_MODEL_METADATA = matchModel;

export type MarketSource = {
  id: string;
  sector: string;
  publisher: string;
  title: string;
  url: string;
  asOf: string;
  sourceMetric: string;
  addressableUnits: number;
  annualValueInr: number;
  cagr: number;
  confidence: "high" | "medium";
};

export type StartupIntelligence = {
  startupId: string;
  founderProfileId: string;
  founderName: string;
  name: string;
  sector: string;
  adjacentSectors: string[];
  stage: string;
  location: string;
  targetMarkets: string[];
  businessModel: string;
  revenueModel: string;
  customerType: string;
  raiseCr: number;
  minimumUsefulChequeCr: number;
  arrCr: number;
  growthPercent: number;
  customers: number;
  retentionPercent: number;
  runwayMonths: number;
  teamSize: number;
  previousFundingCr: number;
  problem: string;
  solution: string;
  keywords: string[];
  profileCompleteness: number;
  marketSourceId: string;
};

export type InvestorIntelligence = {
  profileId: string;
  investorId: string;
  name: string;
  firm: string;
  investorType: string;
  primarySectors: string[];
  adjacentSectors: string[];
  excludedSectors: string[];
  stages: string[];
  locations: string[];
  ticketMinCr: number;
  ticketMaxCr: number;
  businessModels: string[];
  customerTypes: string[];
  minimumArrCr: number;
  minimumGrowthPercent: number;
  leadPreference: "Lead" | "Follow" | "Either";
  thesis: string;
  portfolioStartupIds: string[];
  responseRate: number;
  availableCapitalCr: number;
  profileCompleteness: number;
};

export type MatchFeatures = {
  sectorFit: number;
  stageFit: number;
  chequeFit: number;
  geographyFit: number;
  thesisSimilarity: number;
  portfolioRelevance: number;
  tractionQuality: number;
  businessModelFit: number;
  profileCompleteness: number;
  portfolioConflict: number;
};

export type MatchResult = {
  modelVersion: string;
  startupId: string;
  investorProfileId: string;
  investorProbability: number;
  founderProbability: number;
  reciprocalScore: number;
  confidence: number;
  inboxTier: "primary" | "secondary" | "request";
  features: MatchFeatures;
  reasons: string[];
  concerns: string[];
};

const adjacentSectorMap: Record<string, string[]> = {
  "Climate tech": ["Agritech", "Mobility", "Deeptech"],
  Healthtech: ["Biotech", "Enterprise AI", "Consumer"],
  Fintech: ["B2B SaaS", "Enterprise AI", "Consumer"],
  Deeptech: ["Enterprise AI", "Mobility", "Climate tech"],
  Agritech: ["Climate tech", "Deeptech", "B2B SaaS"],
  "Enterprise AI": ["B2B SaaS", "Fintech", "Deeptech"],
  Consumer: ["Fintech", "Edtech", "Healthtech"],
  Mobility: ["Climate tech", "Deeptech", "B2B SaaS"],
  Edtech: ["Consumer", "Enterprise AI", "B2B SaaS"],
  Biotech: ["Healthtech", "Deeptech", "Agritech"],
  "B2B SaaS": ["Enterprise AI", "Fintech", "Logistics"],
  Proptech: ["Fintech", "B2B SaaS", "Climate tech"],
};

export const marketSources: MarketSource[] = [
  { id: "market-climate", sector: "Climate tech", publisher: "Ministry of New and Renewable Energy", title: "Renewable Energy Statistics 2024–25", url: "https://mnre.gov.in/en/re-statistics-2024-25/", asOf: "FY 2024–25", sourceMetric: "Installed renewable capacity and generation", addressableUnits: 320_000, annualValueInr: 480_000, cagr: 17.2, confidence: "high" },
  { id: "market-health", sector: "Healthtech", publisher: "Invest India", title: "Investment Opportunities in India’s Healthcare Sector", url: "https://static.investindia.gov.in/s3fs-public/2021-03/InvestmentOpportunities_HealthcareSector_0.pdf", asOf: "2021 report", sourceMetric: "Healthcare delivery and home-health opportunity", addressableUnits: 68_000_000, annualValueInr: 9_500, cagr: 19.2, confidence: "medium" },
  { id: "market-fintech", sector: "Fintech", publisher: "Reserve Bank of India", title: "Digitalisation and Payment Revolution in India", url: "https://rbi.org.in/scripts/PublicationsView.aspx?id=22459", asOf: "2023–24", sourceMetric: "Digital retail payments and UPI adoption", addressableUnits: 63_388_000, annualValueInr: 18_000, cagr: 20.0, confidence: "high" },
  { id: "market-deeptech", sector: "Deeptech", publisher: "Ministry of MSME", title: "MSME Annual Report 2024–25", url: "https://www.msme.gov.in/sites/default/files/MSME-ANNUAL-REPORT-2024-25-ENGLISH.pdf", asOf: "2024–25", sourceMetric: "Registered and estimated Indian MSME base", addressableUnits: 6_500_000, annualValueInr: 72_000, cagr: 15.0, confidence: "medium" },
  { id: "market-agri", sector: "Agritech", publisher: "Ministry of MSME", title: "MSME Annual Report 2024–25", url: "https://www.msme.gov.in/sites/default/files/MSME-ANNUAL-REPORT-2024-25-ENGLISH.pdf", asOf: "2024–25", sourceMetric: "Rural enterprise and food-processing base", addressableUnits: 24_000_000, annualValueInr: 12_000, cagr: 16.0, confidence: "medium" },
  { id: "market-ai", sector: "Enterprise AI", publisher: "Ministry of MSME", title: "MSME Annual Report 2024–25", url: "https://www.msme.gov.in/sites/default/files/MSME-ANNUAL-REPORT-2024-25-ENGLISH.pdf", asOf: "2024–25", sourceMetric: "Digitisable MSME and enterprise base", addressableUnits: 8_200_000, annualValueInr: 60_000, cagr: 24.0, confidence: "medium" },
  { id: "market-consumer", sector: "Consumer", publisher: "Reserve Bank of India", title: "Annual Report 2023–24: Payment Systems", url: "https://systemhealth.rbi.org.in/Scripts/AnnualReportPublications.aspx_Id%3D1409%281%29.html", asOf: "2023–24", sourceMetric: "Digital retail payment adoption", addressableUnits: 140_000_000, annualValueInr: 6_000, cagr: 14.5, confidence: "medium" },
  { id: "market-mobility", sector: "Mobility", publisher: "Ministry of Road Transport and Highways", title: "Annual Report 2024–25", url: "https://morth.nic.in/hi/print/9950", asOf: "2024–25", sourceMetric: "Road transport and electric-mobility ecosystem", addressableUnits: 4_500_000, annualValueInr: 38_000, cagr: 22.0, confidence: "medium" },
  { id: "market-edtech", sector: "Edtech", publisher: "Ministry of Education", title: "UDISE+ Report 2023–24", url: "https://dsel.education.gov.in/sites/default/files/statistics/report_in_PDF/udise_report_nep_23_24.pdf", asOf: "2023–24", sourceMetric: "1.47 million schools and 248 million enrolments", addressableUnits: 1_471_891, annualValueInr: 90_000, cagr: 18.0, confidence: "high" },
  { id: "market-biotech", sector: "Biotech", publisher: "Department of Biotechnology", title: "Annual Report 2024–25", url: "https://dbtindia.gov.in/hi/about-us/annual-report/dbt", asOf: "2024–25", sourceMetric: "Biotechnology research and commercial ecosystem", addressableUnits: 48_000, annualValueInr: 2_400_000, cagr: 17.5, confidence: "medium" },
  { id: "market-saas", sector: "B2B SaaS", publisher: "Ministry of MSME", title: "MSME Annual Report 2024–25", url: "https://www.msme.gov.in/sites/default/files/MSME-ANNUAL-REPORT-2024-25-ENGLISH.pdf", asOf: "2024–25", sourceMetric: "Addressable Indian MSME base", addressableUnits: 12_500_000, annualValueInr: 36_000, cagr: 21.0, confidence: "medium" },
  { id: "market-proptech", sector: "Proptech", publisher: "Ministry of MSME", title: "MSME Annual Report 2024–25", url: "https://www.msme.gov.in/sites/default/files/MSME-ANNUAL-REPORT-2024-25-ENGLISH.pdf", asOf: "2024–25", sourceMetric: "Property-service and small-enterprise base", addressableUnits: 2_300_000, annualValueInr: 48_000, cagr: 16.5, confidence: "medium" },
];

const founderNames = new Map(demoMembers.filter((member) => member.role === "founder").map((member) => [member.id, member.name]));
const businessModels = ["B2B SaaS", "Usage based", "Marketplace", "Hardware + software", "Transaction fee"];
const revenueModels = ["Annual subscription", "Monthly subscription", "Transaction fee", "Enterprise licence", "Platform commission"];
const customerTypes = ["Enterprise", "SMB", "Mid-market", "Public sector", "Consumer"];
const raiseByStage: Record<string, number> = { "Pre-seed": 4, Seed: 10, "Pre-Series A": 18, "Series A": 35 };
const stageArr: Record<string, number> = { "Pre-seed": .12, Seed: 1.1, "Pre-Series A": 4.2, "Series A": 11.5 };

export const startupIntelligence: StartupIntelligence[] = startups.map((startup, index) => {
  const source = marketSources.find((item) => item.sector === startup.sector) ?? marketSources[0];
  const raiseCr = raiseByStage[startup.stage] ?? 8;
  const deliberatelyIncomplete = index === 28 ? .62 : index === 29 ? .48 : 1;
  return {
    startupId: startup.id,
    founderProfileId: startup.founderProfileId,
    founderName: founderNames.get(startup.founderProfileId) ?? `${startup.name} founder`,
    name: startup.name,
    sector: startup.sector,
    adjacentSectors: adjacentSectorMap[startup.sector] ?? [],
    stage: startup.stage,
    location: startup.location,
    targetMarkets: [startup.location, index % 4 === 0 ? "Southeast Asia" : "India"],
    businessModel: businessModels[index % businessModels.length],
    revenueModel: revenueModels[index % revenueModels.length],
    customerType: customerTypes[index % customerTypes.length],
    raiseCr,
    minimumUsefulChequeCr: Math.max(.25, Number((raiseCr * .08).toFixed(2))),
    arrCr: Number(((stageArr[startup.stage] ?? .6) + (index % 7) * .24).toFixed(2)),
    growthPercent: 12 + ((index * 7) % 47),
    customers: 14 + index * 29,
    retentionPercent: 76 + (index % 20),
    runwayMonths: 8 + (index % 13),
    teamSize: 6 + index,
    previousFundingCr: Number(Math.max(0, raiseCr * .32 - (index % 3)).toFixed(2)),
    problem: `${startup.sector} teams lose time and capital because fragmented tools hide the operational signal they need to act.` ,
    solution: startup.tagline,
    keywords: [startup.sector, ...startup.tags, startup.stage, startup.location, businessModels[index % businessModels.length]],
    profileCompleteness: deliberatelyIncomplete,
    marketSourceId: source.id,
  };
});

function ticketRange(ticket: string) {
  if (ticket.includes("50L")) return [0.5, 2] as const;
  if (ticket.includes("2Cr")) return [2, 8] as const;
  return [8, 20] as const;
}

export const investorIntelligence: InvestorIntelligence[] = investors.map((investor, index) => {
  const [ticketMinCr, ticketMaxCr] = ticketRange(investor.ticket);
  const excluded = Object.keys(adjacentSectorMap).filter((sector) => !investor.sectors.includes(sector) && !investor.sectors.flatMap((item) => adjacentSectorMap[item] ?? []).includes(sector));
  return {
    profileId: investor.profileId,
    investorId: investor.id,
    name: investor.name,
    firm: investor.firm,
    investorType: index % 5 === 0 ? "Operator angel" : index % 3 === 0 ? "Micro VC" : "Venture fund",
    primarySectors: investor.sectors,
    adjacentSectors: Array.from(new Set(investor.sectors.flatMap((sector) => adjacentSectorMap[sector] ?? []))).slice(0, 4),
    excludedSectors: excluded.slice(index % 3, index % 3 + 2),
    stages: investor.stages,
    locations: [...investor.locations, ...(index % 4 === 0 ? ["India"] : [])],
    ticketMinCr,
    ticketMaxCr,
    businessModels: [businessModels[index % businessModels.length], businessModels[(index + 1) % businessModels.length]],
    customerTypes: [customerTypes[index % customerTypes.length], customerTypes[(index + 2) % customerTypes.length]],
    minimumArrCr: investor.stages.includes("Pre-seed") ? 0 : investor.stages.includes("Seed") ? .5 : 3,
    minimumGrowthPercent: 12 + (index % 4) * 6,
    leadPreference: index % 3 === 0 ? "Lead" : index % 3 === 1 ? "Follow" : "Either",
    thesis: `We back ${investor.sectors.join(" and ")} founders at ${investor.stages.join(" and ")} building measurable, capital-efficient products for ${customerTypes[index % customerTypes.length].toLowerCase()} customers. We value evidence of customer urgency, disciplined distribution, and a credible path from India to durable regional scale.`,
    portfolioStartupIds: investor.portfolioStartupIds,
    responseRate: 54 + ((index * 7) % 43),
    availableCapitalCr: 18 + index * 7,
    profileCompleteness: index === 18 ? .72 : 1,
  };
});

const MODEL_WEIGHTS = matchModel.weights as Record<keyof MatchFeatures, number>;

export function scoreMatch(startup: StartupIntelligence, investor: InvestorIntelligence): MatchResult {
  const features = extractFeatures(startup, investor);
  const hardExcluded = investor.excludedSectors.includes(startup.sector);
  const linear = matchModel.intercept + (Object.keys(features) as Array<keyof MatchFeatures>).reduce((sum, key) => sum + features[key] * MODEL_WEIGHTS[key], 0);
  const investorProbability = hardExcluded ? Math.min(28, Math.round(sigmoid(linear) * 100)) : Math.round(sigmoid(linear) * 100);
  const founderUtility = clamp01(
    features.chequeFit * .25 + features.stageFit * .2 + features.sectorFit * .18 + features.geographyFit * .1 + features.portfolioRelevance * .1 + investor.responseRate / 100 * .17,
  );
  const founderProbability = Math.round(founderUtility * 100);
  const reciprocalScore = Math.round(Math.sqrt((investorProbability / 100) * founderUtility) * 100);
  const confidence = Math.round(Math.min(startup.profileCompleteness, investor.profileCompleteness) * 100);
  const reasons = topReasons(features, startup, investor);
  const concerns = topConcerns(features, startup, investor, hardExcluded);
  return {
    modelVersion: MATCH_MODEL_VERSION,
    startupId: startup.startupId,
    investorProfileId: investor.profileId,
    investorProbability,
    founderProbability,
    reciprocalScore,
    confidence,
    inboxTier: investorProbability >= 75 && !hardExcluded ? "primary" : investorProbability >= 45 && !hardExcluded ? "secondary" : "request",
    features,
    reasons,
    concerns,
  };
}

export function recommendationsForInvestor(profileId: string, limit = 12) {
  const investor = investorIntelligence.find((item) => item.profileId === profileId) ?? investorIntelligence[0];
  return startupIntelligence.map((startup) => ({ startup, match: scoreMatch(startup, investor) })).sort((a, b) => b.match.reciprocalScore - a.match.reciprocalScore).slice(0, limit);
}

export function recommendationsForFounder(profileId: string, limit = 12) {
  const startup = startupIntelligence.find((item) => item.founderProfileId === profileId) ?? startupIntelligence[0];
  return investorIntelligence.map((investor) => ({ investor, match: scoreMatch(startup, investor) })).sort((a, b) => b.match.reciprocalScore - a.match.reciprocalScore).slice(0, limit);
}

export function matchByProfileIds(founderProfileId: string, investorProfileId: string) {
  const startup = startupIntelligence.find((item) => item.founderProfileId === founderProfileId);
  const investor = investorIntelligence.find((item) => item.profileId === investorProfileId);
  return startup && investor ? scoreMatch(startup, investor) : null;
}

export function calculateTam(startup: StartupIntelligence, scenario: "bear" | "base" | "bull" = "base") {
  const source = marketSources.find((item) => item.id === startup.marketSourceId) ?? marketSources[0];
  const multiplier = scenario === "bear" ? .72 : scenario === "bull" ? 1.32 : 1;
  const tamCr = source.addressableUnits * source.annualValueInr / 10_000_000 * multiplier;
  const serviceableRate = startup.targetMarkets.includes("India") ? .38 : .24;
  const obtainableRate = startup.stage === "Series A" ? .028 : startup.stage === "Pre-Series A" ? .018 : startup.stage === "Seed" ? .009 : .004;
  return {
    scenario,
    tamCr: Math.round(tamCr),
    samCr: Math.round(tamCr * serviceableRate),
    somCr: Math.round(tamCr * serviceableRate * obtainableRate),
    serviceableRate,
    obtainableRate,
    cagr: source.cagr,
    source,
    formula: `${source.addressableUnits.toLocaleString("en-IN")} addressable units × ₹${source.annualValueInr.toLocaleString("en-IN")} annual value`,
  };
}

function extractFeatures(startup: StartupIntelligence, investor: InvestorIntelligence): MatchFeatures {
  const exactSector = investor.primarySectors.includes(startup.sector);
  const adjacentSector = investor.adjacentSectors.includes(startup.sector) || startup.adjacentSectors.some((sector) => investor.primarySectors.includes(sector));
  const stageFit = stageCompatibility(startup.stage, investor.stages);
  const chequeFit = startup.minimumUsefulChequeCr <= investor.ticketMaxCr && startup.raiseCr >= investor.ticketMinCr
    ? clamp01(1 - Math.abs((investor.ticketMinCr + investor.ticketMaxCr) / 2 - startup.raiseCr * .2) / Math.max(investor.ticketMaxCr, startup.raiseCr))
    : 0;
  const geographyFit = investor.locations.includes(startup.location) ? 1 : investor.locations.includes("India") || startup.targetMarkets.some((market) => investor.locations.includes(market)) ? .78 : .22;
  const portfolioInSector = investor.portfolioStartupIds.map((id) => startups.find((item) => item.id === id)).filter((item): item is Startup => Boolean(item)).filter((item) => item.sector === startup.sector).length;
  const traction = clamp01((startup.growthPercent / Math.max(18, investor.minimumGrowthPercent)) * .48 + (startup.arrCr / Math.max(.5, investor.minimumArrCr || .5)) * .32 + (startup.retentionPercent / 100) * .2);
  return {
    sectorFit: exactSector ? 1 : adjacentSector ? .62 : .08,
    stageFit,
    chequeFit,
    geographyFit,
    thesisSimilarity: textSimilarity(`${startup.problem} ${startup.solution} ${startup.keywords.join(" ")}`, investor.thesis),
    portfolioRelevance: portfolioInSector ? Math.min(1, .52 + portfolioInSector * .16) : .18,
    tractionQuality: traction,
    businessModelFit: investor.businessModels.includes(startup.businessModel) ? 1 : .36,
    profileCompleteness: Math.min(startup.profileCompleteness, investor.profileCompleteness),
    portfolioConflict: portfolioInSector >= 2 ? .72 : portfolioInSector === 1 ? .18 : 0,
  };
}

function stageCompatibility(stage: string, supported: string[]) {
  if (supported.includes(stage)) return 1;
  const order = ["Pre-seed", "Seed", "Pre-Series A", "Series A"];
  const index = order.indexOf(stage);
  return supported.some((item) => Math.abs(order.indexOf(item) - index) === 1) ? .55 : .08;
}

function textSimilarity(left: string, right: string) {
  const documents = [tokenize(left), tokenize(right)];
  const vocabulary = Array.from(new Set(documents.flat()));
  const vectors = documents.map((tokens) => vocabulary.map((term) => {
    const tf = tokens.filter((token) => token === term).length / Math.max(tokens.length, 1);
    const documentFrequency = documents.filter((document) => document.includes(term)).length;
    return tf * (Math.log((documents.length + 1) / (documentFrequency + 1)) + 1);
  }));
  const dot = vectors[0].reduce((sum, value, index) => sum + value * vectors[1][index], 0);
  const magnitude = vectors.map((vector) => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)));
  return clamp01(dot / Math.max(magnitude[0] * magnitude[1], .0001) * 1.8);
}

function tokenize(value: string) {
  const stop = new Set(["and", "the", "for", "with", "from", "that", "this", "into", "we", "to", "of", "a", "in"]);
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !stop.has(token));
}

function topReasons(features: MatchFeatures, startup: StartupIntelligence, investor: InvestorIntelligence) {
  const values = [
    [features.sectorFit, `Strong ${startup.sector} mandate alignment`],
    [features.stageFit, `${startup.stage} is inside the fund’s preferred window`],
    [features.chequeFit, `₹${investor.ticketMinCr}–₹${investor.ticketMaxCr} Cr cheque range supports this round`],
    [features.geographyFit, `${startup.location} is within the investor’s coverage`],
    [features.thesisSimilarity, "Company narrative closely matches the stated thesis"],
    [features.portfolioRelevance, "Relevant portfolio evidence creates useful operating context"],
    [features.tractionQuality, "Traction clears the investor’s current evidence threshold"],
  ] as Array<[number, string]>;
  return values.sort((a, b) => b[0] - a[0]).filter(([value]) => value >= .5).slice(0, 3).map(([, label]) => label);
}

function topConcerns(features: MatchFeatures, startup: StartupIntelligence, investor: InvestorIntelligence, hardExcluded: boolean) {
  const concerns: string[] = [];
  if (hardExcluded) concerns.push(`${startup.sector} is explicitly outside the current mandate`);
  if (features.stageFit < .5) concerns.push(`${startup.stage} falls outside the preferred stage window`);
  if (features.chequeFit < .4) concerns.push("Round size and cheque range have limited overlap");
  if (features.geographyFit < .5) concerns.push(`${startup.location} is outside the investor’s core geography`);
  if (features.portfolioConflict > .5) concerns.push("Potential portfolio adjacency requires a conflict check");
  if (startup.profileCompleteness < .8) concerns.push("Recommendation confidence is reduced by missing startup information");
  if (!concerns.length && investor.leadPreference === "Follow") concerns.push("This investor usually follows rather than leads rounds");
  return concerns.slice(0, 3);
}

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function startupForRecord(record: StartupIntelligence): Startup {
  return startups.find((item) => item.id === record.startupId)!;
}

export function investorForRecord(record: InvestorIntelligence): Investor {
  return investors.find((item) => item.profileId === record.profileId)!;
}
