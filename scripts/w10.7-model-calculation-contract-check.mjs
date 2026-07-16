import assert from 'node:assert/strict';
import {
  archiveModelCalculationPackage, canonicalModelCalculationPackage,
  clearModelCalculationLedger, createModelCalculationExportArtifact,
  createModelCalculationLedger, createModelCalculationPackage,
  createModelCalculationReport, EXPORT_FORMATS, PACKAGE_MODES,
  selectModelCalculationLedgerEntry, validateModelCalculationExportArtifact,
  validateModelCalculationLedger, validateModelCalculationPackage,
  validateModelCalculationReport,
} from '../src/core/model-calculation-package/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/index.js';
import { buildCalculationFixture } from './w10.7-fixtures.mjs';

const selected = process.argv[2] || 'all';
const checks = Object.freeze({
  availability: checkEmptyAvailability,
  modes: checkPackageModes,
  mismatches: checkMismatches,
  ledger: checkLedger,
  report: checkReportProjection,
  artifacts: checkArtifactFormats,
  rendering: checkTextRendering,
  exports: checkReportsAndExports,
  immutability: checkUpstreamImmutability,
});
console.log(`\n--- W10.7 model calculation contracts · ${selected} ---\n`);
if (selected === 'all') ['availability', 'modes', 'mismatches', 'ledger', 'report', 'artifacts', 'rendering', 'immutability'].forEach((key) => checks[key]());
else if (checks[selected]) checks[selected]();
else throw new TypeError(`Unknown W10.7 contract check: ${selected}`);
console.log(`✅ W10.7 model calculation contracts ${selected} passed.\n`);

function checkEmptyAvailability() {
  assert.throws(() => createModelCalculationPackage({ packageMode: PACKAGE_MODES.SCREENING }), /screening snapshot/i);
  assert.throws(() => createModelCalculationPackage({ packageMode: PACKAGE_MODES.BEAM }), /vertical-beam snapshot/i);
}
function checkPackageModes() {
  const fixture = buildCalculationFixture({ directionReversal: true });
  const screening = createPackage(PACKAGE_MODES.SCREENING, fixture);
  const beam = createPackage(PACKAGE_MODES.BEAM, fixture);
  const combinedValue = createPackage(PACKAGE_MODES.COMBINED, fixture);
  [screening, beam, combinedValue].forEach((value) => {
    assert.equal(validateModelCalculationPackage(value).ok, true);
    assertDeepFrozen(value);
    assert.equal(value.qualificationSummary.length, 3);
    assert.match(value.limitations.join(' '), /not a full pipe-stress/i);
    assert.equal(canonicalModelCalculationPackage(value), canonicalModelCalculationPackage(value));
  });
  assert.equal(screening.verticalBeamSnapshot, null);
  assert.equal(beam.screeningSnapshot, null);
  assert.equal(combinedValue.methodEvidence.length, 2);
  assert.ok(combinedValue.verticalBeamSnapshot.solution.pathCases.some((row) => row.supportForceResults.some((support) => support.signedSupportForceN > 0)));
  assert.equal(JSON.stringify(combinedValue).includes('screenedVerticalForceN'), true);
  assert.equal(JSON.stringify(combinedValue).includes('signedSupportForceN'), true);
  assert.equal(JSON.stringify(combinedValue).includes('upwardSupportForceN'), true);

  const blocked = buildCalculationFixture({ blockedCase: 'HYD' });
  const blockedPackage = createPackage(PACKAGE_MODES.COMBINED, blocked);
  const hyd = blockedPackage.qualificationSummary.find((row) => row.loadCaseId === 'HYD');
  assert.equal(hyd.screeningQualification, 'BLOCKED');
  assert.equal(hyd.beamQualification, 'BLOCKED');
  assert.ok(hyd.blockers.length > 0);
}
function checkMismatches() {
  const left = buildCalculationFixture();
  const otherDataset = buildCalculationFixture({ datasetId: 'OTHER' });
  assert.throws(() => combined(left.screeningSnapshot, otherDataset.verticalBeamSnapshot, left.modelReference), /different datasets/);

  const otherPath = buildCalculationFixture({ datasetId: left.modelReference.datasetId, lengthsM: [3, 2] });
  assert.throws(() => combined(left.screeningSnapshot, otherPath.verticalBeamSnapshot, left.modelReference), /different vertical path models/);

  const otherProfile = buildCalculationFixture({ profileOptions: { pivotRelativeTolerance: 1e-10 } });
  assert.throws(() => createModelCalculationPackage({
    packageMode: PACKAGE_MODES.BEAM,
    verticalBeamSnapshot: { ...left.verticalBeamSnapshot, profile: otherProfile.verticalBeamSnapshot.profile },
    modelReference: left.modelReference,
  }), /profile|flexural projection/i);

  const mixedAudit = rehash({ ...structuredClone(left.verticalBeamSnapshot.audit), solutionSemanticHash: 'wrong' });
  assert.throws(() => createModelCalculationPackage({
    packageMode: PACKAGE_MODES.BEAM,
    verticalBeamSnapshot: { ...left.verticalBeamSnapshot, audit: mixedAudit },
    modelReference: left.modelReference,
  }), /audit does not match/i);
  assert.throws(() => createModelCalculationPackage({
    packageMode: PACKAGE_MODES.BEAM,
    verticalBeamSnapshot: { ...left.verticalBeamSnapshot, solution: null },
    modelReference: left.modelReference,
  }), /solution/i);
}
function checkLedger() {
  const fixture = buildCalculationFixture();
  const first = createPackage(PACKAGE_MODES.SCREENING, fixture);
  const second = createPackage(PACKAGE_MODES.BEAM, fixture);
  let ledger = createModelCalculationLedger(first.datasetId);
  ledger = archiveModelCalculationPackage(ledger, first);
  const duplicate = archiveModelCalculationPackage(ledger, first);
  assert.equal(duplicate.entries.length, 1);
  ledger = archiveModelCalculationPackage(duplicate, second);
  assert.equal(ledger.entries.length, 2);
  assert.equal(ledger.activeEntryId, ledger.entries.at(-1).entryId);
  ledger = selectModelCalculationLedgerEntry(ledger, ledger.entries[0].entryId);
  assert.equal(ledger.activeEntryId, ledger.entries[0].entryId);
  for (let index = 0; index < 105; index += 1) ledger = archiveModelCalculationPackage(ledger, rehashPackage(first, index));
  assert.equal(ledger.entries.length, 100);
  assert.equal(ledger.nextSequence, 108);
  assert.equal(validateModelCalculationLedger(ledger).ok, true);
  const cleared = clearModelCalculationLedger(ledger);
  assert.equal(cleared.entries.length, 0);
  assert.equal(cleared.nextSequence, 1);
}
function checkReportProjection() {
  const { report } = reportFixture();
  assert.equal(validateModelCalculationReport(report).ok, true);
  assert.ok(report.sections.screeningSupportForces.every((row) => 'screenedVerticalForceN' in row));
  assert.ok(report.sections.verticalBeamSupportForces.every((row) => 'signedSupportForceN' in row && 'upwardSupportForceN' in row));
}
function checkArtifactFormats() {
  const { packageValue, report } = reportFixture();
  Object.values(EXPORT_FORMATS).forEach((format) => {
    const first = createModelCalculationExportArtifact(packageValue, report, format);
    const second = createModelCalculationExportArtifact(packageValue, report, format);
    assert.equal(validateModelCalculationExportArtifact(first).ok, true);
    assert.equal(first.content, second.content);
    assert.equal(first.semanticHash, second.semanticHash);
    assert.equal(first.content.endsWith('\n'), true);
    assert.equal(new TextEncoder().encode(first.content).length, first.byteLength);
  });
}
function checkTextRendering() {
  const { packageValue, report } = reportFixture();
  const csv = createModelCalculationExportArtifact(packageValue, report, EXPORT_FORMATS.CSV).content;
  assert.match(csv, /screening force/); assert.match(csv, /beam support force/); assert.match(csv, /residual/);
  const markdown = createModelCalculationExportArtifact(packageValue, report, EXPORT_FORMATS.MARKDOWN).content;
  assert.match(markdown, /not a full pipe-stress/i); assert.match(markdown, /signedSupportForceN/);
}
function checkReportsAndExports() { checkReportProjection(); checkArtifactFormats(); checkTextRendering(); }
function checkUpstreamImmutability() {
  const fixture = buildCalculationFixture();
  const before = canonicalPrettyStringify({ screening: fixture.screeningSnapshot, beam: fixture.verticalBeamSnapshot });
  createPackage(PACKAGE_MODES.COMBINED, fixture);
  const after = canonicalPrettyStringify({ screening: fixture.screeningSnapshot, beam: fixture.verticalBeamSnapshot });
  assert.equal(after, before);
}
function reportFixture() {
  const fixture = buildCalculationFixture({ directionReversal: true });
  const packageValue = createPackage(PACKAGE_MODES.COMBINED, fixture);
  const ledger = archiveModelCalculationPackage(createModelCalculationLedger(packageValue.datasetId), packageValue);
  return { packageValue, report: createModelCalculationReport(ledger.entries[0]) };
}
function createPackage(mode, fixture) {
  return createModelCalculationPackage({
    packageMode: mode,
    screeningSnapshot: mode === PACKAGE_MODES.BEAM ? null : fixture.screeningSnapshot,
    verticalBeamSnapshot: mode === PACKAGE_MODES.SCREENING ? null : fixture.verticalBeamSnapshot,
    modelReference: fixture.modelReference,
  });
}
function combined(screeningSnapshot, verticalBeamSnapshot, modelReference) {
  return createModelCalculationPackage({ packageMode: PACKAGE_MODES.COMBINED, screeningSnapshot, verticalBeamSnapshot, modelReference });
}
function rehash(value) { const { semanticHash: _hash, ...base } = value; return { ...base, semanticHash: semanticHash(base) }; }
function rehashPackage(value, index) {
  const clone = { ...value, diagnostics: [...value.diagnostics, { code: `DIAG-${index}`, severity: 'INFO', scope: 'test', message: `Diagnostic ${index}` }] };
  const { packageId: _id, semanticHash: _hash, ...identity } = clone;
  const packageId = `model-calculation-package:${semanticHash(identity).split(':')[1]}`;
  const base = { ...identity, packageId };
  return { ...base, semanticHash: semanticHash(base) };
}
function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value); assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach((child) => assertDeepFrozen(child, seen));
}
