/** How-to guide — pixel-faithful previews using real app UI classes */
import { CATEGORIES } from '../data/categories.js';

export const GUIDE_STEPS = [
  { title: 'Welcome', body: 'Propulsion Studio is your workspace for designing rocket propulsion architectures with live physics feedback.', mockup: 'welcome' },
  { title: 'Choose a propulsion family', body: 'Pick from nine propulsion categories. Each unlocks its own component library and analysis models.', mockup: 'categories' },
  { title: 'Build your architecture', body: 'Drag components from the palette onto the canvas. Name your design and use Arrange Diagram to snap everything into flow order.', mockup: 'workspace' },
  { title: 'Connect the flow path', body: 'Click Connect, then an orange output port and a green input port on the next downstream component.', mockup: 'connect' },
  { title: 'Review live analysis', body: 'Switch between Metrics, Missions, Feedback, Parameters, and Costs — all update as you edit.', mockup: 'analysis' },
  { title: 'Save and compare', body: 'Use File → Save to store designs. Open Compare to evaluate two architectures side by side.', mockup: 'compare' },
];

function previewNode(icon, name, left, top, opts = {}) {
  const { selected = false, showPorts = true } = opts;
  return `
    <div class="component-node guide-frozen-node ${selected ? 'selected' : ''}" style="left:${left}px;top:${top}px">
      <div class="node-header">
        <span class="node-icon">${icon}</span>
        <span class="node-name">${name}</span>
        <span class="node-status ok"></span>
      </div>
      ${showPorts ? `<div class="node-ports"><span class="port input"></span><span class="port output"></span></div>` : ''}
    </div>`;
}

function connPath(x1, y1, x2, y2, animated = false) {
  const mx = (x1 + x2) / 2;
  const cls = animated ? 'connection-line flow-anim guide-conn-draw' : 'connection-line';
  return `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="${cls}" fill="none" stroke-width="2"/>`;
}

function wrapPreview(inner, variant = '') {
  return `<div class="guide-preview-stage"><div class="guide-preview-app ${variant}">${inner}</div></div>`;
}

function mockupWelcome() {
  return wrapPreview(`
    <div class="guide-inner-landing landing">
      <div class="landing-grid"></div>
      <div class="landing-content guide-landing-compact">
        <div class="landing-badge">Aerospace Engineering Workstation</div>
        <h1>Propulsion System Architecture Studio</h1>
        <p class="landing-desc">Assemble propulsion systems, get live physics-informed feedback, and compare architectures.</p>
        <div class="landing-cta">
          <button type="button" class="btn btn-primary btn-lg guide-cta-highlight">Start Designing →</button>
          <button type="button" class="btn btn-lg">How to Use 📖</button>
        </div>
        <div class="landing-features guide-features-2x2">
          <div class="feature-pill"><strong>9 Propulsion Families</strong><span>Chemical, Ion, Hall, Nuclear & more</span></div>
          <div class="feature-pill"><strong>Live Analysis</strong><span>Thrust, Isp, delta-v, thermal & cost</span></div>
          <div class="feature-pill"><strong>Mission Suitability</strong><span>10 mission profiles scored live</span></div>
          <div class="feature-pill"><strong>Compare & Export</strong><span>Save, compare, JSON/PNG/PDF</span></div>
        </div>
      </div>
    </div>
  `, 'guide-variant-landing');
}

function mockupCategories() {
  const cards = CATEGORIES.slice(0, 4).map((c, i) => `
    <div class="category-card ${i === 0 ? 'guide-card-active' : ''}" style="--cat-color:${c.color}">
      <div class="category-icon">${c.icon}</div>
      <h3>${c.name}</h3>
      <p>${c.description.slice(0, 52)}…</p>
    </div>`).join('');

  return wrapPreview(`
    <div class="guide-inner-screen screen">
      <h2 class="screen-title">Select Propulsion Category</h2>
      <p class="screen-subtitle">Choose a propulsion family to begin.</p>
      <div class="category-grid guide-cat-grid">${cards}</div>
      <div class="guide-cursor-ring" aria-hidden="true"></div>
    </div>
  `, 'guide-variant-categories');
}

function mockupWorkspace() {
  return wrapPreview(`
    <div class="guide-ws-chrome">
      <div class="app-header app-header-workspace guide-mini-header">
        <button type="button" class="btn btn-ghost btn-sm">←</button>
        <div class="ws-title-block"><span class="ws-cat">🔥 Chemical Rocket</span></div>
        <nav class="nav-actions ws-nav">
          <div class="nav-dropdown"><button type="button" class="btn btn-sm nav-dropdown-btn">File ▾</button></div>
          <div class="nav-dropdown"><button type="button" class="btn btn-sm nav-dropdown-btn">Edit ▾</button></div>
          <button type="button" class="btn btn-sm">Library</button>
        </nav>
      </div>
      <div class="workspace guide-mini-workspace">
        <aside class="palette">
          <h3>Components</h3>
          <div class="palette-item guide-drag-item"><span>⛽</span><span>Fuel Tank</span></div>
          <div class="palette-item"><span>🛢️</span><span>Oxidizer Tank</span></div>
          <div class="palette-item"><span>🔥</span><span>Combustion Chamber</span></div>
          <div class="palette-item"><span>🔺</span><span>Nozzle</span></div>
        </aside>
        <div class="canvas-container">
          <div class="canvas-toolbar">
            <input type="text" value="Launch Stage A" readonly />
            <button type="button" class="btn btn-sm btn-accent-outline guide-toolbar-pulse">📐 Arrange Diagram</button>
          </div>
          <div class="canvas guide-mini-canvas">
            <svg class="canvas-svg" viewBox="0 0 520 220" width="520" height="220">
              ${connPath(155, 95, 195, 95, true)}
              ${connPath(335, 95, 375, 95, true)}
            </svg>
            ${previewNode('⛽', 'Fuel Tank', 24, 72)}
            ${previewNode('🛢️', 'Oxidizer Tank', 24, 152)}
            ${previewNode('🔥', 'Combustion Chamber', 195, 72, { selected: true })}
            ${previewNode('🔺', 'Nozzle', 375, 72)}
          </div>
        </div>
        <aside class="analysis-panel">
          <div class="panel-tabs">
            <button type="button" class="panel-tab active">Metrics</button>
            <button type="button" class="panel-tab">Missions</button>
            <button type="button" class="panel-tab">Costs</button>
          </div>
          <div class="panel-content">
            <div class="metric-grid">
              <div class="metric-card"><div class="metric-label">Thrust</div><div class="metric-value">142 kN</div></div>
              <div class="metric-card"><div class="metric-label">Isp</div><div class="metric-value">305 s</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `, 'guide-variant-workspace');
}

function mockupConnect() {
  return wrapPreview(`
    <div class="guide-ws-chrome guide-connect-only">
      <div class="canvas-container" style="flex:1;border-radius:12px">
        <div class="canvas-toolbar">
          <span class="guide-connect-hint">🔗 Connect mode — output → input</span>
        </div>
        <div class="canvas guide-mini-canvas guide-connect-canvas">
          <svg class="canvas-svg" viewBox="0 0 480 200" width="480" height="200">
            ${connPath(168, 88, 248, 88, true)}
          </svg>
          ${previewNode('⛽', 'Fuel Tank', 32, 64)}
          ${previewNode('🔥', 'Combustion Chamber', 248, 64, { selected: true })}
          <div class="guide-port-callout guide-port-out">Output</div>
          <div class="guide-port-callout guide-port-in">Input</div>
        </div>
      </div>
    </div>
  `, 'guide-variant-connect');
}

function mockupAnalysis() {
  return wrapPreview(`
    <div class="guide-ws-chrome">
      <div class="workspace guide-mini-workspace guide-analysis-focus">
        <div class="canvas-container guide-faded-canvas">
          <div class="canvas guide-mini-canvas" style="opacity:0.35"></div>
        </div>
        <aside class="analysis-panel guide-panel-focus">
          <div class="panel-tabs">
            <button type="button" class="panel-tab">Metrics</button>
            <button type="button" class="panel-tab active">Missions</button>
            <button type="button" class="panel-tab">Feedback</button>
            <button type="button" class="panel-tab">Costs</button>
          </div>
          <div class="panel-content">
            <div class="missions-panel-list">
              <div class="mission-panel-item">
                <div class="mission-panel-top"><span>🌌 Deep Space Transfer</span><span class="mission-panel-score" style="color:var(--success)">87</span></div>
                <span class="mission-rating" style="background:rgba(6,214,160,0.15);color:var(--success)">High suitability</span>
                <p class="mission-panel-reason">High Isp supports long-duration cruise.</p>
              </div>
              <div class="mission-panel-item">
                <div class="mission-panel-top"><span>🌍 LEO Launch</span><span class="mission-panel-score" style="color:var(--warning)">42</span></div>
                <span class="mission-rating" style="background:rgba(255,209,102,0.15);color:var(--warning)">Low suitability</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `, 'guide-variant-analysis');
}

function mockupCompare() {
  return wrapPreview(`
    <div class="guide-inner-screen screen compare-page">
      <h2 class="screen-title">Compare Designs</h2>
      <div class="compare-verdict"><strong>Design A</strong> leads across more performance dimensions.</div>
      <div class="compare-designs-row guide-compare-row">
        <div class="cmp-design-card">
          <div class="cmp-design-header"><span class="cmp-cat-icon">🔥</span><div><h3>Launch Stage A</h3><span class="cmp-cat-name">Chemical Rocket</span></div></div>
          <div class="cmp-stat-row">
            <div class="cmp-stat"><span>Thrust</span><strong>142 kN</strong></div>
            <div class="cmp-stat"><span>Isp</span><strong>305 s</strong></div>
          </div>
        </div>
        <div class="cmp-design-card">
          <div class="cmp-design-header"><span class="cmp-cat-icon">⚡</span><div><h3>Deep Space Ion</h3><span class="cmp-cat-name">Ion Propulsion</span></div></div>
          <div class="cmp-stat-row">
            <div class="cmp-stat"><span>Thrust</span><strong>0.24 N</strong></div>
            <div class="cmp-stat"><span>Isp</span><strong>3200 s</strong></div>
          </div>
        </div>
      </div>
      <div class="cmp-bars guide-cmp-bars">
        <div class="cmp-bar-group">
          <div class="cmp-bar-label">Thrust</div>
          <div class="cmp-bar-row"><span class="cmp-bar-tag a">A</span><div class="cmp-bar-track"><div class="cmp-bar-fill a winner" style="width:88%"></div></div></div>
          <div class="cmp-bar-row"><span class="cmp-bar-tag b">B</span><div class="cmp-bar-track"><div class="cmp-bar-fill b" style="width:12%"></div></div></div>
        </div>
      </div>
    </div>
  `, 'guide-variant-compare');
}

const MOCKUP_RENDERERS = {
  welcome: mockupWelcome,
  categories: mockupCategories,
  workspace: mockupWorkspace,
  connect: mockupConnect,
  analysis: mockupAnalysis,
  compare: mockupCompare,
};

export function renderGuideOverlay(stepIndex) {
  const step = GUIDE_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / GUIDE_STEPS.length) * 100;
  const mockupHtml = MOCKUP_RENDERERS[step.mockup]?.() || '';

  return `
    <div class="guide-overlay" id="guide-overlay">
      <div class="guide-backdrop" data-action="close-guide"></div>
      <div class="guide-card-wide guide-animate-in">
        <div class="guide-progress"><div class="guide-progress-fill" style="width:${progress}%"></div></div>
        <div class="guide-body-split">
          <div class="guide-visual">${mockupHtml}</div>
          <div class="guide-text-panel">
            <span class="guide-step-num">Step ${stepIndex + 1} of ${GUIDE_STEPS.length}</span>
            <h2>${step.title}</h2>
            <p>${step.body}</p>
            <div class="guide-dots">
              ${GUIDE_STEPS.map((_, i) => `<span class="guide-dot ${i === stepIndex ? 'active' : ''}"></span>`).join('')}
            </div>
            <div class="guide-actions">
              <button type="button" class="btn btn-ghost" data-guide="close">Skip</button>
              ${stepIndex > 0 ? '<button type="button" class="btn" data-guide="prev">← Back</button>' : ''}
              ${stepIndex < GUIDE_STEPS.length - 1
                ? '<button type="button" class="btn btn-primary" data-guide="next">Next →</button>'
                : '<button type="button" class="btn btn-primary" data-guide="close">Get Started</button>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}
