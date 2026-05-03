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
    const structuralComps = components.filter(c => ['PIPE', 'ELBOW', 'BEND', 'TEE', 'VALVE', 'FLANGE', 'REDUCER'].includes(c.type));

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
        } else if (['VALVE', 'FLANGE', 'REDUCER'].includes(comp.type)) {
            const midpoint = {
                x: (comp.points[0].x + comp.points[1].x) / 2,
                y: (comp.points[0].y + comp.points[1].y) / 2,
                z: (comp.points[0].z + comp.points[1].z) / 2,
            };
            const midId = findOrAddNode(midpoint);
            if (midId) {
                nodes[midId].type = comp.type.toLowerCase();

                // Connect weld points to midpoint
                segments.push({
                    id: `${comp.id}-in`,
                    startNode: startId,
                    endNode: midId,
                    properties: { type: 'PIPE', bore: comp.bore, material: comp.attributes?.MATERIAL || 'UNKNOWN' }
                });
                segments.push({
                    id: `${comp.id}-out`,
                    startNode: midId,
                    endNode: endId,
                    properties: { type: 'PIPE', bore: comp.bore, material: comp.attributes?.MATERIAL || 'UNKNOWN' }
                });
            }
        } else if (comp.type === 'ELBOW' || comp.type === 'BEND') {
            // Upgrade nodes if they are fittings
            nodes[startId].type = 'fitting';
            nodes[endId].type = 'fitting';

            if (!comp.centrePoint) {
                const pt1 = comp.points[0];
                const pt2 = comp.points[1];

                // Fallback logic: Find connecting pipes to compute intersection
                const pipe1 = components.find(c => c.type === 'PIPE' && c.points && c.points.length >= 2 && (distance(c.points[0], pt1) < TOLERANCE || distance(c.points[1], pt1) < TOLERANCE));
                const pipe2 = components.find(c => c.type === 'PIPE' && c.points && c.points.length >= 2 && (distance(c.points[0], pt2) < TOLERANCE || distance(c.points[1], pt2) < TOLERANCE));

                let calculatedCenter = null;
                if (pipe1 && pipe2) {
                    const v1 = {
                        x: pipe1.points[1].x - pipe1.points[0].x,
                        y: pipe1.points[1].y - pipe1.points[0].y,
                        z: pipe1.points[1].z - pipe1.points[0].z
                    };
                    const v2 = {
                        x: pipe2.points[1].x - pipe2.points[0].x,
                        y: pipe2.points[1].y - pipe2.points[0].y,
                        z: pipe2.points[1].z - pipe2.points[0].z
                    };

                    const p1Coord = pt1;
                    const p2Coord = pt2;

                    // Compute closest approach midpoint for 3D line intersection
                    const d1343 = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
                    const d4321 = v2.x * v1.x + v2.y * v1.y + v2.z * v1.z;
                    const d1321 = v1.x * v1.x + v1.y * v1.y + v1.z * v1.z;
                    const d4343 = v2.x * v2.x + v2.y * v2.y + v2.z * v2.z;
                    const d2121 = d1321;

                    const p13 = {
                        x: p1Coord.x - p2Coord.x,
                        y: p1Coord.y - p2Coord.y,
                        z: p1Coord.z - p2Coord.z
                    };
                    const d1343_p13 = p13.x * v2.x + p13.y * v2.y + p13.z * v2.z;
                    const d1321_p13 = p13.x * v1.x + p13.y * v1.y + p13.z * v1.z;

                    const denom = d2121 * d4343 - d4321 * d4321;
                    if (Math.abs(denom) > 1e-6) {
                        const numer = d1343_p13 * d4321 - d1321_p13 * d4343;
                        const mua = numer / denom;
                        const mub = (d1343_p13 + d4321 * mua) / d4343;

                        const pa = {
                            x: p1Coord.x + mua * v1.x,
                            y: p1Coord.y + mua * v1.y,
                            z: p1Coord.z + mua * v1.z
                        };
                        const pb = {
                            x: p2Coord.x + mub * v2.x,
                            y: p2Coord.y + mub * v2.y,
                            z: p2Coord.z + mub * v2.z
                        };
                        calculatedCenter = {
                            x: (pa.x + pb.x) / 2,
                            y: (pa.y + pb.y) / 2,
                            z: (pa.z + pb.z) / 2
                        };
                    }
                }

                // Absolute fallback if math fails
                if (!calculatedCenter) {
                    calculatedCenter = { x: (pt1.x + pt2.x)/2, y: (pt1.y + pt2.y)/2, z: (pt1.z + pt2.z)/2 };
                }
                comp.centrePoint = calculatedCenter;
            }

            if (comp.centrePoint) {
                 const centerId = findOrAddNode(comp.centrePoint);
                 if (centerId) {
                     nodes[centerId].type = 'elbow';

                     // Creates two straight legs meeting at the center point (sharp corner).
                     segments.push({
                         id: `${comp.id}-leg1`,
                         startNode: startId,
                         endNode: centerId,
                         properties: { type: 'PIPE', bore: comp.bore } // Changed from FITTING_LEG
                     });
                     segments.push({
                         id: `${comp.id}-leg2`,
                         startNode: centerId,
                         endNode: endId,
                         properties: { type: 'PIPE', bore: comp.bore } // Changed from FITTING_LEG
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

        // Skip segments that are zero length (safety)
        if (n1.pos[0] === n2.pos[0] && n1.pos[1] === n2.pos[1] && n1.pos[2] === n2.pos[2]) return;

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

    // Auto-Fittings Pass
    Object.keys(nodes).forEach(nodeId => {
        const node = nodes[nodeId];
        const connected = segments.filter(s => s.startNode === nodeId || s.endNode === nodeId);

        if (node.type === 'elbow' && connected.length === 2) {
            // Get the two far nodes to define the vectors
            const n1 = nodes[connected[0].startNode === nodeId ? connected[0].endNode : connected[0].startNode];
            const n2 = nodes[connected[1].startNode === nodeId ? connected[1].endNode : connected[1].startNode];
            
            // Assume the elbow geometry spans 1/3 of the way to the adjacent nodes for visual purposes if no physical weld points exist
            const p1 = {
                x: node.pos[0] + (n1.pos[0] - node.pos[0]) * 0.3,
                y: node.pos[1] + (n1.pos[1] - node.pos[1]) * 0.3,
                z: node.pos[2] + (n1.pos[2] - node.pos[2]) * 0.3
            };
            const p2 = {
                x: node.pos[0] + (n2.pos[0] - node.pos[0]) * 0.3,
                y: node.pos[1] + (n2.pos[1] - node.pos[1]) * 0.3,
                z: node.pos[2] + (n2.pos[2] - node.pos[2]) * 0.3
            };

            components.push({
                id: `E-${idCounter++}`,
                type: 'ELBOW',
                points: [p1, p2],
                centrePoint: { x: node.pos[0], y: node.pos[1], z: node.pos[2] },
                bore: connected[0].properties?.bore || 100,
                attributes: { MATERIAL: connected[0].properties?.material || 'CARBON STEEL' }
            });
        }

        if (node.type === 'tee' && connected.length === 3) {
            // Find the main run (the two segments that are most colinear)
            // For simplicity in this auto-pass, we just take the first two as main, third as branch
            const n1 = nodes[connected[0].startNode === nodeId ? connected[0].endNode : connected[0].startNode];
            const n2 = nodes[connected[1].startNode === nodeId ? connected[1].endNode : connected[1].startNode];
            const n3 = nodes[connected[2].startNode === nodeId ? connected[2].endNode : connected[2].startNode];

            const p1 = { x: node.pos[0] + (n1.pos[0] - node.pos[0]) * 0.3, y: node.pos[1] + (n1.pos[1] - node.pos[1]) * 0.3, z: node.pos[2] + (n1.pos[2] - node.pos[2]) * 0.3 };
            const p2 = { x: node.pos[0] + (n2.pos[0] - node.pos[0]) * 0.3, y: node.pos[1] + (n2.pos[1] - node.pos[1]) * 0.3, z: node.pos[2] + (n2.pos[2] - node.pos[2]) * 0.3 };
            const p3 = { x: node.pos[0] + (n3.pos[0] - node.pos[0]) * 0.3, y: node.pos[1] + (n3.pos[1] - node.pos[1]) * 0.3, z: node.pos[2] + (n3.pos[2] - node.pos[2]) * 0.3 };

            components.push({
                id: `T-${idCounter++}`,
                type: 'TEE',
                points: [p1, p2, p3],
                centrePoint: { x: node.pos[0], y: node.pos[1], z: node.pos[2] },
                bore: connected[0].properties?.bore || 100,
                attributes: { MATERIAL: connected[0].properties?.material || 'CARBON STEEL' }
            });
        }
    });

    return components;
};
