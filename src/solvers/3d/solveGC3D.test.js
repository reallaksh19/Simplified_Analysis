import { solveGC3D } from './solveGC3D.js';
import assert from 'assert';

const testPayload = {
    nodes: {
        'n1': { pos: [0, 0, 0], type: 'anchor' },
        'n2': { pos: [120, 0, 0], type: 'elbow' },
        'n3': { pos: [120, 120, 0], type: 'anchor' }
    },
    segments: [
        { id: 's1', startNode: 'n1', endNode: 'n2', length_in: 120, od_in: 4.5, wt_in: 0.237, axis: 'X' },
        { id: 's2', startNode: 'n2', endNode: 'n3', length_in: 120, od_in: 4.5, wt_in: 0.237, axis: 'Y' }
    ],
    params: {
        deltaT_F: 100,
        E_psi: 29000000,
        alpha_in_in_F: 0.000006,
        Sc_psi: 20000,
        Sh_psi: 20000,
        f: 1.0
    }
};

try {
    const result = solveGC3D(testPayload);
    assert.strictEqual(result.moduleId, '3d-guided-cantilever');
    assert.strictEqual(result.engineeringLevel, 'SCREENING');
    assert.ok(result.results.overallResult === 'PASS' || result.results.overallResult === 'FAIL');
    assert.ok(result.assumptions.length > 0);
    console.log('solveGC3D tests passed.');
} catch (e) {
    console.error('solveGC3D tests failed:', e);
    process.exit(1);
}
