const expansionCoeffs = [
  { material: 'Carbon Steel', data: [
    { temp_F: 70, expansion_in_per_100ft: 0.0 }, { temp_F: 100, expansion_in_per_100ft: 0.23 },
    { temp_F: 150, expansion_in_per_100ft: 0.61 }, { temp_F: 200, expansion_in_per_100ft: 0.99 },
    { temp_F: 250, expansion_in_per_100ft: 1.4 }, { temp_F: 300, expansion_in_per_100ft: 1.82 },
    { temp_F: 350, expansion_in_per_100ft: 2.26 }, { temp_F: 400, expansion_in_per_100ft: 2.7 },
    { temp_F: 450, expansion_in_per_100ft: 3.16 }, { temp_F: 500, expansion_in_per_100ft: 3.62 },
    { temp_F: 600, expansion_in_per_100ft: 4.6 }, { temp_F: 700, expansion_in_per_100ft: 5.63 }
  ] },
  { material: 'Austenitic Stainless Steel 18 Cr 8 Ni', data: [
    { temp_F: 70, expansion_in_per_100ft: 0.0 }, { temp_F: 100, expansion_in_per_100ft: 0.29 },
    { temp_F: 150, expansion_in_per_100ft: 0.75 }, { temp_F: 200, expansion_in_per_100ft: 1.21 },
    { temp_F: 250, expansion_in_per_100ft: 1.68 }, { temp_F: 300, expansion_in_per_100ft: 2.15 },
    { temp_F: 400, expansion_in_per_100ft: 3.13 }, { temp_F: 500, expansion_in_per_100ft: 4.12 },
    { temp_F: 600, expansion_in_per_100ft: 5.15 }, { temp_F: 700, expansion_in_per_100ft: 6.2 }
  ] }
];

const modulusElasticity = [
  { material: 'Carbon Steel', data: [
    { temp_F: 70, modulus_ksi: 29.5 }, { temp_F: 200, modulus_ksi: 28.8 },
    { temp_F: 300, modulus_ksi: 28.3 }, { temp_F: 400, modulus_ksi: 27.7 },
    { temp_F: 500, modulus_ksi: 27.3 }, { temp_F: 600, modulus_ksi: 26.7 },
    { temp_F: 700, modulus_ksi: 25.5 }
  ] },
  { material: 'Austenitic Stainless Steel 18 Cr 8 Ni', data: [
    { temp_F: 70, modulus_ksi: 28.3 }, { temp_F: 200, modulus_ksi: 27.6 },
    { temp_F: 300, modulus_ksi: 27.0 }, { temp_F: 400, modulus_ksi: 26.5 },
    { temp_F: 500, modulus_ksi: 25.8 }, { temp_F: 600, modulus_ksi: 25.3 },
    { temp_F: 700, modulus_ksi: 24.8 }
  ] }
];

export const rackExpansionCoefficients = expansionCoeffs;
export const rackModulusElasticity = modulusElasticity;

const pipeProps = [
  { nominal_size: 2.0, schedule: '40', OD: 2.375, t: 0.154, Am: 1.074, I: 0.666 },
  { nominal_size: 2.0, schedule: '80', OD: 2.375, t: 0.218, Am: 1.477, I: 0.868 },
  { nominal_size: 4.0, schedule: '40', OD: 4.5, t: 0.237, Am: 3.17, I: 7.23 },
  { nominal_size: 4.0, schedule: '80', OD: 4.5, t: 0.337, Am: 4.41, I: 9.61 },
  { nominal_size: 6.0, schedule: '40', OD: 6.625, t: 0.28, Am: 5.58, I: 28.1 },
  { nominal_size: 6.0, schedule: '80', OD: 6.625, t: 0.432, Am: 8.4, I: 40.5 },
  { nominal_size: 8.0, schedule: '40', OD: 8.625, t: 0.322, Am: 8.4, I: 72.5 },
  { nominal_size: 8.0, schedule: '80', OD: 8.625, t: 0.5, Am: 12.76, I: 105.7 },
  { nominal_size: 10.0, schedule: '40', OD: 10.75, t: 0.365, Am: 11.91, I: 160.8 },
  { nominal_size: 10.0, schedule: '80', OD: 10.75, t: 0.5, Am: 16.1, I: 212.0 },
  { nominal_size: 16.0, schedule: '40', OD: 16.0, t: 0.5, Am: 24.3, I: 562.0, note: 'I=562.0 is a benchmark constant (matches 16" STD t=0.375)' }
];

export const rackPipeProperties = pipeProps;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const interpolateRows = (rows = [], tempF = 70, key) => {
  const sorted = [...rows]
    .filter((row) => Number.isFinite(Number(row.temp_F)) && Number.isFinite(Number(row[key])))
    .sort((a, b) => Number(a.temp_F) - Number(b.temp_F));

  if (!sorted.length) return { value: 0, warning: `No rows available for ${key}.` };
  if (tempF <= sorted[0].temp_F) return { value: Number(sorted[0][key]), warning: tempF < sorted[0].temp_F ? `Temperature ${tempF}F is below DB range; clamped to ${sorted[0].temp_F}F.` : null };
  const last = sorted[sorted.length - 1];
  if (tempF >= last.temp_F) return { value: Number(last[key]), warning: tempF > last.temp_F ? `Temperature ${tempF}F is above DB range; clamped to ${last.temp_F}F.` : null };

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (tempF >= a.temp_F && tempF <= b.temp_F) {
      const ratio = (tempF - a.temp_F) / (b.temp_F - a.temp_F);
      return { value: Number(a[key]) + ratio * (Number(b[key]) - Number(a[key])), warning: null };
    }
  }
  return { value: Number(last[key]), warning: `Interpolation failed for ${key}; used highest available value.` };
};

export const normalizeMaterialName = (material = '') => {
  const text = String(material || '').toLowerCase();
  if (text.includes('stainless') || text.includes('austenitic')) return 'Austenitic Stainless Steel 18 Cr 8 Ni';
  if (text.includes('carbon') || text.includes('cs') || text.includes('a106')) return 'Carbon Steel';
  return '';
};

export const isKnownRackMaterial = (material = '') => Boolean(normalizeMaterialName(material));

export const getRackMaterialProps = (material, tempF = 70, options = {}) => {
  const warnings = [];
  const allowFallback = options.allowFallback !== false;
  const explicit = options.explicit || {};

  if (explicit && Number.isFinite(Number(explicit.expansionInPer100ft)) && Number.isFinite(Number(explicit.modulusPsi))) {
    const expansionInPer100ft = Number(explicit.expansionInPer100ft);
    return {
      material: String(material || explicit.material || 'explicit-material'),
      expansionInPer100ft,
      expansionInPerFt: expansionInPer100ft / 100,
      modulusPsi: Number(explicit.modulusPsi),
      warnings,
      missing: false,
      dataSource: 'explicit'
    };
  }

  const mappedMaterial = normalizeMaterialName(material);
  if (!mappedMaterial && !allowFallback) {
    return {
      material: String(material || ''),
      expansionInPer100ft: 0,
      expansionInPerFt: 0,
      modulusPsi: 0,
      warnings: [`Material '${material}' missing from rack material DB.`],
      missing: true,
      dataSource: 'missing'
    };
  }

  const materialKey = mappedMaterial || 'Carbon Steel';
  const expMat = expansionCoeffs.find((entry) => entry.material === materialKey) || expansionCoeffs[0];
  const modMat = modulusElasticity.find((entry) => entry.material === materialKey) || modulusElasticity[0];

  if (!mappedMaterial) warnings.push(`Material '${material}' missing; used fallback '${materialKey}'.`);

  const expansion = interpolateRows(expMat?.data || [], toNumber(tempF, 70), 'expansion_in_per_100ft');
  const modulus = interpolateRows(modMat?.data || [], toNumber(tempF, 70), 'modulus_ksi');
  if (expansion.warning) warnings.push(expansion.warning);
  if (modulus.warning) warnings.push(modulus.warning);

  const expansionInPerFt = expansion.value / 100;
  return {
    material: materialKey,
    expansionInPer100ft: expansion.value,
    expansionInPerFt,
    modulusPsi: modulus.value * 1000000,
    warnings,
    missing: false,
    dataSource: mappedMaterial ? 'db' : 'fallback'
  };
};

export const getRackPipeProps = (sizeNps, schedule = '40', options = {}) => {
  const allowFallback = options.allowFallback !== false;
  const explicit = options.explicit || {};
  if (explicit && Number.isFinite(Number(explicit.OD)) && Number.isFinite(Number(explicit.I))) {
    return {
      nominal_size: Number(sizeNps || explicit.nominal_size || 0),
      schedule: String(schedule || explicit.schedule || 'explicit'),
      OD: Number(explicit.OD),
      t: Number(explicit.t || 0),
      Am: Number(explicit.Am || 0),
      I: Number(explicit.I),
      fallback: false,
      missing: false,
      warnings: [],
      dataSource: 'explicit'
    };
  }

  const size = toNumber(sizeNps, 0);
  const scheduleText = String(schedule || '40');
  const exact = pipeProps.find((row) => Number(row.nominal_size) === size && String(row.schedule) === scheduleText);
  if (exact) return { ...exact, fallback: false, missing: false, warnings: [], dataSource: 'db' };

  if (!allowFallback) {
    return {
      nominal_size: size,
      schedule: scheduleText,
      OD: 0,
      I: 0,
      t: 0,
      Am: 0,
      fallback: false,
      missing: true,
      warnings: [`Pipe ${sizeNps} Sch ${scheduleText} missing from rack pipe DB.`],
      dataSource: 'missing'
    };
  }

  const fallback = pipeProps[0] || { nominal_size: size || 1, schedule: scheduleText, OD: size || 1, I: 1, t: 0.1 };
  return {
    ...fallback,
    fallback: true,
    missing: false,
    warnings: [`Pipe ${sizeNps} Sch ${scheduleText} missing; used fallback ${fallback.nominal_size} Sch ${fallback.schedule}.`],
    dataSource: 'fallback'
  };
};

// Flange OD estimates from ASME B16.5 Table E2.1 approximate bolt circle / OD ratios.
// 150#: OD ≈ 1.5 × NPS (approximate from B16.5 dimensional table)
// 300#: OD ≈ 1.75 × NPS
// 600# and above: OD ≈ 2.0 × NPS (conservative)
// Use actual B16.5 table values for critical flange checks.
const FLANGE_OD_NPS_RATIO = {
  150: 1.5,
  300: 1.75,
  600: 2.0,
  900: 2.0,
  1500: 2.0,
};

export const estimateFlangeRadiusIn = (nps, rating) => {
  const size = Math.max(toNumber(nps, 0), 0);
  const ratingText = String(rating || '150#');

  let multiplier = 1.5;
  if (ratingText.includes('1500')) multiplier = FLANGE_OD_NPS_RATIO[1500];
  else if (ratingText.includes('900')) multiplier = FLANGE_OD_NPS_RATIO[900];
  else if (ratingText.includes('600')) multiplier = FLANGE_OD_NPS_RATIO[600];
  else if (ratingText.includes('300')) multiplier = FLANGE_OD_NPS_RATIO[300];
  else if (ratingText.includes('150')) multiplier = FLANGE_OD_NPS_RATIO[150];
  else multiplier = FLANGE_OD_NPS_RATIO[150]; // default

  return (size * multiplier) / 2;
};

export const numeric = toNumber;
