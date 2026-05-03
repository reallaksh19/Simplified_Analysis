import { describe, expect, test } from 'vitest';
import { buildGraphFromComponents } from './GraphTranslator.js';

describe('Agent 4: Mathematical Center-Point Extraction', () => {
    test('Missing Data Test', () => {
        const components = [
            { id: 'p1', type: 'PIPE', points: [{ x: 0, y: 100, z: 0 }, { x: 100, y: 100, z: 0 }] },
            { id: 'e1', type: 'ELBOW', points: [{ x: 100, y: 100, z: 0 }, { x: 200, y: 200, z: 0 }], centrePoint: undefined },
            { id: 'p2', type: 'PIPE', points: [{ x: 200, y: 200, z: 0 }, { x: 200, y: 300, z: 0 }] }
        ];

        const { nodes, segments, warnings } = buildGraphFromComponents(components);

        // Ensure no "skipped synthetic routing" warning
        const warning = warnings.find(w => w.includes('skipped synthetic routing'));
        expect(warning).toBeUndefined();

        // Check if an elbow node was created
        const elbowNode = Object.values(nodes).find(n => n.type === 'elbow');
        expect(elbowNode).toBeDefined();

        // Check if the calculated center point is correct (intersection is [200, 100, 0])
        expect(elbowNode.pos[0]).toBeCloseTo(200, 2);
        expect(elbowNode.pos[1]).toBeCloseTo(100, 2);
        expect(elbowNode.pos[2]).toBeCloseTo(0, 2);
    });
});

describe('Agent 5: Inline Component Abstractions', () => {
    test('Graph Continuity Test', () => {
        const components = [
            { id: 'v1', type: 'VALVE', points: [{ x: 100, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }], bore: 100 }
        ];

        const { nodes, segments } = buildGraphFromComponents(components);

        // The resulting Sketcher graph MUST contain exactly 3 nodes (start, valve, end) and 2 pipe segments connecting them.
        expect(Object.keys(nodes).length).toBe(3);
        expect(segments.length).toBe(2);

        // The valve must be positioned exactly halfway between the original PCF weld points.
        const valveNode = Object.values(nodes).find(n => n.type === 'valve');
        expect(valveNode).toBeDefined();
        expect(valveNode.pos[0]).toBe(110);
        expect(valveNode.pos[1]).toBe(0);
        expect(valveNode.pos[2]).toBe(0);
    });
});
