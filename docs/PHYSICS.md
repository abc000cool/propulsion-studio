# Physics & Economic Assumptions

Propulsion System Architecture Studio uses **design-level approximations**, not CFD or flight-proven performance models. All outputs are labeled as estimates.

## Chemical rockets

| Assumption | Model |
|------------|--------|
| Thrust | \( F \approx \dot{m} \cdot V_e \), with \( \dot{m} \approx P_c A_t / c^* \) |
| \(c^*\) | Ideal-gas approximation from chamber temperature, γ, and gas constant \(R\) |
| Isp | From propellant preset (vacuum vs sea-level) × environment factor |
| Delta-v | Tsiolkovsky: \( \Delta v = I_{sp} g_0 \ln(m_0/m_f) \) |
| Nozzle | Efficiency multiplier on exhaust velocity; expansion ratio drives environment warnings |

## Electric propulsion (ion, Hall)

| Assumption | Model |
|------------|--------|
| Thrust | \( F \approx \eta \dot{m} V_e \), low absolute thrust |
| Isp | Preset + voltage/magnetic field tuning |
| Power | Simplified beam power balance vs PPU efficiency |
| Propellant | Xenon/krypton cost from preset $/kg |

## Nuclear thermal

| Assumption | Model |
|------------|--------|
| Thrust | Heated hydrogen exhaust, \(F = \dot{m} V_e \eta\) |
| Isp | Function of expansion ratio and thermal power proxy |
| Cost | High development multiplier on hardware |

## Airbreathing

| Assumption | Model |
|------------|--------|
| Thrust | Momentum + fuel enthalpy proxy (not full Brayton cycle) |
| Isp | Not primary metric (shown as 0) |

## Topology (connections)

| Assumption | Effect |
|------------|--------|
| Flow path | Storage → … → thrust exit must be connected via directed graph |
| Efficiency | +5% cap when topology score > 50%; −15% if poorly connected |

## Mission suitability

Weighted scores across thrust, Isp, power, thermal, mass, duration, and category fit. Ion/Hall penalized for launch missions.

## Economic estimates

| Item | Basis |
|------|--------|
| Component hardware | Base + size-dependent terms per component type |
| Propellant | $/kg from preset (LOX, RP-1, xenon, hydrazine, etc.) |
| Category multiplier | Scales family cost (nuclear highest, cold-gas lowest) |
| Program total | Hardware + propellant fill (not recurring ops) |

**Not included:** development schedule, learning curve, launch insurance, or recurring mission ops.

## Sanity bounds

Outputs are tuned for educational plausibility:

- Upper-stage chemical: ~10²–10⁵ N thrust for mm–cm scale throats  
- Ion/Hall: millinewton to newton scale  
- Solid boosters: high thrust, moderate Isp  
- Cold gas: sub-newton RCS  

Adjust chamber pressure, throat area, and propellant preset to explore trade space.
