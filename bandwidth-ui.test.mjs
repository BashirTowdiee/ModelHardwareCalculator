import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const scripts=['simulator-core.js','layout.js','visualisations.js','app.js','comparison.js','catalog.js','measurement-core.js','measurements.js','bandwidth-visuals.js'];
const change=(win,el,value,type='change')=>{
 el.value=value;el.dispatchEvent(new win.Event(type,{bubbles:true}));
};
async function load(){
 const w=new Window({url:'http://localhost:8000/'});
 w.document.write(fs.readFileSync('index.html','utf8'));
 for(const file of scripts)w.eval(fs.readFileSync(file,'utf8'));
 return {w,$:id=>w.document.getElementById(id),close:()=>w.happyDOM.close()};
}
test('bandwidth panel shows model weight reads, KV reads and KV writes',async()=>{
 const {w,$,close}=await load();try{
  assert.equal($('bandwidthPanel').hidden,false);
  assert.equal(w.document.querySelector('.viz-compare').hidden,true);
  assert.match($('bwPhysical').textContent,/1,792 GB\/s/);
  assert.match($('bwReads').textContent,/GB/);
  assert.match($('bwWrites').textContent,/(kB|MB)/);
  assert.match($('bwIdeal').textContent,/tok\/s/);
  assert.equal(w.document.querySelectorAll('#bwTrafficBar span').length,3);
  assert.match($('bwCaveat').textContent,/shared memory channel/);
 }finally{await close();}
});
test('active vs allocated KV reads and scan-factor slider affect estimated decode TPS',async()=>{
 const {w,$,close}=await load();try{
  const start=w.CalculatorApp.getResult().theoreticalTPS;
  change(w,$('bwKvBasis'),'allocated');
  assert.equal(w.CalculatorApp.getState().kvReadMode,'allocated');
  assert.ok(w.CalculatorApp.getResult().theoreticalTPS<start);
  const kv=w.CalculatorApp.getResult().kvReadGB;
  change(w,$('bwScanPct'),'50','input');
  assert.equal(w.CalculatorApp.getState().kvReadPct,50);
  assert.equal($('bwScanValue').textContent,'50%');
  assert.ok(Math.abs(w.CalculatorApp.getResult().kvReadGB-kv/2)<1e-9);
  $('bwDevices').click();
  assert.equal($('bandwidthPanel').hidden,true);
  assert.equal(w.document.querySelector('.viz-compare').hidden,false);
  $('bwBack').click();
  assert.equal($('bandwidthPanel').hidden,false);
 }finally{await close();}
});
test('measured Ollama decode rate appears separate from bandwidth model and clears',async()=>{
 const {w,$,close}=await load();try{
  assert.equal($('bwObserved').textContent,'No runtime data');
  const ideal=w.CalculatorApp.getResult().theoreticalTPS;
  w.MeasurementStudio.apply(JSON.stringify({model:'qwen',prompt_eval_count:200,eval_count:100,eval_duration:4000000000}));
  assert.equal($('bwObserved').textContent,'25 tok/s');
  assert.equal(w.CalculatorApp.getResult().theoreticalTPS,ideal);
  w.MeasurementStudio.clear();
  assert.equal($('bwObserved').textContent,'No runtime data');
 }finally{await close();}
});
test('prefill wait depends on measured input rather than bandwidth estimate',async()=>{
 const {w,$,close}=await load();try{
  assert.equal($('bwPrefillTime').textContent,'Not measured');
  $('bwTune').click();
  assert.equal($('drawer-workload').hidden,false);
  change(w,$('prefill'),'1000','input');
  assert.notEqual($('bwPrefillTime').textContent,'Not measured');
 }finally{await close();}
});