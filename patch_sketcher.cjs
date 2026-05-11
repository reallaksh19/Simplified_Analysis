const fs = require('fs');

const path = 'src/sketcher/SketcherTab.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace destructuring
const oldDestruct = /const \{\n\s+activeTool,\n\s+setActiveTool,\n\s+workingPlane,\n\s+setWorkingPlane,\n\s+importFromComponents,\n\s+importFromCanonicalGeometry,\n\s+exportToComponents,\n\s+exportToCanonicalGeometry,\n\s+clearSketch,\n\s+exportSketch,\n\s+importSketch,\n\s+selectedSegmentId,\n\s+applyMasterDbComponentToSegment,\n\} = useSketchStore\(\);/;

const newDestruct = `const {
    activeTool,
    setActiveTool,
    workingPlane,
    setWorkingPlane,
    importFromComponents,
    importFromCanonicalGeometry,
    exportToComponents,
    exportToCanonicalGeometry,
    clearSketch,
    exportSketch,
    importSketch,
    selectedSegmentId,
    insertMasterDbComponentIntoSegment,
} = useSketchStore();`;

content = content.replace(oldDestruct, newDestruct);

// Replace handlers
const oldHandlers = /const handleInsertMasterComponent = \(masterDbRowId\) => \{\n\s+if \(!selectedSegmentId\) \{\n\s+alert\('Select a pipe segment before inserting a component\.'\);\n\s+return;\n\s+\}\n\n\s+const result = applyMasterDbComponentToSegment\(selectedSegmentId, masterDbRowId\);\n\n\s+if \(!result\?\.ok\) \{\n\s+alert\(result\?\.diagnostic\?\.message \|\| 'Failed to insert component from Master DB\.'\);\n\s+\}\n\s+\};\n/;

const newHandlers = `const handleSplitInsertMasterComponent = (masterDbRowId) => {
        if (!selectedSegmentId) {
            alert('Select a pipe segment before inserting a component.');
            return;
        }

        const result = insertMasterDbComponentIntoSegment(selectedSegmentId, masterDbRowId, {
            placementRatio: 0.5,
            minimumPipeStub_mm: 1,
        });

        if (!result?.ok) {
            alert(result?.diagnostic?.message || 'Failed to split segment and insert component.');
        }
    };
`;

content = content.replace(oldHandlers, newHandlers);

// Replace button clicks
content = content.replace(/handleInsertMasterComponent\('MDB-VALVE-4IN-150-CS-001'\)/g, "handleSplitInsertMasterComponent('MDB-VALVE-4IN-150-CS-001')");
content = content.replace(/handleInsertMasterComponent\('MDB-FLANGE-4IN-150-CS-001'\)/g, "handleSplitInsertMasterComponent('MDB-FLANGE-4IN-150-CS-001')");
content = content.replace(/handleInsertMasterComponent\('MDB-VFV-4IN-150-CS-001'\)/g, "handleSplitInsertMasterComponent('MDB-VFV-4IN-150-CS-001')");

// Replace button titles
content = content.replace(/title="Insert valve data from Master DB onto selected segment"/g, 'title="Split selected pipe and insert valve data from Master DB"');
content = content.replace(/title="Insert flange data from Master DB onto selected segment"/g, 'title="Split selected pipe and insert flange data from Master DB"');
content = content.replace(/title="Insert flange-valve-flange assembly data from Master DB onto selected segment"/g, 'title="Split selected pipe and insert flange-valve-flange assembly data from Master DB"');

fs.writeFileSync(path, content);
