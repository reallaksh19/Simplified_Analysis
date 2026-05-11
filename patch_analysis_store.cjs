const fs = require('fs');

const path = 'src/3d-analysis/AnalysisStore.js';
let content = fs.readFileSync(path, 'utf8');

const target1 = `const masterDbRowId = textOrEmpty(props.masterDbRowId);
          const masterDbVersion = textOrEmpty(props.masterDbVersion);
          const masterDbProvenance = props.masterDbProvenance ? { ...props.masterDbProvenance } : null;`;

const insert1 = `
          const loadShareNodeIds = Array.isArray(seg.loadShareNodeIds)
              ? seg.loadShareNodeIds
              : Array.isArray(props.loadShareNodeIds)
                ? props.loadShareNodeIds
                : [];
`;

content = content.replace(target1, target1 + insert1);

const target2 = `propertySource: props.propertySource || 'sketcher-segment-properties',
              masterDbRowId,
              masterDbVersion,
              masterDbProvenance,`;

const insert2 = `
              loadShareNodeIds,`;

content = content.replace(target2, target2 + insert2);

fs.writeFileSync(path, content);
