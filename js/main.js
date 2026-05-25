import { store } from './store.js';
import { CATEGORIES, getCategory } from './data/categories.js';
import { getComponentsForCategory, getComponentDef } from './data/components.js';
import { getTemplatesForCategory } from './data/templates.js';
import { METRIC_LABELS, formatMetric } from './engine/analysis.js';
import { getSuitabilityStyle } from './engine/missions.js';
import { compareSystems } from './engine/compare.js';

let dragState = null;
let connectState = null;
let activePanelTab = 'metrics';
let toastTimer = null;

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3000);
}

function render() {
  const state = store.getState();
  const app = document.getElementById('app');
  app.innerHTML = renderHeader(state) + renderScreen(state);
  bindEvents(state);
  if (state.screen === 'workspace') {
    drawConnections(state);
    setupCanvasDrag(state);
  }
}

function renderHeader(state) {
  return `
    <header class="app-header">
      <div class="logo" data-action="home">
        <div class="logo-icon">🚀</div>
        <div>
          <div class="logo-text">Propulsion Studio</div>
          <div class="logo-sub">Architecture Design & Analysis</div>
        </div>
      </div>
      <nav class="nav-actions">
        ${state.screen !== 'landing' ? `<button class="btn btn-ghost btn-sm" data-action="categories">Categories</button>` : ''}
        ${state.screen === 'workspace' ? `
          <button class="btn btn-sm" data-action="undo" title="Undo">↩</button>
          <button class="btn btn-sm" data-action="redo" title="Redo">↪</button>
          <label class="btn btn-sm" style="cursor:pointer">
            Import<input type="file" accept=".json" data-input="import-json" hidden />
          </label>
          <button class="btn btn-sm" data-action="missions">Missions 🎯</button>
          <button class="btn btn-sm" data-action="save">Save 💾</button>
          <button class="btn btn-sm" data-action="export-json">Export JSON</button>
          <button class="btn btn-sm" data-action="export-pdf">PDF Report</button>
        ` : ''}
        <button class="btn btn-sm" data-action="library">Library 📁</button>
        <button class="btn btn-sm" data-action="compare">Compare ⚖️</button>
      </nav>
    </header>
  `;
}

function renderScreen(state) {
  switch (state.screen) {
    case 'landing': return renderLanding();
    case 'categories': return renderCategories();
    case 'build-mode': return renderBuildMode(state);
    case 'workspace': return renderWorkspace(state);
    case 'missions': return renderMissions(state);
    case 'compare': return renderCompare(state);
    case 'library': return renderLibrary(state);
    default: return renderLanding();
  }
}

function renderLanding() {
  return `
    <main class="landing">
      <div class="landing-grid"></div>
      <div class="landing-content">
        <div class="landing-badge">Aerospace Engineering Workstation</div>
        <h1>Propulsion System Architecture Studio</h1>
        <p class="landing-desc">
          A modular propulsion design platform. Assemble engines across multiple propulsion families,
          get live physics-informed feedback, evaluate mission fit, and compare architectures side by side.
        </p>
        <button class="btn btn-primary" data-action="categories" style="font-size:1rem;padding:0.75rem 2rem">
          Start Designing →
        </button>
        <div class="landing-features">
          <div class="feature-pill"><strong>9 Propulsion Families</strong>Chemical, Ion, Hall, Nuclear, Airbreathing & more</div>
          <div class="feature-pill"><strong>Live Analysis</strong>Real-time thrust, Isp, delta-v, thermal & power metrics</div>
          <div class="feature-pill"><strong>Mission Suitability</strong>Score designs against 10 mission profiles</div>
          <div class="feature-pill"><strong>Compare & Export</strong>Save designs, compare side-by-side, export JSON/PDF</div>
        </div>
        <p class="disclaimer">All calculations are design-level engineering estimates — not high-fidelity CFD or mission simulation.</p>
      </div>
    </main>
  `;
}

function renderCategories() {
  return `
    <main class="screen">
      <h2 class="screen-title">Select Propulsion Category</h2>
      <p class="screen-subtitle">Choose a propulsion family to begin designing your architecture.</p>
      <div class="category-grid">
        ${CATEGORIES.map((c) => `
          <div class="category-card" data-action="select-category" data-id="${c.id}" style="--cat-color:${c.color}">
            <div class="category-icon">${c.icon}</div>
            <h3>${c.name}</h3>
            <p>${c.description}</p>
            <div class="category-tags">
              ${(Array.isArray(c.useCases) ? c.useCases : [c.useCases]).flatMap((u) => u.split(',').map((s) => s.trim())).slice(0, 3).map((u) => `<span class="tag">${u}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </main>
  `;
}

function renderBuildMode(state) {
  const cat = getCategory(state.categoryId);
  const templates = getTemplatesForCategory(state.categoryId);

  return `
    <main class="screen">
      <h2 class="screen-title">${cat?.name || 'Propulsion'} — Build Mode</h2>
      <p class="screen-subtitle">Start from a template for quick setup, or build from scratch with drag-and-drop.</p>
      <div class="mode-grid">
        <div class="mode-card" data-action="custom-mode">
          <div class="mode-icon">🎨</div>
          <h3>Custom Mode</h3>
          <p>Blank workspace. Drag components from the palette and connect them into a full architecture.</p>
        </div>
        <div class="mode-card" data-action="show-templates">
          <div class="mode-icon">📋</div>
          <h3>Template Mode</h3>
          <p>Start from a prebuilt architecture and customize parameters. Great for learning and quick comparisons.</p>
        </div>
      </div>
      ${templates.length > 0 ? `
        <h3 style="margin-bottom:1rem;font-size:1rem;color:var(--text-muted)">Available Templates</h3>
        <div class="template-list">
          ${templates.map((t) => `
            <div class="template-card" data-action="load-template" data-id="${t.id}">
              <h4>${t.name}</h4>
              <p>${t.description}</p>
            </div>
          `).join('')}
        </div>
      ` : '<p class="disclaimer">No templates for this category — use Custom Mode.</p>'}
      <div style="margin-top:1.5rem">
        <button class="btn btn-ghost" data-action="categories">← Back to Categories</button>
      </div>
    </main>
  `;
}

function renderWorkspace(state) {
  const cat = getCategory(state.categoryId);
  const palette = getComponentsForCategory(state.categoryId);
  const analysis = state.analysis;
  const metrics = analysis?.metrics;
  const selected = state.components.find((c) => c.id === state.selectedComponentId);

  const metricKeys = metrics
    ? Object.keys(METRIC_LABELS).filter((k) => metrics[k] !== undefined && metrics[k] !== null)
    : [];

  return `
    <main class="workspace-layout" style="padding:1rem;flex:1;display:flex;flex-direction:column">
      <div class="workspace">
        <aside class="palette">
          <h3>Components</h3>
          ${palette.map((p) => `
            <div class="palette-item" draggable="true" data-component-type="${p.type}">
              <span>${p.icon}</span>
              <span>${p.name}</span>
            </div>
          `).join('')}
          <p class="disclaimer" style="margin-top:1rem">Drag onto canvas. Click ports to connect.</p>
        </aside>

        <div class="canvas-container">
          <div class="canvas-toolbar">
            <input type="text" value="${escapeHtml(state.systemName)}" data-input="system-name" placeholder="Design name..." />
            <button class="btn btn-sm" data-action="connect-mode" title="Click two components to connect">🔗 Connect</button>
            <span style="font-size:0.75rem;color:var(--text-muted)">${cat?.icon} ${cat?.name}</span>
          </div>
          <div class="canvas" id="workspace-canvas">
            <svg class="canvas-svg" id="connection-svg"></svg>
            ${state.components.map((c) => renderComponentNode(c, state)).join('')}
            ${state.components.length === 0 ? `
              <div class="empty-state" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <div class="empty-icon">📐</div>
                <p>Drag components from the palette to build your propulsion system</p>
              </div>
            ` : ''}
          </div>
        </div>

        <aside class="analysis-panel">
          <div class="panel-tabs">
            <button class="panel-tab ${activePanelTab === 'metrics' ? 'active' : ''}" data-tab="metrics">Metrics</button>
            <button class="panel-tab ${activePanelTab === 'feedback' ? 'active' : ''}" data-tab="feedback">Feedback</button>
            <button class="panel-tab ${activePanelTab === 'params' ? 'active' : ''}" data-tab="params">Parameters</button>
            <button class="panel-tab ${activePanelTab === 'notes' ? 'active' : ''}" data-tab="notes">Notes</button>
          </div>
          <div class="panel-content">
            ${activePanelTab === 'metrics' ? renderMetricsPanel(metrics, analysis) : ''}
            ${activePanelTab === 'feedback' ? renderFeedbackPanel(analysis) : ''}
            ${activePanelTab === 'params' ? renderParamsPanel(selected, state.categoryId) : ''}
            ${activePanelTab === 'notes' ? renderNotesPanel(state) : ''}
          </div>
        </aside>

        <div class="status-bar">
          <div class="status-item">
            <span class="status-dot ${analysis?.validation?.valid ? 'ok' : analysis?.validation?.errors?.length ? 'err' : 'warn'}"></span>
            ${analysis?.validation?.valid ? 'System Valid' : analysis?.validation?.errors?.length ? `${analysis.validation.errors.length} Error(s)` : 'Incomplete'}
          </div>
          <div class="status-item">Components: <strong>${state.components.length}</strong></div>
          <div class="status-item">Connections: <strong>${state.connections.length}</strong></div>
          ${metrics ? `<div class="status-item">Thrust: <strong style="color:var(--accent)">${formatMetric('thrust', metrics.thrust)}</strong></div>` : ''}
          ${metrics?.isp ? `<div class="status-item">Isp: <strong style="color:var(--accent)">${formatMetric('isp', metrics.isp)}</strong></div>` : ''}
          <div class="status-item" style="margin-left:auto">
            <span style="font-size:0.7rem;color:var(--text-muted)">Design-level estimates</span>
          </div>
        </div>
      </div>
    </main>
  `;
}

function renderComponentNode(comp, state) {
  const hasError = state.analysis?.validation?.errors?.some((e) => e.componentId === comp.id);
  const hasWarn = state.analysis?.feedback?.some((f) => f.componentId === comp.id && f.level === 'warning');
  const statusClass = hasError ? 'err' : hasWarn ? 'warn' : 'ok';
  const selected = state.selectedComponentId === comp.id;

  return `
    <div class="component-node ${selected ? 'selected' : ''} ${hasError ? 'error' : ''}"
         data-component-id="${comp.id}"
         style="left:${comp.x}px;top:${comp.y}px">
      <button class="node-delete" data-action="delete-component" data-id="${comp.id}">×</button>
      <div class="node-header">
        <span class="node-icon">${comp.icon}</span>
        <span class="node-name">${comp.name}</span>
        <span class="node-status ${statusClass}"></span>
      </div>
      <div class="node-ports">
        <span class="port input" data-port="in" data-id="${comp.id}" title="Input port"></span>
        <span class="port output" data-port="out" data-id="${comp.id}" title="Output port"></span>
      </div>
    </div>
  `;
}

function renderMetricsPanel(metrics, analysis) {
  if (!metrics) {
    return `<p style="color:var(--text-muted);font-size:0.85rem">Add components to see live analysis metrics.</p>`;
  }

  const bars = {
    efficiency: metrics.efficiency * 100,
    thrustToWeight: Math.min(metrics.thrustToWeight * 30, 100),
  };

  const keys = Object.keys(METRIC_LABELS).filter((k) => metrics[k] !== undefined && metrics[k] !== null && k !== 'complexity');

  return `
    <div class="metric-grid">
      ${keys.slice(0, 12).map((key) => `
        <div class="metric-card">
          <div class="metric-label">${METRIC_LABELS[key]}</div>
          <div class="metric-value">${formatMetric(key, metrics[key])}</div>
          ${key === 'efficiency' || key === 'thrustToWeight' ? `
            <div class="metric-bar">
              <div class="metric-bar-fill" style="width:${bars[key] || 50}%;background:${key === 'efficiency' ? 'var(--success)' : 'var(--accent)'}"></div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    <p class="disclaimer">Simplified physics models — design-level approximations only.</p>
  `;
}

function renderFeedbackPanel(analysis) {
  if (!analysis?.feedback?.length) {
    return `<p style="color:var(--text-muted)">No feedback yet.</p>`;
  }
  return `
    <ul class="feedback-list">
      ${analysis.feedback.map((f) => `
        <li class="feedback-item ${f.level}">
          <div>
            <div>${f.message}</div>
            <div class="feedback-cat">${f.category || 'system'}</div>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderNotesPanel(state) {
  return `
    <div class="param-editor">
      <h4 style="margin-bottom:0.5rem">Design Notes</h4>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.75rem">Add notes for portfolios, presentations, or design reviews.</p>
      <textarea data-input="notes" rows="8" style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;color:var(--text);font-family:var(--font);font-size:0.85rem;resize:vertical">${escapeHtml(state.notes)}</textarea>
    </div>
  `;
}

function renderParamsPanel(selected, categoryId) {
  if (!selected) {
    return `<p style="color:var(--text-muted)">Select a component on the canvas to edit parameters.</p>`;
  }
  const def = getComponentDef(categoryId, selected.type);
  return `
    <div class="param-editor">
      <h4 style="margin-bottom:0.5rem">${selected.icon} ${selected.name}</h4>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem">${def?.description || selected.description}</p>
      ${selected.params.map((p) => `
        <div class="param-row">
          <label>
            <span>${p.label}</span>
            <span class="param-value">${p.value} ${p.unit}</span>
          </label>
          <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}"
                 data-param="${p.key}" data-component="${selected.id}" />
        </div>
      `).join('')}
    </div>
  `;
}

function renderMissions(state) {
  const scores = state.missionScores || [];
  return `
    <main class="screen">
      <h2 class="screen-title">Mission Suitability</h2>
      <p class="screen-subtitle">How well does <strong>${escapeHtml(state.systemName)}</strong> fit each mission profile?</p>
      ${scores.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <p>Build a propulsion system first to evaluate mission suitability.</p>
          <button class="btn btn-primary" data-action="categories" style="margin-top:1rem">Start Designing</button>
        </div>
      ` : `
        <div class="mission-grid">
          ${scores.map((s) => {
            const style = getSuitabilityStyle(s.label);
            return `
              <div class="mission-card">
                <div class="mission-header">
                  <span class="mission-icon">${s.mission.icon}</span>
                  <div>
                    <h4>${s.mission.name}</h4>
                    <span class="mission-rating" style="background:${style.color}22;color:${style.color}">${s.rating}</span>
                  </div>
                  <span class="mission-score" style="color:${style.color}">${s.score}</span>
                </div>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem">${s.reason}</p>
                <div class="score-breakdown">
                  ${Object.entries(s.scores || {}).slice(0, 4).map(([k, v]) => `
                    <div class="score-cell">${k}<span>${Math.round(v)}</span></div>
                  `).join('')}
                </div>
                ${s.strengths.length ? `<div class="mission-section"><h5>Strengths</h5><ul>${s.strengths.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
                ${s.weaknesses.length ? `<div class="mission-section"><h5>Weaknesses</h5><ul>${s.weaknesses.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
                ${s.warnings.length ? `<div class="mission-section"><h5>Warnings</h5><ul>${s.warnings.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
                ${s.recommendations.length ? `<div class="mission-section"><h5>Recommendations</h5><ul>${s.recommendations.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
      <div style="margin-top:1.5rem">
        <button class="btn btn-ghost" data-action="workspace">← Back to Workspace</button>
      </div>
    </main>
  `;
}

function renderCompare(state) {
  const designs = state.savedDesigns;
  const [idA, idB] = state.compareSelection;
  const systemA = designs.find((d) => d.id === idA);
  const systemB = designs.find((d) => d.id === idB);
  const comparison = systemA && systemB ? compareSystems(systemA, systemB) : null;

  return `
    <main class="screen">
      <h2 class="screen-title">Compare Designs</h2>
      <p class="screen-subtitle">Select two saved architectures to compare side by side.</p>
      <div class="compare-grid">
        <div class="compare-select">
          <label>Design A</label>
          <select data-compare-slot="0">
            <option value="">— Select design —</option>
            ${designs.map((d) => `<option value="${d.id}" ${idA === d.id ? 'selected' : ''}>${escapeHtml(d.name)} (${d.categoryId})</option>`).join('')}
          </select>
          ${systemA ? `<p style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted)">${systemA.components?.length || 0} components · ${new Date(systemA.updatedAt || systemA.createdAt).toLocaleDateString()}</p>` : ''}
        </div>
        <div class="compare-select">
          <label>Design B</label>
          <select data-compare-slot="1">
            <option value="">— Select design —</option>
            ${designs.map((d) => `<option value="${d.id}" ${idB === d.id ? 'selected' : ''}>${escapeHtml(d.name)} (${d.categoryId})</option>`).join('')}
          </select>
          ${systemB ? `<p style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted)">${systemB.components?.length || 0} components</p>` : ''}
        </div>
      </div>
      ${comparison ? `
        <table class="compare-table">
          <thead>
            <tr><th>Metric</th><th>${escapeHtml(systemA.name)}</th><th>${escapeHtml(systemB.name)}</th><th>Better</th></tr>
          </thead>
          <tbody>
            ${comparison.metricsCompared.map((m) => `
              <tr>
                <td>${m.label}</td>
                <td class="${m.better === 'A' ? 'better-a' : ''}">${m.valueA}</td>
                <td class="${m.better === 'B' ? 'better-b' : ''}">${m.valueB}</td>
                <td>${m.better === 'tie' ? '—' : m.better}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="compare-summary">
          <h3>Comparison Insights</h3>
          <ul>${comparison.summary.map((s) => `<li>${s}</li>`).join('')}</ul>
          ${comparison.winner ? `<p style="margin-top:0.75rem;color:var(--accent)">Overall: Design ${comparison.winner} shows stronger performance across key metrics.</p>` : ''}
        </div>
      ` : designs.length < 2 ? `
        <div class="empty-state">
          <div class="empty-icon">⚖️</div>
          <p>Save at least two designs to compare them.</p>
        </div>
      ` : '<p style="color:var(--text-muted)">Select two designs above to see comparison.</p>'}
      <div style="margin-top:1.5rem">
        <button class="btn btn-ghost" data-action="library">View Library</button>
      </div>
    </main>
  `;
}

function renderLibrary(state) {
  const designs = state.savedDesigns;
  return `
    <main class="screen">
      <h2 class="screen-title">Saved Designs</h2>
      <p class="screen-subtitle">Your saved propulsion architectures.</p>
      ${designs.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>No saved designs yet. Build and save a propulsion system from the workspace.</p>
          <button class="btn btn-primary" data-action="categories" style="margin-top:1rem">Start Designing</button>
        </div>
      ` : `
        <div class="library-grid">
          ${designs.map((d) => {
            const cat = getCategory(d.categoryId);
            return `
              <div class="design-card">
                <div class="design-card-header">
                  <h3>${escapeHtml(d.name)}</h3>
                  <span style="font-size:1.2rem">${cat?.icon || '🚀'}</span>
                </div>
                <div class="design-meta">
                  ${cat?.name || d.categoryId} · ${d.components?.length || 0} components<br>
                  ${d.computedMetrics?.thrust ? `Thrust: ${formatMetric('thrust', d.computedMetrics.thrust)}` : ''}
                  ${d.computedMetrics?.isp ? ` · Isp: ${formatMetric('isp', d.computedMetrics.isp)}` : ''}<br>
                  Saved ${new Date(d.createdAt).toLocaleString()}
                </div>
                ${d.notes ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${escapeHtml(d.notes)}</p>` : ''}
                <div class="design-actions">
                  <button class="btn btn-sm btn-primary" data-action="load-design" data-id="${d.id}">Edit</button>
                  <button class="btn btn-sm" data-action="duplicate-design" data-id="${d.id}">Duplicate</button>
                  <button class="btn btn-sm" data-action="compare-with" data-id="${d.id}">Compare</button>
                  <button class="btn btn-sm btn-danger" data-action="delete-design" data-id="${d.id}">Delete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </main>
  `;
}

function drawConnections(state) {
  const svg = document.getElementById('connection-svg');
  const canvas = document.getElementById('workspace-canvas');
  if (!svg || !canvas) return;

  const canvasRect = canvas.getBoundingClientRect();
  svg.setAttribute('width', canvas.scrollWidth);
  svg.setAttribute('height', canvas.scrollHeight);

  const paths = state.connections.map((conn) => {
    const fromEl = canvas.querySelector(`[data-component-id="${conn.from}"]`);
    const toEl = canvas.querySelector(`[data-component-id="${conn.to}"]`);
    if (!fromEl || !toEl) return '';

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const x1 = fromRect.right - canvasRect.left + canvas.scrollLeft - 10;
    const y1 = fromRect.top - canvasRect.top + canvas.scrollTop + fromRect.height / 2;
    const x2 = toRect.left - canvasRect.left + canvas.scrollLeft + 10;
    const y2 = toRect.top - canvasRect.top + canvas.scrollTop + toRect.height / 2;
    const mx = (x1 + x2) / 2;

    return `<path class="connection-line flow-anim" d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" />`;
  }).join('');

  svg.innerHTML = paths;
}

function setupCanvasDrag(state) {
  const canvas = document.getElementById('workspace-canvas');
  if (!canvas) return;

  canvas.querySelectorAll('.palette-item').forEach(() => {});

  document.querySelectorAll('.palette-item').forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('component-type', item.dataset.componentType);
    });
  });

  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('component-type');
    if (!type) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft - 80;
    const y = e.clientY - rect.top + canvas.scrollTop - 40;
    store.addComponent(type, x, y);
    showToast(`Added ${type.replace(/-/g, ' ')}`);
  });

  canvas.querySelectorAll('.component-node').forEach((node) => {
    const id = node.dataset.componentId;
    let startX, startY, origX, origY;

    node.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-delete') || e.target.closest('.port')) return;
      e.preventDefault();
      store.selectComponent(id);
      dragState = { id, node };
      const comp = store.getState().components.find((c) => c.id === id);
      startX = e.clientX;
      startY = e.clientY;
      origX = comp.x;
      origY = comp.y;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        node.style.left = `${origX + dx}px`;
        node.style.top = `${origY + dy}px`;
      };

      const onUp = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        store.moveComponent(id, origX + dx, origY + dy);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        dragState = null;
        drawConnections(store.getState());
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    node.addEventListener('click', (e) => {
      if (!e.target.closest('.node-delete')) {
        store.selectComponent(id);
        activePanelTab = 'params';
        render();
      }
    });
  });

  canvas.querySelectorAll('.port').forEach((port) => {
    port.addEventListener('click', (e) => {
      e.stopPropagation();
      const compId = port.dataset.id;
      if (!connectState) {
        connectState = compId;
        showToast('Select target component port to connect');
      } else if (connectState !== compId) {
        store.connectComponents(connectState, compId);
        connectState = null;
        showToast('Components connected');
        drawConnections(store.getState());
      } else {
        connectState = null;
      }
    });
  });
}

function bindEvents(state) {
  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const action = el.dataset.action;
      const id = el.dataset.id;

      switch (action) {
        case 'home':
        case 'landing':
          store.navigate('landing');
          break;
        case 'categories':
          store.navigate('categories');
          break;
        case 'select-category':
          store.selectCategory(el.dataset.id);
          break;
        case 'custom-mode':
          store.selectBuildMode('custom');
          break;
        case 'load-template':
          store.selectBuildMode('template', el.dataset.id);
          break;
        case 'workspace':
          store.navigate('workspace');
          break;
        case 'missions':
          store.navigate('missions');
          break;
        case 'save': {
          const design = store.saveDesign();
          showToast(`Saved "${design.name}"`);
          break;
        }
        case 'library':
          store.navigate('library');
          break;
        case 'compare':
          store.navigate('compare');
          break;
        case 'undo':
          store.undo();
          showToast('Undone');
          break;
        case 'redo':
          store.redo();
          showToast('Redone');
          break;
        case 'delete-component':
          store.removeComponent(el.dataset.id);
          showToast('Component removed');
          break;
        case 'load-design':
          store.loadDesign(el.dataset.id);
          showToast('Design loaded');
          break;
        case 'duplicate-design':
          store.duplicateDesign(el.dataset.id);
          showToast('Design duplicated');
          break;
        case 'delete-design':
          if (confirm('Delete this saved design?')) {
            store.deleteDesign(el.dataset.id);
            showToast('Design deleted');
          }
          break;
        case 'compare-with': {
          const designs = store.getState().savedDesigns;
          store.setCompareSelection(0, el.dataset.id);
          if (designs.length > 1) {
            const other = designs.find((d) => d.id !== el.dataset.id);
            if (other) store.setCompareSelection(1, other.id);
          }
          store.navigate('compare');
          break;
        }
        case 'export-json': {
          const json = store.exportJSON();
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${store.getState().systemName.replace(/\s+/g, '-')}.json`;
          a.click();
          showToast('JSON exported');
          break;
        }
        case 'export-pdf':
          exportPDFReport(state);
          break;
        case 'connect-mode':
          connectState = null;
          showToast('Click output port, then input port on another component');
          break;
      }
    });
  });

  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      activePanelTab = tab.dataset.tab;
      render();
    });
  });

  document.querySelectorAll('[data-input="system-name"]').forEach((input) => {
    input.addEventListener('change', () => store.setState({ systemName: input.value }));
  });

  document.querySelectorAll('[data-input="notes"]').forEach((input) => {
    input.addEventListener('input', () => store.setState({ notes: input.value }));
  });

  document.querySelectorAll('[data-input="import-json"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (store.importJSON(reader.result)) {
          showToast('Project imported');
        } else {
          showToast('Invalid project file');
        }
      };
      reader.readAsText(file);
      input.value = '';
    });
  });

  document.querySelectorAll('[data-param]').forEach((input) => {
    input.addEventListener('input', () => {
      store.updateComponentParam(input.dataset.component, input.dataset.param, input.value);
      const row = input.closest('.param-row');
      const valSpan = row?.querySelector('.param-value');
      const comp = store.getState().components.find((c) => c.id === input.dataset.component);
      const p = comp?.params.find((x) => x.key === input.dataset.param);
      if (valSpan && p) valSpan.textContent = `${input.value} ${p.unit}`;
    });
  });

  document.querySelectorAll('[data-compare-slot]').forEach((select) => {
    select.addEventListener('change', () => {
      store.setCompareSelection(Number(select.dataset.compareSlot), select.value || null);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function exportPDFReport(state) {
  const cat = getCategory(state.categoryId);
  const metrics = state.analysis?.metrics;
  const win = window.open('', '_blank');
  if (!win) {
    showToast('Allow popups to export PDF report');
    return;
  }

  const metricRows = metrics
    ? Object.keys(METRIC_LABELS)
        .filter((k) => metrics[k] !== undefined)
        .map((k) => `<tr><td>${METRIC_LABELS[k]}</td><td>${formatMetric(k, metrics[k])}</td></tr>`)
        .join('')
    : '';

  const missionRows = (state.missionScores || [])
    .slice(0, 5)
    .map((s) => `<tr><td>${s.mission.name}</td><td>${s.rating}</td><td>${s.score}</td><td>${escapeHtml(s.reason)}</td></tr>`)
    .join('');

  win.document.write(`<!DOCTYPE html><html><head><title>Report</title>
    <style>
      body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;color:#111}
      h1{border-bottom:2px solid #333;padding-bottom:.5rem}
      h2{color:#333;margin-top:2rem}
      table{width:100%;border-collapse:collapse;margin:1rem 0}
      th,td{border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.9rem}
      th{background:#f0f0f0}
      .meta{color:#666;font-size:.9rem}
      .disclaimer{font-size:.8rem;color:#888;font-style:italic;margin-top:2rem}
    </style></head><body>
    <h1>${escapeHtml(state.systemName)}</h1>
    <p class="meta">${cat?.name || state.categoryId} · ${new Date().toLocaleString()}</p>
    <p>${state.components.length} components · ${state.connections.length} connections</p>
    <h2>Performance Metrics</h2>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${metricRows}</tbody></table>
    <h2>Mission Suitability</h2>
    <table><thead><tr><th>Mission</th><th>Rating</th><th>Score</th><th>Reason</th></tr></thead><tbody>${missionRows}</tbody></table>
    <h2>Feedback</h2><ul>${(state.analysis?.feedback || []).map((f) => `<li>[${f.level}] ${escapeHtml(f.message)}</li>`).join('')}</ul>
    <p class="disclaimer">Design-level engineering estimates — Propulsion System Architecture Studio</p>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
  showToast('PDF report opened — use Print to save');
}

store.subscribe(render);
render();

// Resize handler for connection redraw
window.addEventListener('resize', () => {
  if (store.getState().screen === 'workspace') {
    drawConnections(store.getState());
  }
});
