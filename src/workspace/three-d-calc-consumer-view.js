export function renderThreeDCalcConsumer(documentRef, model, eligibility = {}, status = {}) {
  const section = documentRef.createElement('section');
  section.className = 'three-d-calc-consumer';
  section.dataset.role = 'three-d-calc-consumer';
  section.innerHTML = model ? availableMarkup(model, eligibility, status) : unavailableMarkup(status);
  return section;
}

function availableMarkup(model, eligibility, status) {
  return `
    <header class="three-d-calc-consumer__header">
      <div><span class="panel-eyebrow">Exact model and scalar beam evidence</span><h1>3D Calc</h1></div>
      <p class="three-d-calc-consumer__claim">Read-only evidence review. Not a second 3D viewport.</p>
    </header>
    <section class="three-d-calc-consumer__controls" aria-label="3D Calc actions">
      ${action('export-shared-model','Export Shared Model',eligibility.EXPORT_SHARED_MODEL)}
      ${action('rebuild-topology','Rebuild Exact Topology',eligibility.REBUILD_TOPOLOGY_EXACT)}
      ${action('export-topology','Export Topology',eligibility.EXPORT_TOPOLOGY)}
      ${action('rebuild-supports','Rebuild Support Evidence',eligibility.REBUILD_SUPPORT_EVIDENCE)}
      ${action('export-supports','Export Support / Restraint',eligibility.EXPORT_SUPPORT_RESTRAINT)}
      ${action('rebuild-beam','Rebuild Vertical Beam Model',eligibility.REBUILD_VERTICAL_BEAM_MODEL)}
      ${action('solve-beam','Solve Vertical Beam',eligibility.SOLVE_VERTICAL_BEAM)}
      ${action('export-beam','Export Vertical Beam',eligibility.EXPORT_VERTICAL_BEAM)}
      <output data-role="three-d-calc-status" aria-live="polite">${escapeHtml(status.message || '')}</output>
    </section>
    ${identitySection(model)}
    ${sourceSection(model.sourceReferences)}
    ${summarySection(model.modelSummary)}
    ${componentsSection(model.components)}
    ${portsSection(model.ports)}
    ${connectionsSection(model.connections)}
    ${topologySection(model.topologyComponents)}
    ${attachmentsSection(model.supportAttachments)}
    ${restraintsSection(model.restraintCapabilities)}
    ${loadsSection(model.loadPrimitives)}
    ${flexuralSection(model.flexuralProperties)}
    ${beamSection(model.verticalBeamCases)}
    ${listSection('Engineering assumptions',model.assumptions,'three-d-calc-assumptions')}
    ${listSection('Engineering limitations',model.limitations,'three-d-calc-limitations')}
    ${diagnosticsSection(model.diagnostics)}
  `;
}

function identitySection(model) {
  return card('Review identity','three-d-calc-identity',definitionList([
    ['Dataset ID',model.datasetId],['Review model ID',model.reviewModelId],['Context semantic hash',model.contextSemanticHash],
    ['Components',model.summary.componentCount],['Ports',model.summary.portCount],['Connections',model.summary.connectionCount],
    ['Model-load evidence',model.summary.optionalModelLoadsIncluded?'Included':'Not included'],
    ['Vertical-beam evidence',model.summary.optionalVerticalBeamIncluded?'Included':'Not included'],
  ]));
}
function sourceSection(refs) { return card('Exact source semantic hashes','three-d-calc-source-references',definitionList(Object.entries(refs))); }
function summarySection(row) { return card('Model summary','three-d-calc-model-summary',definitionList(Object.entries(row).map(([key,value])=>[key,json(value)]))); }
function componentsSection(rows) {
  return tableCard('Component geometry and identity','three-d-calc-components',['Component','Source entity','Type','Source path','Line','System','Zone','Start','End','Center','Ports','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.componentKey)}</td><td>${e(r.sourceEntityId)}</td><td>${e(r.componentType)}</td><td>${e(r.sourcePath)}</td><td>${e(r.lineIdentity)}</td><td>${e(r.systemIdentity)}</td><td>${e(r.zoneIdentity)}</td><td>${e(json(r.startPoint))}</td><td>${e(json(r.endPoint))}</td><td>${e(json(r.centerPoint))}</td><td>${list(r.portKeys)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function portsSection(rows) {
  return tableCard('Port evidence','three-d-calc-ports',['Port','Component','Role','Position','Source reference','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.portKey)}</td><td>${e(r.componentKey)}</td><td>${e(r.role)}</td><td>${e(json(r.position))}</td><td>${e(json(r.sourceReference))}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function connectionsSection(rows) {
  return tableCard('Connection evidence','three-d-calc-connections',['Connection','From port','To port','From component','To component','Evidence','State','Distance','Identity','Alternatives','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.connectionId)}</td><td>${e(r.fromPortKey)}</td><td>${e(r.toPortKey)}</td><td>${e(r.fromComponentKey)}</td><td>${e(r.toComponentKey)}</td><td>${e(r.evidenceType)}</td><td>${e(r.resolutionState)}</td><td>${num(r.distanceCanonical)}</td><td>${e(json(r.identityCompatibility))}</td><td>${list(r.alternativeTargetIds)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function topologySection(rows) {
  return tableCard('Topology health, terminal, junction and cycle evidence','three-d-calc-topology',['Connected component','Components','Ports','Connections','Terminals','Junctions','Cycle','Qualification','Blockers','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.connectedComponentId)}</td><td>${list(r.componentKeys)}</td><td>${list(r.portKeys)}</td><td>${list(r.connectionIds)}</td><td>${list(r.terminalEvidence.portKeys)}</td><td>${list(r.junctionEvidence.portKeys)}</td><td>${e(r.cycleEvidence.cyclic)}</td><td>${e(r.qualification)}</td><td>${list(r.blockers)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function attachmentsSection(rows) {
  return tableCard('Support attachment evidence','three-d-calc-attachments',['Attachment','Support','Status','Component','Port','Target','Evidence','Projected point','Distance','Segment','Confidence','Identity','Alternatives','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.attachmentId)}</td><td>${e(r.supportKey)}</td><td>${e(r.status)}</td><td>${e(r.attachedComponentKey)}</td><td>${e(r.attachedPortKey)}</td><td>${e(r.targetId)}</td><td>${e(r.evidenceType)}</td><td>${e(json(r.projectedPointCanonical))}</td><td>${num(r.distanceCanonical)}</td><td>${num(r.segmentParameter)}</td><td>${num(r.confidence)}</td><td>${e(json(r.identityCompatibility))}</td><td>${list(r.alternativeTargetIds)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function restraintsSection(rows) {
  return tableCard('Restraint capability evidence','three-d-calc-restraints',['Support','Attachment','Qualification','Solver eligible','Vertical','Lateral','Longitudinal','Rotational','Gap','Stiffness','Spring','Friction','Source evidence','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.supportKey)}</td><td>${e(r.attachmentId)}</td><td>${e(r.qualification)}</td><td>${e(r.solverEligible)}</td><td>${e(json(r.vertical))}</td><td>${e(json(r.lateral))}</td><td>${e(json(r.longitudinal))}</td><td>${e(json(r.rotational))}</td><td>${e(json(r.gapEvidence))}</td><td>${e(json(r.stiffnessEvidence))}</td><td>${e(json(r.springEvidence))}</td><td>${e(json(r.frictionEvidence))}</td><td>${e(json(r.sourceEvidence))}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function loadsSection(rows) {
  return tableCard('Model-load evidence','three-d-calc-loads',['Primitive','Case','Component','Type','Geometry','Mass','Force','Moment','Direction','globalVector','Formula trace','Source evidence','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.primitiveId)}</td><td>${e(r.loadCaseId)}</td><td>${e(r.componentKey)}</td><td>${e(r.primitiveType)}</td><td>${e(json(r.geometry))}</td><td>${e(json(r.massEvidence))}</td><td>${e(json(r.forceEvidence))}</td><td>${e(json(r.momentEvidence))}</td><td>${e(r.semanticDirection)}</td><td>${e(json(r.globalVector))}</td><td>${trace(r.formulaTrace)}</td><td>${e(json(r.sourceEvidence))}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function flexuralSection(rows) {
  return tableCard('Flexural-property evidence','three-d-calc-flexural',['Path','Component','Qualification','Source mode','Elastic modulus','Second moment','Flexural rigidity','Formula traces','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.pathId)}</td><td>${e(r.componentKey)}</td><td>${e(r.qualification)}</td><td>${e(r.sourceMode)}</td><td>${e(json(r.elasticModulusEvidence))}</td><td>${e(json(r.secondMomentEvidence))}</td><td>${e(json(r.flexuralRigidityEvidence))}</td><td>${trace(r.formulaTrace)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function beamSection(rows) {
  return tableCard('Scalar linear-elastic vertical Euler–Bernoulli beam evidence','three-d-calc-beam',['Path','Case','Qualification','Nodes','Elements','Free DOF','Constrained DOF','Supports','Applied force N','signedSupportForceN','Max displacement m','Max rotation rad','Force residual N','Moment residual N·m','Matrix residual N','Support-force rows','Node displacement rows','Node rotation rows','Blockers','Diagnostics'],rows.map((r)=>`<tr><td>${e(r.pathId)}</td><td>${e(r.loadCaseId)}</td><td>${e(r.qualification)}</td><td>${num(r.nodeCount)}</td><td>${num(r.elementCount)}</td><td>${num(r.freeDofCount)}</td><td>${num(r.constrainedDofCount)}</td><td>${list(r.qualifiedSupports)}</td><td>${num(r.appliedForceN)}</td><td>${num(r.signedSupportForceN)}</td><td>${num(r.maximumAbsoluteDisplacementM)}</td><td>${num(r.maximumAbsoluteRotationRad)}</td><td>${num(r.forceResidualN)}</td><td>${num(r.momentResidualNm)}</td><td>${num(r.matrixResidualN)}</td><td>${e(json(r.supportForceRows))}</td><td>${e(json(r.nodeDisplacementRows))}</td><td>${e(json(r.nodeRotationRows))}</td><td>${list(r.blockers)}</td><td>${diag(r.diagnostics)}</td></tr>`).join(''));
}
function diagnosticsSection(rows) { return tableCard('Review diagnostics','three-d-calc-diagnostics',['Code','Severity','Scope','Message'],rows.map((r)=>`<tr><td>${e(r.code)}</td><td>${e(r.severity)}</td><td>${e(r.scope)}</td><td>${e(r.message)}</td></tr>`).join('')); }
function listSection(title,rows,role) { return card(title,role,rows.length?`<ul>${rows.map((r)=>`<li>${e(r)}</li>`).join('')}</ul>`:'<p class="panel-empty">None recorded.</p>'); }
function action(name,label,enabled) { return `<button type="button" data-three-d-calc-action="${name}" aria-disabled="${String(!enabled)}">${e(label)}</button>`; }
function unavailableMarkup(status) { return `<header class="three-d-calc-consumer__header"><div><span class="panel-eyebrow">Exact model and scalar beam evidence</span><h1>3D Calc</h1></div></header><section class="three-d-calc-card" data-role="three-d-calc-unavailable"><h2>3D Calc unavailable</h2><p class="panel-empty">${e(status.message || 'Import a dataset with complete validated W10.1-W10.3 evidence.')}</p></section>`; }
function card(title,role,content) { return `<section class="three-d-calc-card" data-role="${role}"><h2>${e(title)}</h2>${content}</section>`; }
function tableCard(title,role,headings,body) { return card(title,role,`<div class="three-d-calc-table-wrap"><table aria-label="${e(title)}"><thead><tr>${headings.map((h)=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${headings.length}">No evidence recorded.</td></tr>`}</tbody></table></div>`); }
function definitionList(rows) { return `<dl>${rows.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v??'—')}</dd></div>`).join('')}</dl>`; }
function list(rows) { return Array.isArray(rows)&&rows.length?rows.map(e).join('<br>'):'—'; }
function diag(rows) { return Array.isArray(rows)&&rows.length?rows.map((r)=>e(`${r.code||''}: ${r.message||''}`)).join('<br>'):'—'; }
function trace(rows) { return Array.isArray(rows)&&rows.length?rows.map((r)=>`<code>${e(json(r))}</code>`).join('<br>'):'—'; }
function num(value) { return Number.isFinite(value)?String(value):'—'; }
function json(value) { return value===undefined||value===null?'null':JSON.stringify(value); }
function e(value) { return escapeHtml(value); }
function escapeHtml(value) { return String(value??'').replace(/[&<>'"]/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char])); }
