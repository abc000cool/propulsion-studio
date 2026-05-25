/** Propellant presets — tune Isp, density, cost, chamber temperature */

export const PROPELLANTS = {
  chemical: [
    { id: 'lox-rp1', name: 'LOX / RP-1', ispVac: 311, ispSl: 282, densityFuel: 820, densityOx: 1140, costFuel: 0.4, costOx: 0.15, Tc: 3670, gamma: 1.22, R: 340 },
    { id: 'lox-lh2', name: 'LOX / LH₂', ispVac: 450, ispSl: 390, densityFuel: 71, densityOx: 1140, costFuel: 6, costOx: 0.15, Tc: 3250, gamma: 1.25, R: 520 },
    { id: 'hypergolic', name: 'N₂O₄ / MMH', ispVac: 320, ispSl: 290, densityFuel: 1030, densityOx: 1450, costFuel: 8, costOx: 5, Tc: 3150, gamma: 1.20, R: 310 },
  ],
  hybrid: [
    { id: 'htpb-n2o', name: 'HTPB / N₂O', ispVac: 290, ispSl: 250, densityFuel: 920, densityOx: 900, costFuel: 0.5, costOx: 0.3, Tc: 2800, gamma: 1.18, R: 330 },
    { id: 'paraffin-lox', name: 'Paraffin / LOX', ispVac: 310, ispSl: 270, densityFuel: 900, densityOx: 1140, costFuel: 0.6, costOx: 0.15, Tc: 3000, gamma: 1.20, R: 340 },
  ],
  ion: [
    { id: 'xenon', name: 'Xenon', isp: 3200, costPerKg: 1200, density: 5.5 },
    { id: 'krypton', name: 'Krypton', isp: 2000, costPerKg: 800, density: 3.75 },
  ],
  hall: [
    { id: 'xenon', name: 'Xenon', isp: 1800, costPerKg: 1200, density: 5.5 },
  ],
  monoprop: [
    { id: 'hydrazine', name: 'Hydrazine', isp: 230, costPerKg: 45, density: 1020 },
    { id: 'green', name: 'Green Monoprop (LMP-103S)', isp: 250, costPerKg: 35, density: 1240 },
  ],
};

export const ENVIRONMENTS = [
  { id: 'vacuum', name: 'Vacuum', ispFactor: 1.0, thrustFactor: 1.0 },
  { id: 'sea-level', name: 'Sea Level', ispFactor: 0.92, thrustFactor: 0.85 },
  { id: 'high-altitude', name: 'High Altitude', ispFactor: 0.97, thrustFactor: 0.95 },
];

export function getPropellants(categoryId) {
  return PROPELLANTS[categoryId] || [];
}

export function getPropellant(categoryId, propellantId) {
  return getPropellants(categoryId).find((p) => p.id === propellantId) || getPropellants(categoryId)[0];
}

export function getEnvironment(envId) {
  return ENVIRONMENTS.find((e) => e.id === envId) || ENVIRONMENTS[0];
}
