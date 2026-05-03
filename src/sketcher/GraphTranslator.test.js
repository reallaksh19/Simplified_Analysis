import { describe, it, expect } from 'vitest';
import { buildGraphFromComponents } from './GraphTranslator.js';

describe('GraphTranslator - Wave 2', () => {
    describe('Agent 4: Mathematical Center-Point Extraction', () => {
        it('calculates the center point of an elbow missing centrePoint using intersecting pipes', () => {
            const components = [
                {
                    id: 'PIPE-1',
                    type: 'PIPE',
                    points: [{ x: 100, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }],
                    bore: 100
                },
                {
                    id: 'ELBOW-1',
                    type: 'ELBOW',
                    points: [{ x: 50, y: 0, z: 0 }, { x: 0, y: 50, z: 0 }],
                    bore: 100
                    // Missing centrePoint intentionally
                },
                {
                    id: 'PIPE-2',
                    type: 'PIPE',
                    points: [{ x: 0, y: 50, z: 0 }, { x: 0, y: 100, z: 0 }],
                    bore: 100
                }
            ];

            const result = buildGraphFromComponents(components);

            // Should not warn about skipped synthetic routing
            expect(result.warnings.some(w => w.includes('skipped synthetic routing'))).toBe(false);

            // Graph should contain an elbow node at { x: 0, y: 0, z: 0 }
            const elbowNodes = Object.values(result.nodes).filter(n => n.type === 'elbow');
            expect(elbowNodes.length).toBe(1);

            const elbowPos = elbowNodes[0].pos;
            expect(elbowPos[0]).toBeCloseTo(0, 2);
            expect(elbowPos[1]).toBeCloseTo(0, 2);
            expect(elbowPos[2]).toBeCloseTo(0, 2);
        });
    });

    describe('Agent 5: Inline Component Abstractions', () => {
        it('processes a line with pipe -> valve -> pipe into nodes and segments', () => {
            const components = [
                {
                    id: 'PIPE-1',
                    type: 'PIPE',
                    points: [{ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }],
                    bore: 100
                },
                {
                    id: 'VALVE-1',
                    type: 'VALVE',
                    points: [{ x: 50, y: 0, z: 0 }, { x: 150, y: 0, z: 0 }],
                    bore: 100
                },
                {
                    id: 'PIPE-2',
                    type: 'PIPE',
                    points: [{ x: 150, y: 0, z: 0 }, { x: 200, y: 0, z: 0 }],
                    bore: 100
                }
            ];

            const result = buildGraphFromComponents(components);

            expect(Object.keys(result.nodes).length).toBe(5);
            expect(result.segments.length).toBe(4);

            const valveNodes = Object.values(result.nodes).filter(n => n.type === 'valve');
            expect(valveNodes.length).toBe(1);

            const valvePos = valveNodes[0].pos;
            expect(valvePos[0]).toBeCloseTo(100, 2);
            expect(valvePos[1]).toBeCloseTo(0, 2);
            expect(valvePos[2]).toBeCloseTo(0, 2);
        });
    });
});
