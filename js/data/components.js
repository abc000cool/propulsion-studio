/** Component library definitions per propulsion category */

const param = (key, label, value, unit, min, max, step = 1) => ({
  key, label, value, unit, min, max, step,
});

export const COMPONENT_LIBRARY = {
  chemical: [
    { type: 'fuel-tank', name: 'Fuel Tank', icon: '⛽', description: 'Stores liquid fuel propellant.', params: [param('capacity', 'Capacity', 5000, 'kg', 100, 500000, 100), param('pressure', 'Ullage Pressure', 2.5, 'MPa', 0.1, 50, 0.1)] },
    { type: 'oxidizer-tank', name: 'Oxidizer Tank', icon: '🫧', description: 'Stores liquid oxidizer.', params: [param('capacity', 'Capacity', 8000, 'kg', 100, 500000, 100), param('pressure', 'Ullage Pressure', 2.5, 'MPa', 0.1, 50, 0.1)] },
    { type: 'pressurization', name: 'Pressurization System', icon: '🔧', description: 'Pressurizes propellant tanks.', params: [param('pressure', 'Set Pressure', 3.0, 'MPa', 0.5, 40, 0.1), param('mass', 'System Mass', 45, 'kg', 5, 500, 5)] },
    { type: 'turbopump', name: 'Turbopump', icon: '⚙️', description: 'Pumps propellants at high pressure.', params: [param('power', 'Shaft Power', 15000, 'kW', 100, 500000, 100), param('efficiency', 'Efficiency', 0.72, '', 0.3, 0.95, 0.01)] },
    { type: 'feed-lines', name: 'Feed Lines', icon: '🔗', description: 'Propellant plumbing between tanks and engine.', params: [param('diameter', 'Line Diameter', 150, 'mm', 10, 1000, 5), param('length', 'Length', 8, 'm', 0.5, 50, 0.5)] },
    { type: 'injector', name: 'Injector', icon: '🎯', description: 'Atomizes and mixes propellants.', params: [param('elements', 'Element Count', 200, '', 20, 2000, 10), param('pressureDrop', 'Pressure Drop', 0.5, 'MPa', 0.05, 5, 0.05)] },
    { type: 'combustion-chamber', name: 'Combustion Chamber', icon: '🔥', description: 'Burns propellants at high temperature and pressure.', params: [param('pressure', 'Chamber Pressure', 9.7, 'MPa', 0.5, 30, 0.1), param('temperature', 'Chamber Temp', 3500, 'K', 1500, 4500, 50), param('area', 'Chamber Area', 0.5, 'm²', 0.01, 5, 0.01)] },
    { type: 'cooling-jacket', name: 'Cooling Jacket', icon: '🧊', description: 'Regenerative cooling for chamber and nozzle.', params: [param('effectiveness', 'Cooling Effectiveness', 0.85, '', 0.3, 0.98, 0.01), param('mass', 'Jacket Mass', 120, 'kg', 10, 2000, 10)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Expands exhaust to generate thrust.', params: [param('expansionRatio', 'Expansion Ratio', 40, '', 5, 200, 1), param('throatArea', 'Throat Area', 0.008, 'm²', 0.0005, 2, 0.0005), param('efficiency', 'Nozzle Efficiency', 0.98, '', 0.7, 0.99, 0.01)] },
    { type: 'throttle-valve', name: 'Throttle Valve', icon: '🎚️', description: 'Controls propellant flow rate.', params: [param('throttle', 'Throttle Setting', 100, '%', 10, 100, 1)] },
    { type: 'guidance', name: 'Guidance Interface', icon: '📡', description: 'Flight computer and gimbal control.', params: [param('gimbalRange', 'Gimbal Range', 8, '°', 1, 20, 0.5)] },
  ],
  ion: [
    { type: 'propellant-tank', name: 'Propellant Tank', icon: '⛽', description: 'Stores xenon or krypton propellant.', params: [param('capacity', 'Capacity', 50, 'kg', 1, 500, 1), param('pressure', 'Storage Pressure', 0.15, 'MPa', 0.01, 2, 0.01)] },
    { type: 'flow-controller', name: 'Flow Controller', icon: '🎛️', description: 'Regulates propellant mass flow.', params: [param('flowRate', 'Flow Rate', 0.5, 'mg/s', 0.01, 10, 0.01)] },
    { type: 'ionization-chamber', name: 'Ionization Chamber', icon: '⚛️', description: 'Ionizes neutral propellant atoms.', params: [param('efficiency', 'Ionization Efficiency', 0.9, '', 0.5, 0.99, 0.01), param('power', 'Power Draw', 200, 'W', 10, 5000, 10)] },
    { type: 'accelerator-grids', name: 'Accelerator Grids', icon: '⊞', description: 'Electrostatically accelerates ions.', params: [param('voltage', 'Grid Voltage', 1200, 'V', 200, 5000, 50), param('gridGap', 'Grid Gap', 0.5, 'mm', 0.1, 2, 0.05)] },
    { type: 'neutralizer', name: 'Cathode/Neutralizer', icon: '⊖', description: 'Neutralizes ion beam to prevent spacecraft charging.', params: [param('current', 'Emission Current', 2, 'A', 0.1, 20, 0.1)] },
    { type: 'ppu', name: 'Power Processing Unit', icon: '🔌', description: 'Converts spacecraft bus power for thruster.', params: [param('efficiency', 'PPU Efficiency', 0.92, '', 0.6, 0.98, 0.01), param('mass', 'PPU Mass', 8, 'kg', 1, 100, 1)] },
    { type: 'power-source', name: 'Power Source', icon: '☀️', description: 'Solar arrays or RTG power supply.', params: [param('powerAvailable', 'Available Power', 3000, 'W', 50, 50000, 50)] },
  ],
  hall: [
    { type: 'propellant-tank', name: 'Propellant Tank', icon: '⛽', description: 'Stores xenon propellant.', params: [param('capacity', 'Capacity', 30, 'kg', 1, 300, 1)] },
    { type: 'flow-controller', name: 'Flow Controller', icon: '🎛️', description: 'Regulates propellant flow to discharge channel.', params: [param('flowRate', 'Flow Rate', 3, 'mg/s', 0.1, 50, 0.1)] },
    { type: 'magnetic-circuit', name: 'Magnetic Circuit', icon: '🧲', description: 'Creates radial magnetic field in channel.', params: [param('fieldStrength', 'Field Strength', 150, 'G', 50, 500, 5), param('mass', 'Magnet Mass', 4, 'kg', 0.5, 50, 0.5)] },
    { type: 'discharge-channel', name: 'Discharge Channel', icon: '⭕', description: 'Annular channel where propellant is ionized and accelerated.', params: [param('diameter', 'Channel Diameter', 80, 'mm', 20, 200, 5), param('length', 'Channel Length', 25, 'mm', 10, 60, 1)] },
    { type: 'anode', name: 'Anode', icon: '➕', description: 'Positive electrode in discharge channel.', params: [param('voltage', 'Anode Voltage', 300, 'V', 100, 800, 10)] },
    { type: 'cathode', name: 'Cathode', icon: '➖', description: 'Electron emitter and neutralizer.', params: [param('current', 'Cathode Current', 5, 'A', 0.5, 30, 0.5)] },
    { type: 'ppu', name: 'Power Processing Unit', icon: '🔌', description: 'High-voltage power conversion.', params: [param('efficiency', 'PPU Efficiency', 0.9, '', 0.6, 0.98, 0.01)] },
    { type: 'power-source', name: 'Power Source', icon: '☀️', description: 'Solar or battery power supply.', params: [param('powerAvailable', 'Available Power', 2000, 'W', 50, 30000, 50)] },
  ],
  nuclear: [
    { type: 'reactor-core', name: 'Reactor Core', icon: '☢️', description: 'Nuclear fission heat source.', params: [param('power', 'Thermal Power', 500, 'MW', 10, 5000, 10), param('mass', 'Core Mass', 3000, 'kg', 500, 200000, 100)] },
    { type: 'fuel-elements', name: 'Fuel Elements', icon: '🔋', description: 'Enriched uranium fuel rods.', params: [param('enrichment', 'Enrichment', 93, '%', 5, 97, 1)] },
    { type: 'propellant-feed', name: 'Propellant Feed System', icon: '💧', description: 'Pumps hydrogen through reactor.', params: [param('flowRate', 'Mass Flow', 8, 'kg/s', 0.1, 100, 0.1), param('pressure', 'Feed Pressure', 4, 'MPa', 0.5, 20, 0.1)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Expands heated hydrogen exhaust.', params: [param('expansionRatio', 'Expansion Ratio', 100, '', 10, 300, 5), param('throatArea', 'Throat Area', 0.08, 'm²', 0.01, 1, 0.01)] },
    { type: 'thermal-shield', name: 'Thermal Shielding', icon: '🛡️', description: 'Protects spacecraft from reactor radiation.', params: [param('shieldMass', 'Shield Mass', 1500, 'kg', 200, 10000, 100)] },
    { type: 'control-systems', name: 'Control Systems', icon: '🎛️', description: 'Reactor control rods and safety systems.', params: [param('responseTime', 'Response Time', 2, 's', 0.5, 30, 0.5)] },
  ],
  airbreathing: [
    { type: 'inlet', name: 'Inlet', icon: '🌬️', description: 'Captures and decelerates incoming air.', params: [param('captureArea', 'Capture Area', 1.2, 'm²', 0.1, 10, 0.1), param('pressureRecovery', 'Pressure Recovery', 0.92, '', 0.5, 0.99, 0.01)] },
    { type: 'compressor', name: 'Compressor', icon: '🌀', description: 'Compresses air before combustion.', params: [param('pressureRatio', 'Pressure Ratio', 25, '', 3, 60, 1), param('efficiency', 'Efficiency', 0.88, '', 0.5, 0.95, 0.01)] },
    { type: 'combustor', name: 'Combustor', icon: '🔥', description: 'Burns fuel with compressed air.', params: [param('temperature', 'Exit Temperature', 1600, 'K', 800, 2500, 50), param('fuelFlow', 'Fuel Flow', 0.8, 'kg/s', 0.01, 20, 0.01)] },
    { type: 'turbine', name: 'Turbine', icon: '⚙️', description: 'Extracts energy to drive compressor.', params: [param('efficiency', 'Turbine Efficiency', 0.9, '', 0.5, 0.95, 0.01)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Accelerates exhaust jet.', params: [param('expansionRatio', 'Expansion Ratio', 5, '', 1, 20, 0.5)] },
    { type: 'afterburner', name: 'Afterburner', icon: '💥', description: 'Optional thrust augmentation.', params: [param('enabled', 'Enabled', 0, '', 0, 1, 1), param('thrustBoost', 'Thrust Boost', 40, '%', 0, 80, 5)] },
  ],
  solid: [
    { type: 'propellant-grain', name: 'Propellant Grain', icon: '🧱', description: 'Cast solid propellant charge.', params: [param('mass', 'Propellant Mass', 50000, 'kg', 100, 500000, 100), param('isp', 'Specific Impulse', 265, 's', 200, 300, 1)] },
    { type: 'casing', name: 'Motor Casing', icon: '🛢️', description: 'Structural pressure vessel.', params: [param('mass', 'Casing Mass', 5000, 'kg', 100, 50000, 100)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Fixed or movable nozzle.', params: [param('expansionRatio', 'Expansion Ratio', 12, '', 4, 50, 1), param('throatArea', 'Throat Area', 0.3, 'm²', 0.01, 5, 0.01)] },
    { type: 'ignition', name: 'Ignition System', icon: '💥', description: 'Initiates grain burn.', params: [param('reliability', 'Reliability', 0.999, '', 0.9, 1, 0.001)] },
    { type: 'insulation', name: 'Insulation', icon: '🧱', description: 'Thermal protection for casing.', params: [param('thickness', 'Thickness', 15, 'mm', 5, 50, 1)] },
  ],
  hybrid: [
    { type: 'fuel-grain', name: 'Solid Fuel Grain', icon: '🧱', description: 'Rubber or paraffin fuel grain.', params: [param('mass', 'Fuel Mass', 2000, 'kg', 50, 50000, 50)] },
    { type: 'oxidizer-tank', name: 'Oxidizer Tank', icon: '🫧', description: 'Liquid or gaseous oxidizer storage.', params: [param('capacity', 'Capacity', 3000, 'kg', 50, 50000, 50)] },
    { type: 'injector', name: 'Injector', icon: '🎯', description: 'Injects oxidizer onto fuel surface.', params: [param('flowRate', 'Oxidizer Flow', 2, 'kg/s', 0.1, 50, 0.1)] },
    { type: 'combustion-chamber', name: 'Combustion Chamber', icon: '🔥', description: 'Hybrid combustion zone.', params: [param('pressure', 'Chamber Pressure', 3, 'MPa', 0.5, 15, 0.1)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Exhaust expansion nozzle.', params: [param('expansionRatio', 'Expansion Ratio', 20, '', 5, 80, 1), param('throatArea', 'Throat Area', 0.02, 'm²', 0.001, 1, 0.001)] },
  ],
  'cold-gas': [
    { type: 'gas-tank', name: 'Pressurized Gas Tank', icon: '🗜️', description: 'High-pressure nitrogen or argon.', params: [param('capacity', 'Gas Mass', 5, 'kg', 0.1, 100, 0.1), param('pressure', 'Tank Pressure', 20, 'MPa', 1, 70, 1)] },
    { type: 'valve', name: 'Valve', icon: '🚪', description: 'On/off or proportional flow valve.', params: [param('flowRate', 'Flow Rate', 0.05, 'kg/s', 0.001, 2, 0.001)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Expansion nozzle for thrust.', params: [param('throatArea', 'Throat Area', 0.0001, 'm²', 0.00001, 0.01, 0.00001)] },
  ],
  monoprop: [
    { type: 'propellant-tank', name: 'Propellant Tank', icon: '⛽', description: 'Hydrazine or green monoprop storage.', params: [param('capacity', 'Capacity', 200, 'kg', 1, 5000, 1)] },
    { type: 'catalyst-bed', name: 'Catalyst Bed', icon: '⚗️', description: 'Decomposes monopropellant exothermically.', params: [param('efficiency', 'Decomposition Efficiency', 0.98, '', 0.8, 1, 0.01)] },
    { type: 'valve-system', name: 'Valve System', icon: '🚪', description: 'Propellant isolation and control valves.', params: [param('flowRate', 'Flow Rate', 0.2, 'kg/s', 0.01, 5, 0.01)] },
    { type: 'nozzle', name: 'Nozzle', icon: '🔺', description: 'Thrust nozzle.', params: [param('expansionRatio', 'Expansion Ratio', 50, '', 10, 150, 5), param('throatArea', 'Throat Area', 0.001, 'm²', 0.0001, 0.05, 0.0001)] },
  ],
};

export const REQUIRED_COMPONENTS = {
  chemical: ['combustion-chamber', 'nozzle'],
  ion: ['ionization-chamber', 'accelerator-grids', 'power-source'],
  hall: ['discharge-channel', 'magnetic-circuit', 'power-source'],
  nuclear: ['reactor-core', 'propellant-feed', 'nozzle'],
  airbreathing: ['inlet', 'combustor', 'nozzle'],
  solid: ['propellant-grain', 'nozzle'],
  hybrid: ['fuel-grain', 'combustion-chamber', 'nozzle'],
  'cold-gas': ['gas-tank', 'nozzle'],
  monoprop: ['propellant-tank', 'catalyst-bed', 'nozzle'],
};

export const THRUST_COMPONENTS = {
  chemical: ['combustion-chamber', 'nozzle'],
  ion: ['accelerator-grids'],
  hall: ['discharge-channel'],
  nuclear: ['nozzle'],
  airbreathing: ['combustor', 'nozzle'],
  solid: ['propellant-grain', 'nozzle'],
  hybrid: ['combustion-chamber', 'nozzle'],
  'cold-gas': ['nozzle'],
  monoprop: ['catalyst-bed', 'nozzle'],
};

export function getComponentsForCategory(categoryId) {
  return COMPONENT_LIBRARY[categoryId] || [];
}

export function createComponentInstance(categoryId, type, x = 100, y = 100) {
  const def = getComponentsForCategory(categoryId).find((c) => c.type === type);
  if (!def) return null;
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: def.type,
    name: def.name,
    icon: def.icon,
    description: def.description,
    x,
    y,
    params: def.params.map((p) => ({ ...p, value: p.value })),
    status: 'ok',
  };
}

export function getComponentDef(categoryId, type) {
  return getComponentsForCategory(categoryId).find((c) => c.type === type);
}
