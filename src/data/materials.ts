export const materialHeaders = [
  { label: 'MATERIAL', unit: '' },
  { label: 'DENSITY', unit: 'kg/m³' },
  { label: "YOUNG'S MODULUS", unit: 'GPa' },
  { label: "POISSON'S RATIO", unit: '' },
  { label: 'YIELD STRENGTH', unit: 'MPa' },
  { label: 'TENSILE STRENGTH', unit: 'MPa' },
  { label: 'THERMAL COND.', unit: 'W/m·K' },
  { label: 'SPECIFIC HEAT', unit: 'J/kg·K' },
];

export const materials: string[][] = [
  ['Carbon steel (typical)', '7850', '200', '0.30', '250', '400–550', '50', '486'],
  ['Stainless steel 304', '8000', '193', '0.29', '215', '505–750', '16.2', '500'],
  ['Stainless steel 316', '8000', '193', '0.30', '205', '515–690', '16.3', '500'],
  ['Cast iron (gray)', '7200', '110', '0.26', '130', '150–300', '50', '460'],
  ['Aluminium alloy (typical)', '2700', '69', '0.33', '95', '180–310', '167', '900'],
  ['Copper', '8960', '117', '0.34', '70', '210–250', '401', '385'],
  ['Brass', '8500', '100', '0.34', '100', '300–550', '109', '380'],
  ['Bronze', '8800', '110', '0.34', '125', '300–600', '60', '380'],
  ['Alloy steel (typical)', '7850', '210', '0.29', '650', '800–1000', '42', '470'],
];
