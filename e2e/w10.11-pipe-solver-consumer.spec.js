import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const PACKAGE={schema:'inputxml-managed-stage/v1',packageHash:'W10.11-BROWSER',unit:'mm',objects:[
  {id:'PIPES',name:'Pipes',type:'BRANCH',children:[
    pipe('PIPE-A',[0,0,0],[1000,0,0]),pipe('PIPE-B',[1000,0,0],[1000,1000,0]),
  ]},
  {id:'SUPPORTS',name:'Supports',type:'GROUP',children:[
    support('SUP-A',[0,0,0],'PIPE-A:port:start'),support('SUP-B',[1000,1000,0],'PIPE-B:port:end'),
  ]},
]};
const TOPICS=['analysis:sessionOpenRequested','analysis:sessionOverrideRequested','analysis:sessionResetRequested',
  'analysis:sessionCloseRequested','analysis:requested','analysis:ledgerActiveRequested','analysis:exportRequested'];

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{globalThis.__WORKSPACE_VIEWPORT_BACKEND__='canvas2d';});
});

test('adopts guarded pipe-screening inspection, session, result and ledger evidence',async({page})=>{
  await page.goto('/');await installAudit(page);
  const pipeNav=page.getByRole('button',{name:'Pipe Solver'});
  await expect(pipeNav).toHaveAttribute('aria-disabled','true');
  await uploadJson(page,'w10.11.json',PACKAGE);
  await expect(pipeNav).toHaveAttribute('aria-disabled','false');
  expect((await audit(page)).runs).toBe(0);

  await pipeNav.click();
  await expect(page.locator('[data-application-view="PIPE_SOLVER"]')).toBeVisible();
  await expect(page.locator('[data-role="pipe-solver-consumer"]')).toContainText('No Workspace entity is selected');
  expect(await page.evaluate(()=>AnalysisWorkspace.getApplicationViewState().schema)).toBe('application-view-state/v4');
  expect(await page.evaluate(()=>AnalysisWorkspace.getPipeSolverReviewModel().schema)).toBe('pipe-solver-review-model/v1');
  expect((await audit(page)).runs).toBe(0);

  await page.getByRole('button',{name:'Workspace'}).click();
  await page.locator('[data-entity-id="SUP-A"]').click();
  await pipeNav.click();
  await expect(page.locator('[data-role="pipe-solver-capability"]')).toContainText('Applicable');
  await expect(page.locator('[data-role="pipe-solver-capability"]')).toContainText('No');

  await page.getByRole('button',{name:'Workspace'}).click();
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await pipeNav.click();
  const review=page.locator('[data-role="pipe-solver-consumer"]');
  for(const text of ['Benchmarked simplified 2D screening only','Not final piping-code stress analysis',
    'No automatic execution','workspace-simplified-2d-screening','SIMPLIFIED_2D_TOPOLOGY_SCREENING',
    'Input evidence and reviewed overrides'])await expect(review).toContainText(text);
  await expect(page.locator('[data-role="pipe-solver-inputs"]')).toContainText('deltaT');
  await expect(page.locator('[data-role="pipe-solver-consumer"]')).toContainText('Explicit engineering inputs are missing');
  await expect(page.getByRole('button',{name:'Open Input Review'})).toHaveAttribute('aria-disabled','false');
  expect((await audit(page)).opens).toBe(0);

  await page.getByRole('button',{name:'Open Input Review'}).click();
  await expect(page.locator('[data-role="pipe-solver-session"]')).toContainText('analysis-session-');
  await setOverride(page,'deltaT',-1);
  await expect(page.locator('[data-role="pipe-solver-inputs"]')).toContainText('must be greater than zero');
  await page.getByRole('button',{name:'Reset Reviewed Overrides'}).click();
  expect(await page.evaluate(()=>AnalysisWorkspace.getAnalysisSession().session.fieldErrors)).toEqual({});

  await setOverride(page,'deltaT',180);
  await setOverride(page,'alpha',0.000012);
  await setOverride(page,'E',200000);
  await setOverride(page,'od',168.3);
  await setOverride(page,'Sa',100);
  await expect(page.locator('[data-role="pipe-solver-capability"]')).toContainText('Ready to run');
  await expect(page.getByRole('button',{name:'Run Pipe Screening'})).toHaveAttribute('aria-disabled','false');
  const beforeRun=await audit(page);
  await page.getByRole('button',{name:'Run Pipe Screening'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getAnalysisSession().session?.status)).toBe('completed');
  const afterRun=await audit(page);
  expect(afterRun.runs).toBe(beforeRun.runs+1);
  expect(afterRun.started).toBe(beforeRun.started+1);
  expect(afterRun.completed).toBe(beforeRun.completed+1);

  await expect(page.locator('[data-role="pipe-solver-result"]')).toContainText('solver-result-contract-v1');
  await expect(page.locator('[data-role="pipe-solver-result"]')).toContainText('BENCHMARKED_SCREENING');
  await expect(page.locator('[data-role="pipe-solver-result"]')).toContainText('Formula trace');
  await expect(page.locator('[data-role="pipe-solver-ledger"] tbody tr')).toHaveCount(1);
  const entry=page.locator('[data-pipe-solver-ledger-entry]').first();
  await entry.click();
  expect((await audit(page)).ledgerSelections).toBe(1);

  for(const [format,label] of [['json','Export Ledger / Report JSON'],['csv','Export Ledger / Report CSV'],['markdown','Export Ledger / Report Markdown']]){
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:label}).click()]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`\.${format==='markdown'?'md':format}$`));
    expect(fs.readFileSync(await download.path(),'utf8').length).toBeGreaterThan(10);
  }
  expect((await audit(page)).exports).toBe(3);
  expect(await page.locator('[data-webgl-host]').count()).toBe(1);
  expect(await page.locator('[data-application-view="PIPE_SOLVER"] canvas').count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

test('preserves selection, session, ledger and existing consumer state across views',async({page})=>{
  await page.goto('/');await uploadJson(page,'w10.11-preserve.json',PACKAGE);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await page.getByRole('button',{name:'Pipe Solver'}).click();
  await page.getByRole('button',{name:'Open Input Review'}).click();
  for(const [key,value] of [['deltaT',180],['alpha',0.000012],['E',200000],['od',168.3],['Sa',100]])await setOverride(page,key,value);
  await page.getByRole('button',{name:'Run Pipe Screening'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getAnalysisSession().session?.status)).toBe('completed');

  await page.getByRole('button',{name:'Workspace'}).click();
  await page.getByRole('button',{name:'Run Tributary Screening'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getSupportLoadScreening()?.semanticHash||null)).not.toBeNull();
  await page.getByRole('button',{name:'Solve Vertical Beam'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getVerticalBeamSolution()?.semanticHash||null)).not.toBeNull();
  await page.locator('[data-model-calculation-control="mode"]').selectOption('SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button',{name:'Create Calculation Package'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getActiveModelCalculationPackage()?.semanticHash||null)).not.toBeNull();
  const before=await preserved(page);

  for(const view of ['Load Calc','Reports','3D Calc','Pipe Solver']){
    await page.getByRole('button',{name:view}).click();
    await expect(page.locator(`[data-application-view="${viewId(view)}"]`)).toBeVisible();
  }
  const after=await preserved(page);
  expect(after.datasetId).toBe(before.datasetId);
  expect(after.selectedEntityId).toBe(before.selectedEntityId);
  expect(after.sessionId).toBe(before.sessionId);
  expect(after.ledgerEntries).toBe(before.ledgerEntries);
  expect(after.pipeReviewHash).toBe(before.pipeReviewHash);
});

test('same-ID replacement, clear and teardown preserve guarded lifecycle boundaries',async({page})=>{
  let downloads=0;page.on('download',()=>{downloads+=1;});
  await page.goto('/');await installAudit(page);await uploadJson(page,'same.json',PACKAGE);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await page.getByRole('button',{name:'Pipe Solver'}).click();
  const datasetId=await page.evaluate(()=>AnalysisWorkspace.getSnapshot().dataset.datasetId);
  await uploadJson(page,'same.json',PACKAGE);
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(()=>AnalysisWorkspace.getSnapshot().dataset.datasetId)).toBe(datasetId);
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pipe Solver'})).toHaveAttribute('aria-disabled','true');
  expect((await audit(page)).runs).toBe(0);
  const before=await listenerCounts(page);
  await page.evaluate(()=>AnalysisWorkspace.destroy());
  await expect(page.locator('#root')).toBeEmpty();
  const after=await listenerCounts(page);
  Object.keys(before).forEach((topic)=>expect(after[topic]).toBeLessThan(before[topic]));
  await page.evaluate(()=>{EventBus.publish('analysis:requested',{analysisType:'pipe-screening',targetId:'PIPE-A'});});
  await page.waitForTimeout(50);
  expect(downloads).toBe(0);
});

async function installAudit(page){await page.evaluate(()=>{
  globalThis.__w1011={opens:0,overrides:0,resets:0,runs:0,started:0,completed:0,ledgerSelections:0,exports:0};
  const count=(key)=>()=>{globalThis.__w1011[key]+=1;};
  EventBus.subscribe('analysis:sessionOpenRequested',count('opens'));
  EventBus.subscribe('analysis:sessionOverrideRequested',count('overrides'));
  EventBus.subscribe('analysis:sessionResetRequested',count('resets'));
  EventBus.subscribe('analysis:requested',count('runs'));
  EventBus.subscribe('analysis:started',count('started'));
  EventBus.subscribe('analysis:completed',count('completed'));
  EventBus.subscribe('analysis:ledgerActiveRequested',count('ledgerSelections'));
  EventBus.subscribe('analysis:exportRequested',count('exports'));
});}
async function audit(page){return page.evaluate(()=>globalThis.__w1011);}
async function uploadJson(page,name,payload){await page.locator('[data-role="dataset-file"]').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});}
async function setOverride(page,key,value){const input=page.locator(`[data-pipe-solver-field="${key}"]`);await input.fill(String(value));await input.press('Tab');}
async function listenerCounts(page){return page.evaluate((topics)=>Object.fromEntries(topics.map((topic)=>[topic,EventBus.listenerCount(topic)])),TOPICS);}
async function preserved(page){return page.evaluate(()=>({datasetId:AnalysisWorkspace.getSnapshot().dataset.datasetId,selectedEntityId:AnalysisWorkspace.getSnapshot().selectedEntityId,sessionId:AnalysisWorkspace.getAnalysisSession().session?.sessionId||null,ledgerEntries:AnalysisWorkspace.getAnalysisLedger().entries.length,pipeReviewHash:AnalysisWorkspace.getPipeSolverReviewModel()?.semanticHash||null}));}
function viewId(label){return {'Load Calc':'LOAD_CALC','Reports':'REPORTS','3D Calc':'THREE_D_CALC','Pipe Solver':'PIPE_SOLVER'}[label];}
function pipe(id,startPoint,endPoint){return{id,name:id,type:'PIPE',sourcePath:`/MODEL/PIPES/${id}`,sourceAttributes:{LINE_ID:'LINE-W10.11',SYSTEM_ID:'SYS-W10.11',EI_N_M2:2000000,UNIT_PIPE_WEIGHT_KG_PER_M:10,INSULATION_THICKNESS_MM:0,FLUID_WT_OPE_KG_M:2,FLUID_WT_HYD_KG_M:3},nativeParams:{startPoint,endPoint}};}
function support(id,position,attachedPortId){return{id,name:id,type:'SUPPORT',sourcePath:`/MODEL/SUPPORTS/${id}`,sourceAttributes:{LINE_ID:'LINE-W10.11',SYSTEM_ID:'SYS-W10.11',POS:{x:position[0],y:position[1],z:position[2]},ATTACHED_PORT_ID:attachedPortId,SUPPORT_TYPE:'ANCHOR',VERTICAL_CAPABILITY:'RESTRAINED'}};}
