import { describe, it, expect } from 'vitest';
import { importPcf, exportPcf } from './index.js';

describe('PCF Interface Contract', () => {
  it('imports PCF and returns geometry with diagnostics', () => {
    const pcfText = `PIPE
    END-POINT    0.0 0.0 0.0 100
    END-POINT    100.0 0.0 0.0 100
    ITEM-CODE    TEST-PIPE
ELBOW
    END-POINT    100.0 0.0 0.0 50
    CENTRE-POINT 100.0 50.0 0.0 50
    END-POINT    150.0 50.0 0.0 50
SUPPORT
    CO-ORDS      100.0 0.0 0.0 100
    SKEY         GUID`;

    const result = importPcf(pcfText);

    expect(result.geometry).toBeDefined();
    expect(result.diagnostics).toBeDefined();

    expect(result.diagnostics.imported.pipes).toBe(1);
    expect(result.diagnostics.imported.elbows).toBe(1);
    expect(result.diagnostics.imported.supports).toBe(1);

    expect(result.diagnostics.importConfidenceScore).toBe(100);
    expect(result.geometry.nodes.length).toBeGreaterThan(0);
    expect(result.geometry.segments.length).toBeGreaterThan(0);

    // Round trip test
    const exportedPcf = exportPcf(result.geometry);
    expect(typeof exportedPcf).toBe('string');
    expect(exportedPcf.includes('PIPE')).toBe(true);
  });

  it('handles bad/partial PCF gracefully', () => {
      const pcfText = `PIPE
      END-POINT 0.0 0.0
      INVALID LINE`;

      const result = importPcf(pcfText);
      expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
      expect(result.diagnostics.warnings[0].code).toBe('PCF_COORD_INCOMPLETE');
      expect(result.geometry).toBeDefined();
  });
});
