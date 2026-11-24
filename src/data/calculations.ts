export interface CalculationField {
  name: string;
  unit: string;
  initial: number;
}

export interface Calculation {
  name: string;
  group: string;
  description: string;
  formula: string;
  assumptions: string;
  fields: CalculationField[];
  unit: string;
  run: (v: number[]) => number;
  validate?: (v: number[]) => string | null;
}

export const calculations: Calculation[] = [
  {
    name: 'Pump hydraulic power',
    group: 'PUMPS',
    description: 'Estimate power transferred to liquid from flow, head and density.',
    formula: 'P = ρgQH',
    assumptions: 'Enter flow in m³/h. This is hydraulic power; it does not include pump or motor losses.',
    fields: [
      { name: 'Flow rate', unit: 'm³/h', initial: 100 },
      { name: 'Total head', unit: 'm', initial: 50 },
      { name: 'Fluid density', unit: 'kg/m³', initial: 1000 },
    ],
    unit: 'W',
    run: (v) => (v[0] / 3600) * v[1] * v[2] * 9.80665,
    validate: (v) => {
      if (v[0] < 0) return 'Flow rate cannot be negative.';
      if (v[1] < 0) return 'Total head cannot be negative.';
      if (v[2] <= 0) return 'Fluid density must be greater than zero.';
      return null;
    },
  },
  {
    name: 'Pressure from force',
    group: 'FUNDAMENTALS',
    description: 'Calculate uniform pressure from applied force and loaded area.',
    formula: 'P = F / A',
    assumptions: 'Use the effective loaded area in m².',
    fields: [
      { name: 'Applied force', unit: 'N', initial: 10000 },
      { name: 'Area', unit: 'm²', initial: 0.02 },
    ],
    unit: 'Pa',
    run: (v) => v[0] / v[1],
    validate: (v) => {
      if (v[1] <= 0) return 'Effective loaded area must be greater than zero.';
      return null;
    },
  },
  {
    name: 'Pipe flow rate',
    group: 'FLUID MECHANICS',
    description: 'Calculate flow in a full circular pipe from its internal diameter and mean velocity.',
    formula: 'Q = A × v = (πD² / 4) × v',
    assumptions: 'Diameter is internal diameter in mm. Flow is assumed full-pipe with a representative mean velocity.',
    fields: [
      { name: 'Internal diameter', unit: 'mm', initial: 100 },
      { name: 'Mean velocity', unit: 'm/s', initial: 2 },
    ],
    unit: 'm³/s',
    run: (v) => (Math.PI * (v[0] / 1000) ** 2 / 4) * v[1],
    validate: (v) => {
      if (v[0] <= 0) return 'Internal pipe diameter must be greater than zero.';
      return null;
    },
  },
  {
    name: 'Darcy–Weisbach pressure drop',
    group: 'FLUID MECHANICS',
    description: 'Estimate straight-pipe friction pressure drop.',
    formula: 'Δp = f (L / D) (ρv² / 2)',
    assumptions: 'f is the Darcy friction factor. Fittings, elevation and equipment losses are excluded.',
    fields: [
      { name: 'Darcy friction factor', unit: '—', initial: 0.02 },
      { name: 'Pipe length', unit: 'm', initial: 100 },
      { name: 'Internal diameter', unit: 'm', initial: 0.1 },
      { name: 'Fluid density', unit: 'kg/m³', initial: 1000 },
      { name: 'Mean velocity', unit: 'm/s', initial: 2 },
    ],
    unit: 'Pa',
    run: (v) => v[0] * (v[1] / v[2]) * (v[3] * v[4] ** 2 / 2),
    validate: (v) => {
      if (v[2] <= 0) return 'Internal diameter must be greater than zero.';
      if (v[1] < 0) return 'Pipe length cannot be negative.';
      if (v[3] <= 0) return 'Fluid density must be greater than zero.';
      return null;
    },
  },
  {
    name: 'Reynolds number',
    group: 'FLUID MECHANICS',
    description: 'Calculate a dimensionless internal-flow Reynolds number.',
    formula: 'Re = ρvD / μ',
    assumptions: 'Use consistent SI units: density kg/m³, velocity m/s, diameter m and dynamic viscosity Pa·s.',
    fields: [
      { name: 'Density', unit: 'kg/m³', initial: 1000 },
      { name: 'Velocity', unit: 'm/s', initial: 1 },
      { name: 'Pipe diameter', unit: 'm', initial: 0.05 },
      { name: 'Dynamic viscosity', unit: 'Pa·s', initial: 0.001 },
    ],
    unit: '—',
    run: (v) => (v[0] * v[1] * v[2]) / v[3],
    validate: (v) => {
      if (v[2] <= 0) return 'Pipe diameter must be greater than zero.';
      if (v[3] <= 0) return 'Dynamic viscosity must be greater than zero.';
      return null;
    },
  },
  {
    name: 'Shaft power from torque',
    group: 'ROTATING EQUIPMENT',
    description: 'Calculate shaft power from torque and rotational speed.',
    formula: 'P = T × 2πN / 60',
    assumptions: 'Torque in N·m; speed in rpm.',
    fields: [
      { name: 'Torque', unit: 'N·m', initial: 100 },
      { name: 'Rotational speed', unit: 'rpm', initial: 1500 },
    ],
    unit: 'W',
    run: (v) => (v[0] * 2 * Math.PI * v[1]) / 60,
  },
  {
    name: 'Thermal expansion',
    group: 'THERMAL',
    description: 'Estimate free linear expansion due to a temperature change.',
    formula: 'ΔL = αL₀ΔT',
    assumptions: 'Free expansion only. Restraint stresses are not included.',
    fields: [
      { name: 'Expansion coefficient', unit: '1/K', initial: 12e-6 },
      { name: 'Original length', unit: 'm', initial: 10 },
      { name: 'Temperature change', unit: 'K', initial: 80 },
    ],
    unit: 'm',
    run: (v) => v[0] * v[1] * v[2],
  },
  {
    name: 'Heat exchanger duty',
    group: 'HEAT TRANSFER',
    description: 'Estimate sensible heat duty at constant specific heat.',
    formula: 'Q̇ = ṁcₚΔT',
    assumptions: 'Use consistent mass-flow and specific-heat units; latent heat is not included.',
    fields: [
      { name: 'Mass flow', unit: 'kg/s', initial: 2 },
      { name: 'Specific heat', unit: 'J/(kg·K)', initial: 4180 },
      { name: 'Temperature change', unit: 'K', initial: 25 },
    ],
    unit: 'W',
    run: (v) => v[0] * v[1] * v[2],
  },
  {
    name: 'Log mean temperature difference',
    group: 'HEAT TRANSFER',
    description: 'Calculate LMTD from positive terminal temperature differences.',
    formula: 'LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)',
    assumptions: 'Multipass correction is separate. Do not use if terminal temperature differences cross.',
    fields: [
      { name: 'Terminal difference ΔT₁', unit: 'K', initial: 50 },
      { name: 'Terminal difference ΔT₂', unit: 'K', initial: 20 },
    ],
    unit: 'K',
    run: (v) => (v[0] === v[1] ? v[0] : (v[0] - v[1]) / Math.log(v[0] / v[1])),
    validate: (v) => {
      if (v[0] <= 0 || v[1] <= 0) {
        return 'Both terminal temperature differences (ΔT₁ and ΔT₂) must be strictly positive.';
      }
      return null;
    },
  },
  {
    name: 'Bearing L₁₀ life',
    group: 'ROTATING EQUIPMENT',
    description: 'Basic rating life estimate for a rolling-element bearing.',
    formula: 'L₁₀ = (C / P)ᵖ × 10⁶ revolutions',
    assumptions: 'Use p = 3 for ball bearings or 10/3 for roller bearings. Adjustments and lubrication effects are excluded.',
    fields: [
      { name: 'Dynamic rating C', unit: 'kN', initial: 30 },
      { name: 'Equivalent load P', unit: 'kN', initial: 5 },
      { name: 'Life exponent p', unit: '—', initial: 3 },
    ],
    unit: 'million rev',
    run: (v) => (v[0] / v[1]) ** v[2],
    validate: (v) => {
      if (v[1] <= 0) return 'Equivalent load P must be greater than zero.';
      if (v[0] < 0) return 'Dynamic rating C cannot be negative.';
      return null;
    },
  },
];

export function getCalcIndexFromPage(page: string): number {
  const s = (page || '').toLowerCase();
  if (s.includes('pump')) return 0;
  if (s.includes('pressure')) return 1;
  if (s.includes('flow') || s.includes('pipe')) return 2;
  if (s.includes('darcy') || s.includes('friction') || s.includes('drop')) return 3;
  if (s.includes('reynolds')) return 4;
  if (s.includes('power') || s.includes('shaft') || s.includes('torque')) return 5;
  if (s.includes('expansion') || s.includes('thermal')) return 6;
  if (s.includes('duty') || s.includes('exchanger')) return 7;
  if (s.includes('lmtd')) return 8;
  if (s.includes('bearing') || s.includes('life')) return 9;
  return 0;
}
