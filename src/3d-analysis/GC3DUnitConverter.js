export const UC = {
  // Length
  mm_to_in:  (mm)  => mm / 25.4,
  in_to_mm:  (inch) => inch * 25.4,
  in_to_ft:  (inch) => inch / 12,
  ft_to_in:  (ft)  => ft * 12,
  mm_to_ft:  (mm)  => mm / 304.8,

  // Stress
  psi_to_MPa: (psi) => psi * 0.00689476,
  MPa_to_psi: (MPa) => MPa / 0.00689476,

  // Force
  lbf_to_N:   (lbf) => lbf * 4.44822,
  N_to_lbf:   (N)   => N / 4.44822,

  // Moment
  inlbf_to_Nmm: (inlbf) => inlbf * 112.985,
  inlbf_to_kNm: (inlbf) => (inlbf * 112.985) / 1000000,

  // Temperature
  C_to_F: (C) => C * 9/5 + 32,
  F_to_C: (F) => (F - 32) * 5/9,

  // Thermal expansion
  per_C_to_per_F: (perC) => perC / 1.8,
  per_F_to_per_C: (perF) => perF * 1.8,
};

/**
 * Display formatter: converts internal imperial value to display unit.
 * @param {number} value - Internal value (imperial)
 * @param {string} quantity - 'length'|'stress'|'force'|'moment'|'temperature'|'expansion'
 * @param {string} unitSystem - 'imperial'|'si'
 * @param {number} precision - decimal places
 * @returns {string} Formatted string with unit suffix
 */
export function displayValue(value, quantity, unitSystem, precision = 1) {
  if (value == null || isNaN(value)) return 'N/A';

  switch (quantity) {
    case 'length':
      if (unitSystem === 'si') {
        return `${UC.in_to_mm(value).toFixed(precision)} mm`;
      }
      return `${value.toFixed(precision)} in`;

    case 'stress':
      if (unitSystem === 'si') {
        return `${UC.psi_to_MPa(value).toFixed(precision)} MPa`;
      }
      return `${value.toFixed(precision)} psi`;

    case 'force':
      if (unitSystem === 'si') {
        return `${UC.lbf_to_N(value).toFixed(precision)} N`;
      }
      return `${value.toFixed(precision)} lbf`;

    case 'moment':
      if (unitSystem === 'si') {
        return `${UC.inlbf_to_Nmm(value).toFixed(precision)} N·mm`;
      }
      return `${value.toFixed(precision)} in·lbf`;

    case 'temperature':
      if (unitSystem === 'si') {
        return `${UC.F_to_C(value).toFixed(precision)} °C`;
      }
      return `${value.toFixed(precision)} °F`;

    case 'expansion':
      if (unitSystem === 'si') {
        return `${UC.per_F_to_per_C(value).toExponential(precision)} /°C`;
      }
      return `${value.toExponential(precision)} /°F`;

    default:
      return `${value.toFixed(precision)}`;
  }
}
