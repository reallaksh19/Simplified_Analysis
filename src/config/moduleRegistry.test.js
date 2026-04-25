import { MODULE_REGISTRY, MODULE_STATUS, ENGINEERING_LEVEL } from './moduleRegistry';

describe('moduleRegistry', () => {
  it('should have required fields for ACTIVE modules', () => {
    const activeModules = MODULE_REGISTRY.filter(m => m.status === MODULE_STATUS.ACTIVE);

    for (const module of activeModules) {
      expect(module.id).toBeDefined();
      expect(typeof module.id).toBe('string');
      expect(module.path).toBeDefined();
      expect(typeof module.path).toBe('string');
      expect(module.engineeringLevel).toBeDefined();
      expect(module.engineeringLevel).not.toBe(ENGINEERING_LEVEL.UNKNOWN);
    }
  });

  it('should not contain duplicate module ids', () => {
    const ids = MODULE_REGISTRY.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
