import { describe, it, expect } from 'vitest';
import { solveGC3D } from './solveGC3D.js';
import { materialPropertyTable } from '../../data/materialProperties.js';

describe('solveGC3D Anisotropic Failure Test', () => {
    it('should fail when S_hoop > Sa_hoop even if combined/S_axial stress is low', () => {
        const payload = {
            nodes: {
                N1: { pos: [0, 0, 0], type: 'anchor' },
                N2: { pos: [100, 0, 0], type: 'anchor' }
            },
            segments: [
                {
                    id: 'S1',
                    startNode: 'N1',
                    endNode: 'N2',
                    length_in: 100,
                    od_in: 4,
                    wt_in: 0.237,
                    axis: 'X',
                    compType: 'PIPE'
                }
            ],
            params: {
                deltaT_F: 0,
                E_psi: 2000000,
                alpha_in_in_F: 0.000012,
                Sc_psi: 20000,
                Sh_psi: 20000,
                f: 1.0,
                Sa_psi: 20000, // Not used if anisotropic
                S_hoop: 21000,
                S_axial: 5000,
                material: materialPropertyTable['GRE_FRP_PLACEHOLDER']
            }
        };

        const result = solveGC3D(payload);

        expect(result.results.overallResult).toBe('FAIL');

        const hasAnisotropicTrace = result.formulas.some(
            t => t.name === 'Anisotropic Independent Stress Check'
        );
        expect(hasAnisotropicTrace).toBe(true);

        // Assert that S_hoop failure was the controlling factor
        const criticalNodeResult = result.results.nodeResults.find(n => n.nodeId === result.results.criticalNode);
        expect(criticalNodeResult.ratio).toBeGreaterThan(1.0);
        expect(criticalNodeResult.S_hoop).toBe(21000);
        expect(criticalNodeResult.SA_psi).toBe(15000); // Wait, Sa_hoop is 20000, Sa_axial is 15000. Wait, `Math.min(materialProps.Sa_axial_psi, materialProps.Sa_hoop_psi)` returns 15000.
        // Oh right, my test uses 21000 S_hoop, and 21000 > 20000, so ratioHoop = 21000/20000 = 1.05
        // S_axial = 5000, Sa_axial = 15000, ratioAxial = 5000/15000 = 0.33
        // So ratio should be 1.05. Let's not check SA_psi tightly, but the ratio.
        expect(Math.abs(criticalNodeResult.ratio - 1.05)).toBeLessThan(0.01);
    });
});
