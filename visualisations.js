(function () {
'use strict';
const {HARDWARE,calculate,hardwareState}=window.LLMLab;
const root=document.getElementById('visualCanvas');
if(!root) throw Error('Missing visualCanvas');
root.innerHTML = [
'<section class="panel viz-panel viz-memory">',
'<header class="viz-head"><div><small>01 / GPU MEMORY</small><h2>Where the model lives</h2><p>Each square represents part of the GPU memory.</p></div><b id="vizFit"></b></header>',
'<div class="viz-chip"><div class="viz-chip-head"><strong id="vizDevice"></strong><span id="vizBw"></span></div>',
'<div class="viz-chip-label"><span>VRAM / UNIFIED MEMORY</span><strong id="vizTotal"></strong></div>',
'<div id="vizMemoryDiagram" class="viz-memory-diagram"><div id="vizTiles" class="viz-tiles" role="img" aria-label="Memory tiles by allocation type"></div><div id="vizRuler" class="viz-ruler" role="img" aria-label="Memory ruler"></div></div>',
'<div class="viz-chip-foot"><span>0 GiB</span><span id="vizTileScale" class="viz-tile-scale" aria-live="polite"></span><span id="vizDemand"></span></div></div>',
'<div class="viz-legend" id="vizLegend"></div>',
'<div class="viz-host"><div class="viz-host-label"><span>GPU ⇄ SYSTEM RAM</span><span id="vizHost"></span></div><div class="viz-host-bar"><div id="vizHostBar"></div></div></div>',
'</section>',
'<section class="panel viz-panel viz-context"><header class="viz-head"><div><small>02 / CONTEXT WINDOW</small><h2>Where the tokens go</h2><p>Illustrative token workload from your configured assumptions.</p></div></header>',
'<div class="viz-context-main"><div class="viz-ring-wrap"><svg viewBox="0 0 160 160" role="img" aria-label="Context allocation ring" xmlns="http://www.w3.org/2000/svg">',
'<circle cx="80" cy="80" r="62" fill="none" stroke="#283942" stroke-width="15"/><g id="vizRingSegments" transform="rotate(-90 80 80)"></g></svg>',
'<div class="viz-ring-centre"><strong id="vizPct"></strong><small>context used</small></div></div>',
'<div class="viz-token-stats"><div><span>Allocated</span><strong id="vizAllocated"></strong></div>',
'<div><span>Workload</span><strong id="vizUsed"></strong></div><div><span>Unused</span><strong id="vizFree"></strong></div>',
'<div><span>GPU-only limit</span><strong id="vizCeiling"></strong></div></div></div>',
'<div class="viz-context-bar" id="vizContextBar"></div><div class="viz-token-legend" id="vizTokenLegend"></div><p class="viz-note" id="vizNote"></p>',
'</section>',
'<section class="panel viz-panel viz-compare"><header class="viz-head"><div><small>03 / HARDWARE COMPARISON</small><h2>Can your model fit?</h2>',
'<p>Capacity bars compared against this model and context. Click to select hardware.</p></div></header>',
'<div class="viz-scale" id="vizScale"></div><div class="viz-gpus" id="vizGpus"></div>',
'<p class="viz-disclaimer">GPU-only memory projection. Apple values use the configured Metal budget. No model throughput benchmark is implied.</p></section>'
].join('');
const $=id=>document.getElementById(id);
const fmt=(n,p=1)=>Number(n).toLocaleString('en-AU',{maximumFractionDigits:p});
const types=[['Weights','#7dddbc'],['KV cache','#77b7ed'],['Extras','#f0c385'],['Reserved','#8795a8'],['Free','#2e444e']];
const colors=['#7dddbc','#77b7ed','#f0c385','#2e444e'];
const sampleIds=['mbp-m4-16','mini-m4-24','mini-m4pro-48','studio-m4max40-64','4090','5090','h100'];
function add(parent,tag,cls,contents) {
 const e=document.createElement(tag);if(cls)e.className=cls;if(contents!=null)e.textContent=contents;parent.appendChild(e);return e;
}
// A column corresponds to a consistent portion of memory and always has 8 tiles.
// Under 40 GiB, each column is 1 GiB (each tile 128 MiB).
// Beyond that, power-of-two column ranges bound the width without changing row count.
const TILE_ROWS = 8;
const MAX_TILE_COLUMNS = 40;
function tileGeometry(capacityGiB) {
 const capacity = Math.max(0,Number(capacityGiB)||0);
 let nominalColumnGiB = 1;
 while (Math.ceil(capacity / nominalColumnGiB) > MAX_TILE_COLUMNS) nominalColumnGiB *= 2;
 const columns = Math.max(1,Math.ceil(capacity / nominalColumnGiB));
 const count = columns * TILE_ROWS;
 const columnGiB = capacity / columns;
 const unit = capacity / count;
 return {capacity,unit,columnGiB,nominalColumnGiB,count,columns,rows:TILE_ROWS};
}
function drawRuler(geometry,ruler) {
 ruler.replaceChildren();
 ruler.setAttribute('aria-label','Memory ruler: 0 to '+fmt(geometry.capacity,2)+' GiB');
 if (!geometry.capacity) return;
 let step = 1;
 while(step < geometry.capacity / 7) step *= 2;
 const values=[0];
 for(let value=step;value<geometry.capacity;value+=step) {
  if(geometry.capacity-value>=step*.3)values.push(value);
 }
 values.push(geometry.capacity);
 for(const [index,value] of values.entries()){
  const tick=add(ruler,'span','viz-ruler-tick');
  tick.style.left=(100*value/geometry.capacity)+'%';
  if(index===0)tick.classList.add('first');
  if(index===values.length-1)tick.classList.add('last');
  tick.dataset.gib=String(value);
  const label=index===values.length-1?fmt(value,2)+' GiB':fmt(value,0);
  add(tick,'span','viz-ruler-label',label);
 }
}
function drawMemory(s,d,prefix='viz'){
 const el=key=>$(prefix+key);
 el('Device').textContent=HARDWARE[s.hardware].name;
 el('Bw').textContent=fmt(s.bandwidth,0)+' GB/s';
 el('Total').textContent=fmt(d.cap,2)+' GiB';
 el('Demand').textContent=fmt(d.gpuDemand,2)+' GiB needed';
 const fit=d.gpuDemand<=d.cap;el('Fit').textContent=fit?'FITS':'OVER CAPACITY';
 el('Fit').className=fit?'is-fit':'is-over';
 const amounts=[d.gpuWeightsGiB,d.gpuKvGiB,d.extrasGiB,d.guardGiB,Math.max(0,d.left)];
 const geometry=tileGeometry(d.cap);
 const diagram=el('MemoryDiagram');
 const tiles=el('Tiles');tiles.replaceChildren();
 diagram.style.maxWidth=Math.min(660,geometry.columns*19+12)+'px';
 tiles.style.setProperty('--viz-tile-columns',String(geometry.columns));
 tiles.style.setProperty('--viz-tile-rows',String(geometry.rows));
 el('TileScale').textContent=fmt(geometry.columns,0)+' columns × 8 rows · 1 tile ≈ '+fmt(geometry.unit,3)+' GiB';
 tiles.setAttribute('aria-label','GPU memory: '+fmt(geometry.capacity,2)+' GiB arranged in 8 rows and '+geometry.columns+' columns; one colour and one category per tile.');
 const segments=[];
 let cursor=0;
 for(let i=0;i<4;i++){
  const size=Math.max(0,amounts[i]);
  segments.push({from:cursor,to:cursor+size,name:types[i][0],colour:types[i][1]});
  cursor+=size;
 }
 segments.push({from:cursor,to:Math.max(cursor,geometry.capacity),name:types[4][0],colour:types[4][1]});
 // The midpoint determines one allocation category per tile. Never paint gradients
 // or split a rectangle, even where the exact allocation boundary crosses a tile.
 for(let i=0;i<geometry.count;i++){
  const start=i*geometry.unit,end=(i+1)*geometry.unit;
  const midpoint=(start+end)/2;
  const type=segments.find(segment=>midpoint>=segment.from && midpoint<segment.to)
    || segments[segments.length-1];
  const tile=add(tiles,'span','viz-tile');
  tile.dataset.type=type.name;
  tile.style.background=type.colour;
  tile.title=type.name+' · '+fmt(start,3)+'–'+fmt(end,3)+' GiB (rounded visual allocation)';
 }
 drawRuler(geometry,el('Ruler'));
 const leg=el('Legend');leg.replaceChildren();
 types.forEach(([name,color],i)=>{
   const cell=add(leg,'div','viz-key');
   const dot=add(cell,'i','');dot.style.background=color;
   add(cell,'span','',name);add(cell,'b','',fmt(amounts[i],2)+' GiB');
 });
 const hostAmount=Math.max(0,d.hostDemand);const capacity=Math.max(.01,d.availableHostGiB);
 el('Host').textContent=fmt(hostAmount,2)+' / '+fmt(capacity,2)+' GiB';
 el('HostBar').style.width=Math.min(100,100*hostAmount/capacity)+'%';
 el('HostBar').classList.toggle('over',hostAmount>capacity);
}
function drawContext(s,d){
 const values=[Number(s.agentBase),Number(s.agentTools),Number(s.agentOutput)];
 const used=values.reduce((a,b)=>a+b,0), total=Math.max(1,Number(s.context)),free=Math.max(0,total-used);
 $('vizPct').textContent=fmt(used/total*100,0)+'%';
 $('vizAllocated').textContent=fmt(total,0);
 $('vizUsed').textContent=fmt(used,0);
 $('vizFree').textContent=fmt(free,0);
 $('vizCeiling').textContent=fmt(d.maxGpuContext,0);
 const circumference=2*Math.PI*62,ns='http://www.w3.org/2000/svg';
 const ring=$('vizRingSegments');ring.replaceChildren();
 let offset=0;
 values.forEach((v,i)=>{
   const fraction=Math.min(Math.max(0,1-offset),v/total);
   if(fraction<=0)return;
   const arc=document.createElementNS(ns,'circle');
   for(const [k,val] of Object.entries({cx:80,cy:80,r:62,fill:'none',stroke:colors[i],'stroke-width':15,'stroke-dasharray':(fraction*circumference)+' '+circumference,'stroke-dashoffset':-offset*circumference}))arc.setAttribute(k,String(val));
   ring.appendChild(arc);offset+=fraction;
 });
 const bar=$('vizContextBar'),legend=$('vizTokenLegend');bar.replaceChildren();legend.replaceChildren();
 const labels=['System / agent','Tools / files','Generated','Free'];
 [...values,free].forEach((v,i)=>{
   const seg=add(bar,'span','viz-context-seg');
   seg.style.width=(100*v/Math.max(total,used))+'%';seg.style.background=colors[i];seg.title=labels[i]+': '+fmt(v,0);
   const key=add(legend,'div','viz-token-key');const dot=add(key,'i','');dot.style.background=colors[i];
   add(key,'span','',labels[i]);add(key,'b','',fmt(v,0));
 });
 const warning=used>total?'The workload exceeds the allocated context by '+fmt(used-total,0)+' tokens.':
   total>d.maxGpuContext?'Allocated context exceeds GPU-only capacity. Try a smaller model, quantised KV cache or more GPU memory.':
   'This workload fits the selected context and GPU capacity under the configured assumptions.';
 $('vizNote').textContent=warning;$('vizNote').classList.toggle('warn',used>total||total>d.maxGpuContext);
}
function drawComparisons(s){
 const list=$('vizGpus');list.replaceChildren();
 const ids=[...new Set([...sampleIds,s.hardware])].filter(id=>HARDWARE[id]);
 const entries=ids.map(id=>{
  const next=hardwareState(id,s);next.gpuCount=1;next.cpuWeights=0;next.kvOffload=false;next.autoSpill=false;
  return {id,h:HARDWARE[id],d:calculate(next)};
 });
 const max=Math.max(1,...entries.map(x=>Math.max(x.d.cap,x.d.gpuDemand)));
 $('vizScale').textContent='Scale: 0 to '+fmt(max,0)+' GiB | amber = model demand';
 for(const {id,h,d} of entries){
  const row=add(list,'button','viz-gpu-row');row.type='button';
  if(id===s.hardware)row.classList.add('active');row.setAttribute('aria-label','Select '+h.name);
  const desc=add(row,'span','viz-row-desc');add(desc,'b','',h.name);add(desc,'small','',fmt(d.cap,1)+' GiB · '+fmt(h.bandwidth,0)+' GB/s');
  const track=add(row,'span','viz-track'),fill=add(track,'span','viz-fill');
  fill.style.width=(100*d.cap/max)+'%';fill.classList.toggle('miss',d.gpuDemand>d.cap);
  const mark=add(track,'span','viz-marker');mark.style.left=(100*Math.min(max,d.gpuDemand)/max)+'%';mark.title=fmt(d.gpuDemand,2)+' GiB required';
  add(row,'b',d.status==='fit'?'viz-fit-label':'viz-miss-label',d.status==='fit'?'FITS':'OVER');
  row.addEventListener('click',()=>{
    const sel=$('hardware');sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));
  });
 }
}
window.CalculatorVisuals={tileGeometry,renderMemory:drawMemory,render(s,d){drawMemory(s,d);drawContext(s,d);drawComparisons(s);}};
})();