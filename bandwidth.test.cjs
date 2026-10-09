const test=require('node:test');
const assert=require('node:assert/strict');
require('./simulator-core.js');
const {calculate,DEFAULTS}=globalThis.LLMLab;
const make=patch=>({...DEFAULTS,...patch});
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,String(a)+' should equal '+String(b));

test('one token reads model weights and attention KV and writes new KV',()=>{
 const d=calculate(make({vision:false,mtp:false,agentBase:1024,agentTools:0,agentOutput:0,context:32768}));
 near(d.weightReadGB,11.8);
 near(d.kvReadGB,1024*64*1024/1e9);
 near(d.kvWriteGB,64*1024/1e9);
 near(d.trafficGBPerToken,d.weightReadGB+d.kvReadGB+d.kvWriteGB);
 near(d.theoreticalTPS,d.bandwidthGBs/d.trafficGBPerToken);
});
test('active workload vs reserved context changes decode bytes but not KV allocation',()=>{
 const active=calculate(make({vision:false,mtp:false,context:131072,agentBase:8000,agentTools:2000,agentOutput:1000,kvReadMode:'active'}));
 const full=calculate(make({vision:false,mtp:false,context:131072,agentBase:8000,agentTools:2000,agentOutput:1000,kvReadMode:'allocated'}));
 near(active.kvGiB,full.kvGiB);
 near(active.kvWriteGB,full.kvWriteGB);
 assert.ok(active.scannedKvTokens<full.scannedKvTokens);
 assert.ok(full.kvReadGB>active.kvReadGB);
 assert.ok(full.theoreticalTPS<active.theoreticalTPS);
});
test('shorter active contexts increase bandwidth-only upper-bound',()=>{
 const shorter=calculate(make({context:131072,agentBase:4000,agentTools:0,agentOutput:0}));
 const longer=calculate(make({context:131072,agentBase:80000,agentTools:0,agentOutput:0}));
 assert.ok(longer.trafficGBPerToken>shorter.trafficGBPerToken);
 assert.ok(longer.theoreticalTPS<shorter.theoreticalTPS);
});
test('KV scan efficiency is a user assumption that scales reads, never writes',()=>{
 const full=calculate(make({kvReadPct:100}));
 const half=calculate(make({kvReadPct:50}));
 const zero=calculate(make({kvReadPct:0}));
 near(half.kvReadGB,full.kvReadGB/2);
 near(zero.kvReadGB,0);
 near(full.kvWriteGB,half.kvWriteGB);
 assert.ok(zero.theoreticalTPS>half.theoreticalTPS && half.theoreticalTPS>full.theoreticalTPS);
});
test('Q8 cache lowers both per-token KV read and write traffic',()=>{
 const fp=calculate(make({cache:'fp16'})),q8=calculate(make({cache:'q8'}));
 near(q8.kvReadGB/fp.kvReadGB,34/64);
 near(q8.kvWriteGB/fp.kvWriteGB,34/64);
 near(q8.weightReadGB,fp.weightReadGB);
});
test('physical bandwidth scales proxy with fixed token traffic',()=>{
 const a=calculate(make({bandwidth:448}));
 const b=calculate(make({bandwidth:896}));
 near(b.theoreticalTPS,2*a.theoreticalTPS);
});
test('MTP multiplier and assumed runtime efficiency change scenario rate, not theoretical ceiling',()=>{
 const base=calculate(make({mtp:false,efficiency:50}));
 const adjusted=calculate(make({mtp:true,efficiency:75,mtpGain:1.5}));
 near(base.theoreticalTPS,adjusted.theoreticalTPS);
 near(adjusted.estimatedTPS/base.estimatedTPS,2.25);
});
test('prefill has no theoretical prediction without actual measured rate',()=>{
 const none=calculate(make({prefill:0,agentOutput:2048,vision:false,mtp:false,cache:'q8',context:16384}));
 assert.equal(none.prefillSeconds,null);
 assert.equal(none.workloadSeconds,null);
 assert.ok(none.decodeSeconds>0);
 const measured=calculate(make({prefill:500,agentOutput:2048,vision:false,mtp:false,cache:'q8',context:16384}));
 near(measured.prefillSeconds,(measured.promptTokens)/500);
 near(measured.workloadSeconds,measured.decodeSeconds+measured.prefillSeconds);
});
test('offloaded or overflowing model has no credible decode duration',()=>{
 const offload=calculate(make({cpuWeights:50,context:8192}));
 const overflow=calculate(make({modelGB:120,context:131072}));
 assert.equal(offload.decodeSeconds,null);
 assert.equal(overflow.decodeSeconds,null);
});
