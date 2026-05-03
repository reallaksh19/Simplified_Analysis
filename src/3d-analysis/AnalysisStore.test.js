import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalysisStore } from './AnalysisStore.js';

describe('AnalysisStore - Geometric Conservation Test', () => {
    beforeEach(() => {
        useAnalysisStore.setState({
            nodes: {
                N1: { pos: [0, 0, 0], type: 'anchor' },
                N2: { pos: [1000, 0, 0], type: 'anchor' }
            },
            segments: [
                {
                    id: 'S1',
                    startNode: 'N1',
                    endNode: 'N2',
                    length_in: 1000 / 25.4,
                    od_in: 4,
                    wt_in: 0.237,
                    material: 'CS_A106B',
                    compType: 'PIPE'
                }
            ],
            params: {
                deltaT_F: 100,
                E_psi: 29000000,
                alpha_in_in_F: 6.5e-6,
                Sc_psi: 20000,
                Sh_psi: 20000,
                f: 1.0,
                Sa_psi: 25000,
            },
            overallResult: null,
            debugLog: []
        });
    });

    it('splits a segment successfully conserving length and nodes', () => {
        const store = useAnalysisStore.getState();
        store.splitSegment('S1', 0.5);

        const newState = useAnalysisStore.getState();
        const nodeKeys = Object.keys(newState.nodes);

        expect(nodeKeys.length).toBe(3);
        expect(newState.segments.length).toBe(2);

        const newSegments = newState.segments;
        const targetLenInches = 500 / 25.4;

        expect(Math.abs(newSegments[0].length_in - targetLenInches)).toBeLessThan(0.001);
        expect(Math.abs(newSegments[1].length_in - targetLenInches)).toBeLessThan(0.001);

        // ensure solver ran successfully
        expect(['PASS', 'FAIL', 'MARGINAL']).toContain(newState.overallResult);
    });
});
