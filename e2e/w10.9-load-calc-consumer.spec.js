import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const STAGED_PACKAGE={schema:'inputxml-managed-stage/v1',packageHash:'W10.9-BROWSER',unit:'mm',objects:[
  {id:'PIPES',name:'Pipes',type:'BRANCH',children:[pipe('PIPE-A',[0,0,0],[1000,0,0]),pipe('PIPE-B',[1000,0,0],[2000,0,0])]},
  {id:'SUPPORTS',name:'Supports',type:'GROUP',children:[support('SUP-START',[0,0,0],'PIPE-A:port:start'),support('SUP-END',[2000,0,0],'PIPE-B:port:end')]},
]};
const NAVIGATION=['Workspace','Reports','Load Calc','3D Calc','Pipe Solver','QA','Debug'];

test.beforeEach(async({page})=>{await page.addInitScript(()=>{
  globalThis.__WORKSPACE_VIEWPORT_BACKEND__='canvas2d';globalThis.__w109UrlAudit={created:0,revoked:0};
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=(blob)=>{globalThis.__w109UrlAudit.created+=1;return create(blob);};
  URL.revokeObjectURL=(url)=>{globalThis.__w109UrlAudit.revoked+=1;return revoke(url);};
});});

test('adopts exact W10.4 evidence and delegates optional W10.5 actions',async({page})=>{
  await page.goto('/');await installEventAudit(page);
  const nav=page.locator('[data-role="application-navigation"]');
  await expect(nav.getByRole('button')).toHaveText(NAVIGATION);
  const workspace=nav.getByRole('button',{name:'Workspace'}),loadCalc=nav.getByRole('button',{name:'Load Calc'});
  await expect(loadCalc).toHaveAttribute('aria-disabled','true');
  expect(await loadCalc.evaluate((element)=>element.disabled)).toBe(false);
  const reasonId=await loadCalc.getAttribute('aria-describedby');
  await expect(page.locator(`#${reasonId}`)).toContainText('required contract');
  await page.keyboard.press('Tab');await expect(workspace).toBeFocused();
  await workspace.focus();await page.keyboard.press('ArrowRight');await expect(nav.getByRole('button',{name:'Reports'})).toBeFocused();
  await page.keyboard.press('ArrowRight');await expect(loadCalc).toBeFocused();
  await page.keyboard.press('Space');
  expect((await eventCounts(page)).viewFailures).toBe(1);
  await page.keyboard.press('End');await expect(nav.getByRole('button',{name:'Debug'})).toBeFocused();
  await page.keyboard.press('Home');await expect(workspace).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(nav.getByRole('button',{name:'Debug'})).toBeFocused();

  await uploadJson(page,'w10.9-browser.json',STAGED_PACKAGE);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await expect(loadCalc).toHaveAttribute('aria-disabled','false');
  const beforeActivation=await eventCounts(page);
  await loadCalc.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-application-view="LOAD_CALC"]')).toBeVisible();
  await expect(loadCalc).toHaveAttribute('aria-current','page');
  expect(await eventCounts(page)).toEqual({...beforeActivation,viewChanges:beforeActivation.viewChanges+1});
  const review=page.locator('[data-role="load-calc-consumer"]');
  for(const text of ['Load Calc','EMPTY','OPE','HYD','READY','DISTRIBUTED_GRAVITY_LOAD','MASS_TO_WEIGHT_FORCE_V1','component gravity loads only','no thermal or pressure stress','tributary screening is not stiffness reaction analysis'])await expect(review).toContainText(text);
  await expect(review.locator('th')).toContainText(['Case','Component','Primitive','Formula trace']);
  expect(await page.evaluate(()=>AnalysisWorkspace.getLoadCalculationReviewModel().schema)).toBe('load-calculation-review-model/v1');
  expect(await page.evaluate(()=>AnalysisWorkspace.listWorkspaceConsumers().find((row)=>row.consumerId==='LOAD_CALC').implementationStatus)).toBe('IMPLEMENTED');
  expect(await page.evaluate(()=>AnalysisWorkspace.getWorkspaceConsumerReadiness('LOAD_CALC').readinessState)).toBe('AVAILABLE');
  expect(await page.evaluate(()=>AnalysisWorkspace.getApplicationViewState().schema)).toBe('application-view-state/v2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);

  await page.getByRole('button',{name:'Rebuild Model Loads'}).click();
  await expect(page.locator('[data-role="load-calc-status"]')).toContainText('Model-load evidence updated');
  expect((await eventCounts(page)).modelLoadRebuilds).toBe(beforeActivation.modelLoadRebuilds+1);
  const modelDownload=await downloadFor(page,'Export Model Loads');
  expect(JSON.parse(modelDownload.content).schema).toBe('model-load-export/v1');

  await page.getByRole('button',{name:'Rebuild Vertical Load Paths'}).click();
  expect((await eventCounts(page)).pathRebuilds).toBe(1);
  await page.getByRole('button',{name:'Run Tributary Screening'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getLoadCalculationReviewModel()?.summary.screeningIncluded)).toBe(true);
  await expect(page.locator('[data-role="load-calc-screening"]')).toContainText('screenedVerticalForceN');
  expect((await eventCounts(page)).screeningRuns).toBe(1);
  const screeningDownload=await downloadFor(page,'Export Tributary Screening');
  expect(JSON.parse(screeningDownload.content).schema).toBe('support-load-screening-export/v1');
  expect(await page.evaluate(()=>globalThis.__w109UrlAudit)).toEqual({created:2,revoked:2});
});

test('preserves Workspace, W10.5-W10.7 and Reports state across views',async({page})=>{
  await page.goto('/');await installEventAudit(page);await uploadJson(page,'w10.9-preserve.json',STAGED_PACKAGE);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await page.getByRole('button',{name:'Run Tributary Screening'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getSupportLoadScreening()?.semanticHash||null)).not.toBeNull();
  await page.getByRole('button',{name:'Solve Vertical Stiffness'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getVerticalBeamSolution()?.semanticHash||null)).not.toBeNull();
  await page.locator('[data-model-calculation-control="mode"]').selectOption('SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button',{name:'Create Calculation Package'}).click();
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getActiveModelCalculationPackage()?.semanticHash||null)).not.toBeNull();
  const before=await preservedState(page),actions=await eventCounts(page);

  await page.getByRole('button',{name:'Load Calc'}).click();
  await expect(page.locator('[data-role="load-calc-consumer"]')).toContainText('Topology-local tributary screening');
  await page.getByRole('button',{name:'Reports'}).click();
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button',{name:'Workspace'}).click();
  expect(await preservedState(page)).toEqual(before);
  const after=await eventCounts(page);
  expect(after.modelLoadRebuilds).toBe(actions.modelLoadRebuilds);
  expect(after.screeningRuns).toBe(actions.screeningRuns);
  expect(after.beamSolves).toBe(actions.beamSolves);
  expect(after.packageCreates).toBe(actions.packageCreates);
});

test('same-ID replacement, clear and teardown remove stale Load Calc state',async({page})=>{
  let downloads=0;page.on('download',()=>{downloads+=1;});
  await page.goto('/');await installEventAudit(page);await uploadJson(page,'w10.9-first.json',STAGED_PACKAGE);
  const datasetId=await page.evaluate(()=>AnalysisWorkspace.getSnapshot().dataset.datasetId);
  await page.getByRole('button',{name:'Load Calc'}).click();
  await uploadJson(page,'w10.9-replacement.json',STAGED_PACKAGE);
  await expect.poll(()=>page.evaluate(()=>AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(()=>AnalysisWorkspace.getSnapshot().dataset.datasetId)).toBe(datasetId);
  await expect(page.getByRole('button',{name:'Load Calc'})).toHaveAttribute('aria-disabled','false');
  await page.getByRole('button',{name:'Load Calc'}).click();await page.getByRole('button',{name:'Workspace'}).click();
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  expect(await page.evaluate(()=>AnalysisWorkspace.getLoadCalculationReviewModel())).toBeNull();
  await expect(page.getByRole('button',{name:'Load Calc'})).toHaveAttribute('aria-disabled','true');
  const beforeDestroy=await eventCounts(page);
  await page.evaluate(()=>AnalysisWorkspace.destroy());await expect(page.locator('#root')).toBeEmpty();
  await page.evaluate(()=>{
    EventBus.publish('modelLoad:rebuildRequested',{});
    EventBus.publish('supportLoadScreening:runRequested',{});
    EventBus.publish('applicationView:changeRequested',{viewId:'LOAD_CALC',source:'api'});
  });
  await page.waitForTimeout(50);
  expect(await eventCounts(page)).toEqual(beforeDestroy);
  expect(downloads).toBe(0);
  expect(await page.evaluate(()=>globalThis.__w109UrlAudit)).toEqual({created:0,revoked:0});
});

async function installEventAudit(page){await page.evaluate(()=>{
  globalThis.__w109Events={viewFailures:0,viewChanges:0,modelLoadRebuilds:0,modelLoadExports:0,pathRebuilds:0,screeningRuns:0,screeningExports:0,beamSolves:0,packageCreates:0};
  const count=(key)=>()=>{globalThis.__w109Events[key]+=1;};
  EventBus.subscribe('applicationView:changeFailed',count('viewFailures'));EventBus.subscribe('applicationView:changed',count('viewChanges'));
  EventBus.subscribe('modelLoad:rebuildRequested',count('modelLoadRebuilds'));EventBus.subscribe('modelLoad:exportRequested',count('modelLoadExports'));
  EventBus.subscribe('supportLoadScreening:rebuildPathsRequested',count('pathRebuilds'));EventBus.subscribe('supportLoadScreening:runRequested',count('screeningRuns'));EventBus.subscribe('supportLoadScreening:exportRequested',count('screeningExports'));
  EventBus.subscribe('verticalBeam:solveRequested',count('beamSolves'));EventBus.subscribe('modelCalculation:createRequested',count('packageCreates'));
});}
async function uploadJson(page,name,payload){await page.locator('[data-role="dataset-file"]').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});}
async function downloadFor(page,name){const[download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name}).click()]);return{name:download.suggestedFilename(),content:fs.readFileSync(await download.path(),'utf8')};}
async function eventCounts(page){return page.evaluate(()=>globalThis.__w109Events);}
async function preservedState(page){return page.evaluate(()=>({datasetId:AnalysisWorkspace.getSnapshot().dataset.datasetId,selectedEntityId:AnalysisWorkspace.getSnapshot().selectedEntityId,modelLoadHash:AnalysisWorkspace.getLoadPrimitiveSet()?.semanticHash||null,screeningHash:AnalysisWorkspace.getSupportLoadScreening()?.semanticHash||null,beamHash:AnalysisWorkspace.getVerticalBeamSolution()?.semanticHash||null,ledgerHash:AnalysisWorkspace.getModelCalculationLedger()?.semanticHash||null,activePackageHash:AnalysisWorkspace.getActiveModelCalculationPackage()?.semanticHash||null}));}
function pipe(id,startPoint,endPoint){return{id,name:id,type:'PIPE',sourcePath:`/MODEL/PIPES/${id}`,sourceAttributes:{LINE_ID:'LINE-W10.9',SYSTEM_ID:'SYS-W10.9',EI_N_M2:2000000,UNIT_PIPE_WEIGHT_KG_PER_M:10,INSULATION_THICKNESS_MM:0,FLUID_WT_OPE_KG_M:2,FLUID_WT_HYD_KG_M:3},nativeParams:{startPoint,endPoint}};}
function support(id,position,attachedPortId){return{id,name:id,type:'SUPPORT',sourcePath:`/MODEL/SUPPORTS/${id}`,sourceAttributes:{LINE_ID:'LINE-W10.9',SYSTEM_ID:'SYS-W10.9',POS:{x:position[0],y:position[1],z:position[2]},ATTACHED_PORT_ID:attachedPortId,SUPPORT_TYPE:'ANCHOR',VERTICAL_CAPABILITY:'RESTRAINED'}};}
