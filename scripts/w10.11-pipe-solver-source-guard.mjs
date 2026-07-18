import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_SHA='622fea7d10f2711f53318f2756f8bf0c1f49b14c';
const root=process.cwd();
const ALLOWED=Object.freeze([
  /^src\/core\/pipe-solver-consumer\//,
  /^src\/workspace\/pipe-solver-consumer-[^/]+\.js$/,
  /^scripts\/w10\.11-[^/]+\.mjs$/,
  /^e2e\/w10\.11-[^/]+\.spec\.js$/,
  /^docs\/pipe-solver-consumer\//,
  /^src\/core\/workspace-consumers\/(?:constants|registry|view-state|event-contracts|index)\.js$/,
  /^src\/workspace\/(?:application-shell-controller|bootstrap|workspace-layout|event-topics)\.js$/,
  /^src\/workspace\/workspace\.css$/,
  /^package\.json$/,
  /^\.github\/workflows\/(?:u0-certification|release-candidate)\.yml$/,
  /^scripts\/(?:qa-check|u7-browser-qa-check|release-candidate-check)\.mjs$/,
]);
ensureBaseCommit();
const changed=gitLines(['diff','--name-only',BASE_SHA,'HEAD']);
const added=new Set(gitLines(['diff','--name-only','--diff-filter=A',BASE_SHA,'HEAD']));
const errors=[];
const checks={paths:checkPaths,javascript:checkJavaScript,imports:checkImports,runtime:checkRuntime,dependencies:checkDependencies,contracts:checkContracts,integration:checkIntegration};
const selected=process.argv[2]||'all';
console.log(`\n--- W10.11 source guard · ${selected} ---\n`);
if(selected==='all')Object.values(checks).forEach((check)=>check());
else if(checks[selected])checks[selected]();
else throw new TypeError(`Unknown W10.11 source-guard check: ${selected}.`);
if(errors.length){console.error(`W10.11 source guard ${selected} failed with ${errors.length} error(s):`);errors.forEach((error)=>console.error(` - ${error}`));process.exit(1);}
console.log(`✅ W10.11 source guard ${selected} passed for ${changed.length} changed file(s).`);

function checkPaths(){
  changed.forEach((file)=>{if(!ALLOWED.some((rule)=>rule.test(file)))errors.push(`Disallowed W10.11 changed path: ${file}`);});
  if(changed.includes('package-lock.json'))errors.push('package-lock.json must not change.');
}
function checkJavaScript(){
  addedJavaScript().forEach((file)=>{
    const content=read(file),lines=content.split(/\r?\n/).length-1;
    if(lines>=300)errors.push(`${file} has ${lines} lines; maximum is below 300.`);
    if(/export\s+default\b/.test(content))errors.push(`${file} contains a default export.`);
    if(file.startsWith('src/')&&nondeterministic(content))errors.push(`${file} contains nondeterministic identity logic.`);
    functionSpans(content).filter((span)=>span.lines>40).forEach((span)=>errors.push(`${file} function ${span.name} has ${span.lines} lines.`));
  });
}
function checkImports(){
  productionFiles().forEach((file)=>{
    const content=read(file),imports=importClauses(content);
    if(/from\s+['"][^'"]*(?:react|zustand|simp-analysis|calc-extended|calc-workspace|3d-analysis|src\/solvers|core\/solvers|\/solvers\/|three\.module|threejs)['"]/i.test(imports))errors.push(`${file} imports a forbidden UI, solver or renderer.`);
    if(/\b(?:solveSimplified2D|createDefaultAnalysisCapabilityRegistry|AnalysisCapabilityRegistry|AnalysisSessionStore|AnalysisLedgerStore|AnalysisCoordinator)\b/.test(imports))errors.push(`${file} imports a forbidden owner or solver.`);
    if(file.startsWith('src/core/pipe-solver-consumer/')&&/from\s+['"][^'"]*workspace\//i.test(imports))errors.push(`${file} imports Workspace code into the core boundary.`);
  });
  const adapter=read('src/workspace/pipe-solver-consumer-source-adapter.js');
  if(/new\s+(?:AnalysisCapabilityRegistry|AnalysisSessionStore|AnalysisLedgerStore|AnalysisCoordinator)\b/.test(adapter))errors.push('Pipe Solver adapter constructs a duplicate runtime owner.');
}
function checkRuntime(){
  const controller=read('src/workspace/pipe-solver-consumer-controller.js');
  [
    'ANALYSIS_SESSION_OPEN_REQUESTED','ANALYSIS_SESSION_OVERRIDE_REQUESTED',
    'ANALYSIS_SESSION_RESET_REQUESTED','ANALYSIS_SESSION_CLOSE_REQUESTED',
    'ANALYSIS_REQUESTED','ANALYSIS_LEDGER_ACTIVE_REQUESTED','ANALYSIS_EXPORT_REQUESTED',
  ].forEach((token)=>requireToken(controller,token,'Pipe Solver action'));
  if(/\.publish\([^)]*(?:ANALYSIS_STARTED|ANALYSIS_COMPLETED|ANALYSIS_FAILED|ANALYSIS_SESSION_CHANGED|ANALYSIS_LEDGER_CHANGED)/.test(controller))errors.push('Pipe Solver consumer publishes an owner lifecycle event.');
  if(/canvas|viewport|overlay|solveSimplified2D/i.test(`${controller}\n${read('src/workspace/pipe-solver-consumer-view.js')}`))errors.push('Pipe Solver consumer contains a forbidden renderer or solver boundary.');
}
function checkDependencies(){
  const current=JSON.parse(read('package.json')),previous=JSON.parse(git(['show',`${BASE_SHA}:package.json`]));
  assertSame(previous.dependencies,current.dependencies,'dependencies');
  assertSame(previous.devDependencies,current.devDependencies,'devDependencies');
}
function checkContracts(){
  const constants=read('src/core/workspace-consumers/constants.js'),registry=read('src/core/workspace-consumers/registry.js'),views=read('src/core/workspace-consumers/view-state.js');
  [
    'workspace-consumer-registry/v1','workspace-consumer-registry/v2','workspace-consumer-registry/v3','workspace-consumer-registry/v4',
    'application-view-state/v1','application-view-state/v2','application-view-state/v3','application-view-state/v4',
  ].forEach((token)=>requireToken(`${constants}\n${registry}\n${views}`,token,'Versioned contract'));
  ['createWorkspaceConsumerRegistryV4','validateWorkspaceConsumerRegistryV4','createApplicationViewStateV4','validateApplicationViewStateV4'].forEach((token)=>requireToken(`${registry}\n${views}`,token,'Version v4 proof'));
  requireTokens('src/core/pipe-solver-consumer/constants.js',['pipe-solver-consumer-source/v1','pipe-solver-review-model/v1','BENCHMARKED_SCREENING','SIMPLIFIED_2D_TOPOLOGY_SCREENING'],'Pipe Solver contracts');
}
function checkIntegration(){
  requireTokens('src/workspace/bootstrap.js',['PipeSolverConsumerController','getPipeSolverReviewModel','capabilityRegistry','AnalysisSessions','AnalysisLedger'],'Bootstrap injection/API');
  requireTokens('src/workspace/workspace-layout.js',['data-application-view="PIPE_SOLVER"','data-role="pipe-solver-consumer-root"'],'Pipe Solver layout');
  requireTokens('src/workspace/application-shell-controller.js',['createWorkspaceConsumerRegistryV4','createApplicationViewStateV4','PIPE_SOLVER'],'Application shell v4');
  requireTokens('e2e/w10.11-pipe-solver-consumer.spec.js',['analysis:sessionOpenRequested','analysis:sessionOverrideRequested','analysis:requested','analysis:exportRequested','getPipeSolverReviewModel','AnalysisWorkspace.destroy()'],'Browser proof');
}
function addedJavaScript(){return changed.filter((file)=>added.has(file)&&/\.(?:js|mjs)$/.test(file));}
function productionFiles(){return changed.filter((file)=>file.startsWith('src/core/pipe-solver-consumer/')||/^src\/workspace\/pipe-solver-consumer-/.test(file));}
function nondeterministic(content){return /\b(?:Date\.now|new Date|Math\.random|randomUUID|crypto\.randomUUID|uuid)\b/i.test(content);}
function importClauses(content){return [...content.matchAll(/import[\s\S]*?from\s+['"][^'"]+['"]/g)].map((row)=>row[0]).join('\n');}
function functionSpans(content){const lines=content.split(/\r?\n/),rows=[];for(let index=0;index<lines.length;index+=1){const match=lines[index].match(/^\s*(?:export\s+)?function\s+(\w+)\s*\(/);if(!match)continue;let depth=0,end=index;for(;end<lines.length;end+=1){depth+=(lines[end].match(/{/g)||[]).length;depth-=(lines[end].match(/}/g)||[]).length;if(depth===0&&end>index)break;}rows.push({name:match[1],lines:end-index+1});}return rows;}
function requireTokens(file,tokens,label){const content=read(file);tokens.forEach((token)=>requireToken(content,token,label));}
function requireToken(content,token,label){if(!content.includes(token))errors.push(`${label} ${token} is missing.`);}
function assertSame(left,right,label){if(JSON.stringify(left||{})!==JSON.stringify(right||{}))errors.push(`package.json ${label} changed.`);}
function ensureBaseCommit(){try{execFileSync('git',['cat-file','-e',`${BASE_SHA}^{commit}`],{cwd:root,stdio:'ignore'});}catch{execFileSync('git',['fetch','--no-tags','--depth=1','origin',BASE_SHA],{cwd:root,stdio:'ignore'});}}
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function gitLines(args){return git(args).split(/\r?\n/).filter(Boolean);}
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8'});}
