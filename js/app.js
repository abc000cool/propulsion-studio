/**
 * Propulsion Studio — App shell with partial DOM updates (workspace stays mounted)
 */
import { store } from './store.js';
import { CATEGORIES, getCategory } from './data/categories.js';
import { getComponentsForCategory, getComponentDef } from './data/components.js';
import { getTemplatesForCategory } from './data/templates.js';
import { getPropellants, ENVIRONMENTS } from './data/propellants.js';
import { METRIC_LABELS, formatMetric } from './engine/analysis.js';
import { compareSystems } from './engine/compare.js';
import { formatUsd } from './engine/costs.js';
import { renderGuideOverlay, GUIDE_STEPS } from './ui/guide.js';
import { renderDesignSummaryCard, renderMetricBars } from './ui/diagram.js';
import { getSuitabilityStyle } from './engine/missions.js';

let openDropdown = null;

let connectState = null;
let activePanelTab = 'metrics';
let toastTimer = null;
let lastScreen = null;
let guideStep = 0;
let workspaceMounted = false;

const els = { header: null, main: null };

function showToast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3000);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function initShell() {
  const app = document.getElementById('app');
  app.innerHTML = '<header id="app-header"></header><main id="app-main"></main>';
  els.header = document.getElementById('app-header');
  els.main = document.getElementById('app-main');
}

function render(state) {
  if (!els.header) initShell();
  renderHeader(state);

  if (state.showGuide) {
    let g = document.getElementById('guide-overlay');
    if (!g) {
      g = document.createElement('div');
      g.id = 'guide-root';
      document.body.appendChild(g);
    }
    document.getElementById('guide-root').innerHTML = renderGuideOverlay(guideStep);
    bindGuide();
  } else {
    document.getElementById('guide-root')?.remove();
  }

  if (state.screen !== lastScreen) {
    workspaceMounted = false;
    lastScreen = state.screen;
    els.main.innerHTML = renderScreen(state);
    bindScreenEvents(state);
    if (state.screen === 'workspace') {
      workspaceMounted = true;
      setupWorkspaceInteractions(state);
      drawConnections(state);
    }
    return;
  }

  if (state.screen === 'workspace' && workspaceMounted) {
    partialUpdateWorkspace(state);
    return;
  }

  if (state.screen === 'compare' || state.screen === 'library') {
    els.main.innerHTML = renderScreen(state);
    bindScreenEvents(state);
    return;
  }
}

function partialUpdateWorkspace(state) {
  updatePanelTabs();
  const panel = document.getElementById('panel-content');
  if (panel) panel.innerHTML = renderActivePanel(state);

  const status = document.getElementById('status-bar');
  if (status) status.innerHTML = renderStatusBar(state);

  const presets = document.getElementById('preset-bar');
  if (presets) presets.innerHTML = renderPresetBar(state);

  syncCanvasNodes(state);
  drawConnections(state);
  bindWorkspacePanelEvents(state);
}

function renderHeader(state) {
  if (state.screen === 'workspace') {
    renderWorkspaceHeader(state);
    return;
  }
  els.header.innerHTML = `
    <div class="app-header app-header-global">
      <div class="logo" data-action="home">
        <div class="logo-icon">🚀</div>
        <div>
          <div class="logo-text">Propulsion Studio</div>
          <div class="logo-sub">Architecture Design & Analysis</div>
        </div>
      </div>
      <nav class="nav-actions">
        ${state.screen !== 'landing' ? `<button class="btn btn-ghost btn-sm" data-action="categories">Categories</button>` : ''}
        <button class="btn btn-sm" data-action="library">Library</button>
        <button class="btn btn-sm" data-action="compare">Compare</button>
        ${state.screen === 'landing' ? `<button class="btn btn-primary btn-sm" data-action="open-guide">How to Use</button>` : ''}
      </nav>
    </div>`;
  bindHeaderEvents();
}

function renderWorkspaceHeader(state) {
  const cat = getCategory(state.categoryId);
  els.header.innerHTML = `
    <div class="app-header app-header-workspace">
      <button class="btn btn-ghost btn-sm" data-action="categories" title="Back to categories">←</button>
      <div class="ws-title-block">
        <span class="ws-cat">${cat?.icon} ${cat?.name}</span>
      </div>
      <nav class="nav-actions ws-nav">
        <div class="nav-dropdown" data-dropdown="file">
          <button class="btn btn-sm nav-dropdown-btn" type="button">File ▾</button>
          <div class="nav-dropdown-menu">
            <button type="button" data-action="save">${state.editingDesignId ? '💾 Update Save' : '💾 Save'}</button>
            <button type="button" data-action="save-as">Save As…</button>
            <div class="nav-dropdown-divider"></div>
            <label class="nav-dropdown-item">📂 Import JSON<input type="file" accept=".json" data-input="import-json" hidden /></label>
            <div class="nav-dropdown-divider"></div>
            <button type="button" data-action="export-json">Export JSON</button>
            <button type="button" data-action="export-png">Export PNG</button>
            <button type="button" data-action="export-pdf">Export PDF</button>
          </div>
        </div>
        <div class="nav-dropdown" data-dropdown="edit">
          <button class="btn btn-sm nav-dropdown-btn" type="button">Edit ▾</button>
          <div class="nav-dropdown-menu">
            <button type="button" data-action="undo">↩ Undo</button>
            <button type="button" data-action="redo">↪ Redo</button>
            <div class="nav-dropdown-divider"></div>
            <button type="button" data-action="auto-layout">📐 Arrange Diagram</button>
            <button type="button" data-action="connect-mode">🔗 Connect Ports</button>
          </div>
        </div>
        <button class="btn btn-sm" data-action="library">Library</button>
        <button class="btn btn-sm" data-action="compare">Compare</button>
      </nav>
    </div>`;
  bindHeaderEvents();
  bindDropdowns();
}

function renderScreen(state) {
  switch (state.screen) {
    case 'landing': return renderLanding();
    case 'categories': return renderCategories();
    case 'build-mode': return renderBuildMode(state);
    case 'workspace': return renderWorkspaceShell(state);
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
        <p class="landing-desc">Assemble propulsion systems, get live physics-informed feedback, evaluate mission fit, and compare architectures.</p>
        <div class="landing-cta">
          <button class="btn btn-primary btn-lg" data-action="categories">Start Designing →</button>
          <button class="btn btn-lg" data-action="open-guide">How to Use 📖</button>
        </div>
        <div class="landing-features">
          <div class="feature-pill"><strong>9 Propulsion Families</strong><span>Chemical, Ion, Hall, Nuclear & more</span></div>
          <div class="feature-pill"><strong>Live Analysis</strong><span>Thrust, Isp, delta-v, thermal, power & cost</span></div>
          <div class="feature-pill"><strong>Mission Suitability</strong><span>10 mission profiles with recommendations</span></div>
          <div class="feature-pill"><strong>Compare & Export</strong><span>Save, compare, JSON/PNG/PDF export</span></div>
        </div>
        <p class="landing-disclaimer">Design-level engineering estimates — see docs/PHYSICS.md for model scope. Designed by Ansh Pathak. www.anshpathak.us</p>
      </div>
    </main>`;
}

function renderCategories() {
  return `<main class="screen"><h2 class="screen-title">Select Propulsion Category</h2>
    <p class="screen-subtitle">Choose a propulsion family to begin.</p>
    <div class="category-grid">${CATEGORIES.map((c) => `
      <div class="category-card" data-action="select-category" data-id="${c.id}" style="--cat-color:${c.color}">
        <div class="category-icon">${c.icon}</div><h3>${c.name}</h3><p>${c.description}</p>
      </div>`).join('')}</div></main>`;
}

function renderBuildMode(state) {
  const cat = getCategory(state.categoryId);
  const templates = getTemplatesForCategory(state.categoryId);
  return `<main class="screen"><h2 class="screen-title">${cat?.name} — Build Mode</h2>
    <div class="mode-grid">
      <div class="mode-card" data-action="custom-mode"><div class="mode-icon">🎨</div><h3>Custom Mode</h3><p>Drag-and-drop from scratch.</p></div>
      <div class="mode-card" data-action="show-templates"><div class="mode-icon">📋</div><h3>Template Mode</h3><p>Prebuilt architectures.</p></div>
    </div>
    ${templates.length ? `<div class="template-list">${templates.map((t) => `
      <div class="template-card" data-action="load-template" data-id="${t.id}"><h4>${t.name}</h4><p>${t.description}</p></div>`).join('')}</div>` : ''}
    <button class="btn btn-ghost" data-action="categories" style="margin-top:1rem">← Back</button></main>`;
}

function renderWorkspaceShell(state) {
  const cat = getCategory(state.categoryId);
  const palette = getComponentsForCategory(state.categoryId);
  return `<main class="workspace-layout" style="padding:1rem;flex:1;display:flex;flex-direction:column">
    <div class="workspace">
      <aside class="palette" id="palette"><h3>Components</h3>
        ${palette.map((p) => `<div class="palette-item" draggable="true" data-component-type="${p.type}"><span>${p.icon}</span><span>${p.name}</span></div>`).join('')}
      </aside>
      <div class="canvas-container">
        <div class="canvas-toolbar">
          <input type="text" class="design-name-input" id="system-name-input" value="${escapeHtml(state.systemName)}" placeholder="Design name..." />
          <button class="btn btn-sm btn-accent-outline" data-action="auto-layout" title="Snap components left-to-right and connect">📐 Arrange Diagram</button>
          <button class="btn btn-sm" data-action="connect-mode" title="Link component ports">🔗 Connect</button>
        </div>
        <div id="preset-bar" class="preset-bar">${renderPresetBar(state)}</div>
        <div class="canvas" id="workspace-canvas">
          <svg class="canvas-svg" id="connection-svg"></svg>
          <div id="nodes-layer"></div>
        </div>
      </div>
      <aside class="analysis-panel">
        <div class="panel-tabs" id="panel-tabs">
          ${[
            ['metrics', 'Metrics'],
            ['missions', 'Missions'],
            ['feedback', 'Feedback'],
            ['params', 'Parameters'],
            ['costs', 'Costs'],
            ['notes', 'Notes'],
          ].map(([id, label]) => `
            <button class="panel-tab ${activePanelTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}
        </div>
        <div class="panel-content" id="panel-content">${renderActivePanel(state)}</div>
      </aside>
      <div class="status-bar" id="status-bar">${renderStatusBar(state)}</div>
    </div></main>`;
}

function renderPresetBar(state) {
  const props = getPropellants(state.categoryId);
  if (!props.length) return `<span class="preset-label">Environment:</span>
    ${ENVIRONMENTS.map((e) => `<button class="preset-chip ${state.environmentId === e.id ? 'active' : ''}" data-env="${e.id}">${e.name}</button>`).join('')}`;
  return `
    <span class="preset-label">Propellant:</span>
    ${props.map((p) => `<button class="preset-chip ${state.propellantId === p.id ? 'active' : ''}" data-prop="${p.id}">${p.name}</button>`).join('')}
    <span class="preset-label">Env:</span>
    ${ENVIRONMENTS.map((e) => `<button class="preset-chip ${state.environmentId === e.id ? 'active' : ''}" data-env="${e.id}">${e.name}</button>`).join('')}`;
}

function renderMissionsPanel(state) {
  const scores = state.missionScores || [];
  if (!scores.length) {
    return '<p style="color:var(--text-muted);font-size:0.85rem">Add components to evaluate mission suitability.</p>';
  }
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return `<div class="missions-panel-list">${sorted.map((s) => {
    const st = getSuitabilityStyle(s.label);
    return `
      <div class="mission-panel-item">
        <div class="mission-panel-top">
          <span>${s.mission.icon} ${s.mission.name}</span>
          <span class="mission-panel-score" style="color:${st.color}">${s.score}</span>
        </div>
        <span class="mission-rating" style="background:${st.color}22;color:${st.color}">${s.rating}</span>
        <p class="mission-panel-reason">${escapeHtml(s.reason)}</p>
        ${s.strengths?.[0] ? `<p class="mission-panel-tip">✓ ${escapeHtml(s.strengths[0])}</p>` : ''}
        ${s.weaknesses?.[0] ? `<p class="mission-panel-tip warn">△ ${escapeHtml(s.weaknesses[0])}</p>` : ''}
      </div>`;
  }).join('')}</div>
  <button class="btn btn-sm btn-ghost" data-action="missions" style="margin-top:0.75rem;width:100%">Full mission report →</button>`;
}

function renderActivePanel(state) {
  const selected = state.components.find((c) => c.id === state.selectedComponentId);
  switch (activePanelTab) {
    case 'metrics': return renderMetricsPanel(state.analysis?.metrics);
    case 'missions': return renderMissionsPanel(state);
    case 'feedback': return renderFeedbackPanel(state.analysis);
    case 'params': return renderParamsPanel(selected, state.categoryId);
    case 'costs': return renderCostsPanel(state.analysis?.costs, state);
    case 'notes': return renderNotesPanel(state);
    default: return '';
  }
}

function renderMetricsPanel(metrics) {
  if (!metrics) return '<p style="color:var(--text-muted)">Add components to begin analysis.</p>';
  const keys = Object.keys(METRIC_LABELS).filter((k) => metrics[k] != null && k !== 'complexity');
  return `<div class="metric-grid">${keys.slice(0, 14).map((key) => `
    <div class="metric-card"><div class="metric-label">${METRIC_LABELS[key]}</div>
    <div class="metric-value">${formatMetric(key, metrics[key])}</div></div>`).join('')}
  </div><p class="disclaimer">Simplified physics — design-level estimates.</p>`;
}

function renderFeedbackPanel(analysis) {
  if (!analysis?.feedback?.length) return '<p style="color:var(--text-muted)">No feedback.</p>';
  return `<ul class="feedback-list">${analysis.feedback.map((f) => `
    <li class="feedback-item ${f.level}" title="${escapeHtml(f.help || '')}">
      <div><div>${f.message}</div><div class="feedback-cat">${f.category}</div>
      ${f.help ? `<div class="feedback-help">ℹ️ ${escapeHtml(f.help)}</div>` : ''}</div></li>`).join('')}</ul>`;
}

function renderParamsPanel(selected, categoryId) {
  if (!selected) return '<p style="color:var(--text-muted)">Select a component to edit parameters.</p>';
  const def = getComponentDef(categoryId, selected.type);
  return `<div class="param-editor"><h4>${selected.icon} ${selected.name}</h4>
    <p style="font-size:0.75rem;color:var(--text-muted)">${def?.description || ''}</p>
    ${selected.params.map((p) => `<div class="param-row"><label><span>${p.label}</span>
      <span class="param-value" data-pv="${selected.id}-${p.key}">${p.value} ${p.unit}</span></label>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}"
        data-param="${p.key}" data-component="${selected.id}" /></div>`).join('')}
  </div>`;
}

function renderCostsPanel(costs, state) {
  if (!costs) return '<p style="color:var(--text-muted)">Add components for cost estimates.</p>';
  return `
    <div class="cost-summary">
      <div class="metric-card"><div class="metric-label">Hardware</div><div class="metric-value">${formatUsd(costs.hardwareCost)}</div></div>
      <div class="metric-card"><div class="metric-label">Propellant</div><div class="metric-value">${formatUsd(costs.propellantCost)}</div></div>
      <div class="metric-card"><div class="metric-label">Total Program</div><div class="metric-value">${formatUsd(costs.totalProgramCost)}</div></div>
    </div>
    <h5 style="margin:1rem 0 0.5rem;font-size:0.75rem;color:var(--text-muted)">COMPONENT BREAKDOWN</h5>
    <ul class="cost-breakdown">${costs.breakdown.map((b) => `
      <li><span>${b.name}</span><span>${formatUsd(b.unitCost)}</span></li>`).join('')}</ul>
    <p class="disclaimer">Economic estimates for education — not quotes for flight hardware.</p>`;
}

function renderNotesPanel(state) {
  return `<div class="param-editor"><h4>Design Notes</h4>
    <textarea data-input="notes" rows="8" style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:0.75rem;color:var(--text);resize:vertical">${escapeHtml(state.notes)}</textarea></div>`;
}

function renderStatusBar(state) {
  const a = state.analysis;
  const m = a?.metrics;
  const v = a?.validation;
  return `
    <div class="status-item"><span class="status-dot ${v?.valid ? 'ok' : v?.errors?.length ? 'err' : 'warn'}"></span>
      ${v?.valid ? 'Valid' : v?.errors?.length ? `${v.errors.length} error(s)` : 'Incomplete'}
      ${v?.topologyScore != null ? ` · Topology ${Math.round(v.topologyScore * 100)}%` : ''}</div>
    <div class="status-item">Parts: <strong>${state.components.length}</strong></div>
    ${m ? `<div class="status-item">F: <strong style="color:var(--accent)">${formatMetric('thrust', m.thrust)}</strong></div>` : ''}
    ${m?.isp ? `<div class="status-item">Isp: <strong style="color:var(--accent)">${formatMetric('isp', m.isp)}</strong></div>` : ''}
    ${a?.costs ? `<div class="status-item">Cost: <strong>${formatUsd(a.costs.totalProgramCost)}</strong></div>` : ''}`;
}

function renderNodeHtml(comp, state) {
  const sel = state.selectedComponentId === comp.id;
  return `<div class="component-node ${sel ? 'selected' : ''}" data-component-id="${comp.id}" style="left:${comp.x}px;top:${comp.y}px">
    <button class="node-delete" data-action="delete-component" data-id="${comp.id}">×</button>
    <div class="node-header"><span class="node-icon">${comp.icon}</span><span class="node-name">${comp.name}</span><span class="node-status ok"></span></div>
    <div class="node-ports"><span class="port input" data-port="in" data-id="${comp.id}"></span>
    <span class="port output" data-port="out" data-id="${comp.id}"></span></div></div>`;
}

function syncCanvasNodes(state) {
  const layer = document.getElementById('nodes-layer');
  if (!layer) return;
  const existing = new Set([...layer.querySelectorAll('.component-node')].map((n) => n.dataset.componentId));
  const current = new Set(state.components.map((c) => c.id));

  for (const id of existing) {
    if (!current.has(id)) layer.querySelector(`[data-component-id="${id}"]`)?.remove();
  }
  for (const comp of state.components) {
    let node = layer.querySelector(`[data-component-id="${comp.id}"]`);
    if (!node) {
      const wrap = document.createElement('div');
      wrap.innerHTML = renderNodeHtml(comp, state);
      node = wrap.firstElementChild;
      layer.appendChild(node);
      bindNode(node, comp.id);
    } else {
      node.classList.toggle('selected', state.selectedComponentId === comp.id);
      node.style.left = `${comp.x}px`;
      node.style.top = `${comp.y}px`;
    }
  }
  if (state.components.length === 0) {
    layer.innerHTML = `<div class="empty-state" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column">
      <div class="empty-icon">📐</div><p>Drag components here</p></div>`;
  } else {
    layer.querySelector('.empty-state')?.remove();
  }
}

function bindNode(node, id) {
  let sx, sy, ox, oy;
  node.addEventListener('mousedown', (e) => {
    if (e.target.closest('.node-delete') || e.target.closest('.port')) return;
    e.preventDefault();
    store.selectComponent(id);
    activePanelTab = 'params';
    const comp = store.getState().components.find((c) => c.id === id);
    sx = e.clientX; sy = e.clientY; ox = comp.x; oy = comp.y;
    const move = (ev) => {
      node.style.left = `${ox + ev.clientX - sx}px`;
      node.style.top = `${oy + ev.clientY - sy}px`;
    };
    const up = (ev) => {
      store.moveComponent(id, ox + ev.clientX - sx, oy + ev.clientY - sy);
      drawConnections(store.getState());
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  node.querySelector('.node-delete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.removeComponent(id);
    showToast('Removed');
  });
  node.querySelectorAll('.port').forEach((port) => {
    port.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = port.dataset.id;
      if (!connectState) { connectState = cid; showToast('Select target port'); }
      else if (connectState !== cid) { store.connectComponents(connectState, cid); connectState = null; drawConnections(store.getState()); }
      else connectState = null;
    });
  });
}

function drawConnections(state) {
  const svg = document.getElementById('connection-svg');
  const canvas = document.getElementById('workspace-canvas');
  if (!svg || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  svg.setAttribute('width', Math.max(canvas.scrollWidth, 1200));
  svg.setAttribute('height', Math.max(canvas.scrollHeight, 600));
  svg.innerHTML = state.connections.map((conn) => {
    const from = canvas.querySelector(`[data-component-id="${conn.from}"]`);
    const to = canvas.querySelector(`[data-component-id="${conn.to}"]`);
    if (!from || !to) return '';
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const x1 = fr.right - rect.left + canvas.scrollLeft - 8;
    const y1 = fr.top - rect.top + canvas.scrollTop + fr.height / 2;
    const x2 = tr.left - rect.left + canvas.scrollLeft + 8;
    const y2 = tr.top - rect.top + canvas.scrollTop + tr.height / 2;
    const mx = (x1 + x2) / 2;
    return `<path class="connection-line flow-anim" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
  }).join('');
}

function setupWorkspaceInteractions(state) {
  syncCanvasNodes(state);
  const canvas = document.getElementById('workspace-canvas');
  document.querySelectorAll('.palette-item').forEach((item) => {
    item.addEventListener('dragstart', (e) => e.dataTransfer.setData('component-type', item.dataset.componentType));
  });
  canvas?.addEventListener('dragover', (e) => e.preventDefault());
  canvas?.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('component-type');
    if (!type) return;
    const r = canvas.getBoundingClientRect();
    store.addComponent(type, e.clientX - r.left + canvas.scrollLeft - 80, e.clientY - r.top + canvas.scrollTop - 40);
    showToast('Component added');
  });
  bindWorkspacePanelEvents(state);
}

function updatePanelTabs() {
  document.querySelectorAll('.panel-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === activePanelTab);
  });
}

function bindHeaderEvents() {
  document.querySelectorAll('#app-header [data-action]').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      closeDropdowns();
      handleAction(el.dataset.action, el);
    };
  });
  document.querySelectorAll('#app-header .nav-dropdown-menu [data-action]').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      closeDropdowns();
      handleAction(el.dataset.action, el);
    };
  });
  document.querySelectorAll('#app-header [data-input="import-json"]').forEach((input) => {
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (store.importJSON(reader.result)) showToast('Imported');
        else showToast('Invalid file');
      };
      reader.readAsText(file);
      e.target.value = '';
      closeDropdowns();
    };
  });
}

function bindDropdowns() {
  document.querySelectorAll('.nav-dropdown').forEach((dd) => {
    const trigger = dd.querySelector('.nav-dropdown-btn');
    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = dd.dataset.dropdown;
      if (openDropdown === name) {
        closeDropdowns();
      } else {
        closeDropdowns();
        dd.classList.add('open');
        openDropdown = name;
      }
    });
  });
}

function closeDropdowns() {
  document.querySelectorAll('.nav-dropdown.open').forEach((d) => d.classList.remove('open'));
  openDropdown = null;
}

document.addEventListener('click', () => closeDropdowns());

function bindScreenEvents(state) {
  els.main.querySelectorAll('[data-action]').forEach((el) => {
    el.onclick = () => handleAction(el.dataset.action, el);
  });
  els.main.querySelectorAll('[data-compare-slot]').forEach((sel) => {
    sel.onchange = () => {
      store.setCompareSelection(Number(sel.dataset.compareSlot), sel.value || null);
    };
  });
  els.main.querySelector('[data-input="import-json"]')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (store.importJSON(reader.result)) showToast('Imported');
      else showToast('Invalid file');
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  if (state.screen === 'workspace') bindWorkspacePanelEvents(state);
}

function bindWorkspacePanelEvents(state) {
  document.querySelectorAll('.panel-tab').forEach((tab) => {
    tab.onclick = () => { activePanelTab = tab.dataset.tab; partialUpdateWorkspace(store.getState()); };
  });
  document.getElementById('system-name-input')?.addEventListener('change', (e) => {
    store.setState({ systemName: e.target.value }, 'partial');
  });
  document.querySelectorAll('[data-param]').forEach((input) => {
    input.oninput = () => {
      store.updateComponentParam(input.dataset.component, input.dataset.param, input.value);
      const pv = document.querySelector(`[data-pv="${input.dataset.component}-${input.dataset.param}"]`);
      if (pv) {
        const p = store.getState().components.find((c) => c.id === input.dataset.component)?.params.find((x) => x.key === input.dataset.param);
        if (p) pv.textContent = `${input.value} ${p.unit}`;
      }
    };
  });
  document.querySelectorAll('[data-prop]').forEach((b) => {
    b.onclick = () => { store.setPropellant(b.dataset.prop); showToast('Propellant updated'); };
  });
  document.querySelectorAll('[data-env]').forEach((b) => {
    b.onclick = () => { store.setEnvironment(b.dataset.env); showToast('Environment updated'); };
  });
  document.querySelector('[data-input="notes"]')?.addEventListener('input', (e) => {
    store.setState({ notes: e.target.value }, 'partial');
  });
}

function bindGuide() {
  document.querySelectorAll('[data-guide]').forEach((el) => {
    el.onclick = () => {
      if (el.dataset.guide === 'next') guideStep = Math.min(guideStep + 1, GUIDE_STEPS.length - 1);
      else if (el.dataset.guide === 'prev') guideStep = Math.max(guideStep - 1, 0);
      else { store.setState({ showGuide: false }); guideStep = 0; }
      render(store.getState());
    };
  });
  document.querySelector('[data-action="close-guide"]')?.addEventListener('click', () => {
    store.setState({ showGuide: false });
    guideStep = 0;
  });
}

function handleAction(action, el) {
  const state = store.getState();
  switch (action) {
    case 'home': case 'landing': store.navigate('landing'); break;
    case 'categories': store.navigate('categories'); break;
    case 'select-category': store.selectCategory(el.dataset.id); break;
    case 'custom-mode': store.selectBuildMode('custom'); break;
    case 'load-template': store.selectBuildMode('template', el.dataset.id); break;
    case 'workspace': store.navigate('workspace'); break;
    case 'missions': store.navigate('missions'); break;
    case 'save': { const d = store.saveDesign(); showToast(`Saved ${d.name}`); break; }
    case 'save-as': { const d = store.saveAsNew(); showToast(`Saved as ${d.name}`); break; }
    case 'library': store.navigate('library'); break;
    case 'compare': store.navigate('compare'); break;
    case 'undo': store.undo(); break;
    case 'redo': store.redo(); break;
    case 'auto-layout': store.autoLayout(); showToast('Diagram arranged and connected'); break;
    case 'open-guide': guideStep = 0; store.setState({ showGuide: true }, 'full'); break;
    case 'delete-component': store.removeComponent(el.dataset.id); break;
    case 'load-design': store.loadDesign(el.dataset.id); showToast('Loaded'); break;
    case 'duplicate-design': store.duplicateDesign(el.dataset.id); showToast('Duplicated'); break;
    case 'delete-design': if (confirm('Delete?')) store.deleteDesign(el.dataset.id); break;
    case 'compare-with':
      store.setCompareSelection(0, el.dataset.id);
      store.navigate('compare');
      break;
    case 'export-json': {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${state.systemName.replace(/\s+/g, '-')}.json`;
      a.click();
      break;
    }
    case 'export-png': exportPng(); break;
    case 'export-pdf': exportPdf(state); break;
    case 'connect-mode': connectState = null; showToast('Click ports to connect'); break;
  }
}

async function exportPng() {
  const canvas = document.getElementById('workspace-canvas');
  if (!canvas) return;
  try {
    const { default: html2canvas } = await import('https://esm.sh/html2canvas@1.4.1');
    const shot = await html2canvas(canvas, { backgroundColor: '#111827', scale: 2 });
    const a = document.createElement('a');
    a.download = `${store.getState().systemName.replace(/\s+/g, '-')}-diagram.png`;
    a.href = shot.toDataURL('image/png');
    a.click();
    showToast('PNG exported');
  } catch {
    showToast('PNG export failed — check network for html2canvas CDN');
  }
}

function exportPdf(state) {
  const win = window.open('', '_blank');
  if (!win) return showToast('Allow popups for PDF');
  const m = state.analysis?.metrics;
  const c = state.analysis?.costs;
  win.document.write(`<html><body style="font-family:Georgia;margin:2rem">
    <h1>${escapeHtml(state.systemName)}</h1>
    <p>${getCategory(state.categoryId)?.name} · ${state.components.length} components</p>
    ${m ? `<p>Thrust: ${formatMetric('thrust', m.thrust)} · Isp: ${formatMetric('isp', m.isp)} · Δv: ${formatMetric('deltaV', m.deltaV)}</p>` : ''}
    ${c ? `<p>Est. cost: ${formatUsd(c.totalProgramCost)}</p>` : ''}
    <p><em>Design-level estimates — Propulsion Studio</em></p></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function renderMissions(state) {
  const scores = state.missionScores || [];
  return `<main class="screen"><h2 class="screen-title">Mission Suitability</h2>
    <p class="screen-subtitle">${escapeHtml(state.systemName)}</p>
    <div class="mission-grid">${scores.map((s) => {
      const st = getSuitabilityStyle(s.label);
      return `<div class="mission-card"><div class="mission-header">
        <span class="mission-icon">${s.mission.icon}</span><h4>${s.mission.name}</h4>
        <span class="mission-score" style="color:${st.color}">${s.score}</span></div>
        <span class="mission-rating" style="background:${st.color}22;color:${st.color}">${s.rating}</span>
        <p style="font-size:0.85rem;color:var(--text-muted)">${s.reason}</p>
        ${s.recommendations?.length ? `<ul>${s.recommendations.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
      </div>`;
    }).join('')}</div>
    <button class="btn btn-ghost" data-action="workspace" style="margin-top:1rem">← Workspace</button></main>`;
}

function renderCompare(state) {
  const designs = state.savedDesigns;
  const [idA, idB] = state.compareSelection;
  const systemA = designs.find((d) => d.id === idA);
  const systemB = designs.find((d) => d.id === idB);
  const comparison = systemA && systemB ? compareSystems(systemA, systemB) : null;

  return `<main class="screen compare-page">
    <h2 class="screen-title">Compare Designs</h2>
    <p class="screen-subtitle">Select two saved architectures for side-by-side analysis.</p>

    <div class="compare-picker-row">
      <div class="compare-picker">
        <label>Design A</label>
        <select data-compare-slot="0" class="compare-select-input">
          <option value="">Choose a design…</option>
          ${designs.map((d) => `<option value="${d.id}" ${idA === d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
        </select>
      </div>
      <div class="compare-vs-badge">VS</div>
      <div class="compare-picker">
        <label>Design B</label>
        <select data-compare-slot="1" class="compare-select-input">
          <option value="">Choose a design…</option>
          ${designs.map((d) => `<option value="${d.id}" ${idB === d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    ${comparison ? `
      <div class="compare-verdict ${comparison.winner ? `winner-${comparison.winner.toLowerCase()}` : ''}">
        ${comparison.winner
          ? `<strong>Design ${comparison.winner}</strong> leads across more performance dimensions.`
          : 'Both designs are closely matched.'}
      </div>

      <div class="compare-designs-row">
        ${renderDesignSummaryCard(systemA, systemA.name)}
        ${renderDesignSummaryCard(systemB, systemB.name)}
      </div>

      <div class="compare-insights-grid">
        <div class="compare-insights-panel">
          <h3>Performance comparison</h3>
          ${renderMetricBars(comparison)}
        </div>
        <div class="compare-insights-panel">
          <h3>Key insights</h3>
          <ul class="insight-list">${comparison.summary.map((s) => `<li>${s}</li>`).join('')}</ul>
          <h4 style="margin-top:1.25rem">Mission suitability</h4>
          <table class="compare-mission-table">
            <thead><tr><th>Mission</th><th>A</th><th>B</th></tr></thead>
            <tbody>
              ${(systemA.missionScores || []).slice(0, 8).map((sa) => {
                const sb = (systemB.missionScores || []).find((x) => x.mission.id === sa.mission.id);
                return `<tr>
                  <td>${sa.mission.icon} ${sa.mission.name}</td>
                  <td class="${sa.score > (sb?.score ?? 0) ? 'better-a' : ''}">${sa.score}</td>
                  <td class="${sb && sb.score > sa.score ? 'better-b' : ''}">${sb?.score ?? '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <details class="compare-details">
        <summary>Full metric table</summary>
        <table class="compare-table">
          <thead><tr><th>Metric</th><th>${escapeHtml(systemA.name)}</th><th>${escapeHtml(systemB.name)}</th><th>Edge</th></tr></thead>
          <tbody>${comparison.metricsCompared.map((m) => `
            <tr>
              <td>${m.label}</td>
              <td class="${m.better === 'A' ? 'better-a' : ''}">${m.valueA}</td>
              <td class="${m.better === 'B' ? 'better-b' : ''}">${m.valueB}</td>
              <td>${m.better === 'tie' ? '—' : m.better}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </details>
    ` : `
      <div class="compare-empty">
        <div class="empty-icon">⚖️</div>
        <p>${designs.length < 2 ? 'Save at least two designs from the workspace to compare them.' : 'Pick Design A and Design B above.'}</p>
      </div>
    `}
  </main>`;
}

function renderLibrary(state) {
  return `<main class="screen"><h2 class="screen-title">Saved Designs</h2>
    <div class="library-grid">${state.savedDesigns.map((d) => {
      const cat = getCategory(d.categoryId);
      return `<div class="design-card"><h3>${escapeHtml(d.name)}</h3>
        <div class="design-meta">${cat?.name} · ${d.components?.length || 0} parts
        ${d.computedMetrics?.thrust ? ` · ${formatMetric('thrust', d.computedMetrics.thrust)}` : ''}</div>
        <div class="design-actions">
          <button class="btn btn-sm btn-primary" data-action="load-design" data-id="${d.id}">Edit</button>
          <button class="btn btn-sm" data-action="duplicate-design" data-id="${d.id}">Duplicate</button>
          <button class="btn btn-sm" data-action="compare-with" data-id="${d.id}">Compare</button>
          <button class="btn btn-sm btn-danger" data-action="delete-design" data-id="${d.id}">Delete</button>
        </div></div>`;
    }).join('') || '<div class="empty-state"><p>No saved designs</p></div>'}
  </div></main>`;
}

store.subscribe((state) => render(state));
initShell();
render(store.getState());

window.addEventListener('resize', () => {
  if (store.getState().screen === 'workspace') drawConnections(store.getState());
});
