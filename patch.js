const fs = require('fs');
const content = fs.readFileSync('src/sketcher/SketcherStore.js', 'utf8');
console.log(content.includes('insertMasterDbComponentIntoSegment'));
