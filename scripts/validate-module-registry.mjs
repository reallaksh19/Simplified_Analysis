import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

async function run() {
  let moduleRegistryFile;
  try {
    moduleRegistryFile = await import(pathToFileURL(path.join(root, 'src/config/moduleRegistry.js')).href);
  } catch (err) {
    console.error('Failed to import MODULE_REGISTRY from src/config/moduleRegistry.js', err);
    process.exit(1);
  }

  const MODULE_REGISTRY = moduleRegistryFile.MODULE_REGISTRY;

  if (!Array.isArray(MODULE_REGISTRY)) {
    console.error('MODULE_REGISTRY is not an array.');
    process.exit(1);
  }

  let failed = false;

  for (const module of MODULE_REGISTRY) {
    // 1. Verify forbidden paths don't exist
    if (module.forbiddenPaths && Array.isArray(module.forbiddenPaths)) {
      for (const forbiddenPath of module.forbiddenPaths) {
        const fullPath = path.join(root, forbiddenPath);
        if (fs.existsSync(fullPath)) {
          console.error(`VALIDATION ERROR: Forbidden path exists in file system: ${forbiddenPath} (Module: ${module.id})`);
          failed = true;
        }
      }
    }

    if (module.status === 'ACTIVE') {
      // 2. Verify active modules have required properties
      if (!module.ownerTab) {
        console.error(`VALIDATION ERROR: Active module missing ownerTab: ${module.id}`);
        failed = true;
      }
      if (!module.path) {
        console.error(`VALIDATION ERROR: Active module missing path: ${module.id}`);
        failed = true;
      }
      if (!module.engineeringLevel) {
        console.error(`VALIDATION ERROR: Active module missing engineeringLevel: ${module.id}`);
        failed = true;
      }
      if (!module.status) {
        console.error(`VALIDATION ERROR: Active module missing status: ${module.id}`);
        failed = true;
      }

      // 3. Verify no active module has engineeringLevel 'UNKNOWN'
      if (module.engineeringLevel === 'UNKNOWN') {
        console.error(`VALIDATION ERROR: Active module cannot have engineeringLevel UNKNOWN: ${module.id}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('Module registry validation failed.');
    process.exit(1);
  } else {
    console.log('Module registry validation passed.');
    process.exit(0);
  }
}

run();
