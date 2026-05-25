import { analyzeSystem, formatMetric } from '../engine/analysis.js';
import { evaluateMissions } from '../engine/missions.js';
import { compareSystems } from '../engine/compare.js';
import { createComponentInstance } from '../data/components.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('\nPropulsion Studio — Validation Tests\n');

// Chemical rocket analysis
console.log('Chemical Rocket:');
const chemComponents = [
  createComponentInstance('chemical', 'fuel-tank', 0, 0),
  createComponentInstance('chemical', 'oxidizer-tank', 0, 100),
  createComponentInstance('chemical', 'combustion-chamber', 200, 50),
  createComponentInstance('chemical', 'nozzle', 400, 50),
].filter(Boolean);

const chemAnalysis = analyzeSystem('chemical', chemComponents, { connections: [], propellantId: 'lox-rp1', environmentId: 'vacuum' });
assert(chemAnalysis.metrics !== null, 'Produces metrics');
assert(chemAnalysis.metrics.thrust > 0, `Thrust > 0 (${formatMetric('thrust', chemAnalysis.metrics.thrust)})`);
assert(chemAnalysis.metrics.isp > 200, `Isp > 200s (${formatMetric('isp', chemAnalysis.metrics.isp)})`);
assert(chemAnalysis.metrics.deltaV > 0, 'Delta-v > 0');
assert(chemAnalysis.validation.valid, 'Valid chemical architecture');

// Missing nozzle
console.log('\nValidation — missing nozzle:');
const incomplete = [createComponentInstance('chemical', 'combustion-chamber', 0, 0)].filter(Boolean);
const incompleteAnalysis = analyzeSystem('chemical', incomplete, { connections: [] });
assert(!incompleteAnalysis.validation.valid, 'Invalid without nozzle');
assert(incompleteAnalysis.validation.errors.length > 0, 'Has error messages');

// Ion thruster
console.log('\nIon Propulsion:');
const ionComponents = [
  createComponentInstance('ion', 'propellant-tank', 0, 0),
  createComponentInstance('ion', 'flow-controller', 100, 0),
  createComponentInstance('ion', 'ionization-chamber', 200, 0),
  createComponentInstance('ion', 'accelerator-grids', 300, 0),
  createComponentInstance('ion', 'power-source', 100, 100),
].filter(Boolean);
const ionAnalysis = analyzeSystem('ion', ionComponents, { connections: [], propellantId: 'xenon' });
assert(ionAnalysis.metrics.isp > 2000, `High Isp (${formatMetric('isp', ionAnalysis.metrics.isp)})`);
assert(ionAnalysis.metrics.thrust > 0 && ionAnalysis.metrics.thrust < 100, 'Low thrust relative to chemical rockets');

// Mission evaluation
console.log('\nMission Suitability:');
const missions = evaluateMissions('ion', ionAnalysis.metrics, ionAnalysis.validation);
const deepSpace = missions.find((m) => m.mission.id === 'deep-space');
const leoLaunch = missions.find((m) => m.mission.id === 'leo-launch');
assert(deepSpace.score > leoLaunch.score, `Deep space (${deepSpace.score}) > LEO launch (${leoLaunch.score})`);

// Compare
console.log('\nCompare Systems:');
const systemA = {
  name: 'Design A',
  computedMetrics: chemAnalysis.metrics,
  missionScores: missions,
};
const systemB = {
  name: 'Design B',
  computedMetrics: ionAnalysis.metrics,
  missionScores: missions,
};
const comparison = compareSystems(systemA, systemB);
assert(comparison.metricsCompared.length > 0, 'Comparison metrics generated');
assert(comparison.summary.length > 0, 'Comparison summary generated');

// Auto-layout connections for all categories
console.log('\nArrange Diagram — logical connections:');
import { buildLogicalConnections, computeSmartLayout, validateTopology } from '../engine/topology.js';
import { CATEGORIES } from '../data/categories.js';
import { getTemplatesForCategory } from '../data/templates.js';

for (const cat of CATEGORIES) {
  const template = getTemplatesForCategory(cat.id)[0];
  if (!template) continue;
  const components = template.components.map((t, i) => ({
    id: `c-${i}`,
    type: t.type,
    name: t.type,
    icon: '•',
    x: t.x,
    y: t.y,
    params: [],
  }));
  const { components: laid, connections } = computeSmartLayout(cat.id, components);
  assert(connections.length >= components.length - 1 || components.length <= 2,
    `${cat.name}: ${connections.length} connections for ${components.length} parts`);
  const topo = validateTopology(cat.id, laid, connections);
  const disconnectedWarn = topo.warnings.filter((w) =>
    w.message.includes('not connected to the main propulsion path')
  );
  assert(disconnectedWarn.length === 0, `${cat.name}: all parts on main graph after arrange`);
  const storage = components.filter((c) =>
    ['fuel-tank', 'oxidizer-tank', 'propellant-tank', 'gas-tank', 'propellant-grain', 'fuel-grain'].includes(c.type)
  );
  if (storage.length) {
    const conns = buildLogicalConnections(cat.id, components);
    const exitTypes = {
      chemical: 'nozzle', ion: 'neutralizer', hall: 'discharge-channel', nuclear: 'nozzle',
      airbreathing: 'nozzle', solid: 'nozzle', hybrid: 'nozzle', 'cold-gas': 'nozzle', monoprop: 'nozzle',
    };
    const exit = components.find((c) => c.type === exitTypes[cat.id]);
    if (exit) {
      const adj = new Map(components.map((c) => [c.id, []]));
      for (const cn of conns) adj.get(cn.from)?.push(cn.to);
      const hasPathFromStore = storage.some((s) => {
        const q = [s.id];
        const seen = new Set([s.id]);
        while (q.length) {
          const id = q.shift();
          if (id === exit.id) return true;
          for (const n of adj.get(id) || []) {
            if (!seen.has(n)) { seen.add(n); q.push(n); }
          }
        }
        return false;
      });
      assert(hasPathFromStore, `${cat.name}: storage reaches thrust exit`);
    }
  }
}

// Template with optional guidance (often triggered false "unused" before fix)
console.log('\nArrange — chemical with guidance:');
const orbitalTpl = getTemplatesForCategory('chemical').find((t) => t.id === 'chem-orbital');
if (orbitalTpl) {
  const comps = orbitalTpl.components.map((t, i) => ({
    id: `g-${i}`,
    type: t.type,
    name: t.type,
    icon: '•',
    x: t.x,
    y: t.y,
    params: [],
  }));
  const { components: laid, connections } = computeSmartLayout('chemical', comps);
  const topo = validateTopology('chemical', laid, connections);
  assert(
    !topo.warnings.some((w) => w.message.includes('not connected to the main propulsion path')),
    'Guidance attaches to main path after arrange'
  );
}

// All categories have components
console.log('\nComponent Libraries:');
import { COMPONENT_LIBRARY } from '../data/components.js';
for (const cat of CATEGORIES) {
  assert(COMPONENT_LIBRARY[cat.id]?.length > 0, `${cat.name} has components`);
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
