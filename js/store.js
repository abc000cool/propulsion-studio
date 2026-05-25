import { analyzeSystem } from './engine/analysis.js';
import { evaluateMissions } from './engine/missions.js';
import { createComponentInstance } from './data/components.js';
import { getTemplatesForCategory } from './data/templates.js';
import { getPropellants } from './data/propellants.js';
import { computeSmartLayout } from './engine/topology.js';

const STORAGE_KEY = 'propulsion-studio-designs';

class AppStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      screen: 'landing',
      categoryId: null,
      buildMode: null,
      templateId: null,
      systemName: 'Untitled Design',
      components: [],
      connections: [],
      selectedComponentId: null,
      analysis: null,
      missionScores: [],
      savedDesigns: this.loadDesigns(),
      compareSelection: [null, null],
      notes: '',
      history: [],
      historyIndex: -1,
      propellantId: null,
      environmentId: 'vacuum',
      editingDesignId: null,
      showGuide: false,
      _changeType: 'full',
    };
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getState() {
    return this.state;
  }

  setState(partial, changeType = 'partial') {
    this.state = { ...this.state, ...partial, _changeType: changeType };
    this.notify();
  }

  notify() {
    for (const fn of this.listeners) fn(this.state);
  }

  loadDesigns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  persistDesigns() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.savedDesigns));
  }

  navigate(screen, extra = {}) {
    this.setState({ screen, ...extra }, 'full');
  }

  selectCategory(categoryId) {
    const propellants = getPropellants(categoryId);
    this.setState({
      categoryId,
      screen: 'build-mode',
      components: [],
      connections: [],
      buildMode: null,
      templateId: null,
      analysis: null,
      missionScores: [],
      systemName: 'Untitled Design',
      notes: '',
      history: [],
      historyIndex: -1,
      propellantId: propellants[0]?.id ?? null,
      environmentId: 'vacuum',
      editingDesignId: null,
    }, 'full');
  }

  selectBuildMode(mode, templateId = null) {
    if (mode === 'template' && templateId) {
      this.loadTemplate(templateId);
    } else {
      this.setState({
        buildMode: mode,
        templateId,
        screen: 'workspace',
        components: [],
        connections: [],
      }, 'full');
      this.reanalyze();
    }
  }

  loadTemplate(templateId) {
    const templates = getTemplatesForCategory(this.state.categoryId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const components = template.components
      .map((c) => createComponentInstance(this.state.categoryId, c.type, c.x, c.y))
      .filter(Boolean);

    const connections = [];
    for (let i = 0; i < components.length - 1; i++) {
      connections.push({ id: `conn-${i}`, from: components[i].id, to: components[i + 1].id });
    }

    this.pushHistory();
    this.setState({
      buildMode: 'template',
      templateId,
      screen: 'workspace',
      systemName: template.name,
      components,
      connections,
    }, 'full');
    this.reanalyze();
  }

  addComponent(type, x, y) {
    const comp = createComponentInstance(this.state.categoryId, type, x, y);
    if (!comp) return;
    this.pushHistory();
    const components = [...this.state.components, comp];
    this.setState({ components, selectedComponentId: comp.id }, 'nodes');
    this.reanalyze();
  }

  removeComponent(id) {
    this.pushHistory();
    const components = this.state.components.filter((c) => c.id !== id);
    const connections = this.state.connections.filter((c) => c.from !== id && c.to !== id);
    this.setState({
      components,
      connections,
      selectedComponentId: this.state.selectedComponentId === id ? null : this.state.selectedComponentId,
    }, 'nodes');
    this.reanalyze();
  }

  updateComponentParam(id, key, value) {
    const components = this.state.components.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        params: c.params.map((p) => (p.key === key ? { ...p, value: Number(value) } : p)),
      };
    });
    this.setState({ components }, 'params');
    this.reanalyze();
  }

  moveComponent(id, x, y) {
    const components = this.state.components.map((c) =>
      c.id === id ? { ...c, x: Math.max(0, x), y: Math.max(0, y) } : c
    );
    this.setState({ components }, 'move');
  }

  selectComponent(id) {
    this.setState({ selectedComponentId: id }, 'selection');
  }

  connectComponents(fromId, toId) {
    if (fromId === toId) return;
    const exists = this.state.connections.some((c) => c.from === fromId && c.to === toId);
    if (exists) return;
    this.pushHistory();
    const connections = [...this.state.connections, { id: `conn-${Date.now()}`, from: fromId, to: toId }];
    this.setState({ connections }, 'connections');
    this.reanalyze();
  }

  setPropellant(id) {
    this.setState({ propellantId: id }, 'metrics');
    this.reanalyze();
  }

  setEnvironment(id) {
    this.setState({ environmentId: id }, 'metrics');
    this.reanalyze();
  }

  autoLayout() {
    const { components, connections } = computeSmartLayout(
      this.state.categoryId,
      this.state.components
    );
    this.pushHistory();
    this.setState({ components, connections }, 'nodes');
    this.reanalyze();
  }

  reanalyze() {
    const { categoryId, components, connections, propellantId, environmentId } = this.state;
    const analysis = analyzeSystem(categoryId, components, {
      connections,
      propellantId,
      environmentId,
    });
    const missionScores = evaluateMissions(categoryId, analysis.metrics, analysis.validation);
    this.state.analysis = analysis;
    this.state.missionScores = missionScores;
    this.state._changeType = 'metrics';
    this.notify();
  }

  buildDesignPayload() {
    return {
      name: this.state.systemName,
      categoryId: this.state.categoryId,
      components: JSON.parse(JSON.stringify(this.state.components)),
      connections: JSON.parse(JSON.stringify(this.state.connections)),
      computedMetrics: this.state.analysis?.metrics,
      missionScores: this.state.missionScores,
      costs: this.state.analysis?.costs,
      notes: this.state.notes,
      propellantId: this.state.propellantId,
      environmentId: this.state.environmentId,
      updatedAt: new Date().toISOString(),
    };
  }

  saveDesign() {
    if (this.state.editingDesignId) {
      return this.updateDesign(this.state.editingDesignId);
    }
    const design = {
      id: `design-${Date.now()}`,
      ...this.buildDesignPayload(),
      createdAt: new Date().toISOString(),
    };
    const savedDesigns = [...this.state.savedDesigns, design];
    this.setState({ savedDesigns, editingDesignId: design.id }, 'partial');
    this.persistDesigns();
    return design;
  }

  updateDesign(id) {
    const savedDesigns = this.state.savedDesigns.map((d) =>
      d.id === id ? { ...d, ...this.buildDesignPayload() } : d
    );
    this.setState({ savedDesigns, editingDesignId: id }, 'partial');
    this.persistDesigns();
    return savedDesigns.find((d) => d.id === id);
  }

  saveAsNew() {
    this.setState({ editingDesignId: null, systemName: this.state.systemName + ' (Copy)' }, 'partial');
    return this.saveDesign();
  }

  loadDesign(id) {
    const design = this.state.savedDesigns.find((d) => d.id === id);
    if (!design) return;
    const propellants = getPropellants(design.categoryId);
    this.setState({
      screen: 'workspace',
      categoryId: design.categoryId,
      systemName: design.name,
      components: JSON.parse(JSON.stringify(design.components)),
      connections: JSON.parse(JSON.stringify(design.connections || [])),
      notes: design.notes || '',
      buildMode: 'custom',
      editingDesignId: id,
      propellantId: design.propellantId || propellants[0]?.id,
      environmentId: design.environmentId || 'vacuum',
    }, 'full');
    this.reanalyze();
  }

  duplicateDesign(id) {
    const design = this.state.savedDesigns.find((d) => d.id === id);
    if (!design) return;
    const copy = {
      ...JSON.parse(JSON.stringify(design)),
      id: `design-${Date.now()}`,
      name: design.name + ' (Copy)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const savedDesigns = [...this.state.savedDesigns, copy];
    this.setState({ savedDesigns });
    this.persistDesigns();
  }

  deleteDesign(id) {
    const savedDesigns = this.state.savedDesigns.filter((d) => d.id !== id);
    const editingDesignId = this.state.editingDesignId === id ? null : this.state.editingDesignId;
    this.setState({ savedDesigns, editingDesignId });
    this.persistDesigns();
  }

  setCompareSelection(slot, designId) {
    const compareSelection = [...this.state.compareSelection];
    compareSelection[slot] = designId;
    this.setState({ compareSelection }, 'partial');
  }

  pushHistory() {
    const snapshot = {
      components: JSON.parse(JSON.stringify(this.state.components)),
      connections: JSON.parse(JSON.stringify(this.state.connections)),
    };
    const history = this.state.history.slice(0, this.state.historyIndex + 1);
    history.push(snapshot);
    if (history.length > 30) history.shift();
    this.state.history = history;
    this.state.historyIndex = history.length - 1;
  }

  undo() {
    if (this.state.historyIndex <= 0) return;
    const historyIndex = this.state.historyIndex - 1;
    const snapshot = this.state.history[historyIndex];
    this.setState({
      historyIndex,
      components: JSON.parse(JSON.stringify(snapshot.components)),
      connections: JSON.parse(JSON.stringify(snapshot.connections)),
    }, 'nodes');
    this.reanalyze();
  }

  redo() {
    if (this.state.historyIndex >= this.state.history.length - 1) return;
    const historyIndex = this.state.historyIndex + 1;
    const snapshot = this.state.history[historyIndex];
    this.setState({
      historyIndex,
      components: JSON.parse(JSON.stringify(snapshot.components)),
      connections: JSON.parse(JSON.stringify(snapshot.connections)),
    }, 'nodes');
    this.reanalyze();
  }

  exportJSON() {
    return JSON.stringify({ ...this.buildDesignPayload(), exportedAt: new Date().toISOString() }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.categoryId || !Array.isArray(data.components)) throw new Error('Invalid');
      const propellants = getPropellants(data.categoryId);
      this.setState({
        screen: 'workspace',
        categoryId: data.categoryId,
        systemName: data.name || 'Imported Design',
        components: data.components,
        connections: data.connections || [],
        notes: data.notes || '',
        buildMode: 'custom',
        editingDesignId: null,
        propellantId: data.propellantId || propellants[0]?.id,
        environmentId: data.environmentId || 'vacuum',
      }, 'full');
      this.reanalyze();
      return true;
    } catch {
      return false;
    }
  }
}

export const store = new AppStore();
