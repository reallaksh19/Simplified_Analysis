import fs from 'node:fs';

function fail(message) {
  console.error(`V18F check failed: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'src/sketcher/commands/insertComponentCommands.js',
  'src/sketcher/SketcherStore.js',
  'scripts/v18f-insert-component-commands-behavior-test.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const commands = fs.readFileSync('src/sketcher/commands/insertComponentCommands.js', 'utf8');
for (const token of [
  'INSERT_COMPONENT_COMMAND_SCHEMA_VERSION',
  'insertFlangeValveFlangeOnSegment',
  'insertFlangeValveFlangeContinue',
  'insertReducerOnSegment',
  'INSERT_COMPONENT_TOO_LONG',
]) {
  if (!commands.includes(token)) fail(`insertComponentCommands missing token: ${token}`);
}

const store = fs.readFileSync('src/sketcher/SketcherStore.js', 'utf8');
for (const token of [
  'insertFlangeValveFlangeOnSelectedSegment',
  'insertFlangeValveFlangeContinue',
  'insertReducerOnSelectedSegment',
  'applyInsertComponentCommandResult',
]) {
  if (!store.includes(token)) fail(`SketcherStore missing insert command token: ${token}`);
}

console.log('V18F insert component commands static check passed.');
