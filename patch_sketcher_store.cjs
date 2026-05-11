const fs = require('fs');
let content = fs.readFileSync('src/sketcher/SketcherStore.js', 'utf8');

if (!content.includes('import { findSketcherMasterComponentRow }')) {
  content = content.replace(
    "import { autoConnectPipesCmd, validateSketchCommand, convertSelectedNodeToBend, convertSelectedNodeToTee, convertSelectedNodeToOlet } from './SketcherDraftingCommands.js';",
    "import { autoConnectPipesCmd, validateSketchCommand, convertSelectedNodeToBend, convertSelectedNodeToTee, convertSelectedNodeToOlet } from './SketcherDraftingCommands.js';\nimport { findSketcherMasterComponentRow, buildMasterDbSegmentProperties } from './masterDb/sketcherMasterComponentDb.js';\nimport { insertMasterDbComponentIntoSegment } from './SketcherDraftingCommands.js';"
  );
}

if (!content.includes('insertMasterDbComponentIntoSegment:')) {
  const replacement = `  applyMasterDbComponentToSegment: (segmentId, masterDbRowId) => {
      const state = get();
      state.saveSnapshot();

      const { segments } = state;
      const segIndex = segments.findIndex(s => s.id === segmentId);
      if (segIndex < 0) return;

      const masterRow = findSketcherMasterComponentRow(masterDbRowId);
      if (!masterRow) {
          console.warn('Master DB row not found:', masterDbRowId);
          return;
      }

      const existingProps = segments[segIndex].properties || {};
      const newProps = buildMasterDbSegmentProperties(existingProps, masterRow);

      const newSegments = [...segments];
      newSegments[segIndex] = {
          ...newSegments[segIndex],
          properties: newProps
      };

      set({ segments: newSegments });
  },

  insertMasterDbComponentIntoSegment: (segmentId, masterDbRowId, options) => {
      const state = get();
      const result = insertMasterDbComponentIntoSegment({
          nodes: state.nodes,
          segments: state.segments,
          segmentId,
          masterDbRowId,
          options
      });
      state.applyDraftingCommandResult(result);
      return result;
  },`;

  content = content.replace(
    "  applyMasterDbComponentToSegment: (segmentId, masterDbRowId) => {\n      const state = get();\n      state.saveSnapshot();\n      \n      const { segments } = state;\n      const segIndex = segments.findIndex(s => s.id === segmentId);\n      if (segIndex < 0) return;\n\n      const masterRow = findSketcherMasterComponentRow(masterDbRowId);\n      if (!masterRow) {\n          console.warn('Master DB row not found:', masterDbRowId);\n          return;\n      }\n\n      const existingProps = segments[segIndex].properties || {};\n      const newProps = buildMasterDbSegmentProperties(existingProps, masterRow);\n\n      const newSegments = [...segments];\n      newSegments[segIndex] = {\n          ...newSegments[segIndex],\n          properties: newProps\n      };\n\n      set({ segments: newSegments });\n  },",
    replacement
  );
}

fs.writeFileSync('src/sketcher/SketcherStore.js', content);
