export const ImperialToMetric = {
  in_to_mm: (val) => val * 25.4,
  ft_to_m: (val) => val * 0.3048,
  lbs_to_N: (val) => val * 4.44822,
  psi_to_MPa: (val) => val * 0.00689476,
  F_to_C: (val) => (val - 32) * 5/9,
  lbs_in_to_Nm: (val) => val * 0.1129848
};

export const MetricToImperial = {
  mm_to_in: (val) => val / 25.4,
  m_to_ft: (val) => val / 0.3048,
  N_to_lbs: (val) => val / 4.44822,
  MPa_to_psi: (val) => val / 0.00689476,
  C_to_F: (val) => (val * 9/5) + 32,
  Nm_to_lbs_in: (val) => val / 0.1129848
};

// UI Helper to render the correct label
export const getUnitLabel = (unitSystem, type) => {
  if (unitSystem === 'Imperial') {
    switch (type) {
      case 'length': return 'ft';
      case 'shortLength': return 'in';
      case 'force': return 'lbs';
      case 'pressure': return 'PSI';
      case 'temp': return '°F';
      default: return '';
    }
  } else {
    switch (type) {
      case 'length': return 'm';
      case 'shortLength': return 'mm';
      case 'force': return 'N';
      case 'pressure': return 'MPa';
      case 'temp': return '°C';
      default: return '';
    }
  }
};

// UI Helper to format output display values
export const formatUnit = (unitSystem, type, value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return '-';
  if (unitSystem === 'Imperial') {
    return Number(value).toFixed(decimals); // Backend is natively Imperial
  }

  // Convert to Metric for display
  let converted = value;
  switch (type) {
    case 'length': converted = ImperialToMetric.ft_to_m(value); break;
    case 'shortLength': converted = ImperialToMetric.in_to_mm(value); break;
    case 'force': converted = ImperialToMetric.lbs_to_N(value); break;
    case 'pressure': converted = ImperialToMetric.psi_to_MPa(value); break;
    case 'temp': converted = ImperialToMetric.F_to_C(value); break;
    default: break;
  }
  return converted.toFixed(decimals);
};
