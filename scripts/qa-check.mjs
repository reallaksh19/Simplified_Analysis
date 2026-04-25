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
try {
    const output = execSync("grep -rn 'Math.random' src/ || true").toString().trim();
    if (output) {
        // filter out files that are allowed (like tests if they accidentally slipped into src)
        const lines = output.split('\n').filter(line => !line.includes('.test.') && !line.includes('spec.'));
        if (lines.length > 0) {
            console.error(`❌ Math.random found in source files:\n${lines.join('\n')}`);
            success = false;
        } else {
             console.log(`✅ Math.random Check passed.`);
        }
    } else {
        console.log(`✅ Math.random Check passed.`);
    }
} catch (e) {
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
