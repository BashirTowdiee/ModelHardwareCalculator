/* Offline parser for Ollama and llama.cpp completion telemetry. */
(function(global){
'use strict';
const GiB=1024**3, isObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0?x:null;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
function parseText(text){
 if(typeof text!=='string'||!text.trim())throw Error('Paste a final inference JSON response.');
 if(text.length>2_000_000)throw Error('Import exceeds 2 MB; remove prompts and large payloads.');
 let data;try{data=JSON.parse(text);}catch{
  try{data=text.trim().split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));}
  catch{throw Error('Invalid JSON/JSONL. Use Ollama or llama.cpp completion response data.');}
 }
 return normalise(data);
}
function normalise(data){
 const sources=Array.isArray(data)?data:[data],records=[];
 for(const x of sources){if(!isObject(x))continue;records.push(x);
  for(const key of ['response','completion','ps','snapshot'])if(isObject(x[key]))records.push(x[key]);
 }
 const matches=records.filter(x=>integer(x.prompt_eval_count)!=null&&integer(x.eval_count)!=null||
  integer(x.usage?.prompt_tokens)!=null&&integer(x.usage?.completion_tokens)!=null||
  integer(x.timings?.predicted_n)!=null&&(integer(x.timings?.prompt_n)!=null||integer(x.tokens_evaluated)!=null)||
  integer(x.tokens_evaluated)!=null&&integer(x.tokens_predicted)!=null);
 if(!matches.length)throw Error('No completion counts. Import the final Ollama /api/generate or /api/chat response, or llama.cpp completion JSON. /api/ps alone has no request counts.');
 const x=matches[matches.length-1],ollama=integer(x.prompt_eval_count)!=null&&integer(x.eval_count)!=null;
 const t=isObject(x.timings)?x.timings:{},u=isObject(x.usage)?x.usage:{};
 const prompt=ollama?integer(x.prompt_eval_count):
  integer(u.prompt_tokens)??integer(x.tokens_evaluated)??(integer(t.prompt_n)!=null?t.prompt_n+(integer(t.cache_n)??0):null);
 const generated=ollama?integer(x.eval_count):integer(u.completion_tokens)??integer(x.tokens_predicted)??integer(t.predicted_n);
 if(prompt==null||generated==null)throw Error('Missing complete prompt/generated token counts.');
 const cached=ollama?integer(x.prompt_eval_cached_count):integer(u.prompt_tokens_details?.cached_tokens)??integer(t.cache_n)??integer(x.tokens_cached);
 const cachedTokens=cached==null?null:Math.min(prompt,cached);
 const model=typeof x.model==='string'?x.model.trim():'';
 const ps=records.filter(x=>Array.isArray(x.models)).flatMap(x=>x.models).filter(isObject);
 const loaded=ps.find(z=>model&&[z.name,z.model].includes(model))||(!model&&ps.length===1?ps[0]:null);
 const bytes=loaded?integer(loaded.size_vram):null;
 const reportedWindow=ollama?integer(loaded?.context_length)??integer(x.context_length):
  integer(x.generation_settings?.n_ctx)??integer(x.n_ctx);
 const windowTokens=reportedWindow>0?reportedWindow:null;
 const promptSec=positive(x.prompt_eval_duration)?x.prompt_eval_duration/1e9:null;
 const outputSec=positive(x.eval_duration)?x.eval_duration/1e9:null;
 const prefill=ollama?(promptSec?prompt/promptSec:null):
  positive(t.prompt_per_second)??(positive(t.prompt_ms)?(integer(t.prompt_n)??prompt)*1000/t.prompt_ms:null);
 const decode=ollama?(outputSec?generated/outputSec:null):
  positive(t.predicted_per_second)??(positive(t.predicted_ms)?generated*1000/t.predicted_ms:null);
 const notes=[];
 if(!windowTokens)notes.push('Runtime context-window size was not supplied: utilisation percentage is unknown.');
 if(bytes==null)notes.push('No matching Ollama /api/ps model residency figure was supplied.');
 else notes.push('Ollama size_vram is model residency, not total GPU memory usage or a KV/weights breakdown.');
 notes.push('Response tokens do not separate system instructions, tools and files.');
 return {source:ollama?'Ollama':'llama.cpp',model:model||(loaded?.name||null),
  promptTokens:prompt,generatedTokens:generated,totalTokens:prompt+generated,cachedPromptTokens:cachedTokens,
  contextWindowTokens:windowTokens,contextFraction:windowTokens?(prompt+generated)/windowTokens:null,
  promptTPS:prefill,decodeTPS:decode,modelVRAMGiB:bytes==null?null:bytes/GiB,
  modelVRAMBytes:bytes,truncated:typeof x.truncated==='boolean'?x.truncated:null,
  observedAt:typeof x.created_at==='string'?x.created_at:null,notes};
}
const api={parseText,normalise};global.MeasurementCore=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
