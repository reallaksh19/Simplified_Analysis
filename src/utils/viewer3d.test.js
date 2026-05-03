import { describe, it, expect } from 'vitest';
import { clippingPlanes, setClippingBounds } from './viewer3d.js';

describe('viewer3d - Wave 2', () => {
    describe('Agent 6: Section Box Clipping Engine', () => {
        it('initializes with large bounds and updates correctly', () => {
            expect(clippingPlanes.length).toBe(6);

            // Should be initialized to large values
            expect(clippingPlanes[0].constant).toBe(10000); // Usually the case if default is 10000

            setClippingBounds(-50, 150, -20, 80, -10, 10);

            expect(clippingPlanes[0].constant).toBe(50); // -minX
            expect(clippingPlanes[1].constant).toBe(150); // maxX
            expect(clippingPlanes[2].constant).toBe(20); // -minY
            expect(clippingPlanes[3].constant).toBe(80); // maxY
            expect(clippingPlanes[4].constant).toBe(10); // -minZ
            expect(clippingPlanes[5].constant).toBe(10); // maxZ
        });
    });
});
