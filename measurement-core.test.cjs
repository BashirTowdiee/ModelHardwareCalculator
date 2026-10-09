const test=require('node:test');
const assert=require('node:assert/strict');
const {parseText,normalise}=require('./measurement-core.js');

test('Ollama final result gives observed tokens and measured rates',()=>{
 const x=parseText(JSON.stringify({model:'llama3.2',done:true,prompt_eval_count:26,eval_count:290,prompt_eval_duration:325953000,eval_duration:4709213000}));
 assert.equal(x.source,'Ollama');assert.equal(x.promptTokens,26);assert.equal(x.generatedTokens,290);
 assert.equal(x.totalTokens,316);assert.equal(x.contextWindowTokens,null);
 assert.equal(x.modelVRAMGiB,null);
 assert.ok(Math.abs(x.decodeTPS-290/4.709213)<.001);
 assert.equal(x.contextFraction,null);
});
test('Ollama cached input is subset of prompt, not double-counted',()=>{
 const x=normalise({model:'qwen:latest',prompt_eval_count:100,eval_count:15,prompt_eval_cached_count:60});
 assert.equal(x.promptTokens,100);assert.equal(x.cachedPromptTokens,60);assert.equal(x.totalTokens,115);
});
test('Ollama /api/ps matching model adds residency and runtime context',()=>{
 const input={response:{model:'qwen:latest',prompt_eval_count:480,eval_count:20},
 ps:{models:[{name:'other',size_vram:12*1024**3,context_length:2048},
             {name:'qwen:latest',size_vram:6*1024**3,context_length:4096}]}};
 const x=normalise(input);
 assert.equal(x.modelVRAMGiB,6);assert.equal(x.contextWindowTokens,4096);
 assert.equal(x.contextFraction,500/4096);
 assert.ok(x.notes.some(n=>n.includes('residency')));
});
test('ps snapshots cannot be mistaken for completion measurements',()=>{
 assert.throws(()=>normalise({models:[{model:'llama',size_vram:1024}]}),/No completion counts/);
});
test('llama.cpp timings include cached prompt tokens once',()=>{
 const x=normalise({model:'qwen',timings:{cache_n:236,prompt_n:1,prompt_per_second:32.3,predicted_n:35,predicted_per_second:52.94},
   generation_settings:{n_ctx:4096}});
 assert.equal(x.source,'llama.cpp');
 assert.equal(x.promptTokens,237);assert.equal(x.generatedTokens,35);
 assert.equal(x.cachedPromptTokens,236);assert.equal(x.totalTokens,272);
 assert.equal(x.contextWindowTokens,4096);assert.equal(x.decodeTPS,52.94);
});
test('llama.cpp chat usage takes precedence over prompt_n cache_n',()=>{
 const x=normalise({usage:{prompt_tokens:44,completion_tokens:48,prompt_tokens_details:{cached_tokens:11}},
 timings:{prompt_n:90,cache_n:20,predicted_n:40},generation_settings:{n_ctx:128}});
 assert.equal(x.promptTokens,44);assert.equal(x.generatedTokens,48);
 assert.equal(x.cachedPromptTokens,11);assert.equal(x.totalTokens,92);
});
test('JSONL import chooses latest final completed response',()=>{
 const x=parseText([
  JSON.stringify({model:'m',done:false,response:'x'}),
  JSON.stringify({model:'m',done:true,prompt_eval_count:24,eval_count:2}),
  JSON.stringify({model:'m',done:true,prompt_eval_count:30,eval_count:5})
 ].join('\n'));
 assert.equal(x.promptTokens,30);assert.equal(x.generatedTokens,5);
});
test('missing response counts, malformed JSON and oversized data fail explicitly',()=>{
 assert.throws(()=>parseText('{"response":"hello"}'),/No completion counts/);
 assert.throws(()=>parseText('bad json'),/Invalid JSON/);
 assert.throws(()=>parseText('x'.repeat(2_000_001)),/2 MB/);
});
test('model mismatch does not attach unrelated VRAM telemetry',()=>{
 const x=normalise([{model:'one',prompt_eval_count:20,eval_count:10},
  {models:[{name:'two',size_vram:4*1024**3,context_length:8192}]}]);
 assert.equal(x.modelVRAMGiB,null);assert.equal(x.contextWindowTokens,null);
});
