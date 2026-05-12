const fs = require('fs');
const path = 'e2e/fixtures/3d-simplified/sketcher-property-contract-run.json';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(`    "segmentsWithInsulation": 1,
    "segmentsWithComponentWeight": 1`, `    "segmentsWithInsulation": 1,
    "segmentsWithComponentWeight": 0`);

fs.writeFileSync(path, content, 'utf8');
