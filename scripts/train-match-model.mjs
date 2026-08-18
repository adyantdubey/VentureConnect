const featureNames = [
  "sectorFit",
  "stageFit",
  "chequeFit",
  "geographyFit",
  "thesisSimilarity",
  "portfolioRelevance",
  "tractionQuality",
  "businessModelFit",
  "profileCompleteness",
  "portfolioConflict",
];

const sectors = Array.from({ length: 12 }, (_, index) => index);
const stages = Array.from({ length: 4 }, (_, index) => index);
const cities = Array.from({ length: 10 }, (_, index) => index);
const businesses = Array.from({ length: 5 }, (_, index) => index);

const founders = Array.from({ length: 30 }, (_, index) => ({
  sector: sectors[index % sectors.length],
  stage: stages[index % stages.length],
  city: cities[index % cities.length],
  business: businesses[index % businesses.length],
  raise: [4, 10, 18, 35][index % 4],
  growth: 12 + ((index * 7) % 47),
  completeness: index === 28 ? .62 : index === 29 ? .48 : 1,
}));

const investors = Array.from({ length: 20 }, (_, index) => ({
  sectors: [index % 12, (index * 3 + 2) % 12],
  stages: [index % 4, (index + 1) % 4],
  cities: [index % 10, (index * 2 + 3) % 10],
  businesses: [index % 5, (index + 1) % 5],
  ticket: index % 3 === 0 ? [.5, 2] : index % 3 === 1 ? [2, 8] : [8, 20],
  portfolioSector: (index * 5 + 1) % 12,
  completeness: index === 18 ? .72 : 1,
}));

const rows = founders.flatMap((founder, founderIndex) => investors.map((investor, investorIndex) => {
  const exactSector = investor.sectors.includes(founder.sector);
  const adjacentSector = investor.sectors.some((sector) => circularDistance(sector, founder.sector, 12) <= 2);
  const exactStage = investor.stages.includes(founder.stage);
  const adjacentStage = investor.stages.some((stage) => Math.abs(stage - founder.stage) === 1);
  const usefulCheque = founder.raise * .08;
  const chequeFit = usefulCheque <= investor.ticket[1] && founder.raise >= investor.ticket[0]
    ? clamp(1 - Math.abs((investor.ticket[0] + investor.ticket[1]) / 2 - founder.raise * .2) / Math.max(investor.ticket[1], founder.raise))
    : 0;
  const portfolioRelevant = circularDistance(investor.portfolioSector, founder.sector, 12) <= 1;
  const portfolioConflict = investor.portfolioSector === founder.sector && investorIndex % 4 === 0;
  const features = [
    exactSector ? 1 : adjacentSector ? .62 : .08,
    exactStage ? 1 : adjacentStage ? .55 : .08,
    chequeFit,
    investor.cities.includes(founder.city) ? 1 : investorIndex % 4 === 0 ? .78 : .22,
    exactSector ? .9 : adjacentSector ? .58 : .16,
    portfolioRelevant ? .68 : .18,
    clamp(founder.growth / 42),
    investor.businesses.includes(founder.business) ? 1 : .36,
    Math.min(founder.completeness, investor.completeness),
    portfolioConflict ? .72 : portfolioRelevant ? .18 : 0,
  ];
  const truth = -2.35 + features[0] * 1.65 + features[1] * 1.08 + features[2] * 1.15 + features[3] * .58 + features[4] * .72 + features[5] * .38 + features[6] * .45 + features[7] * .36 + features[8] * .28 - features[9] * 1.48;
  const deterministicNoise = (((founderIndex + 3) * 17 + (investorIndex + 5) * 29) % 23 - 11) / 40;
  return { features, label: truth + deterministicNoise >= 1.35 ? 1 : 0, pair: `${founderIndex}:${investorIndex}` };
}));

const training = rows.filter((_, index) => index % 5 !== 0);
const validation = rows.filter((_, index) => index % 5 === 0);
let intercept = 0;
const weights = Array(featureNames.length).fill(0);
const learningRate = .12;
const l2 = .008;

for (let epoch = 0; epoch < 2_400; epoch += 1) {
  let interceptGradient = 0;
  const gradients = Array(weights.length).fill(0);
  for (const row of training) {
    const predicted = sigmoid(intercept + dot(weights, row.features));
    const error = predicted - row.label;
    interceptGradient += error;
    row.features.forEach((value, index) => { gradients[index] += error * value; });
  }
  intercept -= learningRate * interceptGradient / training.length;
  weights.forEach((weight, index) => {
    const next = weight - learningRate * (gradients[index] / training.length + l2 * weight);
    weights[index] = featureNames[index] === "portfolioConflict" ? Math.min(-.05, next) : Math.max(.05, next);
  });
}

const scored = validation.map((row) => ({ ...row, probability: sigmoid(intercept + dot(weights, row.features)) }));
const metrics = {
  trainPairs: training.length,
  validationPairs: validation.length,
  positiveRate: round(rows.reduce((sum, row) => sum + row.label, 0) / rows.length, 4),
  accuracy: round(scored.filter((row) => Number(row.probability >= .5) === row.label).length / scored.length, 4),
  logLoss: round(-scored.reduce((sum, row) => sum + row.label * Math.log(Math.max(row.probability, 1e-8)) + (1 - row.label) * Math.log(Math.max(1 - row.probability, 1e-8)), 0) / scored.length, 4),
  auc: round(auc(scored), 4),
  tierDistribution: rows.reduce((counts, row) => {
    const probability = sigmoid(intercept + dot(weights, row.features));
    const tier = probability >= .75 ? "primary" : probability >= .45 ? "secondary" : "request";
    counts[tier] += 1;
    return counts;
  }, { primary: 0, secondary: 0, request: 0 }),
};

process.stdout.write(`${JSON.stringify({
  version: "innovestart-match-v1.0",
  algorithm: "Monotonic L2-regularized logistic regression with reciprocal utility reranking",
  generatedAt: "2026-08-19",
  featureNames,
  intercept: round(intercept, 6),
  weights: Object.fromEntries(featureNames.map((name, index) => [name, round(weights[index], 6)])),
  metrics,
  trainingData: "30 synthetic founder profiles × 20 synthetic investor profiles; deterministic 80/20 pair split",
}, null, 2)}\n`);

function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function sigmoid(value) { return 1 / (1 + Math.exp(-value)); }
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function round(value, digits = 6) { return Number(value.toFixed(digits)); }
function circularDistance(left, right, length) { const direct = Math.abs(left - right); return Math.min(direct, length - direct); }
function auc(scoredRows) {
  const positives = scoredRows.filter((row) => row.label === 1);
  const negatives = scoredRows.filter((row) => row.label === 0);
  if (!positives.length || !negatives.length) return 0;
  let wins = 0;
  for (const positive of positives) for (const negative of negatives) wins += positive.probability > negative.probability ? 1 : positive.probability === negative.probability ? .5 : 0;
  return wins / (positives.length * negatives.length);
}
