/** Component unit costs (USD, design-level estimates) and category multipliers */

export const COMPONENT_UNIT_COST = {
  'fuel-tank': { base: 80000, perKgCapacity: 12, label: 'Fuel tank fabrication' },
  'oxidizer-tank': { base: 95000, perKgCapacity: 14, label: 'Oxidizer tank fabrication' },
  'pressurization': { base: 45000, perKg: 0, label: 'Pressurization system' },
  'turbopump': { base: 2500000, perKw: 80, label: 'Turbomachinery' },
  'feed-lines': { base: 25000, perM: 3000, label: 'Feed plumbing' },
  'injector': { base: 120000, label: 'Injector plate' },
  'combustion-chamber': { base: 350000, label: 'Chamber assembly' },
  'cooling-jacket': { base: 85000, label: 'Regenerative cooling' },
  'nozzle': { base: 180000, perM2Throat: 500000, label: 'Nozzle extension' },
  'throttle-valve': { base: 65000, label: 'Throttle valve' },
  'guidance': { base: 40000, label: 'Gimbal / avionics interface' },
  'propellant-tank': { base: 15000, perKgCapacity: 25, label: 'Propellant tank' },
  'flow-controller': { base: 8000, label: 'Flow control' },
  'ionization-chamber': { base: 45000, label: 'Ionization chamber' },
  'accelerator-grids': { base: 55000, label: 'Grid optics' },
  'neutralizer': { base: 12000, label: 'Neutralizer cathode' },
  'ppu': { base: 35000, label: 'Power processing unit' },
  'power-source': { base: 120000, perKw: 450, label: 'Solar array / power' },
  'magnetic-circuit': { base: 22000, label: 'Magnetic circuit' },
  'discharge-channel': { base: 38000, label: 'Discharge channel' },
  'anode': { base: 8000, label: 'Anode' },
  'cathode': { base: 10000, label: 'Cathode' },
  'reactor-core': { base: 800000000, label: 'Reactor core (development cost proxy)' },
  'fuel-elements': { base: 50000000, label: 'Fuel elements' },
  'propellant-feed': { base: 120000, label: 'Propellant feed' },
  'thermal-shield': { base: 200000, perKg: 150, label: 'Radiation shielding' },
  'control-systems': { base: 80000, label: 'Reactor controls' },
  'inlet': { base: 95000, label: 'Inlet duct' },
  'compressor': { base: 450000, label: 'Compressor stage' },
  'combustor': { base: 180000, label: 'Combustor' },
  'turbine': { base: 320000, label: 'Turbine stage' },
  'afterburner': { base: 75000, label: 'Afterburner' },
  'propellant-grain': { base: 500000, perKg: 8, label: 'Propellant grain' },
  'casing': { base: 200000, perKg: 15, label: 'Motor casing' },
  'ignition': { base: 15000, label: 'Ignition system' },
  'insulation': { base: 35000, label: 'Insulation' },
  'fuel-grain': { base: 80000, perKg: 6, label: 'Fuel grain' },
  'gas-tank': { base: 5000, label: 'Pressurized gas tank' },
  'valve': { base: 3000, label: 'Valve' },
  'catalyst-bed': { base: 18000, label: 'Catalyst bed' },
  'valve-system': { base: 12000, label: 'Valve system' },
};

export const CATEGORY_COST_MULTIPLIER = {
  chemical: 1,
  ion: 1.4,
  hall: 1.2,
  nuclear: 3.5,
  airbreathing: 0.9,
  solid: 0.7,
  hybrid: 0.85,
  'cold-gas': 0.3,
  monoprop: 0.5,
};

export function getComponentCostEstimate(comp) {
  const cfg = COMPONENT_UNIT_COST[comp.type];
  if (!cfg) return { unitCost: 10000, label: comp.name };

  let cost = cfg.base || 10000;
  const getP = (k, d = 0) => Number(comp.params?.find((x) => x.key === k)?.value ?? d);

  if (cfg.perKgCapacity) cost += getP('capacity', 0) * cfg.perKgCapacity;
  if (cfg.perKg) cost += getP('mass', getP('capacity', 0)) * cfg.perKg;
  if (cfg.perKw) cost += getP('power', getP('powerAvailable', 0) / 1000) * cfg.perKw;
  if (cfg.perM) cost += getP('length', 1) * cfg.perM;
  if (cfg.perM2Throat) cost += getP('throatArea', 0.01) * cfg.perM2Throat;

  return { unitCost: Math.round(cost), label: cfg.label || comp.name };
}
