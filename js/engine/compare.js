import { formatMetric, METRIC_LABELS } from './analysis.js';

const COMPARE_KEYS = [
  'thrust', 'isp', 'deltaV', 'totalMass', 'propellantMass',
  'efficiency', 'powerConsumption', 'thermalLoad', 'burnDuration',
  'thrustToWeight', 'complexity', 'operatingCost',
];

export function compareSystems(systemA, systemB) {
  const metricsA = systemA.computedMetrics;
  const metricsB = systemB.computedMetrics;

  if (!metricsA || !metricsB) {
    return {
      metricsCompared: [],
      summary: ['One or both designs lack computed metrics. Complete both architectures first.'],
      winner: null,
    };
  }

  const metricsCompared = COMPARE_KEYS.map((key) => {
    const a = metricsA[key] ?? 0;
    const b = metricsB[key] ?? 0;
    const higherIsBetter = !['totalMass', 'propellantMass', 'powerConsumption', 'thermalLoad', 'complexity', 'operatingCost'].includes(key);
    const delta = b - a;
    const pctChange = a !== 0 ? ((delta / a) * 100) : 0;
    let better = 'tie';
    if (Math.abs(delta) > 0.001) {
      better = higherIsBetter ? (a > b ? 'A' : 'B') : (a < b ? 'A' : 'B');
    }
    return {
      key,
      label: METRIC_LABELS[key] || key,
      valueA: formatMetric(key, a),
      valueB: formatMetric(key, b),
      rawA: a,
      rawB: b,
      delta,
      pctChange,
      better,
    };
  });

  const summary = generateComparisonSummary(systemA, systemB, metricsCompared);
  const winner = determineWinner(systemA, systemB, metricsCompared);

  return { metricsCompared, summary, winner };
}

function generateComparisonSummary(systemA, systemB, metrics) {
  const lines = [];
  const nameA = systemA.name || 'Design A';
  const nameB = systemB.name || 'Design B';

  const thrust = metrics.find((m) => m.key === 'thrust');
  if (thrust && thrust.better !== 'tie') {
    const winner = thrust.better === 'A' ? nameA : nameB;
    lines.push(`${winner} delivers higher thrust — better for high-thrust maneuvers.`);
  }

  const isp = metrics.find((m) => m.key === 'isp');
  if (isp && isp.rawA > 0 && isp.rawB > 0 && isp.better !== 'tie') {
    const winner = isp.better === 'A' ? nameA : nameB;
    lines.push(`${winner} has higher specific impulse — better for long-duration orbital missions.`);
  }

  const thermal = metrics.find((m) => m.key === 'thermalLoad');
  if (thermal && thermal.better !== 'tie') {
    const higher = thermal.better === 'A' ? nameB : nameA;
    lines.push(`${higher} has lower thermal load.`);
  }

  const power = metrics.find((m) => m.key === 'powerConsumption');
  if (power && power.rawA > 0 && power.rawB > 0 && power.better !== 'tie') {
    const higher = power.better === 'A' ? nameB : nameA;
    lines.push(`${higher} requires less electrical power.`);
  }

  const mass = metrics.find((m) => m.key === 'totalMass');
  if (mass && mass.better !== 'tie') {
    const winner = mass.better === 'A' ? nameA : nameB;
    lines.push(`${winner} is more mass-efficient.`);
  }

  const cost = metrics.find((m) => m.key === 'operatingCost');
  if (cost && cost.better !== 'tie') {
    const winner = cost.better === 'A' ? nameA : nameB;
    lines.push(`${winner} has lower estimated operating cost.`);
  }

  if (lines.length === 0) {
    lines.push('Both designs perform similarly across key metrics.');
  }

  return lines;
}

function determineWinner(systemA, systemB, metrics) {
  let scoreA = 0;
  let scoreB = 0;
  for (const m of metrics) {
    if (m.better === 'A') scoreA++;
    else if (m.better === 'B') scoreB++;
  }

  const missionA = systemA.missionScores?.reduce((s, m) => s + m.score, 0) || 0;
  const missionB = systemB.missionScores?.reduce((s, m) => s + m.score, 0) || 0;

  if (scoreA > scoreB && missionA >= missionB) return 'A';
  if (scoreB > scoreA && missionB >= missionA) return 'B';
  if (missionA > missionB) return 'A';
  if (missionB > missionA) return 'B';
  return scoreA >= scoreB ? 'A' : 'B';
}
