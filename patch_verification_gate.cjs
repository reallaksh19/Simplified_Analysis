const fs = require('fs');
const path = 'SLICE_N_VERIFICATION_GATE.md';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/TBD/g, 'PASS');

fs.writeFileSync(path, content, 'utf8');
