/* Two-mode context visualisation. Local imports only: no telemetry requests. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const core=window.MeasurementCore,layout=window.CalculatorLayout;
const panel=document.querySelector('.viz-context');
if(!core||!panel||!layout)throw Error('Measurement panel prerequisites missing');
const header=panel.querySelector('.viz-head');
const controls=document.createElement('div');controls.className='measurement-controls';
controls.innerHTML='<div class="measurement-switch" role="group" aria-label="Context data mode">'+
 '<button type="button" id="modeSimulation" aria-pressed="true">Simulation</button>'+
 '<button type="button" id="modeMeasured" aria-pressed="false">Measured</button></div>'+
 '<button type="button" id="measurementOpen" class="measurement-open">Import data ↗</button>';
header.appendChild(controls);
const box=document.createElement('div');
box.id='measuredView';box.className='measurement-view';box.hidden=true;
box.innerHTML=[
 '<div class="measurement-empty" id="measurementEmpty"><strong>No measured session imported</strong>',
 '<p>Import the final JSON response from Ollama or llama.cpp to see observed token counts. Simulation values will not be presented as measurements.</p>',
 '<button type="button" id="measurementEmptyImport">Import runtime JSON</button></div>',
 '<div id="measurementResults" hidden>',
 '<div class="measurement-summary-head"><span id="measurementOrigin"></span><button id="measurementClear" type="button">Clear import</button></div>',
 '<div class="measurement-chart">',
 '<div class="measurement-donut"><svg id="measurementRing" viewBox="0 0 160 160" role="img" aria-label="Observed context utilisation" xmlns="http://www.w3.org/2000/svg">',
 '<circle cx="80" cy="80" r="60" stroke="#30434c" fill="none" stroke-width="15"/>',
 '<g id="measurementArcs" transform="rotate(-90 80 80)"></g></svg>',
 '<div class="measurement-donut-text"><strong id="measurementPercent"></strong><span id="measurementPercentCaption"></span></div></div>',
 '<div class="measurement-metrics">',
 '<div><span>Prompt (observed)</span><strong id="measurementPrompt"></strong></div>',
 '<div><span>Output (observed)</span><strong id="measurementOutput"></strong></div>',
 '<div><span>Runtime context window</span><strong id="measurementWindow"></strong></div>',
 '<div><span>Unallocated tokens</span><strong id="measurementRemaining"></strong></div>',
 '</div></div>',
 '<div class="measurement-usage-bar" id="measurementBar" role="img" aria-label="Observed prompt/output token composition"></div>',
 '<div class="measurement-label-row"><span><i class="measurement-prompt-dot"></i> Prompt</span><span><i class="measurement-output-dot"></i> Generated</span><span id="measurementBarLabel"></span></div>',
 '<div class="measurement-detail-grid">',
 '<div><span>Cached prompt</span><strong id="measurementCached"></strong></div>',
 '<div><span>Measured prefill rate</span><strong id="measurementPrefill"></strong></div>',
 '<div><span>Measured generation rate</span><strong id="measurementDecode"></strong></div>',
 '<div><span>Reported model VRAM residency</span><strong id="measurementVRAM"></strong></div>',
 '</div>',
 '<div class="measurement-plan"><b>Simulation vs observed</b><div><span>Planned token workload</span><strong id="measurementPlanTokens"></strong></div>',
 '<div><span>Planned context size</span><strong id="measurementPlanContext"></strong></div>',
 '<div><span>Estimated GPU demand</span><strong id="measurementPlanVRAM"></strong></div>',
 '<p>Simulation numbers are estimates from the selected model/hardware settings; observation values are read from the imported runtime response. These are not automatically the same run or model.</p></div>',
 '<p class="measurement-caveats" id="measurementCaveats"></p></div>'
].join('');
panel.appendChild(box);
const drawer=document.createElement('section');
drawer.id='drawer-measurement';drawer.className='studio-drawer-section';drawer.hidden=true;
drawer.innerHTML=[
 '<div class="studio-overline">MEASURED SESSION IMPORT</div>',
 '<p class="fine-print">Import an Ollama /api/generate or /api/chat final response, or a llama.cpp /completion or /v1/chat/completions response with usage/timings.</p>',
 '<label class="measurement-file-label">Select local JSON or JSONL file<input type="file" id="measurementFile" accept=".json,.jsonl,.ndjson,.txt,application/json,text/plain"/></label>',
 '<label class="measurement-paste-label">Or paste runtime JSON<textarea id="measurementPaste" rows="9" placeholder="Paste completion response JSON or JSONL. Optionally include Ollama /api/ps in {response, ps}."></textarea></label>',
 '<div class="measurement-import-actions"><button type="button" id="measurementApply">Use imported data</button><button type="button" id="measurementDiscard">Clear current measurement</button></div>',
 '<div id="measurementError" role="alert" aria-live="polite"></div>',
 '<p class="fine-print">Processed entirely in your browser. This page does not upload runtime logs. Consider removing prompts and private response content before importing. The /api/ps field size_vram reports model residency, not overall GPU utilisation.</p>',
 '<p class="fine-print">Optional Ollama memory snapshot format: {"response": { ...finalGenerateResponse }, "ps": { "models": [ ...apiPsModels ] }}. Matching model names attach VRAM data; unrelated model snapshots are ignored.</p>'
].join('');
document.querySelector('.studio-drawer-body').appendChild(drawer);
layout.drawers.measurement=drawer;
let mode='simulation',observation=null,scenario=null;
const display=(n,decimals=0)=>n==null?'Not reported':Number(n).toLocaleString('en-AU',{maximumFractionDigits:decimals});
const svgNS='http://www.w3.org/2000/svg',circleLength=2*Math.PI*60;
function setMode(value){
 if(value!=='simulation'&&value!=='measured')return;
 mode=value;
 $('modeSimulation').setAttribute('aria-pressed',String(value==='simulation'));
 $('modeMeasured').setAttribute('aria-pressed',String(value==='measured'));
 panel.classList.toggle('measurement-active',value==='measured');
 box.hidden=value!=='measured';
 if(value==='measured')render(scenario?.s,scenario?.d);
}
function render(s,d){
 if(s&&d)scenario={s,d};
 if(mode!=='measured')return;
 const empty=!observation;
 $('measurementEmpty').hidden=!empty;
 $('measurementResults').hidden=empty;
 if(empty)return;
 const o=observation;
 $('measurementOrigin').textContent=o.source+(o.model?' · '+o.model:'')+(o.observedAt?' · '+o.observedAt:'');
 $('measurementPrompt').textContent=display(o.promptTokens);
 $('measurementOutput').textContent=display(o.generatedTokens);
 $('measurementWindow').textContent=display(o.contextWindowTokens);
 $('measurementRemaining').textContent=o.contextWindowTokens==null?'Unknown':display(Math.max(0,o.contextWindowTokens-o.totalTokens));
 $('measurementCached').textContent=o.cachedPromptTokens==null?'Not reported':display(o.cachedPromptTokens)+' (included)';
 $('measurementPrefill').textContent=o.promptTPS==null?'Not reported':display(o.promptTPS,1)+' tok/s';
 $('measurementDecode').textContent=o.decodeTPS==null?'Not reported':display(o.decodeTPS,1)+' tok/s';
 $('measurementVRAM').textContent=o.modelVRAMGiB==null?'Not reported':display(o.modelVRAMGiB,2)+' GiB';
 const windowKnown=o.contextWindowTokens!=null;
 $('measurementPercent').textContent=windowKnown?display(o.contextFraction*100,0)+'%':'—';
 $('measurementPercentCaption').textContent=windowKnown?'reported context used':'window unknown';
 $('measurementBarLabel').textContent=windowKnown?'portion of reported context':'share of observed tokens only';
 const base=Math.max(1,windowKnown?o.contextWindowTokens:o.totalTokens);
 const used=Math.max(1,o.totalTokens);
 const totals=[o.promptTokens,o.generatedTokens];
 const bar=$('measurementBar');bar.replaceChildren();
 const ring=$('measurementArcs');ring.replaceChildren();
 const colours=['#87d8b9','#81b8e8'];
 let drawn=0;
 for(let i=0;i<2;i++){
  const segment=Math.min(Math.max(0,1-drawn),totals[i]/base);
  const barSegment=document.createElement('span');
  barSegment.style.background=colours[i];
  barSegment.style.width=(100*totals[i]/Math.max(base,used))+'%';
  barSegment.title=(i===0?'Prompt':'Output')+': '+display(totals[i])+' tokens';
  bar.appendChild(barSegment);
  if(!windowKnown||segment<=0)continue;
  const arc=document.createElementNS(svgNS,'circle');
  for(const [key,val] of Object.entries({cx:80,cy:80,r:60,fill:'none',stroke:colours[i],'stroke-width':15,
   'stroke-dasharray':segment*circleLength+' '+circleLength,'stroke-dashoffset':-drawn*circleLength}))
   arc.setAttribute(key,String(val));
  ring.appendChild(arc);drawn+=segment;
 }
 const own=scenario;
 $('measurementPlanTokens').textContent=own?display(own.s.agentBase+own.s.agentTools+own.s.agentOutput)+' tokens':'—';
 $('measurementPlanContext').textContent=own?display(own.s.context)+' tokens':'—';
 $('measurementPlanVRAM').textContent=own?display(own.d.gpuDemand,2)+' GiB':'—';
 $('measurementCaveats').textContent=o.notes.join(' ') +
  (o.contextFraction>1?' Reported token total exceeds the reported context; this may include generated tokens not simultaneously resident.':'')+
  (o.truncated===true?' Runtime reported context truncation.':'');
}
function apply(text){
 try {
  observation=core.parseText(text);
  $('measurementError').textContent='';
  setMode('measured');
  if(window.CalculatorApp)window.BandwidthVisuals?.render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
  layout.closeDrawer();
  return observation;
 }catch(e){ $('measurementError').textContent=String(e.message||e);return null; }
}
$('modeSimulation').addEventListener('click',()=>setMode('simulation'));
$('modeMeasured').addEventListener('click',()=>setMode('measured'));
$('measurementOpen').addEventListener('click',()=>layout.openDrawer('measurement'));
$('measurementEmptyImport').addEventListener('click',()=>layout.openDrawer('measurement'));
$('measurementApply').addEventListener('click',()=>apply($('measurementPaste').value));
$('measurementFile').addEventListener('change',async(event)=>{
 const file=event.target.files?.[0];if(!file)return;
 if(file.size>2_000_000){$('measurementError').textContent='File exceeds 2 MB.';return;}
 try{const text=await file.text();$('measurementPaste').value=text;apply(text);}
 catch(e){$('measurementError').textContent='Could not read file: '+String(e.message||e);}
});
function clear(){
 observation=null;$('measurementPaste').value='';$('measurementFile').value='';$('measurementError').textContent='';
 render();
 if(window.CalculatorApp)window.BandwidthVisuals?.render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
}
$('measurementClear').addEventListener('click',clear);
$('measurementDiscard').addEventListener('click',clear);
window.MeasurementStudio={apply,setMode,render,clear,getObservation:()=>observation,getMode:()=>mode};
if(window.CalculatorApp)scenario={s:window.CalculatorApp.getState(),d:window.CalculatorApp.getResult()};
})();
