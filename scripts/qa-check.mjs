import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const skipE2E = process.argv.includes('--skip-e2e');

function runCheck(name, cmd) {
    console.log(`\n--- Running ${name} ---`);
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`✅ ${name} passed.`);
        return true;
    } catch (err) {
        console.error(`❌ ${name} failed.`);
        return false;
    }
}

let success = true;
const hasPlaywright = fs.existsSync(path.join(process.cwd(), 'node_modules', 'playwright'));

success &= runCheck('Syntax Check', 'npm run syntax:strict');
success &= runCheck('Forbidden Modules Check', 'node scripts/smoke-check.mjs');

console.log(`\n--- Running Math.random Check ---`);
function findMathRandom(dir, problems = []) {
    if (!fs.existsSync(dir)) return problems;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findMathRandom(fullPath, problems);
        } else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Math.random')) problems.push(fullPath);
        }
    }
    return problems;
}

const randomProblems = findMathRandom(path.join(process.cwd(), 'src'));
if (randomProblems.length > 0) {
    console.error(`❌ Math.random found in source files:\n${randomProblems.join('\n')}`);
    success = false;
} else {
    console.log(`✅ Math.random Check passed.`);
}

console.log(`\n--- Running Deterministic Timestamp Check ---`);
const ALLOWED_TIMESTAMP_FILES = new Set([
    path.normalize('src/sketcher/SketcherStore.js'),
    path.normalize('src/reporting/index.js'),
]);

function findNonDeterministicTimestamps(dir, problems = []) {
    if (!fs.existsSync(dir)) return problems;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.normalize(path.relative(process.cwd(), fullPath));

        if (entry.isDirectory()) {
            findNonDeterministicTimestamps(fullPath, problems);
        } else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasDateNow = content.includes('Date.now()');
            const hasNewDate = content.includes('new Date(');
            const hasPerformanceNow = content.includes('performance.now()');

            if ((hasDateNow || hasNewDate || hasPerformanceNow) && !ALLOWED_TIMESTAMP_FILES.has(relativePath)) {
                problems.push({ file: fullPath, relativePath, hasDateNow, hasNewDate, hasPerformanceNow });
            }
        }
    }
    return problems;
}

const timestampProblems = findNonDeterministicTimestamps(path.join(process.cwd(), 'src'));
if (timestampProblems.length > 0) {
    console.warn(`⚠️ Non-deterministic timestamp calls found in source files (warning):`);
    timestampProblems.forEach(problem => {
        const calls = [];
        if (problem.hasDateNow) calls.push('Date.now()');
        if (problem.hasNewDate) calls.push('new Date(');
        if (problem.hasPerformanceNow) calls.push('performance.now()');
        console.warn(`  ${problem.relativePath}: ${calls.join(', ')}`);
    });
    console.warn(`  (These should ideally be whitelisted or refactored)\n`);
} else {
    console.log(`✅ Deterministic Timestamp Check passed.`);
}

console.log(`\n--- Running Required E2E Files Check ---`);
const requiredE2EFiles = [
    'e2e/smoke.spec.js',
    'e2e/u7-workflow-smoke.spec.js',
    'e2e/phase1-analysis-workspace.spec.js',
    'e2e/phase2-workspace-dataset.spec.js',
    'e2e/phase3-viewport-renderer.spec.js',
    'e2e/phase4-viewport-picking.spec.js',
    'e2e/phase5-analysis-capabilities.spec.js',
    'e2e/phase6-analysis-sessions.spec.js',
    'e2e/phase7-analysis-ledger.spec.js',
    'e2e/phase8-engineering-geometry.spec.js',
    'e2e/phase9-analysis-readiness.spec.js',
];

let e2eFilesOk = true;
for (const file of requiredE2EFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${file} found`);
    } else {
        console.error(`  ❌ ${file} NOT found`);
        e2eFilesOk = false;
    }
}

if (!e2eFilesOk) success = false;
else console.log(`✅ Required E2E Files Check passed.`);

if (skipE2E) {
    console.log(`\nℹ️ Browser E2E execution delegated to explicit CI steps.`);
} else if (hasPlaywright) {
    success &= runCheck('Workspace E2E Tests', 'npm run check:workspace-browser');
} else {
    console.log(`\n⚠️ Playwright not found, skipping E2E tests.`);
}

if (!success) process.exit(1);
