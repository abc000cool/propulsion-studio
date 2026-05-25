import { getCategory } from '../data/categories.js';
import { formatMetric, METRIC_LABELS } from '../engine/analysis.js';
import { formatUsd } from '../engine/costs.js';

/** SVG flow diagram for compare cards and summaries */
export function renderFlowDiagramSvg(design, width = 420, height = 200) {
  if (!design?.components?.length) {
    return `<div class="flow-diagram-empty">No components in this design</div>`;
  }

  const comps = design.components;
  const conns = design.connections || [];
  const minX = Math.min(...comps.map((c) => c.x), 0);
  const minY = Math.min(...comps.map((c) => c.y), 0);
  const maxX = Math.max(...comps.map((c) => c.x), 0) + 170;
  const maxY = Math.max(...comps.map((c) => c.y), 0) + 80;
  const pad = 20;
  const scale = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1), 0.85);

  const tx = (x) => pad + (x - minX) * scale;
  const ty = (y) => pad + (y - minY) * scale;
  const byId = new Map(comps.map((c) => [c.id, c]));

  const paths = conns
    .map((conn) => {
      const from = byId.get(conn.from);
      const to = byId.get(conn.to);
      if (!from || !to) return '';
      const x1 = tx(from.x) + 150 * scale;
      const y1 = ty(from.y) + 28 * scale;
      const x2 = tx(to.x);
      const y2 = ty(to.y) + 28 * scale;
      const mx = (x1 + x2) / 2;
      return `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.7"/>`;
    })
    .join('');

  const nodes = comps
    .map((c) => {
      const x = tx(c.x);
      const y = ty(c.y);
      const w = 140 * scale;
      const h = 52 * scale;
      return `
        <g class="flow-node">
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#1a2234" stroke="#3d5a80" stroke-width="1.5"/>
          <text x="${x + 8}" y="${y + 20 * scale}" fill="#e8edf5" font-size="${11 * scale}px" font-family="system-ui">${c.icon}</text>
          <text x="${x + 28}" y="${y + 20 * scale}" fill="#8b9cb8" font-size="${9 * scale}px" font-family="system-ui">${truncate(c.name, 14)}</text>
        </g>`;
    })
    .join('');

  return `<svg class="flow-diagram-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}${nodes}</svg>`;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function renderDesignSummaryCard(design, label) {
  const cat = getCategory(design.categoryId);
  const m = design.computedMetrics;
  const c = design.costs;
  return `
    <div class="cmp-design-card">
      <div class="cmp-design-header">
        <span class="cmp-cat-icon">${cat?.icon || '🚀'}</span>
        <div>
          <h3>${label}</h3>
          <span class="cmp-cat-name">${cat?.name || design.categoryId}</span>
        </div>
      </div>
      <div class="cmp-diagram-wrap">${renderFlowDiagramSvg(design, 400, 180)}</div>
      <div class="cmp-stat-row">
        ${m?.thrust != null ? `<div class="cmp-stat"><span>Thrust</span><strong>${formatMetric('thrust', m.thrust)}</strong></div>` : ''}
        ${m?.isp ? `<div class="cmp-stat"><span>Isp</span><strong>${formatMetric('isp', m.isp)}</strong></div>` : ''}
        ${m?.deltaV ? `<div class="cmp-stat"><span>Δv</span><strong>${formatMetric('deltaV', m.deltaV)}</strong></div>` : ''}
        ${c?.totalProgramCost ? `<div class="cmp-stat"><span>Cost</span><strong>${formatUsd(c.totalProgramCost)}</strong></div>` : ''}
      </div>
      <div class="cmp-parts">${design.components?.length || 0} components · ${design.connections?.length || 0} connections</div>
    </div>`;
}

export function renderMetricBars(comparison) {
  const keyMetrics = comparison.metricsCompared.filter((m) =>
    ['thrust', 'isp', 'deltaV', 'totalMass', 'efficiency', 'operatingCost'].includes(m.key)
  );
  const maxVal = (m) => Math.max(m.rawA || 0, m.rawB || 0, 1);

  return `<div class="cmp-bars">${keyMetrics.map((m) => {
    const max = maxVal(m);
    const pctA = ((m.rawA || 0) / max) * 100;
    const pctB = ((m.rawB || 0) / max) * 100;
    return `
      <div class="cmp-bar-group">
        <div class="cmp-bar-label">${m.label}</div>
        <div class="cmp-bar-row">
          <span class="cmp-bar-tag a">A</span>
          <div class="cmp-bar-track"><div class="cmp-bar-fill a ${m.better === 'A' ? 'winner' : ''}" style="width:${pctA}%"></div></div>
          <span class="cmp-bar-val">${m.valueA}</span>
        </div>
        <div class="cmp-bar-row">
          <span class="cmp-bar-tag b">B</span>
          <div class="cmp-bar-track"><div class="cmp-bar-fill b ${m.better === 'B' ? 'winner' : ''}" style="width:${pctB}%"></div></div>
          <span class="cmp-bar-val">${m.valueB}</span>
        </div>
      </div>`;
  }).join('')}</div>`;
}
