import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';

const scripts=['simulator-core.js','layout.js','visualisations.js','app.js','comparison.js','catalog.js','measurement-core.js','measurements.js','bandwidth-visuals.js'];
async function loadApp(){
 const window=new Window({url:'http://localhost:8000/'});
 window.document.write(fs.readFileSync('index.html','utf8'));
 for(const name of scripts)window.eval(fs.readFileSync(name,'utf8'));
 return {window,document:window.document,close:()=>window.happyDOM.close()};
}
function change(window,el,value,type='change'){
 el.value=value;el.dispatchEvent(new window.Event(type,{bubbles:true}));
}
const by=(doc,id)=>doc.getElementById(id);

test('single-screen studio has quick controls, diagrams and no tab navigation',async()=>{
 const {document,close}=await loadApp();
 try{
  assert.equal(document.querySelectorAll('[role="tab"]').length,0);
  assert.equal(document.querySelectorAll('.studio-main').length,1);
  assert.equal(document.querySelectorAll('.studio-quick').length,1);
  assert.ok(by(document,'context').closest('.studio-quick'));
  assert.ok(by(document,'cacheGroup').closest('.studio-quick'));
  assert.ok(by(document,'vizTiles').children.length===256);
  assert.equal(by(document,'vizDevice').textContent,'RTX 5090');
  assert.ok(by(document,'studioFit').textContent.length>0);
  assert.ok(by(document,'studioDrawer').hidden);
  assert.ok(by(document,'compareCard').hidden);
 }finally{await close();}
});
test('hardware and model searches update primary configuration without navigation',async()=>{
 const {window,document,close}=await loadApp();
 try{
  const gpuSearch=by(document,'hardwareSearch');
  change(window,gpuSearch,'RTX 4090','input');
  assert.ok(document.querySelectorAll('#hardwareSearchResults .catalog-choice').length>0);
  gpuSearch.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(by(document,'hardware').value,'4090');
  assert.equal(by(document,'vizDevice').textContent,'RTX 4090');
  assert.equal(by(document,'vizTiles').children.length,192);
  const modelSearch=by(document,'modelSearch');
  change(window,modelSearch,'Gemma 3 27','input');
  const option=[...document.querySelectorAll('#modelSearchResults .catalog-choice')].find(x=>x.textContent.includes('Gemma 3 27B'));
  assert.ok(option);option.click();
  assert.equal(by(document,'model').value,'gemma3-27');
  assert.equal(by(document,'hardware').value,'4090');
 }finally{await close();}
});
test('settings drawers open and close with keyboard without losing the canvas',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'open-workload').click();
  assert.equal(by(document,'studioDrawer').hidden,false);
  assert.equal(by(document,'drawer-workload').hidden,false);
  assert.ok(by(document,'agentBase').closest('#drawer-workload'));
  assert.ok(by(document,'prefill').closest('#drawer-workload'));
  assert.equal(by(document,'vizTiles').children.length,256);
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(by(document,'studioDrawer').hidden,true);
  by(document,'open-costs').click();
  assert.equal(by(document,'drawer-costs').hidden,false);
  assert.ok(by(document,'apiPrice').closest('#drawer-costs'));
  by(document,'studioBackdrop').click();
  assert.equal(by(document,'studioDrawer').hidden,true);
 }finally{await close();}
});
test('Custom GPU is prominent, auto-opens complete editable settings and accepts large values',async()=>{
 const {window,document,close}=await loadApp();
 try{
  assert.equal(by(document,'hardware').options[0].value,'custom');
  by(document,'customGpu').click();
  assert.equal(by(document,'hardware').value,'custom');
  assert.equal(by(document,'studioDrawer').hidden,false);
  assert.equal(by(document,'drawer-hardware').hidden,false);
  assert.equal(by(document,'studioHardwareExacts').hidden,false);
  for(const id of ['memoryType','gpuCount','split','vram','bandwidth','ram','metalPct',
   'exact-vram','exact-bandwidth','exact-ram','exact-gpuCount'])assert.ok(by(document,id));
  change(window,by(document,'exact-vram'),'4096');
  assert.equal(window.CalculatorApp.getState().vram,4096);
  assert.equal(by(document,'vizTiles').children.length,256);
  assert.equal(window.CalculatorApp.getResult().cap,4096);
  change(window,by(document,'memoryType'),'unified');
  assert.equal(window.CalculatorApp.getResult().apple,true);
  assert.equal(window.CalculatorApp.getResult().count,1);
  assert.equal(by(document,'exact-gpuCount').disabled,true);
  assert.equal(by(document,'appleNotice').classList.contains('hidden'),false);
 }finally{await close();}
});
test('Custom model auto-opens all exact model fields and preserves quick context controls',async()=>{
 const {window,document,close}=await loadApp();
 try{
  assert.equal(by(document,'model').options[0].value,'custom');
  by(document,'customModel').click();
  assert.equal(by(document,'model').value,'custom');
  assert.equal(by(document,'drawer-model').hidden,false);
  assert.equal(by(document,'studioModelExacts').hidden,false);
  for(const id of ['modelGB','kvKiB','modelLimit','visionGB','mtpGB','exact-modelGB','exact-kvKiB','exact-modelLimit'])assert.ok(by(document,id));
  change(window,by(document,'exact-modelGB'),'800');
  assert.equal(window.CalculatorApp.getState().modelGB,800);
  assert.ok(by(document,'vizDemand').textContent.length>0);
  assert.ok(by(document,'context').closest('.studio-quick'));
  assert.equal(by(document,'studioDrawer').hidden,false);
 }finally{await close();}
});
test('memory grid always has eight rows, exact ruler and one colour per tile',async()=>{
 const {window,document,close}=await loadApp();
 try{
  for(const [id,cap,cols] of [['5060',8,8],['5060ti',16,16],['4090',24,24],['5090',32,32]]) {
   change(window,by(document,'hardware'),id);
   const g=window.CalculatorVisuals.tileGeometry(cap);
   assert.equal(g.rows,8);assert.equal(g.columns,cols);
   assert.equal(by(document,'vizTiles').children.length,cols*8);
   assert.equal(by(document,'vizTiles').style.getPropertyValue('--viz-tile-columns'),String(cols));
   const ticks=[...document.querySelectorAll('#vizRuler .viz-ruler-tick')];
   assert.equal(ticks[0].dataset.gib,'0');
   assert.equal(Number(ticks.at(-1).dataset.gib),cap);
   assert.equal(ticks.at(-1).textContent,cap+' GiB');
   const categories=new Set(['Weights','KV cache','Extras','Reserved','Free']);
   assert.ok([...by(document,'vizTiles').children].every(x=>categories.has(x.dataset.type)&&!x.style.background.includes('linear-gradient(')));
  }
 }finally{await close();}
});
test('Apple memory grid and large custom geometry stay bounded',async()=>{
 const {window,document,close}=await loadApp();
 try{
  change(window,by(document,'hardware'),'studio-m4max40-64');
  const cap=64*.79,g=window.CalculatorVisuals.tileGeometry(cap);
  assert.equal(g.columns,26);assert.equal(g.count,208);
  assert.equal(by(document,'vizTiles').children.length,208);
  assert.equal(Number(document.querySelector('#vizRuler .viz-ruler-tick.last').dataset.gib),cap);
  for(const capacity of [96,256,1024,4096,8192]){
   const n=window.CalculatorVisuals.tileGeometry(capacity);
   assert.equal(n.rows,8);assert.ok(n.columns<=40);
   assert.ok(n.count<=320);
  }
  const css=fs.readFileSync('visualisations.css','utf8');
  assert.match(css,/max-width:660px/);assert.match(css,/max-height:255px/);assert.match(css,/grid-auto-flow:column/);
 }finally{await close();}
});
test('compare A and B show independent devices side by side and preserve A on B change',async()=>{
 const {window,document,close}=await loadApp();
 try {
  by(document,'compareToggle').click();
  assert.equal(by(document,'compareToggle').getAttribute('aria-pressed'),'true');
  assert.equal(by(document,'compareCard').hidden,false);
  assert.equal(by(document,'compareSummary').hidden,false);
  assert.ok(by(document,'visualCanvas').classList.contains('is-comparing'));
  assert.equal(by(document,'vizTiles').children.length,256);
  assert.equal(by(document,'cmpTiles').children.length,128);
  assert.equal(by(document,'vizDevice').textContent,'RTX 5090');
  assert.equal(by(document,'cmpDevice').textContent,'RTX 5060 Ti');
  assert.ok(by(document,'compareSummary').textContent.includes('Memory capacity'));
  change(window,by(document,'cmpHardware'),'4090');
  assert.equal(by(document,'cmpDevice').textContent,'RTX 4090');
  assert.equal(by(document,'cmpTiles').children.length,192);
  assert.equal(by(document,'vizDevice').textContent,'RTX 5090');
  assert.equal(by(document,'hardware').value,'5090');
  change(window,by(document,'hardware'),'5070ti');
  assert.equal(by(document,'vizDevice').textContent,'RTX 5070 Ti');
  assert.equal(by(document,'cmpDevice').textContent,'RTX 4090');
  by(document,'compareToggle').click();
  assert.equal(by(document,'compareCard').hidden,true);
  assert.equal(by(document,'compareToggle').getAttribute('aria-pressed'),'false');
 }finally{await close();}
});
test('comparison B supports alternate models, context, KV cache, custom GPU and custom model without changing A',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'compareToggle').click();
  change(window,by(document,'cmpModel'),'gemma3-27');
  let alternative=window.ComparisonStudio.getState();
  assert.equal(alternative.model,'gemma3-27');
  assert.equal(by(document,'model').value,'qwen38-gsr');
  by(document,'cmpSettings').click();
  assert.equal(by(document,'drawer-comparison').hidden,false);
  change(window,by(document,'cmp-context'),'32768','input');
  change(window,by(document,'cmp-cache'),'q8');
  alternative=window.ComparisonStudio.getState();
  assert.equal(alternative.context,32768);
  assert.equal(alternative.cache,'q8');
  change(window,by(document,'cmpHardware'),'custom');
  assert.equal(by(document,'cmpHardwareCustom').hidden,false);
  change(window,by(document,'cmp-gpu-vram'),'64','input');
  change(window,by(document,'cmp-gpu-bandwidth'),'1200','input');
  alternative=window.ComparisonStudio.getState();
  assert.equal(alternative.hardware,'custom');assert.equal(alternative.vram,64);assert.equal(alternative.bandwidth,1200);
  change(window,by(document,'cmpModel'),'custom');
  assert.equal(by(document,'cmpModelCustom').hidden,false);
  change(window,by(document,'cmp-model-modelGB'),'100','input');
  alternative=window.ComparisonStudio.getState();
  assert.equal(alternative.model,'custom');assert.equal(alternative.modelGB,100);
  assert.equal(window.CalculatorApp.getState().modelGB,11.8);
 }finally{await close();}
});
test('B hardware and model search works without altering A',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'compareToggle').click();
  const bGpuSearch=by(document,'cmpHardwareSearch');
  change(window,bGpuSearch,'Mac Studio M3 Ultra 256','input');
  const choices=[...document.querySelectorAll('#cmpHardwareSearchResults .catalog-choice')];
  assert.ok(choices.some(x=>x.textContent.includes('M3 Ultra')));
  const selected=choices.find(x=>x.textContent.includes('256 GB'));
  assert.ok(selected);selected.click();
  assert.equal(by(document,'cmpHardware').value,'studio-m3ultra80-256');
  assert.equal(by(document,'hardware').value,'5090');
  assert.equal(by(document,'cmpBw').textContent,'819 GB/s');
  const bModelSearch=by(document,'cmpModelSearch');
  change(window,bModelSearch,'Gemma 3 12','input');
  assert.ok(document.querySelectorAll('#cmpModelSearchResults .catalog-choice').length>=1);
  bModelSearch.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(by(document,'cmpModel').value,'gemma3-12');
  assert.equal(by(document,'model').value,'qwen38-gsr');
 }finally{await close();}
});
test('B side optional offloading and multimodal overrides are independent',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'compareToggle').click();
  change(window,by(document,'cmpModel'),'custom');
  change(window,by(document,'cmp-model-visionGB'),'1.5','input');
  change(window,by(document,'cmp-extra-vision'),'true');
  change(window,by(document,'cmp-extra-mtp'),'false');
  change(window,by(document,'cmp-extra-reserve'),'2','input');
  change(window,by(document,'cmp-extra-cpuWeights'),'20','input');
  change(window,by(document,'cmp-extra-kvOffload'),'true');
  const b=window.ComparisonStudio.getState(),a=window.CalculatorApp.getState();
  assert.equal(b.vision,true);
  assert.equal(b.visionGB,1.5);
  assert.equal(b.mtp,false);
  assert.equal(b.reserve,2);
  assert.equal(b.cpuWeights,20);
  assert.equal(b.kvOffload,true);
  assert.equal(a.reserve,.9);
  assert.equal(a.cpuWeights,0);
  assert.equal(a.kvOffload,false);
  assert.ok(by(document,'compareSummary').textContent.includes('Decode scenario'));
  change(window,by(document,'cmp-extra-reserve'),'','input');
  assert.equal(window.ComparisonStudio.getState().reserve,a.reserve);
 }finally{await close();}
});
test('B can compare a different model on the same GPU and follow A when both are Same',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'compareToggle').click();
  change(window,by(document,'cmpHardware'),'same');
  change(window,by(document,'cmpModel'),'deepseek-r1-14');
  let b=window.ComparisonStudio.getState(),a=window.CalculatorApp.getState();
  assert.equal(b.hardware,a.hardware);
  assert.equal(b.model,'deepseek-r1-14');
  assert.equal(a.model,'qwen38-gsr');
  assert.notEqual(b.modelGB,a.modelGB);
  change(window,by(document,'cmpModel'),'same');
  change(window,by(document,'hardware'),'mbp-m5max40-64');
  b=window.ComparisonStudio.getState();a=window.CalculatorApp.getState();
  assert.equal(b.hardware,a.hardware);
  assert.equal(b.model,a.model);
  assert.equal(b.memoryType,'unified');
 }finally{await close();}
});
test('JSON export includes B alternative when comparison mode is enabled',async()=>{
 const {window,document,close}=await loadApp();
 const oldClick=window.HTMLAnchorElement.prototype.click;
 let blob;
 try{
  window.URL.createObjectURL=source=>{blob=source;return 'blob:scenario';};
  window.URL.revokeObjectURL=()=>{};
  window.HTMLAnchorElement.prototype.click=function(){};
  by(document,'compareToggle').click();
  change(window,by(document,'cmpHardware'),'4090');
  by(document,'downloadConfig').click();
  assert.ok(blob);
  const content=JSON.parse(await blob.text());
  assert.equal(content.settings.hardware,'5090');
  assert.equal(content.comparison.settings.hardware,'4090');
  assert.equal(content.comparison.settings.model,'qwen38-gsr');
  assert.ok(content.comparison.result.gpuGiB<content.result.gpuGiB);
 }finally{window.HTMLAnchorElement.prototype.click=oldClick;await close();}
});
test('context panel exposes simulation/measured modes without claiming fake readings',async()=>{
 const {window,document,close}=await loadApp();
 try{
  assert.equal(by(document,'modeSimulation').getAttribute('aria-pressed'),'true');
  assert.equal(by(document,'measurementOpen').textContent,'Import data ↗');
  assert.equal(by(document,'measuredView').hidden,true);
  by(document,'modeMeasured').click();
  assert.equal(window.MeasurementStudio.getMode(),'measured');
  assert.equal(by(document,'measurementEmpty').hidden,false);
  assert.equal(by(document,'measurementResults').hidden,true);
  assert.ok(by(document,'viz-context')===null); // CSS-based mode, not a simulated result
  by(document,'measurementOpen').click();
  assert.equal(by(document,'drawer-measurement').hidden,false);
  assert.equal(by(document,'studioDrawer').hidden,false);
  by(document,'modeSimulation').click();
  assert.equal(window.MeasurementStudio.getMode(),'simulation');
  assert.equal(by(document,'measuredView').hidden,true);
 }finally{await close();}
});
test('importing Ollama result shows observed usage, unknown context and planned scenario separately',async()=>{
 const {window,document,close}=await loadApp();
 try{
  const fixture={model:'qwen3:8b',done:true,prompt_eval_count:300,eval_count:60,
    prompt_eval_duration:3000000000,eval_duration:2000000000};
  const obs=window.MeasurementStudio.apply(JSON.stringify(fixture));
  assert.ok(obs);
  assert.equal(window.MeasurementStudio.getMode(),'measured');
  assert.equal(by(document,'measurementPrompt').textContent,'300');
  assert.equal(by(document,'measurementOutput').textContent,'60');
  assert.equal(by(document,'measurementWindow').textContent,'Not reported');
  assert.equal(by(document,'measurementPercent').textContent,'—');
  assert.equal(by(document,'measurementRemaining').textContent,'Unknown');
  assert.equal(by(document,'measurementDecode').textContent,'30 tok/s');
  assert.equal(by(document,'measurementPlanTokens').textContent,'56,000 tokens');
  assert.equal(by(document,'measurementPlanContext').textContent,'65,536 tokens');
  const original=window.MeasurementStudio.getObservation();
  const context=by(document,'context');
  change(window,context,'131072','input');
  assert.equal(by(document,'measurementPlanContext').textContent,'131,072 tokens');
  assert.deepEqual(window.MeasurementStudio.getObservation(),original);
 }finally{await close();}
});
test('measured chart uses reported Ollama context and /api/ps residency, not assumed RAM',async()=>{
 const {window,document,close}=await loadApp();
 try{
  const input={response:{model:'llama3.2',prompt_eval_count:100,eval_count:25},
   ps:{models:[{model:'llama3.2',size_vram:5368709120,context_length:2048}]}};
  window.MeasurementStudio.apply(JSON.stringify(input));
  assert.equal(by(document,'measurementWindow').textContent,'2,048');
  assert.equal(by(document,'measurementPercent').textContent,'6%');
  assert.equal(by(document,'measurementVRAM').textContent,'5 GiB');
  assert.equal(by(document,'measurementArcs').children.length,2);
  assert.match(by(document,'measurementCaveats').textContent,/not total GPU memory/);
  assert.equal(by(document,'measurementResults').hidden,false);
 }finally{await close();}
});
test('llama.cpp usage JSON displays actual prompt and output without imaginary tool breakdown',async()=>{
 const {window,document,close}=await loadApp();
 try{
  const fixture={model:'local-model',usage:{prompt_tokens:237,completion_tokens:35},
   timings:{prompt_n:1,cache_n:236,predicted_n:35,predicted_per_second:50},
   generation_settings:{n_ctx:1024}};
  const obs=window.MeasurementStudio.apply(JSON.stringify(fixture));
  assert.equal(obs.source,'llama.cpp');
  assert.equal(by(document,'measurementWindow').textContent,'1,024');
  assert.equal(by(document,'measurementPercent').textContent,'27%');
  assert.equal(by(document,'measurementCached').textContent,'236 (included)');
  assert.equal(by(document,'measurementDecode').textContent,'50 tok/s');
  assert.match(by(document,'measurementCaveats').textContent,/system instructions/);
 }finally{await close();}
});
test('invalid input surfaces an error instead of a fabricated measurement; clear leaves empty state',async()=>{
 const {window,document,close}=await loadApp();
 try{
  by(document,'measurementOpen').click();
  by(document,'measurementPaste').value='{"response":"hello"}';
  by(document,'measurementApply').click();
  assert.match(by(document,'measurementError').textContent,/No completion counts/);
  assert.equal(window.MeasurementStudio.getObservation(),null);
  by(document,'measurementPaste').value=JSON.stringify({model:'model',prompt_eval_count:5,eval_count:2});
  by(document,'measurementApply').click();
  assert.equal(window.MeasurementStudio.getObservation().totalTokens,7);
  assert.equal(by(document,'studioDrawer').hidden,true);
  by(document,'measurementClear').click();
  assert.equal(window.MeasurementStudio.getObservation(),null);
  assert.equal(by(document,'measurementEmpty').hidden,false);
 }finally{await close();}
});

test('RTX 5090 and compact Qwen 27B start, reset and 16 GB optimisation behave as labelled', async () => {
 const {window,document,close}=await loadApp();
 try {
   const initial=window.CalculatorApp.getState();
   assert.equal(initial.hardware,'5090');
   assert.equal(initial.model,'qwen38-gsr');
   assert.equal(initial.vram,32);
   assert.equal(initial.bandwidth,1792);
   assert.equal(initial.ram,64);
   assert.equal(document.getElementById('hardware').value,'5090');
   assert.equal(document.getElementById('model').value,'qwen38-gsr');
   assert.equal(document.getElementById('vizDevice').textContent,'RTX 5090');
   assert.equal(document.getElementById('vizTiles').children.length,256);
   assert.match(document.getElementById('bwPhysical').textContent,/1,792 GB\/s/);
   change(window,document.getElementById('hardware'),'4090');
   document.getElementById('presetDefault').click();
   assert.equal(window.CalculatorApp.getState().hardware,'5090');
   assert.equal(window.CalculatorApp.getState().bandwidth,1792);
   document.getElementById('presetOptimised').click();
   const smaller=window.CalculatorApp.getState();
   assert.equal(smaller.hardware,'5060ti');
   assert.equal(smaller.vram,16);
   assert.equal(smaller.bandwidth,448);
   assert.equal(smaller.model,'qwen38-gsr');
   assert.equal(smaller.cache,'q8');
   assert.equal(smaller.vision,false);
   assert.equal(smaller.mtp,false);
 } finally {await close();}
});
