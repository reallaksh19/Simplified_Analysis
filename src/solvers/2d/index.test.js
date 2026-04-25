import { describe, it, expect } from 'vitest';
import { run2DSolver } from './index.js';

describe('2D Simplified Stress Check Solver', () => {
  const validGeometry = {
    units: { length: "in", force: "lb" },
    materials: [{ id: "mat1", name: "Steel", E: 29000000 }],
    nodes: [
      { id: "n1", x: 0, y: 0, z: 0 },
      { id: "n2", x: 100, y: 0, z: 0 }
    ],
    segments: [
      { id: "s1", startNodeId: "n1", endNodeId: "n2", outerDiameter: 4.5, wallThickness: 0.237 }
    ]
  };

  it('should return required shape for successful cantilever calculation', () => {
    const payload = {
      geometry: validGeometry,
      calculationType: "CANTILEVER_END_LOAD",
      inputs: { P: 500 }
    };

    const res = run2DSolver(payload);
    expect(res.moduleId).toBe("2d-simplified-stress-check");
    expect(res.engineeringLevel).toBe("SCREENING");
    expect(res.results.moment).toBeDefined();
    expect(res.results.moment.unit).toBe("lb-in");
    expect(res.diagnostics.length).toBe(0);
    expect(res.warnings.length).toBe(0); // since length is 100 <= 1200
  });

  it('should catch validation errors from missing units', () => {
    const payload = {
      geometry: { ...validGeometry, units: undefined },
      calculationType: "CANTILEVER_END_LOAD"
    };
    const res = run2DSolver(payload);
    expect(res.diagnostics.some(d => d.severity === "ERROR")).toBe(true);
  });

  it('should warn when length is out of screening bounds', () => {
    const largeGeometry = {
      ...validGeometry,
      nodes: [
        { id: "n1", x: 0, y: 0, z: 0 },
        { id: "n2", x: 1500, y: 0, z: 0 }
      ]
    };
    const payload = {
      geometry: largeGeometry,
      calculationType: "SIMPLE_SPAN_DISTRIBUTED",
      inputs: { w: 10 }
    };

    const res = run2DSolver(payload);
    expect(res.warnings.some(w => w.code === "SPAN_OUT_OF_BOUNDS")).toBe(true);
  });

  it('should compute SIMPLE_SPAN_CONCENTRATED', () => {
      const payload = {
        geometry: validGeometry,
        calculationType: "SIMPLE_SPAN_CONCENTRATED",
        inputs: { P: 1000, a: 50 }
      };
      const res = run2DSolver(payload);
      expect(res.results.moment.value).toBe(1000 * 50 * 50 / 100);
  });
});
