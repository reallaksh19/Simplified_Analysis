/**
 * The Graph Translation Layer
 * Converts between the flat 3D Viewer PCF array and the topological Sketcher Graph.
 */

// Tolerance for merging nodes (mm)
const TOLERANCE = 1.0;

const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));

export const buildGraphFromComponents = (components) => {
    const nodes = {};
    const segments = [];
    const warnings = [];
    let nodeCounter = 1;
    let segCounter = 1;

    if (!Array.isArray(components)) {
        console.warn("[GraphTranslator] Input components is not an array. Returning empty graph.");
        return { nodes, segments, warnings: [{ message: "Input is not an array." }] };
    }

    const findOrAddNode = (pt) => {
        // Strict Archetypal Casting for coordinates
        const ptX = Number(pt.x);
        const ptY = Number(pt.y);
        const ptZ = Number(pt.z);

        if (isNaN(ptX) || isNaN(ptY) || isNaN(ptZ)) {
            return null;
        }

        const cleanPt = { x: ptX, y: ptY, z: ptZ };

        // Search existing nodes within tolerance
        for (const [id, node] of Object.entries(nodes)) {
            const nPt = { x: node.pos[0], y: node.pos[1], z: node.pos[2] };
            if (distance(cleanPt, nPt) < TOLERANCE) {
                return id;
            }
        }

        // Add new node
        const newId = `N${String(nodeCounter++).padStart(3, '0')}`;
        nodes[newId] = { pos: [ptX, ptY, ptZ], type: 'free' };
        return newId;
    };

    // Filter to only structural piping components for now
    const structuralComps = components.filter(c => ['PIPE', 'ELBOW', 'BEND', 'TEE'].includes(c.type));

    structuralComps.forEach(comp => {
        if (!comp.points || !Array.isArray(comp.points) || comp.points.length < 2) {
            const warningMsg = `[GraphTranslator] Component ${comp.id || 'Unknown'} of type ${comp.type} skipped: Missing or invalid points array.`;
            console.warn(warningMsg);
            warnings.push(warningMsg);
            return;
        }

        const startId = findOrAddNode(comp.points[0]);
        const endId = findOrAddNode(comp.points[1]);

        if (!startId || !endId) {
            const warningMsg = `[GraphTranslator] Component ${comp.id || 'Unknown'} skipped: Failed to parse valid 3D coordinates.`;
            console.warn(warningMsg);
            warnings.push(warningMsg);
            return;
        }

        // Check for zero-length segments
        const p1 = nodes[startId].pos;
        const p2 = nodes[endId].pos;
        const segDist = distance({x: p1[0], y: p1[1], z: p1[2]}, {x: p2[0], y: p2[1], z: p2[2]});

        if (segDist < TOLERANCE && comp.type !== 'ELBOW' && comp.type !== 'BEND') {
            const warningMsg = `[GraphTranslator] Component ${comp.id || 'Unknown'} skipped: Segment length (${segDist}) is below tolerance (${TOLERANCE}).`;
            console.warn(warningMsg);
            warnings.push(warningMsg);
            return;
        }

        if (comp.type === 'PIPE') {
            segments.push({
                id: comp.id || `S${String(segCounter++).padStart(3, '0')}`,
                startNode: startId,
                endNode: endId,
                properties: {
                    type: 'PIPE',
                    bore: comp.bore || 100, // standard fallback
                    material: comp.attributes?.MATERIAL || 'UNKNOWN'
                }
            });
        } else if (comp.type === 'ELBOW' || comp.type === 'BEND') {
            // Upgrade nodes if they are fittings
            nodes[startId].type = 'fitting';
            nodes[endId].type = 'fitting';

            if (comp.centrePoint) {
                 const centerId = findOrAddNode(comp.centrePoint);
                 if (centerId) {
                     nodes[centerId].type = 'elbow';

                     // Map elbows perfectly to straight line intersections for mathematical parity.
                     // Creates two straight legs meeting at the center point (sharp corner).
                     segments.push({
                         id: `${comp.id}-leg1`,
                         startNode: startId,
                         endNode: centerId,
                         properties: { type: 'FITTING_LEG', bore: comp.bore }
                     });
                     segments.push({
                         id: `${comp.id}-leg2`,
                         startNode: centerId,
                         endNode: endId,
                         properties: { type: 'FITTING_LEG', bore: comp.bore }
                     });
                 } else {
                     const warningMsg = `[GraphTranslator] Component ${comp.id || 'Unknown'} skipped synthetic routing: Invalid centrePoint.`;
                     console.warn(warningMsg);
                     warnings.push(warningMsg);
                 }
            } else {
                 const warningMsg = `[GraphTranslator] Component ${comp.id || 'Unknown'} of type ${comp.type} missing centrePoint. Cannot perform synthetic routing.`;
                 console.warn(warningMsg);
                 warnings.push(warningMsg);
            }
        }
    });

    return { nodes, segments, warnings };
};

export const buildComponentsFromGraph = (nodes, segments) => {
    const components = [];
    let idCounter = 1000; // start high to avoid collision if appending

    // Convert segments back to PIPE components
    segments.forEach(seg => {
        const n1 = nodes[seg.startNode];
        const n2 = nodes[seg.endNode];

        if (!n1 || !n2) return;

        // Skip abstract fitting legs for now, we'll auto-generate fittings in a future pass
        if (seg.properties?.type === 'FITTING_LEG') return;

        components.push({
            id: seg.id || `P-${idCounter++}`,
            type: 'PIPE',
            points: [
                { x: n1.pos[0], y: n1.pos[1], z: n1.pos[2] },
                { x: n2.pos[0], y: n2.pos[1], z: n2.pos[2] }
            ],
            bore: seg.properties?.bore || 100,
            attributes: {
                MATERIAL: seg.properties?.material || 'CARBON STEEL'
            }
        });
    });

    // TODO: Auto-Fittings Pass
    // 1. Iterate over all nodes.
    // 2. Count how many segments connect to the node.
    // 3. If connections == 2 and vectors are not parallel -> generate ELBOW component.
    // 4. If connections == 3 -> generate TEE component.

    return components;
};
