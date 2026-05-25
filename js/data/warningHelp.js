/** Educational explanations for feedback categories */

export const WARNING_HELP = {
  incompatible: 'Components or propulsion family do not match mission or system requirements. Check required parts and category fit.',
  undersized: 'Thrust or flow capacity is too low for the intended maneuver. Increase chamber pressure, throat area, or propellant flow.',
  overstressed: 'A parameter exceeds its typical operating range. Real hardware would need redesign or stronger materials.',
  inefficient: 'Energy or propellant is wasted in the cycle. Consider nozzle ratio, cooling, or power conversion efficiency.',
  'mission-limited': 'The design excels in one environment (e.g. vacuum) but loses performance elsewhere (e.g. sea level).',
  'thermal-risk': 'Heat loads approach material limits. Add or improve cooling, reduce chamber temperature, or shorten burn time.',
  'power-limited': 'Electrical power demand exceeds available bus power. Add solar array capacity or reduce thruster duty cycle.',
  'mass-inefficient': 'Dry mass or propellant mass is high relative to performance. Simplify architecture or choose denser propellants.',
  optimal: 'Parameters align well with best practices for this propulsion type and mission class.',
  acceptable: 'Design is workable with some tradeoffs. Review warnings for improvement opportunities.',
  'topology-disconnected': 'Some parts are not linked into the main propulsion chain. Use Arrange Diagram, connect ports manually, or remove extra components.',
  'topology-no-path': 'No complete path exists from propellant storage to the nozzle. Link components in logical order.',
};

export function getWarningHelp(category, message) {
  if (category && WARNING_HELP[category]) return WARNING_HELP[category];
  if (message?.includes('expansion ratio')) {
    return 'High area ratio expands exhaust efficiently in vacuum but can cause flow separation at sea level, reducing thrust.';
  }
  if (message?.includes('thrust-to-weight')) {
    return 'Launch requires T/W > 1 (typically > 1.2) to overcome gravity and drag. Low T/W suits space-only burns.';
  }
  if (message?.includes('power')) {
    return 'Electric thrusters convert electrical power to exhaust kinetic energy. Power-limited missions cannot sustain full throttle.';
  }
  return 'This estimate flags a design tradeoff. Adjust components or parameters to explore alternatives.';
}
