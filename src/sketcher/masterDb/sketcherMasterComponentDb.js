export const SKETCHER_MASTER_COMPONENT_DB_VERSION = 'sketcher-master-component-db-v1';

export const SKETCHER_MASTER_COMPONENT_ROWS = [
  {
    id: 'MDB-VFV-4IN-150-CS-001',
    componentType: 'FLANGE_VALVE_FLANGE',
    displayName: '4 in 150# CS flange-valve-flange assembly',
    nps: '4',
    dn_mm: 100,
    ratingClass: 150,
    material: 'CARBON STEEL',
    schedule: 'STD',
    componentLength_mm: 650,
    componentWeight_kg: 86,
    source: 'SLICE-F-MASTER-DB-FIXTURE',
    sourceRevision: 'slice-f-v1',
    verified: true,
    notes: 'Deterministic fixture row for Slice F. Not a complete project Master DB.'
  },
  {
    id: 'MDB-VALVE-4IN-150-CS-001',
    componentType: 'VALVE',
    displayName: '4 in 150# CS valve',
    nps: '4',
    dn_mm: 100,
    ratingClass: 150,
    material: 'CARBON STEEL',
    schedule: 'STD',
    componentLength_mm: 300,
    componentWeight_kg: 52,
    source: 'SLICE-F-MASTER-DB-FIXTURE',
    sourceRevision: 'slice-f-v1',
    verified: true,
    notes: 'Deterministic fixture row for Slice F.'
  },
  {
    id: 'MDB-FLANGE-4IN-150-CS-001',
    componentType: 'FLANGE',
    displayName: '4 in 150# CS flange',
    nps: '4',
    dn_mm: 100,
    ratingClass: 150,
    material: 'CARBON STEEL',
    schedule: 'STD',
    componentLength_mm: 42,
    componentWeight_kg: 17,
    source: 'SLICE-F-MASTER-DB-FIXTURE',
    sourceRevision: 'slice-f-v1',
    verified: true,
    notes: 'Deterministic fixture row for Slice F.'
  }
];

function text(value) {
  return String(value ?? '').trim();
}

export function listSketcherMasterComponentRows() {
  return SKETCHER_MASTER_COMPONENT_ROWS.map((row) => ({ ...row }));
}

export function findSketcherMasterComponentRow(rowId) {
  const wanted = text(rowId);
  return SKETCHER_MASTER_COMPONENT_ROWS.find((row) => row.id === wanted) || null;
}

export function buildMasterDbSegmentProperties(row) {
  if (!row) {
    throw new Error('Master DB row is required.');
  }

  return {
    type: row.componentType,
    dn_mm: row.dn_mm,
    bore: row.dn_mm,
    nps: row.nps,
    schedule: row.schedule,
    material: row.material,
    ratingClass: row.ratingClass,
    componentLength_mm: row.componentLength_mm,
    componentWeight_kg: row.componentWeight_kg,
    propertySource: row.source,
    masterDbRowId: row.id,
    masterDbVersion: SKETCHER_MASTER_COMPONENT_DB_VERSION,
    masterDbProvenance: {
      rowId: row.id,
      displayName: row.displayName,
      source: row.source,
      sourceRevision: row.sourceRevision,
      verified: row.verified,
      notes: row.notes
    }
  };
}