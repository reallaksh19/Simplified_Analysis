import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function validateRegistry() {
  const { MODULE_REGISTRY, MODULE_STATUS, ENGINEERING_LEVEL } = await import('../src/config/moduleRegistry.js');
  let errors = [];

  for (const module of MODULE_REGISTRY) {
    if (module.status === MODULE_STATUS.ACTIVE) {
      if (!module.id) errors.push(`Active module missing id: ${JSON.stringify(module)}`);
      if (!module.path) errors.push(`Active module missing path: ${module.id}`);
      if (!module.engineeringLevel) errors.push(`Active module missing engineeringLevel: ${module.id}`);
      if (module.engineeringLevel === ENGINEERING_LEVEL.UNKNOWN) {
        errors.push(`Active module ${module.id} cannot have engineeringLevel UNKNOWN`);
      }
    }

    if (module.forbiddenPaths && Array.isArray(module.forbiddenPaths)) {
      for (const forbiddenPath of module.forbiddenPaths) {
        const fullPath = path.join(rootDir, forbiddenPath);
        if (fs.existsSync(fullPath)) {
          errors.push(`Forbidden path exists: ${forbiddenPath} (from module ${module.id})`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('Module registry validation failed:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
  } else {
    console.log('Module registry validation passed.');
    process.exit(0);
  }
}

validateRegistry().catch(err => {
  console.error('Failed to validate registry:', err);
  process.exit(1);
});
