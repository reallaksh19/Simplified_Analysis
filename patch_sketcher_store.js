const fs = require('fs');
const path = 'src/sketcher/SketcherStore.js';
let content = fs.readFileSync(path, 'utf8');

const injectionBlock = `
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function vectorLengthMm(a, b) {
  const dx = Number(b[0]) - Number(a[0]);
  const dy = Number(b[1]) - Number(a[1]);
  const dz = Number(b[2]) - Number(a[2]);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function interpolatePoint(a, b, ratio) {
  return [
    Number(a[0]) + (Number(b[0]) - Number(a[0])) * ratio,
    Number(a[1]) + (Number(b[1]) - Number(a[1])) * ratio,
    Number(a[2]) + (Number(b[2]) - Number(a[2])) * ratio,
  ];
}

function nextPaddedIds(existingIds, prefix, count) {
  let maxNum = 0;

  for (const id of existingIds || []) {
    const text = String(id || '');
    if (!text.startsWith(prefix)) continue;

    const parsed = Number.parseInt(text.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }

  return Array.from({ length: count }, (_, index) =>
    `${prefix}${String(maxNum + index + 1).padStart(3, '0')}`
  );
}

function sanitizePipeProperties(originalProperties = {}) {
  const props = cloneJson(originalProperties) || {};

  props.type = 'PIPE';

  // Remove flat Master DB / component fields.
  delete props.masterDbRowId;
  delete props.masterDbVersion;
  delete props.masterDbProvenance;
  delete props.componentWeight_kg;
  delete props.componentLength_mm;
  delete props.propertySource;

  // Remove split/component metadata that should not live on pipe stubs.
  delete props.placementRatio;
  delete props.componentStartDistance_mm;
  delete props.componentEndDistance_mm;

  // Remove nested component payload if present.
  delete props.component;

  // Defensive cleanup for nested shapes introduced by editor variants.
  if (props.pipe?.componentWeight_kg != null) {
    delete props.pipe.componentWeight_kg;
  }
  if (props.pipe?.componentLength_mm != null) {
    delete props.pipe.componentLength_mm;
  }

  // Keep actual pipe data.
  props.splitSource = 'PIPE_STUB_FROM_COMPONENT_SPLIT';

  return props;
}

function buildComponentSegmentProperties(pipeProperties = {}, masterProps = {}, placement = {}) {
  return {
    ...cloneJson(pipeProperties),
    ...cloneJson(masterProps),

    type: masterProps.type,

    splitRole: 'inline-component',
    splitParentSegmentId: placement.parentSegmentId,
    placementRatio: placement.placementRatio,
    componentStartDistance_mm: placement.componentStartDistance_mm,
    componentEndDistance_mm: placement.componentEndDistance_mm,

    componentLength_mm: masterProps.componentLength_mm,
    componentWeight_kg: masterProps.componentWeight_kg,

    propertySource: masterProps.propertySource,
    masterDbRowId: masterProps.masterDbRowId,
    masterDbVersion: masterProps.masterDbVersion,
    masterDbProvenance: masterProps.masterDbProvenance,
  };
}

export const useSketchStore = create((set, get) => ({`;

content = content.replace('export const useSketchStore = create((set, get) => ({', injectionBlock);

const actionBlock = `      return { ok: true, row, diagnostic, appliedTo: targetNodeId };
  },

  splitInsertMasterDbComponentIntoSegment: (segmentId, masterDbRowId, options = {}) => {
      const row = findSketcherMasterComponentRow(masterDbRowId);

      if (!row) {
          const diagnostic = {
              severity: 'error',
              code: 'MASTER_DB_ROW_NOT_FOUND',
              message: \`Master DB row was not found: \${masterDbRowId}\`,
              data: { masterDbRowId }
          };

          set({
              lastMasterDbApplication: diagnostic,
              topologyDiagnostics: [diagnostic],
              showTopologyDiagnostics: true,
              lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_FAILED'
          });

          return { ok: false, diagnostic };
      }

      const state = get();
      const target = state.segments.find((segment) => segment.id === segmentId);

      if (!target) {
          const diagnostic = {
              severity: 'error',
              code: 'SPLIT_INSERT_TARGET_SEGMENT_NOT_FOUND',
              message: \`Cannot place component; segment \${segmentId} was not found.\`,
              data: { segmentId, masterDbRowId }
          };

          set({
              lastMasterDbApplication: diagnostic,
              topologyDiagnostics: [diagnostic],
              showTopologyDiagnostics: true,
              lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_FAILED'
          });

          return { ok: false, diagnostic };
      }

      const startNode = state.nodes[target.startNode];
      const endNode = state.nodes[target.endNode];

      if (!startNode || !endNode) {
          const diagnostic = {
              severity: 'error',
              code: 'SPLIT_INSERT_SEGMENT_NODE_MISSING',
              message: \`Cannot place component on segment \${segmentId}; start or end node is missing.\`,
              data: {
                  segmentId,
                  startNode: target.startNode,
                  endNode: target.endNode
              }
          };

          set({
              lastMasterDbApplication: diagnostic,
              topologyDiagnostics: [diagnostic],
              showTopologyDiagnostics: true,
              lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_FAILED'
          });

          return { ok: false, diagnostic };
      }

      const masterProps = buildMasterDbSegmentProperties(row);
      const segmentLength_mm = vectorLengthMm(startNode.pos, endNode.pos);
      const componentLength_mm = finiteOrNull(masterProps.componentLength_mm);
      const minimumPipeStub_mm = Number(options.minimumPipeStub_mm ?? 1);

      if (!(segmentLength_mm > 0) || !(componentLength_mm > 0)) {
          const diagnostic = {
              severity: 'error',
              code: 'SPLIT_INSERT_INVALID_LENGTH',
              message: \`Cannot place component on segment \${segmentId}; segment or component length is invalid.\`,
              data: {
                  segmentId,
                  segmentLength_mm,
                  componentLength_mm
              }
          };

          set({
              lastMasterDbApplication: diagnostic,
              topologyDiagnostics: [diagnostic],
              showTopologyDiagnostics: true,
              lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_FAILED'
          });

          return { ok: false, diagnostic };
      }

      if (componentLength_mm + 2 * minimumPipeStub_mm >= segmentLength_mm) {
          const diagnostic = {
              severity: 'error',
              code: 'SPLIT_INSERT_COMPONENT_TOO_LONG',
              message: \`Cannot place \${row.displayName}; component length \${componentLength_mm} mm is too long for selected segment length \${segmentLength_mm.toFixed(3)} mm.\`,
              data: {
                  segmentId,
                  masterDbRowId,
                  segmentLength_mm,
                  componentLength_mm,
                  minimumPipeStub_mm
              }
          };

          set({
              lastMasterDbApplication: diagnostic,
              topologyDiagnostics: [diagnostic],
              showTopologyDiagnostics: true,
              lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_FAILED'
          });

          return { ok: false, diagnostic };
      }

      const placementRatioRaw = Number(options.placementRatio ?? 0.5);
      const placementRatio = Number.isFinite(placementRatioRaw)
          ? Math.min(Math.max(placementRatioRaw, 0), 1)
          : 0.5;

      const halfComponent_mm = componentLength_mm / 2;
      const requestedCenterDistance_mm = segmentLength_mm * placementRatio;
      const centerDistance_mm = Math.min(
          Math.max(requestedCenterDistance_mm, halfComponent_mm + minimumPipeStub_mm),
          segmentLength_mm - halfComponent_mm - minimumPipeStub_mm
      );

      const componentStartDistance_mm = centerDistance_mm - halfComponent_mm;
      const componentEndDistance_mm = centerDistance_mm + halfComponent_mm;

      const componentStartRatio = componentStartDistance_mm / segmentLength_mm;
      const componentEndRatio = componentEndDistance_mm / segmentLength_mm;

      const [componentStartNodeId, componentEndNodeId] = nextPaddedIds(
          Object.keys(state.nodes),
          'N',
          2
      );

      const [upstreamSegmentId, componentSegmentId, downstreamSegmentId] = nextPaddedIds(
          state.segments.map((segment) => segment.id),
          'S',
          3
      );

      const componentStartNode = {
          pos: interpolatePoint(startNode.pos, endNode.pos, componentStartRatio),
          type: 'free',
          generatedBy: 'MASTER_DB_SPLIT_INSERT',
          splitParentSegmentId: target.id,
      };

      const componentEndNode = {
          pos: interpolatePoint(startNode.pos, endNode.pos, componentEndRatio),
          type: 'free',
          generatedBy: 'MASTER_DB_SPLIT_INSERT',
          splitParentSegmentId: target.id,
      };

      const originalProperties = target.properties || {};
      const pipeProperties = sanitizePipeProperties(originalProperties);

      const upstreamPipeSegment = {
          ...target,
          id: upstreamSegmentId,
          type: 'PIPE',
          endNode: componentStartNodeId,
          properties: {
              ...pipeProperties,
              type: 'PIPE',
              splitParentSegmentId: target.id,
              splitRole: 'upstream-pipe',
          }
      };

      const componentSegment = {
          ...target,
          id: componentSegmentId,
          type: masterProps.type,
          startNode: componentStartNodeId,
          endNode: componentEndNodeId,
          properties: buildComponentSegmentProperties(pipeProperties, masterProps, {
              parentSegmentId: target.id,
              placementRatio,
              componentStartDistance_mm,
              componentEndDistance_mm,
          })
      };

      const downstreamPipeSegment = {
          ...target,
          id: downstreamSegmentId,
          type: 'PIPE',
          startNode: componentEndNodeId,
          properties: {
              ...pipeProperties,
              type: 'PIPE',
              splitParentSegmentId: target.id,
              splitRole: 'downstream-pipe',
          }
      };

      const diagnostic = {
          severity: 'info',
          code: 'MASTER_DB_COMPONENT_SPLIT_INSERTED',
          message: \`Placed \${row.displayName} into segment \${segmentId}; segment split into upstream pipe, inline component, and downstream pipe.\`,
          data: {
              originalSegmentId: target.id,
              masterDbRowId: row.id,
              upstreamSegmentId,
              componentSegmentId,
              downstreamSegmentId,
              componentStartNodeId,
              componentEndNodeId,
              segmentLength_mm,
              componentLength_mm,
              componentWeight_kg: row.componentWeight_kg,
              placementRatio,
          }
      };

      get().saveSnapshot();

      set((current) => ({
          nodes: {
              ...current.nodes,
              [componentStartNodeId]: componentStartNode,
              [componentEndNodeId]: componentEndNode,
          },
          segments: current.segments.flatMap((segment) =>
              segment.id === target.id
                  ? [upstreamPipeSegment, componentSegment, downstreamPipeSegment]
                  : [segment]
          ),
          selectedSegmentId: componentSegmentId,
          selectedNodeId: null,
          lastMasterDbApplication: diagnostic,
          topologyDiagnostics: [diagnostic],
          showTopologyDiagnostics: true,
          lastDraftingCommand: 'MASTER_DB_SPLIT_INSERT_COMPONENT'
      }));

      return {
          ok: true,
          row,
          diagnostic,
          inserted: {
              originalSegmentId: target.id,
              upstreamSegmentId,
              componentSegmentId,
              downstreamSegmentId,
              componentStartNodeId,
              componentEndNodeId,
          }
      };
  },

  importFromComponents: () => {`;

content = content.replace(`      return { ok: true, row, diagnostic, appliedTo: targetNodeId };
  },

  importFromComponents: () => {`, actionBlock);

fs.writeFileSync(path, content, 'utf8');
