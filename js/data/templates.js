/** Prebuilt architecture templates per category */

export const TEMPLATES = {
  chemical: [
    {
      id: 'chem-launch-stage',
      name: 'Small Launch Stage',
      description: 'Pressure-fed LOX/RP-1 upper stage for orbital insertion.',
      components: [
        { type: 'fuel-tank', x: 80, y: 120 },
        { type: 'oxidizer-tank', x: 80, y: 280 },
        { type: 'pressurization', x: 280, y: 200 },
        { type: 'feed-lines', x: 480, y: 200 },
        { type: 'injector', x: 680, y: 200 },
        { type: 'combustion-chamber', x: 880, y: 200 },
        { type: 'cooling-jacket', x: 1080, y: 200 },
        { type: 'nozzle', x: 1280, y: 200 },
      ],
    },
    {
      id: 'chem-orbital',
      name: 'High-Efficiency Orbital Engine',
      description: 'Turbopump-fed vacuum-optimized engine for upper stages.',
      components: [
        { type: 'fuel-tank', x: 60, y: 100 },
        { type: 'oxidizer-tank', x: 60, y: 260 },
        { type: 'turbopump', x: 280, y: 180 },
        { type: 'injector', x: 460, y: 180 },
        { type: 'combustion-chamber', x: 660, y: 180 },
        { type: 'cooling-jacket', x: 860, y: 180 },
        { type: 'nozzle', x: 1060, y: 180 },
        { type: 'guidance', x: 860, y: 340 },
      ],
    },
    {
      id: 'chem-lander',
      name: 'Lunar Lander Engine',
      description: 'Throttleable deep-throttling engine for precision landing.',
      components: [
        { type: 'fuel-tank', x: 100, y: 150 },
        { type: 'oxidizer-tank', x: 100, y: 310 },
        { type: 'turbopump', x: 300, y: 230 },
        { type: 'throttle-valve', x: 500, y: 230 },
        { type: 'combustion-chamber', x: 700, y: 230 },
        { type: 'nozzle', x: 900, y: 230 },
        { type: 'guidance', x: 700, y: 390 },
      ],
    },
  ],
  ion: [
    {
      id: 'ion-deepspace',
      name: 'Deep-Space Ion Thruster',
      description: 'High-Isp gridded ion engine for interplanetary cruise.',
      components: [
        { type: 'propellant-tank', x: 100, y: 200 },
        { type: 'flow-controller', x: 300, y: 200 },
        { type: 'ionization-chamber', x: 500, y: 200 },
        { type: 'accelerator-grids', x: 700, y: 200 },
        { type: 'neutralizer', x: 700, y: 360 },
        { type: 'ppu', x: 500, y: 360 },
        { type: 'power-source', x: 300, y: 360 },
      ],
    },
  ],
  hall: [
    {
      id: 'hall-stationkeeping',
      name: 'Stationkeeping Hall Thruster',
      description: 'Compact SPT for GEO stationkeeping missions.',
      components: [
        { type: 'propellant-tank', x: 100, y: 200 },
        { type: 'flow-controller', x: 300, y: 200 },
        { type: 'magnetic-circuit', x: 500, y: 120 },
        { type: 'discharge-channel', x: 500, y: 240 },
        { type: 'anode', x: 700, y: 180 },
        { type: 'cathode', x: 700, y: 320 },
        { type: 'ppu', x: 300, y: 360 },
        { type: 'power-source', x: 100, y: 360 },
      ],
    },
  ],
  nuclear: [
    {
      id: 'ntp-mars',
      name: 'Mars Transfer NTP',
      description: 'Nuclear thermal propulsion system for crewed Mars missions.',
      components: [
        { type: 'reactor-core', x: 200, y: 200 },
        { type: 'fuel-elements', x: 200, y: 360 },
        { type: 'propellant-feed', x: 450, y: 200 },
        { type: 'nozzle', x: 700, y: 200 },
        { type: 'thermal-shield', x: 450, y: 360 },
        { type: 'control-systems', x: 200, y: 520 },
      ],
    },
  ],
  airbreathing: [
    {
      id: 'turbofan-simple',
      name: 'Simple Turbofan',
      description: 'High-bypass turbofan for subsonic atmospheric flight.',
      components: [
        { type: 'inlet', x: 100, y: 200 },
        { type: 'compressor', x: 300, y: 200 },
        { type: 'combustor', x: 500, y: 200 },
        { type: 'turbine', x: 700, y: 200 },
        { type: 'nozzle', x: 900, y: 200 },
      ],
    },
    {
      id: 'ramjet',
      name: 'Ramjet Engine',
      description: 'Supersonic ramjet without rotating compressor.',
      components: [
        { type: 'inlet', x: 150, y: 200 },
        { type: 'combustor', x: 450, y: 200 },
        { type: 'nozzle', x: 750, y: 200 },
      ],
    },
  ],
  solid: [
    {
      id: 'solid-booster',
      name: 'Solid Rocket Booster',
      description: 'Large solid motor for launch vehicle first stage.',
      components: [
        { type: 'propellant-grain', x: 200, y: 200 },
        { type: 'casing', x: 200, y: 360 },
        { type: 'nozzle', x: 500, y: 200 },
        { type: 'ignition', x: 500, y: 360 },
        { type: 'insulation', x: 200, y: 520 },
      ],
    },
  ],
  hybrid: [
    {
      id: 'hybrid-suborbital',
      name: 'Suborbital Hybrid',
      description: 'Rubber/LOX hybrid for sounding rocket applications.',
      components: [
        { type: 'fuel-grain', x: 150, y: 200 },
        { type: 'oxidizer-tank', x: 150, y: 360 },
        { type: 'injector', x: 400, y: 280 },
        { type: 'combustion-chamber', x: 600, y: 280 },
        { type: 'nozzle', x: 800, y: 280 },
      ],
    },
  ],
  'cold-gas': [
    {
      id: 'cold-gas-rcs',
      name: 'Cold Gas Attitude Thruster',
      description: 'Simple nitrogen RCS for CubeSat attitude control.',
      components: [
        { type: 'gas-tank', x: 200, y: 200 },
        { type: 'valve', x: 450, y: 200 },
        { type: 'nozzle', x: 700, y: 200 },
      ],
    },
  ],
  monoprop: [
    {
      id: 'mono-stationkeeping',
      name: 'Hydrazine Stationkeeping',
      description: 'Monopropellant system for satellite orbit maintenance.',
      components: [
        { type: 'propellant-tank', x: 150, y: 200 },
        { type: 'valve-system', x: 400, y: 200 },
        { type: 'catalyst-bed', x: 650, y: 200 },
        { type: 'nozzle', x: 900, y: 200 },
      ],
    },
  ],
};

export function getTemplatesForCategory(categoryId) {
  return TEMPLATES[categoryId] || [];
}
