import { getComponentCostEstimate, CATEGORY_COST_MULTIPLIER } from '../data/economics.js';
import { getPropellant } from '../data/propellants.js';

export function analyzeCosts(categoryId, components, metrics, options = {}) {
  const { propellantId, propellantCostPerKg } = options;
  const mult = CATEGORY_COST_MULTIPLIER[categoryId] || 1;

  const breakdown = components.map((comp) => {
    const est = getComponentCostEstimate(comp);
    return {
      componentId: comp.id,
      name: comp.name,
      type: comp.type,
      unitCost: Math.round(est.unitCost * mult),
      label: est.label,
    };
  });

  const hardwareCost = breakdown.reduce((s, b) => s + b.unitCost, 0);

  let propellantCost = 0;
  const prop = getPropellant(categoryId, propellantId);
  const propMass = metrics?.propellantMass || 0;

  if (prop && propMass > 0) {
    if (prop.costFuel !== undefined) {
      const fuelMass = propMass * 0.4;
      const oxMass = propMass * 0.6;
      propellantCost = fuelMass * prop.costFuel * 1000 + oxMass * prop.costOx * 1000;
    } else if (prop.costPerKg) {
      propellantCost = propMass * prop.costPerKg;
    }
  }
  if (propellantCostPerKg) propellantCost = propMass * propellantCostPerKg;

  const opsPerBurn = metrics?.operatingCost || hardwareCost * 0.02;
  const totalProgramCost = hardwareCost + propellantCost;
  const costPerNewton = metrics?.thrust > 0 ? totalProgramCost / metrics.thrust : 0;

  return {
    breakdown,
    hardwareCost,
    propellantCost: Math.round(propellantCost),
    totalProgramCost: Math.round(totalProgramCost),
    opsPerBurn: Math.round(opsPerBurn),
    costPerNewton,
    categoryMultiplier: mult,
  };
}

export function formatUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
