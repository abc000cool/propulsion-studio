import { REQUIRED_COMPONENTS, THRUST_COMPONENTS } from '../data/components.js';
import { getPropellant, getEnvironment } from '../data/propellants.js';
import { validateTopology } from './topology.js';
import { analyzeCosts } from './costs.js';
import { getWarningHelp } from '../data/warningHelp.js';

export function validateSystem(categoryId, components) {
  const warnings = [];
  const errors = [];
  const types = components.map((c) => c.type);

  const required = REQUIRED_COMPONENTS[categoryId] || [];
  for (const req of required) {
    if (!types.includes(req)) {
      errors.push({
        level: 'error',
        category: 'incompatible',
        message: `Missing required component: ${req.replace(/-/g, ' ')}.`,
      });
    }
  }

  const thrustParts = THRUST_COMPONENTS[categoryId] || [];
  const hasThrust = thrustParts.some((t) => types.includes(t));
  if (components.length > 0 && !hasThrust) {
    errors.push({
      level: 'error',
      category: 'incompatible',
      message: 'This architecture is missing a thrust-producing component.',
    });
  }

  if (['ion', 'hall'].includes(categoryId) && !types.includes('power-source')) {
    errors.push({
      level: 'error',
      category: 'power-limited',
      message: 'Electric propulsion requires a power source.',
    });
  }

  if (categoryId === 'airbreathing') {
    if (!types.includes('inlet')) {
      warnings.push({
        level: 'warning',
        category: 'incompatible',
        message: 'Airbreathing engine missing inlet — cannot ingest atmospheric air.',
      });
    }
  }

  if (categoryId === 'chemical') {
    const hasFuel = types.includes('fuel-tank');
    const hasOx = types.includes('oxidizer-tank');
    if (hasFuel && !hasOx) {
      warnings.push({ level: 'warning', category: 'incompatible', message: 'Fuel tank present but no oxidizer tank.' });
    }
    if (hasOx && !hasFuel) {
      warnings.push({ level: 'warning', category: 'incompatible', message: 'Oxidizer tank present but no fuel tank.' });
    }
  }

  for (const comp of components) {
    for (const p of comp.params) {
      if (p.value < p.min || p.value > p.max) {
        warnings.push({
          level: 'warning',
          category: 'overstressed',
          message: `${comp.name}: ${p.label} is outside valid range (${p.min}–${p.max} ${p.unit}).`,
          componentId: comp.id,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    completeness: required.length > 0 ? types.filter((t) => required.includes(t)).length / required.length : 1,
  };
}

function getParam(comp, key, fallback = 0) {
  const p = comp?.params?.find((x) => x.key === key);
  return p ? Number(p.value) : fallback;
}

export function analyzeSystem(categoryId, components, options = {}) {
  const { connections = [], propellantId, environmentId = 'vacuum' } = options;
  const validation = validateSystem(categoryId, components);
  const topology = validateTopology(categoryId, components, connections);

  validation.errors.push(...topology.errors);
  validation.warnings.push(...topology.warnings);
  validation.valid = validation.errors.length === 0;
  validation.topologyScore = topology.topologyScore;

  if (components.length === 0) {
    return {
      validation,
      metrics: null,
      costs: null,
      feedback: [{ level: 'info', category: 'incompatible', message: 'Add components to begin analysis.', help: getWarningHelp('incompatible') }],
    };
  }

  const env = getEnvironment(environmentId);
  const prop = getPropellant(categoryId, propellantId);

  const analyzers = {
    chemical: analyzeChemical,
    ion: analyzeIon,
    hall: analyzeHall,
    nuclear: analyzeNuclear,
    airbreathing: analyzeAirbreathing,
    solid: analyzeSolid,
    hybrid: analyzeHybrid,
    'cold-gas': analyzeColdGas,
    monoprop: analyzeMonoprop,
  };

  let metrics = (analyzers[categoryId] || analyzeGeneric)(components, { prop, env, topology });

  if (metrics && topology.pathComplete && topology.topologyScore > 0.5) {
    metrics.efficiency = Math.min(0.99, metrics.efficiency * (1 + topology.topologyScore * 0.05));
  } else if (metrics && connections.length > 0 && topology.topologyScore < 0.5) {
    metrics.efficiency *= 0.85;
  }

  const costs = analyzeCosts(categoryId, components, metrics, { propellantId: prop?.id });

  const rawFeedback = [
    ...validation.errors,
    ...validation.warnings,
    ...generateFeedback(categoryId, metrics, env),
  ];
  const feedback = rawFeedback.map((f) => ({ ...f, help: getWarningHelp(f.category, f.message) }));

  return { validation, metrics, costs, feedback };
}

function analyzeChemical(components, ctx = {}) {
  const chamber = components.find((c) => c.type === 'combustion-chamber');
  const nozzle = components.find((c) => c.type === 'nozzle');
  const throttle = components.find((c) => c.type === 'throttle-valve');
  const prop = ctx.prop;
  const env = ctx.env || { ispFactor: 1, thrustFactor: 1 };

  const Pc = getParam(chamber, 'pressure', 9.7) * 1e6;
  const Tc = prop?.Tc ?? getParam(chamber, 'temperature', 3500);
  const At = getParam(nozzle, 'throatArea', 0.008);
  const eps = getParam(nozzle, 'expansionRatio', 40);
  const nozzleEff = getParam(nozzle, 'efficiency', 0.98);
  const throttlePct = throttle ? getParam(throttle, 'throttle', 100) / 100 : 1;

  const gamma = prop?.gamma ?? 1.2;
  const R = prop?.R ?? 350;
  const cStar = Math.sqrt((R * Tc) / gamma) * Math.pow((gamma + 1) / 2, (gamma + 1) / (2 * (gamma - 1)));
  const mdot = ((Pc * At) / cStar) * throttlePct;
  const ispVac = prop?.ispVac ?? 310;
  const ispSl = prop?.ispSl ?? 280;
  const ispBase = env.id === 'sea-level' ? ispSl : ispVac;
  const Ve = ispBase * 9.80665 * env.ispFactor;
  const thrust = mdot * Ve * nozzleEff * env.thrustFactor;
  const isp = thrust / (mdot * 9.80665) || ispBase;

  let totalMass = components.reduce((s, c) => {
    if (c.type.includes('tank')) return s + getParam(c, 'capacity', 0) * 0.05;
    if (c.type === 'cooling-jacket') return s + getParam(c, 'mass', 120);
    if (c.type === 'pressurization') return s + getParam(c, 'mass', 45);
    return s + 50;
  }, 0);

  const fuelMass = getParam(components.find((c) => c.type === 'fuel-tank'), 'capacity', 5000);
  const oxMass = getParam(components.find((c) => c.type === 'oxidizer-tank'), 'capacity', 8000);
  const propMass = fuelMass + oxMass;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 1));

  const cooling = components.find((c) => c.type === 'cooling-jacket');
  const coolingEff = cooling ? getParam(cooling, 'effectiveness', 0.85) : 0.5;
  const thermalLoad = Tc * (1 - coolingEff);

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: Ve,
    chamberPressure: Pc / 1e6,
    chamberTemperature: Tc,
    totalMass,
    propellantMass: propMass,
    deltaV,
    thermalLoad,
    powerConsumption: getParam(components.find((c) => c.type === 'turbopump'), 'power', 0) * 1000,
    efficiency: nozzleEff * 0.95,
    burnDuration: propMass / Math.max(mdot, 0.001),
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 1) * 9.80665),
    expansionRatio: eps,
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust),
  };
}

function analyzeIon(components, ctx = {}) {
  const prop = ctx.prop;
  const grids = components.find((c) => c.type === 'accelerator-grids');
  const flow = components.find((c) => c.type === 'flow-controller');
  const power = components.find((c) => c.type === 'power-source');
  const ppu = components.find((c) => c.type === 'ppu');
  const tank = components.find((c) => c.type === 'propellant-tank');

  const voltage = getParam(grids, 'voltage', 1200);
  const flowRate = getParam(flow, 'flowRate', 0.5) / 1000;
  const ppuEff = getParam(ppu, 'efficiency', 0.92);
  const powerAvail = getParam(power, 'powerAvailable', 3000);
  const propMass = getParam(tank, 'capacity', 50);

  const isp = prop?.isp ?? (2800 + voltage * 0.35);
  const exhaustVel = isp * 9.80665;
  const mdot = flowRate;
  const thrust = mdot * exhaustVel * 0.65;
  const powerNeeded = (0.5 * mdot * exhaustVel * exhaustVel) / (ppuEff * 0.5);
  const thermalLoad = powerNeeded * 0.15;
  const totalMass = components.length * 8 + propMass * 0.1;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 0.1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    powerConsumption: powerNeeded,
    powerAvailable: powerAvail,
    thermalLoad,
    totalMass,
    propellantMass: propMass,
    deltaV,
    efficiency: 0.65,
    burnDuration: propMass / Math.max(mdot, 1e-9),
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 0.1) * 9.80665),
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust * 1000),
  };
}

function analyzeHall(components) {
  const channel = components.find((c) => c.type === 'discharge-channel');
  const flow = components.find((c) => c.type === 'flow-controller');
  const power = components.find((c) => c.type === 'power-source');
  const ppu = components.find((c) => c.type === 'ppu');
  const tank = components.find((c) => c.type === 'propellant-tank');
  const magnet = components.find((c) => c.type === 'magnetic-circuit');

  const flowRate = getParam(flow, 'flowRate', 3) / 1000;
  const anodeV = getParam(components.find((c) => c.type === 'anode'), 'voltage', 300);
  const ppuEff = getParam(ppu, 'efficiency', 0.9);
  const powerAvail = getParam(power, 'powerAvailable', 2000);
  const propMass = getParam(tank, 'capacity', 30);
  const fieldStrength = getParam(magnet, 'fieldStrength', 150);

  const isp = 1500 + anodeV * 2 + fieldStrength * 0.5;
  const exhaustVel = isp * 9.80665;
  const mdot = flowRate;
  const thrust = mdot * exhaustVel * 0.55;
  const powerNeeded = (thrust * exhaustVel) / (2 * ppuEff);
  const thermalLoad = powerNeeded * 0.25 + getParam(channel, 'diameter', 80) * 0.5;
  const totalMass = components.length * 6 + getParam(magnet, 'mass', 4) + propMass * 0.1;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 0.1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    powerConsumption: powerNeeded,
    powerAvailable: powerAvail,
    thermalLoad,
    totalMass,
    propellantMass: propMass,
    deltaV,
    efficiency: 0.55,
    burnDuration: propMass / Math.max(mdot, 1e-9),
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 0.1) * 9.80665),
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust * 1000),
  };
}

function analyzeNuclear(components) {
  const core = components.find((c) => c.type === 'reactor-core');
  const feed = components.find((c) => c.type === 'propellant-feed');
  const nozzle = components.find((c) => c.type === 'nozzle');
  const shield = components.find((c) => c.type === 'thermal-shield');

  const thermalPower = getParam(core, 'power', 500) * 1e6;
  const mdot = getParam(feed, 'flowRate', 8);
  const eps = getParam(nozzle, 'expansionRatio', 100);
  const shieldMass = getParam(shield, 'shieldMass', 1500);
  const coreMass = getParam(core, 'mass', 3000);

  const isp = 850 + eps * 0.5;
  const exhaustVel = isp * 9.80665;
  const thrust = mdot * exhaustVel * 0.85;
  const Tc = 2800;
  const thermalLoad = thermalPower * 0.02;
  const totalMass = coreMass + shieldMass + components.length * 200;
  const propMass = mdot * 3600 * 24;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    chamberTemperature: Tc,
    thermalLoad,
    totalMass,
    propellantMass: propMass,
    deltaV,
    powerConsumption: 0,
    efficiency: 0.85,
    burnDuration: 86400,
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 1) * 9.80665),
    expansionRatio: eps,
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust) * 5,
  };
}

function analyzeAirbreathing(components) {
  const inlet = components.find((c) => c.type === 'inlet');
  const combustor = components.find((c) => c.type === 'combustor');
  const compressor = components.find((c) => c.type === 'compressor');
  const nozzle = components.find((c) => c.type === 'nozzle');
  const afterburner = components.find((c) => c.type === 'afterburner');

  const captureArea = getParam(inlet, 'captureArea', 1.2);
  const compEff = compressor ? getParam(compressor, 'efficiency', 0.88) : 0.7;
  const fuelFlow = getParam(combustor, 'fuelFlow', 0.8);
  const exitTemp = getParam(combustor, 'temperature', 1600);
  const eps = getParam(nozzle, 'expansionRatio', 5);
  const abEnabled = getParam(afterburner, 'enabled', 0);
  const abBoost = getParam(afterburner, 'thrustBoost', 40) / 100;

  const airSpeed = 250;
  const rho = 1.225;
  const mdotAir = rho * captureArea * airSpeed * getParam(inlet, 'pressureRecovery', 0.92);
  const mdot = mdotAir + fuelFlow;
  const thrust = mdotAir * airSpeed * 2 * compEff + fuelFlow * 43000;
  const adjustedThrust = abEnabled ? thrust * (1 + abBoost) : thrust;
  const thermalLoad = exitTemp * 0.3;
  const totalMass = components.length * 150 + captureArea * 200;

  return {
    thrust: adjustedThrust,
    isp: 0,
    mdot,
    exhaustVelocity: adjustedThrust / Math.max(mdot, 0.01),
    thermalLoad,
    totalMass,
    propellantMass: fuelFlow * 3600,
    deltaV: 0,
    powerConsumption: 0,
    efficiency: compEff * 0.9,
    burnDuration: 7200,
    thrustToWeight: adjustedThrust / (Math.max(totalMass, 1) * 9.80665),
    expansionRatio: eps,
    complexity: components.length,
    operatingCost: estimateCost(components.length, adjustedThrust),
  };
}

function analyzeSolid(components) {
  const grain = components.find((c) => c.type === 'propellant-grain');
  const nozzle = components.find((c) => c.type === 'nozzle');
  const casing = components.find((c) => c.type === 'casing');

  const propMass = getParam(grain, 'mass', 50000);
  const isp = getParam(grain, 'isp', 265);
  const casingMass = getParam(casing, 'mass', 5000);
  const burnTime = 120;

  const mdot = propMass / burnTime;
  const exhaustVel = isp * 9.80665;
  const thrust = mdot * exhaustVel * 0.96;
  const totalMass = casingMass + components.length * 100;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    thermalLoad: 3200,
    totalMass,
    propellantMass: propMass,
    deltaV,
    powerConsumption: 0,
    efficiency: 0.96,
    burnDuration: burnTime,
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 1) * 9.80665),
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust),
  };
}

function analyzeHybrid(components, ctx = {}) {
  const chamber = components.find((c) => c.type === 'combustion-chamber');
  const nozzle = components.find((c) => c.type === 'nozzle');
  const injector = components.find((c) => c.type === 'injector');
  const fuel = components.find((c) => c.type === 'fuel-grain');
  const oxTank = components.find((c) => c.type === 'oxidizer-tank');
  const prop = ctx.prop;
  const env = ctx.env || { thrustFactor: 1 };

  const Pc = getParam(chamber, 'pressure', 3) * 1e6;
  const oxFlow = getParam(injector, 'flowRate', 2);
  const fuelMass = getParam(fuel, 'mass', 2000);
  const oxMass = getParam(oxTank, 'capacity', 3000);
  const eps = getParam(nozzle, 'expansionRatio', 20);
  const At = getParam(nozzle, 'throatArea', 0.02);

  const isp = (prop?.ispVac ?? 290) + eps * 0.15;
  const mdot = Math.min(oxFlow * 1.2, (Pc * At) / 1200);
  const exhaustVel = isp * 9.80665;
  const thrust = mdot * exhaustVel * 0.92 * env.thrustFactor;
  const propMass = fuelMass + oxMass;
  const totalMass = components.length * 80 + fuelMass * 0.1;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    chamberPressure: Pc / 1e6,
    thermalLoad: 2800,
    totalMass,
    propellantMass: propMass,
    deltaV,
    powerConsumption: 0,
    efficiency: 0.92,
    burnDuration: propMass / Math.max(mdot, 0.001),
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 1) * 9.80665),
    expansionRatio: eps,
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust),
  };
}

function analyzeColdGas(components) {
  const tank = components.find((c) => c.type === 'gas-tank');
  const valve = components.find((c) => c.type === 'valve');
  const nozzle = components.find((c) => c.type === 'nozzle');

  const gasMass = getParam(tank, 'capacity', 5);
  const pressure = getParam(tank, 'pressure', 20) * 1e6;
  const flowRate = getParam(valve, 'flowRate', 0.05);

  const isp = 50;
  const mdot = flowRate;
  const exhaustVel = isp * 9.80665;
  const thrust = mdot * exhaustVel;
  const totalMass = gasMass * 0.3 + 2;
  const deltaV = isp * 9.80665 * Math.log((totalMass + gasMass) / Math.max(totalMass, 0.01));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    chamberPressure: pressure / 1e6,
    thermalLoad: 50,
    totalMass,
    propellantMass: gasMass,
    deltaV,
    powerConsumption: 0,
    efficiency: 0.4,
    burnDuration: gasMass / Math.max(mdot, 0.0001),
    thrustToWeight: thrust / (Math.max(totalMass + gasMass, 0.01) * 9.80665),
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust),
  };
}

function analyzeMonoprop(components, ctx = {}) {
  const prop = ctx.prop;
  const tank = components.find((c) => c.type === 'propellant-tank');
  const catalyst = components.find((c) => c.type === 'catalyst-bed');
  const valve = components.find((c) => c.type === 'valve-system');
  const nozzle = components.find((c) => c.type === 'nozzle');

  const propMass = getParam(tank, 'capacity', 200);
  const catEff = getParam(catalyst, 'efficiency', 0.98);
  const flowRate = getParam(valve, 'flowRate', 0.2);
  const eps = getParam(nozzle, 'expansionRatio', 50);

  const isp = (prop?.isp ?? 230) + eps * 0.15;
  const mdot = flowRate;
  const exhaustVel = isp * 9.80665;
  const thrust = mdot * exhaustVel * catEff;
  const totalMass = components.length * 5 + propMass * 0.05;
  const deltaV = isp * 9.80665 * Math.log((totalMass + propMass) / Math.max(totalMass, 0.1));

  return {
    thrust,
    isp,
    mdot,
    exhaustVelocity: exhaustVel,
    thermalLoad: 800,
    totalMass,
    propellantMass: propMass,
    deltaV,
    powerConsumption: 0,
    efficiency: catEff * 0.9,
    burnDuration: propMass / Math.max(mdot, 0.001),
    thrustToWeight: thrust / (Math.max(totalMass + propMass, 0.1) * 9.80665),
    expansionRatio: eps,
    complexity: components.length,
    operatingCost: estimateCost(components.length, thrust),
  };
}

function analyzeGeneric(components) {
  return {
    thrust: 1000,
    isp: 300,
    mdot: 1,
    totalMass: components.length * 50,
    propellantMass: 1000,
    deltaV: 5000,
    thermalLoad: 1000,
    powerConsumption: 0,
    efficiency: 0.8,
    burnDuration: 100,
    thrustToWeight: 0.1,
    complexity: components.length,
    operatingCost: 1000,
  };
}

function estimateCost(complexity, thrust) {
  return Math.round(complexity * 5000 + Math.log10(Math.max(thrust, 1)) * 10000);
}

function generateFeedback(categoryId, metrics, env) {
  const fb = [];
  if (!metrics) return fb;

  if (metrics.thrustToWeight < 1 && ['chemical', 'solid', 'hybrid'].includes(categoryId)) {
    fb.push({
      level: 'warning',
      category: 'undersized',
      message: 'Thrust-to-weight ratio below 1 — insufficient for launch from gravity well.',
    });
  }

  if (metrics.expansionRatio > 40 && categoryId === 'chemical') {
    fb.push({
      level: 'warning',
      category: 'mission-limited',
      message: 'High expansion ratio suggests vacuum optimization — may underperform at sea level.',
    });
  }
  if (env?.id === 'sea-level' && metrics.expansionRatio > 25) {
    fb.push({
      level: 'warning',
      category: 'mission-limited',
      message: 'Sea-level environment selected with high expansion ratio — expect thrust loss.',
    });
  }

  if (metrics.powerAvailable && metrics.powerConsumption > metrics.powerAvailable) {
    fb.push({
      level: 'warning',
      category: 'power-limited',
      message: `Power draw (${formatNum(metrics.powerConsumption)} W) exceeds available power (${formatNum(metrics.powerAvailable)} W).`,
    });
  }

  if (metrics.thermalLoad > 3000) {
    fb.push({
      level: 'warning',
      category: 'thermal-risk',
      message: 'Elevated thermal load — verify cooling system capacity.',
    });
  }

  if (metrics.efficiency < 0.5) {
    fb.push({
      level: 'warning',
      category: 'inefficient',
      message: 'System efficiency is below optimal range for this propulsion family.',
    });
  }

  if (metrics.deltaV > 10000) {
    fb.push({
      level: 'info',
      category: 'optimal',
      message: 'High delta-v capability — well suited for deep-space or extended missions.',
    });
  }

  return fb;
}

export function formatNum(n, decimals = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + ' M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + ' k';
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(decimals);
  return n.toFixed(decimals);
}

export function formatMetric(key, value) {
  const units = {
    thrust: 'N',
    isp: 's',
    mdot: 'kg/s',
    exhaustVelocity: 'm/s',
    chamberPressure: 'MPa',
    chamberTemperature: 'K',
    totalMass: 'kg',
    propellantMass: 'kg',
    deltaV: 'm/s',
    thermalLoad: 'K·MW',
    powerConsumption: 'W',
    powerAvailable: 'W',
    efficiency: '',
    burnDuration: 's',
    thrustToWeight: '',
    expansionRatio: '',
    complexity: ' parts',
    operatingCost: ' USD',
  };
  const unit = units[key] || '';
  if (key === 'efficiency' || key === 'thrustToWeight') return formatNum(value, 3);
  if (key === 'burnDuration') {
    if (value > 86400) return formatNum(value / 86400, 1) + ' days';
    if (value > 3600) return formatNum(value / 3600, 1) + ' hr';
    return formatNum(value, 0) + ' s';
  }
  if (key === 'operatingCost') return '$' + formatNum(value, 0);
  return formatNum(value) + (unit ? ' ' + unit : '');
}

export const METRIC_LABELS = {
  thrust: 'Thrust',
  isp: 'Specific Impulse',
  mdot: 'Mass Flow Rate',
  exhaustVelocity: 'Exhaust Velocity',
  chamberPressure: 'Chamber Pressure',
  chamberTemperature: 'Chamber Temperature',
  totalMass: 'Dry Mass',
  propellantMass: 'Propellant Mass',
  deltaV: 'Delta-V',
  thermalLoad: 'Thermal Load',
  powerConsumption: 'Power Draw',
  powerAvailable: 'Power Available',
  efficiency: 'Efficiency',
  burnDuration: 'Burn Duration',
  thrustToWeight: 'Thrust/Weight',
  expansionRatio: 'Expansion Ratio',
  complexity: 'Complexity',
  operatingCost: 'Est. Operating Cost',
};
