import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

// Check for Math.random in src (exclude tests, benchmarks)
console.log(`\n--- Running Math.random Check ---`);
function findMathRandom(dir, problems = []) {
    if (!fs.existsSync(dir)) return problems;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findMathRandom(fullPath, problems);
        } else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Math.random')) {
                problems.push(fullPath);
            }
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

if (hasPlaywright) {
    success &= runCheck('E2E Smoke Tests', 'npx playwright test e2e/smoke.spec.js');
} else {
    console.log(`\n⚠️ Playwright not found, skipping E2E tests.`);
}

if (!success) {
    process.exit(1);
}
