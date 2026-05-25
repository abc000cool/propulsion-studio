/** Flow-path topology validation and smart layout / auto-connect */

const FLOW_ORDER = {
  chemical: [
    ['fuel-tank', 'oxidizer-tank'],
    ['pressurization', 'turbopump', 'feed-lines', 'injector'],
    ['combustion-chamber', 'cooling-jacket'],
    ['nozzle'],
  ],
  ion: [
    ['propellant-tank', 'flow-controller', 'ionization-chamber', 'accelerator-grids', 'neutralizer'],
    ['power-source', 'ppu'],
  ],
  hall: [
    ['propellant-tank', 'flow-controller'],
    ['magnetic-circuit', 'discharge-channel'],
    ['anode', 'cathode'],
    ['power-source', 'ppu'],
  ],
  nuclear: [
    ['propellant-feed', 'reactor-core', 'nozzle'],
    ['fuel-elements'],
    ['thermal-shield', 'control-systems'],
  ],
  airbreathing: [['inlet', 'compressor', 'combustor', 'turbine', 'afterburner', 'nozzle']],
  solid: [['propellant-grain', 'casing', 'ignition', 'insulation', 'nozzle']],
  hybrid: [['oxidizer-tank', 'fuel-grain', 'injector', 'combustion-chamber', 'nozzle']],
  'cold-gas': [['gas-tank', 'valve', 'nozzle']],
  monoprop: [['propellant-tank', 'valve-system', 'catalyst-bed', 'nozzle']],
};

const AUX_CHAIN_INDICES = {
  ion: new Set([1]),
  hall: new Set([3]),
  nuclear: new Set([2]),
};

const CROSS_LINKS = {
  ion: [{ from: 'ppu', to: 'flow-controller' }],
  hall: [{ from: 'ppu', to: 'flow-controller' }],
  nuclear: [
    { from: 'fuel-elements', to: 'reactor-core' },
    { from: 'thermal-shield', to: 'reactor-core' },
    { from: 'control-systems', to: 'reactor-core' },
  ],
  solid: [{ from: 'insulation', to: 'casing' }],
};

/** Optional / support parts → attach to nearest main-line component (if present) */
const SUPPORT_ATTACHMENTS = [
  { from: 'combustion-chamber', to: 'guidance' },
  { from: 'combustion-chamber', to: 'throttle-valve' },
  { from: 'injector', to: 'throttle-valve' },
  { from: 'feed-lines', to: 'throttle-valve' },
  { from: 'casing', to: 'insulation' },
];

const AUX_ANCHOR_TYPE = {
  ion: 'flow-controller',
  hall: 'flow-controller',
  nuclear: 'reactor-core',
};

const THRUST_EXIT = {
  chemical: 'nozzle',
  ion: 'neutralizer',
  hall: 'discharge-channel',
  nuclear: 'nozzle',
  airbreathing: 'nozzle',
  solid: 'nozzle',
  hybrid: 'nozzle',
  'cold-gas': 'nozzle',
  monoprop: 'nozzle',
};

const STORAGE_TYPES = new Set([
  'fuel-tank', 'oxidizer-tank', 'propellant-tank', 'gas-tank', 'propellant-grain', 'fuel-grain',
  'propellant-feed',
]);

const PARALLEL_TYPES = new Set([
  ...STORAGE_TYPES,
  'anode', 'cathode', 'fuel-elements',
]);

export function buildGraph(components, connections) {
  const adj = new Map();
  for (const c of components) adj.set(c.id, []);
  for (const conn of connections) {
    if (adj.has(conn.from) && adj.has(conn.to)) {
      adj.get(conn.from).push(conn.to);
    }
  }
  return adj;
}

/** Undirected adjacency — any physical link counts as "in use" */
function buildUndirectedAdj(components, connections) {
  const adj = new Map();
  for (const c of components) adj.set(c.id, []);
  for (const conn of connections) {
    if (!adj.has(conn.from) || !adj.has(conn.to)) continue;
    adj.get(conn.from).push(conn.to);
    adj.get(conn.to).push(conn.from);
  }
  return adj;
}

function getConnectedComponent(adj, startId) {
  const reached = new Set();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift();
    if (reached.has(id)) continue;
    reached.add(id);
    for (const next of adj.get(id) || []) {
      if (!reached.has(next)) queue.push(next);
    }
  }
  return reached;
}

export function hasPath(adj, startId, endId, maxDepth = 20) {
  const queue = [[startId, 0]];
  const seen = new Set([startId]);
  while (queue.length) {
    const [id, depth] = queue.shift();
    if (id === endId) return true;
    if (depth >= maxDepth) continue;
    for (const next of adj.get(id) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, depth + 1]);
      }
    }
  }
  return false;
}

function findComponent(components, type, usedIds) {
  return components.find((c) => c.type === type && !usedIds.has(c.id)) || null;
}

function resolveGroupComponents(components, group, usedIds) {
  return group.map((t) => findComponent(components, t, usedIds)).filter(Boolean);
}

export function validateTopology(categoryId, components, connections) {
  const warnings = [];
  const errors = [];
  if (components.length === 0 || connections.length === 0) {
    return { warnings, errors, pathComplete: false, topologyScore: 0 };
  }

  const adj = buildGraph(components, connections);
  const exitType = THRUST_EXIT[categoryId];
  const exitComp = components.find((c) => c.type === exitType);

  if (!exitComp) {
    return { warnings, errors, pathComplete: false, topologyScore: 0 };
  }

  const storageComps = components.filter((c) => STORAGE_TYPES.has(c.type));
  let pathsFound = 0;

  for (const store of storageComps) {
    if (hasPath(adj, store.id, exitComp.id)) pathsFound++;
  }

  if (storageComps.length > 0 && pathsFound === 0) {
    errors.push({
      level: 'error',
      category: 'topology-no-path',
      message: 'No complete flow path from propellant storage to thrust exit. Connect components in order.',
    });
  } else if (storageComps.length > 0 && pathsFound < storageComps.length) {
    warnings.push({
      level: 'warning',
      category: 'topology-disconnected',
      message: 'Some propellant stores are not connected to the thrust-producing path.',
    });
  }

  const undirected = buildUndirectedAdj(components, connections);
  const onMainGraph = getConnectedComponent(undirected, exitComp.id);
  const disconnected = components.filter((c) => !onMainGraph.has(c.id));

  if (disconnected.length > 0) {
    warnings.push({
      level: 'warning',
      category: 'topology-disconnected',
      message: `${disconnected.length} component(s) not connected to the main propulsion path — link or remove them.`,
    });
  }

  const pathComplete = pathsFound > 0 && errors.length === 0 && disconnected.length === 0;
  const connectedRatio = components.length
    ? onMainGraph.size / components.length
    : 0;
  const topologyScore = storageComps.length
    ? Math.min(1, (pathsFound / storageComps.length) * 0.7 + connectedRatio * 0.3)
    : Math.min(1, connectedRatio * (connections.length >= components.length - 1 ? 1 : 0.75));

  return { warnings, errors, pathComplete, topologyScore };
}

export function getSuggestedChain(categoryId) {
  const chains = FLOW_ORDER[categoryId];
  if (!chains) return [];
  return chains.flat();
}

function isParallelGroup(comps) {
  return comps.length > 1 && comps.every((c) => PARALLEL_TYPES.has(c.type));
}

function attachRemainingOrphans(components, connections) {
  const inEdge = new Set();
  for (const c of connections) {
    inEdge.add(c.from);
    inEdge.add(c.to);
  }

  const unlinked = components.filter((c) => !inEdge.has(c.id));
  if (!unlinked.length) return connections;

  const linked = components.filter((c) => inEdge.has(c.id));
  const result = [...connections];
  const seen = new Set(result.map((c) => `${c.from}->${c.to}`));
  let connIdx = result.length;

  const add = (from, to) => {
    if (!from || !to || from.id === to.id) return;
    const key = `${from.id}->${to.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ id: `conn-orphan-${connIdx++}`, from: from.id, to: to.id });
    inEdge.add(from.id);
    inEdge.add(to.id);
  };

  const sortedLinked = [...linked].sort((a, b) => a.x - b.x);

  for (const orphan of unlinked.sort((a, b) => a.x - b.x)) {
    const left = sortedLinked.filter((c) => c.x <= orphan.x + 20).pop();
    const right = sortedLinked.find((c) => c.x > orphan.x + 20);
    if (left && right) add(left, orphan);
    else if (left) add(left, orphan);
    else if (right) add(orphan, right);
    else if (sortedLinked[0]) add(sortedLinked[0], orphan);
    sortedLinked.push(orphan);
    sortedLinked.sort((a, b) => a.x - b.x);
  }

  return result;
}

export function buildLogicalConnections(categoryId, components) {
  if (components.length < 2) return [];

  const chains = FLOW_ORDER[categoryId];
  const usedIds = new Set();
  const connections = [];
  const seen = new Set();
  let connIdx = 0;

  const add = (fromComp, toComp) => {
    if (!fromComp || !toComp || fromComp.id === toComp.id) return;
    const key = `${fromComp.id}->${toComp.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    connections.push({ id: `conn-${connIdx++}`, from: fromComp.id, to: toComp.id });
  };

  const addByType = (fromType, toType) => {
    const from = findComponent(components, fromType, new Set());
    const to = findComponent(components, toType, new Set());
    add(from, to);
  };

  if (chains?.length) {
    const groupCompsList = chains.map((group) => {
      const comps = resolveGroupComponents(components, group, usedIds);
      comps.forEach((c) => usedIds.add(c.id));
      return comps;
    });
    const auxIndices = AUX_CHAIN_INDICES[categoryId] || new Set();

    for (const comps of groupCompsList) {
      for (let i = 0; i < comps.length - 1; i++) {
        add(comps[i], comps[i + 1]);
      }
    }

    for (let i = 0; i < groupCompsList.length - 1; i++) {
      const nextIdx = i + 1;
      if (auxIndices.has(nextIdx)) continue;

      const prev = groupCompsList[i];
      const next = groupCompsList[nextIdx];
      if (!prev?.length || !next?.length) continue;

      if (isParallelGroup(prev)) {
        for (const p of prev) add(p, next[0]);
      } else if (isParallelGroup(next)) {
        const hub = prev[prev.length - 1];
        for (const n of next) add(hub, n);
      } else {
        add(prev[prev.length - 1], next[0]);
      }
    }

    for (const link of CROSS_LINKS[categoryId] || []) {
      const from = components.find((c) => c.type === link.from);
      const to = components.find((c) => c.type === link.to);
      add(from, to);
    }
  }

  for (const { from, to } of SUPPORT_ATTACHMENTS) {
    const fromComp = components.find((c) => c.type === from);
    const toComp = components.find((c) => c.type === to);
    if (fromComp && toComp) add(fromComp, toComp);
  }

  let result = connections;
  if (result.length === 0) {
    const sorted = [...components].sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 0; i < sorted.length - 1; i++) {
      add(sorted[i], sorted[i + 1]);
    }
    result = connections;
  }

  return attachRemainingOrphans(components, result);
}

const COL_GAP = 200;
const ROW_GAP = 130;
const BASE_Y = 240;

export function computeSmartLayout(categoryId, components) {
  const chains = FLOW_ORDER[categoryId] || [];
  const usedIds = new Set();
  const ordered = [];
  let x = 50;
  const auxIndices = AUX_CHAIN_INDICES[categoryId] || new Set();

  for (let gi = 0; gi < chains.length; gi++) {
    const group = chains[gi];
    const groupComps = resolveGroupComponents(components, group, usedIds);
    groupComps.forEach((c) => usedIds.add(c.id));
    if (!groupComps.length) continue;

    if (auxIndices.has(gi)) {
      const anchorType = AUX_ANCHOR_TYPE[categoryId];
      const anchor = ordered.find((c) => c.type === anchorType) || ordered[0];
      const ax = anchor?.x ?? 50;
      const ay = (anchor?.y ?? BASE_Y) + ROW_GAP * 1.4;
      const startY = ay - ((groupComps.length - 1) * (ROW_GAP * 0.85)) / 2;
      groupComps.forEach((comp, i) => {
        ordered.push({ ...comp, x: ax, y: startY + i * ROW_GAP * 0.85 });
      });
      continue;
    }

    if (groupComps.length === 1) {
      ordered.push({ ...groupComps[0], x, y: BASE_Y });
      x += COL_GAP;
    } else {
      const startY = BASE_Y - ((groupComps.length - 1) * ROW_GAP) / 2;
      groupComps.forEach((comp, i) => {
        ordered.push({ ...comp, x, y: startY + i * ROW_GAP });
      });
      x += COL_GAP;
    }
  }

  for (const comp of components) {
    if (!usedIds.has(comp.id)) {
      ordered.push({ ...comp, x, y: BASE_Y + 160 });
      x += COL_GAP;
    }
  }

  ordered.sort((a, b) => a.x - b.x || a.y - b.y);

  const connections = buildLogicalConnections(categoryId, ordered);

  return { components: ordered, connections };
}
