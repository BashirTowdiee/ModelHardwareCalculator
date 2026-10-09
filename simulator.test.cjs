const test = require('node:test');
const assert = require('node:assert/strict');
require('./simulator-core.js');
const { DEFAULTS, HARDWARE, calculate, hardwareState, modelState, GB_TO_GIB } = globalThis.LLMLab;
const setup = (o={}) => ({ ...DEFAULTS,...o });
test('Baseline 5060 Ti with FP16, vision, MTP cannot allocate 64k', () => {
  const d = calculate(hardwareState('5060ti',setup()));
  assert.equal(d.status, 'overflow');
  assert.ok(d.maxGpuContext > 40000 && d.maxGpuContext < 55000, String(d.maxGpuContext));
  assert.ok(d.excess > 0);
});
test('Q8 cache and no vision allows about 110k tokens at 16 GiB', () => {
  const d = calculate(hardwareState('5060ti',setup({cache:'q8', vision:false, context:106496})));
  assert.equal(d.status, 'fit');
  assert.ok(d.maxGpuContext > 103000 && d.maxGpuContext < 120000, String(d.maxGpuContext));
});
test('Q8 and Q4 cache sizes include ggml block overhead', () => {
  const fp = calculate(setup({context:32768, cache:'fp16'}));
  const q8 = calculate(setup({context:32768, cache:'q8'}));
  const q4 = calculate(setup({context:32768, cache:'q4'}));
  assert.equal(fp.kvGiB, 2);
  assert.equal(q8.kvGiB, 2 * 34/64);
  assert.equal(q4.kvGiB, 2 * 18/64);
});
test('A 32-GiB card holds 128k context at FP16 on this model', () => {
  const d = calculate(hardwareState('5090', setup({ context:131072 })));
  assert.equal(d.status, 'fit');
});
test('Model file GB conversion uses decimal gigabytes', () => {
  const d = calculate(setup());
  assert.ok(Math.abs(d.weightsGiB - 11.8 * GB_TO_GIB) < 1e-10);
});
test('Apple unified memory budget is applied rather than all 16 GiB', () => {
  const d = calculate(hardwareState('m4', setup()));
  assert.equal(d.cap,16*.79);
  assert.equal(d.count,1);
  assert.equal(d.status,'overflow');
});
test('Explicit KV offloading uses host RAM and has no throughput claim', () => {
  const d = calculate(setup({kvOffload:true,context:262144}));
  assert.equal(d.status, 'offload');
  assert.equal(d.gpuOnly,false);
  assert.equal(d.hostKvGiB,16);
});
test('Automatic spill changes overflow to offload if host RAM permits', () => {
  const d = calculate(hardwareState('5060ti',setup({autoSpill:true})));
  assert.equal(d.status,'offload');
  assert.ok(d.spillGiB > 0);
});
test('CPU RAM limit is enforced', () => {
  const d = calculate(setup({autoSpill:true,ram:8,cpuWeights:100,context:262144}));
  assert.equal(d.status,'host');
});
test('Hardware profiles have non-zero documented memory and bandwidth', () => {
  for (const h of Object.values(HARDWARE)) {
    assert.ok(h.vram > 0);
    assert.ok(h.bandwidth > 0);
  }
});
test('Model profile switch sets expected customisable values', () => {
  const s = modelState('qwen38-q4',setup());
  assert.equal(s.modelGB,17.44);
  assert.equal(s.kvKiB,64);
});
test('Multi GPU tensor split is an idealised higher bandwidth scenario', () => {
  const one = calculate(setup({context:32768,gpuCount:1}));
  const two = calculate(setup({context:32768,gpuCount:2}));
  assert.ok(two.cap > one.cap);
  assert.ok(two.theoreticalTPS > one.theoreticalTPS);
});
test('Cost has no payback without a positive local saving', () => {
  const d = calculate(setup({cache:'q8',vision:false,context:32768,apiPrice:0}));
  assert.equal(d.breakEvenMonths,null);
});