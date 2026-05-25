import { MISSIONS, SUITABILITY_LABELS } from '../data/missions.js';
import { formatNum } from './analysis.js';

export function evaluateMissions(categoryId, metrics, validation) {
  if (!metrics) {
    return MISSIONS.map((m) => ({
      mission: m,
      score: 0,
      rating: 'Incompatible',
      label: 'incompatible',
      reason: 'No components in system — cannot evaluate.',
      strengths: [],
      weaknesses: ['Empty architecture'],
      warnings: [],
      recommendations: ['Add components to your propulsion system.'],
    }));
  }

  return MISSIONS.map((mission) => evaluateMission(categoryId, mission, metrics, validation));
}

function evaluateMission(categoryId, mission, metrics, validation) {
  const scores = {
    thrust: scoreThrust(metrics.thrust, mission),
    efficiency: scoreEfficiency(metrics, mission, categoryId),
    power: scorePower(metrics, mission),
    thermal: scoreThermal(metrics.thermalLoad, mission.thermalLimit),
    mass: scoreMass(metrics, mission),
    duration: scoreDuration(metrics.burnDuration, mission),
    category: scoreCategory(categoryId, mission),
    completeness: validation.completeness * 100,
  };

  const weights = {
    thrust: 0.2,
    efficiency: 0.15,
    power: 0.1,
    thermal: 0.1,
    mass: 0.1,
    duration: 0.1,
    category: 0.15,
    completeness: 0.1,
  };

  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += scores[key] * weight;
    weightSum += weight;
  }
  const score = Math.round(total / weightSum);

  const { rating, label } = getRating(score, scores.category, validation);
  const { strengths, weaknesses, warnings, recommendations } = buildMissionFeedback(
    mission, categoryId, metrics, scores, validation
  );

  return {
    mission,
    score,
    rating,
    label,
    scores,
    reason: buildReason(mission, metrics, score, categoryId),
    strengths,
    weaknesses,
    warnings,
    recommendations,
  };
}

function scoreThrust(thrust, mission) {
  if (thrust < mission.minThrust) return Math.max(0, (thrust / mission.minThrust) * 50);
  if (thrust > mission.maxThrust) return 70;
  const mid = (mission.minThrust + Math.min(mission.maxThrust, mission.minThrust * 10)) / 2;
  const ratio = thrust / mid;
  return Math.min(100, 60 + ratio * 40);
}

function scoreEfficiency(metrics, mission, categoryId) {
  if (mission.preferredIsp === 0) return metrics.efficiency * 100;
  if (metrics.isp === 0) return metrics.efficiency * 100;
  const ratio = metrics.isp / mission.preferredIsp;
  return Math.min(100, ratio * 100);
}

function scorePower(metrics, mission) {
  if (mission.powerLimit === Infinity) return 100;
  if (!metrics.powerConsumption) return 100;
  if (metrics.powerConsumption > mission.powerLimit) {
    return Math.max(0, 100 - ((metrics.powerConsumption - mission.powerLimit) / mission.powerLimit) * 100);
  }
  return 100;
}

function scoreThermal(thermalLoad, limit) {
  if (thermalLoad <= limit * 0.7) return 100;
  if (thermalLoad <= limit) return 80;
  return Math.max(0, 100 - ((thermalLoad - limit) / limit) * 80);
}

function scoreMass(metrics, mission) {
  const total = metrics.totalMass + metrics.propellantMass;
  if (mission.id === 'leo-launch' && total > 100000) return 60;
  if (['stationkeeping', 'attitude-control', 'small-sat-maneuver'].includes(mission.id) && total < 500) return 100;
  return 85;
}

function scoreDuration(duration, mission) {
  if (duration >= mission.minDuration && duration <= mission.maxDuration) return 100;
  if (duration < mission.minDuration) return Math.max(0, (duration / mission.minDuration) * 70);
  if (duration > mission.maxDuration) return 90;
  return 75;
}

function scoreCategory(categoryId, mission) {
  if (mission.categories.includes(categoryId)) return 100;
  if (categoryId === 'nuclear' && ['mars-transfer', 'lunar-transfer', 'deep-space'].includes(mission.id)) return 85;
  if (categoryId === 'chemical' && mission.id === 'deep-space') return 30;
  if (['ion', 'hall'].includes(categoryId) && mission.id === 'leo-launch') return 5;
  return 25;
}

function getRating(score, categoryScore, validation) {
  if (!validation.valid) return { rating: 'Incompatible', label: 'incompatible' };
  if (categoryScore < 20) return { rating: 'Incompatible', label: 'incompatible' };
  if (score >= 85) return { rating: 'High', label: 'optimal' };
  if (score >= 70) return { rating: 'Good', label: 'acceptable' };
  if (score >= 50) return { rating: 'Moderate', label: 'inefficient' };
  if (score >= 30) return { rating: 'Low', label: 'mission-limited' };
  return { rating: 'Very Low', label: 'incompatible' };
}

function buildReason(mission, metrics, score, categoryId) {
  if (['ion', 'hall'].includes(categoryId) && mission.id === 'leo-launch') {
    return 'Ion/Hall thrusters cannot provide sufficient thrust for sea-level launch.';
  }
  if (score >= 85) {
    if (metrics.isp > 1500) return 'High specific impulse and low propellant consumption support long-duration missions.';
    if (metrics.thrust > 100000) return 'High thrust output suitable for demanding maneuvers.';
    return 'Architecture parameters align well with mission requirements.';
  }
  if (metrics.thrustToWeight < 1 && mission.environment === 'sea-level') {
    return 'Insufficient thrust-to-weight ratio for launch conditions.';
  }
  if (metrics.expansionRatio > 40 && mission.environment === 'sea-level') {
    return 'Vacuum-optimized nozzle may underperform at sea level.';
  }
  return 'Design partially meets mission requirements with notable tradeoffs.';
}

function buildMissionFeedback(mission, categoryId, metrics, scores, validation) {
  const strengths = [];
  const weaknesses = [];
  const warnings = [];
  const recommendations = [];

  if (scores.category >= 80) strengths.push(`Well-matched propulsion family for ${mission.name}.`);
  else weaknesses.push(`Propulsion category not ideal for ${mission.name}.`);

  if (scores.thrust >= 80) strengths.push(`Thrust (${formatNum(metrics.thrust)} N) adequate for mission.`);
  else if (scores.thrust < 50) {
    weaknesses.push('Thrust below mission requirements.');
    recommendations.push('Increase chamber pressure, throat area, or propellant flow.');
  }

  if (metrics.isp > 0 && scores.efficiency >= 80) strengths.push(`High Isp (${formatNum(metrics.isp)} s) improves mission efficiency.`);
  if (metrics.isp > 0 && scores.efficiency < 50) {
    weaknesses.push('Specific impulse below mission preference.');
    recommendations.push('Optimize nozzle expansion ratio or propellant selection.');
  }

  if (scores.power < 60) {
    warnings.push('Power requirements may exceed mission power budget.');
    recommendations.push('Add solar array capacity or reduce flow rate.');
  }

  if (scores.thermal < 70) {
    warnings.push('Thermal load approaching or exceeding safe limits.');
    recommendations.push('Improve cooling system or reduce operating temperature.');
  }

  if (!validation.valid) {
    warnings.push('Architecture has compatibility errors that must be resolved.');
    recommendations.push('Add missing required components.');
  }

  if (metrics.thrust < mission.minThrust && mission.minThrust > 1000) {
    warnings.push(`Mission requires at least ${formatNum(mission.minThrust)} N thrust.`);
  }

  if (['ion', 'hall'].includes(categoryId) && metrics.thrust < 1 && ['lunar-transfer', 'mars-transfer'].includes(mission.id)) {
    warnings.push('Low thrust may make departure from gravity well impractical.');
  }

  return { strengths, weaknesses, warnings, recommendations };
}

export function getSuitabilityStyle(label) {
  return SUITABILITY_LABELS[label] || SUITABILITY_LABELS.acceptable;
}
