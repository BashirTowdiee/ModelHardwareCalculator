(function(){
'use strict';
const {HARDWARE,MODELS,DEFAULTS,calculate,hardwareState,modelState}=window.LLMLab;
const $=id=>document.getElementById(id);
const canvas=$('visualCanvas'),toggle=$('compareToggle');
if(!canvas||!toggle||!window.CalculatorVisuals?.renderMemory)throw Error('Compare interface prerequisites missing');
const b={
 hardware:'5060ti',model:'same',context:null,cache:'same',
 gpu:{vram:24,bandwidth:800,ram:64,gpuCount:1,split:'tensor',memoryType:'discrete',metalPct:79},
 extras:{reserve:null,overhead:null,cpuWeights:null,kvOffload:null,autoSpill:null,vision:null,mtp:null},
 modelValues:{modelGB:8,kvKiB:64,modelLimit:262144,visionGB:0,mtpGB:0}
};
let enabled=false;
const card=document.createElement('section');
card.className='panel viz-panel viz-memory viz-memory-b';
card.id='compareCard';card.hidden=true;
card.innerHTML=[
 '<header class="viz-head"><div><small>B / ALTERNATIVE</small><h2>Compare configuration</h2></div><b id="cmpFit"></b></header>',
 '<div class="compare-pickers"><label>GPU<select id="cmpHardware"></select></label><label>Model<select id="cmpModel"></select></label></div>',
 '<div class="viz-chip"><div class="viz-chip-head"><strong id="cmpDevice"></strong><span id="cmpBw"></span></div>',
 '<div class="viz-chip-label"><span>VRAM / UNIFIED MEMORY</span><strong id="cmpTotal"></strong></div>',
 '<div id="cmpMemoryDiagram" class="viz-memory-diagram"><div id="cmpTiles" class="viz-tiles" role="img" aria-label="Comparison GPU memory allocation"></div><div id="cmpRuler" class="viz-ruler" role="img" aria-label="Comparison memory ruler"></div></div>',
 '<div class="viz-chip-foot"><span>0 GiB</span><span id="cmpTileScale" class="viz-tile-scale"></span><span id="cmpDemand"></span></div></div>',
 '<div class="viz-legend" id="cmpLegend"></div>',
 '<div class="viz-host"><div class="viz-host-label"><span>GPU ⇄ SYSTEM RAM</span><span id="cmpHost"></span></div><div class="viz-host-bar"><div id="cmpHostBar"></div></div></div>',
 '<button id="cmpSettings" class="studio-detail-button cmp-edit" type="button">Configure B memory, context & precision ↗</button>'
].join('');
canvas.querySelector('.viz-memory').after(card);
const diff=document.createElement('section');
diff.className='panel viz-ab-summary';diff.id='compareSummary';diff.hidden=true;
diff.setAttribute('aria-label','Side by side hardware and model comparison');
canvas.appendChild(diff);
const hardwareSelect=$('cmpHardware'),modelSelect=$('cmpModel');
for(const [select,kind,placeholder] of [[hardwareSelect,'Hardware','Search GPU / Mac…'],[modelSelect,'Model','Search model…']]){
 const label=select.closest('label');
 if(label.firstChild?.nodeType===3)label.firstChild.textContent='';
 label.classList.add('lookup-group','compare-picker');
 const text=document.createElement('span');text.textContent=kind;
 label.prepend(text);
 const search=document.createElement('input');
 search.type='search';search.className='catalog-search';search.id=select.id+'Search';
 search.placeholder=placeholder;search.setAttribute('aria-label','Search B '+kind);
 search.autocomplete='off';
 select.before(search);
}
hardwareSelect.innerHTML='<option value="same">Same GPU as A</option>'+Object.entries(HARDWARE).sort(([a],[z])=>a==='custom'?-1:z==='custom'?1:0)
 .map(([id,h])=>'<option value="'+id+'">'+h.name+' · '+h.vram+' GB</option>').join('');
modelSelect.innerHTML='<option value="same">Same model as A</option>'+Object.entries(MODELS).sort(([a],[z])=>a==='custom'?-1:z==='custom'?1:0)
 .map(([id,m])=>'<option value="'+id+'">'+m.name+' · '+m.detail+'</option>').join('');
hardwareSelect.value=b.hardware;modelSelect.value=b.model;

const drawer=document.createElement('section');
drawer.id='drawer-comparison';drawer.className='studio-drawer-section';drawer.hidden=true;
const heading=document.createElement('div');heading.className='studio-overline';heading.textContent='CONFIGURATION B · INDEPENDENT SETTINGS';
drawer.appendChild(heading);
const intro=document.createElement('p');intro.className='fine-print';intro.textContent='By default, B uses the same context and cache as A. Choose a different model or GPU above and customise this scenario independently.';drawer.appendChild(intro);
function field(container,label,id,value,opts={}){
 const wrap=document.createElement('label');wrap.className='studio-exact';
 const name=document.createElement('span');name.textContent=label;wrap.appendChild(name);
 const input=document.createElement('input');input.id='cmp-'+id;input.type='number';input.min=opts.min??0;input.step=opts.step??1;
 if(opts.max!=null)input.max=opts.max;
 input.value=String(value??'');input.setAttribute('aria-label','B: '+label);
 wrap.appendChild(input);container.appendChild(wrap);
 return input;
}
function headingPart(name){const h=document.createElement('div');h.className='studio-overline';h.textContent=name;drawer.appendChild(h);return h;}
headingPart('MODEL & CONTEXT OVERRIDES');
const context=field(drawer,'Context tokens (blank = same as A)','context','',{step:1024,min:4096,max:2097152});
context.placeholder='Same as A';
const precisionWrap=document.createElement('label');precisionWrap.className='field';
precisionWrap.innerHTML='<span class="field-name">KV cache precision for B</span><select id="cmp-cache"><option value="same">Same as A</option><option value="fp16">FP16</option><option value="q8">Q8_0</option><option value="q4">Q4_0</option></select>';
drawer.appendChild(precisionWrap);
headingPart('CUSTOM GPU VALUES');
const hardwareInputs=document.createElement('div');hardwareInputs.id='cmpHardwareCustom';hardwareInputs.className='cmp-inputs';drawer.appendChild(hardwareInputs);
const vendorWrap=document.createElement('label');vendorWrap.className='field';vendorWrap.innerHTML='<span class="field-name">GPU memory architecture</span><select id="cmp-gpu-memoryType"><option value="discrete">Discrete GPU / VRAM</option><option value="unified">Unified memory (Apple-style)</option></select>';hardwareInputs.appendChild(vendorWrap);
const gpuFields={};for(const [k,label,step,min,max] of [
 ['vram','Memory per GPU (GiB)',1,1,8192],['bandwidth','Bandwidth per GPU (GB/s)',1,1,30000],
 ['ram','System RAM (GiB)',1,1,16384],['gpuCount','GPU count',1,1,16],
 ['metalPct','Metal working-set %',1,1,100]
])gpuFields[k]=field(hardwareInputs,label,'gpu-'+k,b.gpu[k],{step,min,max});
const splitWrap=document.createElement('label');splitWrap.className='field';splitWrap.innerHTML='<span class="field-name">Multi-GPU split</span><select id="cmp-gpu-split"><option value="tensor">Tensor</option><option value="layer">Layer</option></select>';hardwareInputs.appendChild(splitWrap);
headingPart('CUSTOM MODEL VALUES');
const modelInputs=document.createElement('div');modelInputs.id='cmpModelCustom';modelInputs.className='cmp-inputs';drawer.appendChild(modelInputs);
const modelFields={};for(const [k,label,step,min,max] of [
 ['modelGB','Weights file (GB)',.1,.1,10000],['kvKiB','FP16 KV per token (KiB)',1,1,8192],
 ['modelLimit','Native model context (tokens)',1024,1024,2097152],
 ['visionGB','Vision projector (GB)',.01,0,1000],['mtpGB','MTP head (GB)',.01,0,1000]
])modelFields[k]=field(modelInputs,label,'model-'+k,b.modelValues[k],{step,min,max});
headingPart('OPTIONAL RESOURCES & OFFLOADING');
const extraFields={};
for(const [key,label,min,max,step] of [
 ['reserve','Reserve per GPU (GiB)',0,20,.1],
 ['overhead','Runtime overhead per GPU (GiB)',0,20,.1],
 ['cpuWeights','Weights offloaded to RAM (%)',0,100,1]
]){
 extraFields[key]=field(drawer,label,'extra-'+key,'',{min,max,step});
 extraFields[key].placeholder='Same as A';
}
const extraChecks={};
for(const [key,label] of [
 ['kvOffload','Store KV cache in host RAM'],
 ['autoSpill','Automatically spill when VRAM exceeded'],
 ['vision','Enable vision projector'],
 ['mtp','Enable multi-token prediction']
]){
 const row=document.createElement('label');row.className='studio-extra-check';
 const text=document.createElement('span');text.textContent=label;
 const toggle=document.createElement('select');
 toggle.id='cmp-extra-'+key;
 toggle.innerHTML='<option value="same">Same as model / A</option><option value="true">On</option><option value="false">Off</option>';
 row.append(text,toggle);drawer.appendChild(row);extraChecks[key]=toggle;
}
window.CalculatorLayout.drawers.comparison=drawer;
document.querySelector('.studio-drawer-body').appendChild(drawer);
const fmt=(num,p=1)=>Number(num).toLocaleString('en-AU',{maximumFractionDigits:p});
function syncVisibility(){
 hardwareInputs.hidden=b.hardware!=='custom';
 modelInputs.hidden=b.model!=='custom';
 $('cmp-gpu-memoryType').value=b.gpu.memoryType;
 $('cmp-gpu-split').value=b.gpu.split;
 Object.entries(gpuFields).forEach(([id,el])=>el.value=b.gpu[id]);
 Object.entries(modelFields).forEach(([id,el])=>el.value=b.modelValues[id]);
 context.value=b.context==null?'':b.context;
 $('cmp-cache').value=b.cache;
 Object.entries(extraFields).forEach(([key,el])=>{if(document.activeElement!==el)el.value=b.extras[key]??'';});
 Object.entries(extraChecks).forEach(([key,el])=>el.value=b.extras[key]==null?'same':String(b.extras[key]));
}
function getState(a){
 let s={...a};
 if(b.hardware!=='same')s=hardwareState(b.hardware,s);
 if(b.hardware==='custom'){
  s={...s,...b.gpu};
  if(b.gpu.memoryType==='unified'){s.gpuCount=1;s.cpuWeights=0;s.kvOffload=false;s.autoSpill=false;}
 }
 if(b.model!=='same')s=modelState(b.model,s);
 if(b.model==='custom')s={...s,...b.modelValues};
 if(b.context!=null)s.context=b.context;
 if(b.cache!=='same')s.cache=b.cache;
 for(const [key,value] of Object.entries(b.extras))if(value!=null)s[key]=value;
 return s;
}
function createValue(label,a,b,unit,precision=1){
 const item=document.createElement('div');item.className='ab-metric';
 const caption=document.createElement('span');caption.textContent=label;
 const primary=document.createElement('strong');primary.textContent=Number.isFinite(a)?fmt(a,precision)+' '+unit:'—';
 const alternate=document.createElement('strong');alternate.textContent=Number.isFinite(b)?fmt(b,precision)+' '+unit:'—';
 item.append(caption,primary,alternate);diff.appendChild(item);
}
function render(a,da){
 if(!enabled)return;
 const s=getState(a),db=calculate(s);
 window.CalculatorVisuals.renderMemory(s,db,'cmp');
 diff.replaceChildren();
 const heads=document.createElement('div');heads.className='ab-heading';
 heads.innerHTML='<span>COMPARISON</span><strong>A · PRIMARY</strong><strong>B · ALTERNATIVE</strong>';
 diff.appendChild(heads);
 createValue('Memory capacity',da.cap,db.cap,'GiB');
 createValue('Memory required',da.gpuDemand,db.gpuDemand,'GiB');
 createValue('Free GPU memory',da.left,db.left,'GiB');
 createValue('GPU-only context',da.maxGpuContext,db.maxGpuContext,'tokens',0);
 createValue('Decode scenario',da.gpuOnly?da.estimatedTPS:NaN,db.gpuOnly?db.estimatedTPS:NaN,'tok/s');
 const foot=document.createElement('p');foot.className='ab-note';
 foot.textContent='A: '+da.status.toUpperCase()+' · B: '+db.status.toUpperCase()+' · Speed estimates depend on software and memory residency.';
 diff.appendChild(foot);
 diff.dataset.primaryStatus=da.status;
 diff.dataset.alternativeStatus=db.status;
 return db;
}
function setEnabled(value){
 enabled=Boolean(value);
 card.hidden=!enabled;diff.hidden=!enabled;
 canvas.classList.toggle('is-comparing',enabled);
 toggle.setAttribute('aria-pressed',String(enabled));
 toggle.textContent=enabled?'Close comparison':'Compare A / B';
 const primaryLabel=canvas.querySelector('.viz-memory:not(.viz-memory-b) .viz-head small');
 if(primaryLabel)primaryLabel.textContent=enabled?'A / CURRENT CONFIGURATION':'01 / GPU MEMORY';
 if(enabled)render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
}
toggle.addEventListener('click',()=>setEnabled(!enabled));
hardwareSelect.addEventListener('change',()=>{
 b.hardware=hardwareSelect.value;syncVisibility();
 if(b.hardware==='custom')window.CalculatorLayout.openDrawer('comparison');
 render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
modelSelect.addEventListener('change',()=>{
 b.model=modelSelect.value;syncVisibility();
 if(b.model==='custom')window.CalculatorLayout.openDrawer('comparison');
 render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
$('cmpSettings').addEventListener('click',()=>{syncVisibility();window.CalculatorLayout.openDrawer('comparison');});
context.addEventListener('input',()=>{
 const value=Number(context.value);
 b.context=context.value!=='' && Number.isFinite(value) && value>0?value:null;
 render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
$('cmp-cache').addEventListener('change',event=>{b.cache=event.target.value;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());});
$('cmp-gpu-memoryType').addEventListener('change',event=>{b.gpu.memoryType=event.target.value;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());});
$('cmp-gpu-split').addEventListener('change',event=>{b.gpu.split=event.target.value;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());});
for(const [key,el]of Object.entries(gpuFields))el.addEventListener('input',()=>{
 const v=Number(el.value);if(!el.value||!Number.isFinite(v)||v<Number(el.min)||v>Number(el.max))return;
 b.gpu[key]=v;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
for(const [key,el]of Object.entries(extraFields))el.addEventListener('input',()=>{
 if(el.value===''){b.extras[key]=null;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());return;}
 const v=Number(el.value);
 if(!Number.isFinite(v)||v<Number(el.min)||v>Number(el.max))return;
 b.extras[key]=v;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
for(const [key,el]of Object.entries(extraChecks))el.addEventListener('change',()=>{
 b.extras[key]=el.value==='same'?null:el.value==='true';
 render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
for(const [key,el]of Object.entries(modelFields))el.addEventListener('input',()=>{
 const v=Number(el.value);if(!el.value||!Number.isFinite(v)||v<Number(el.min)||v>Number(el.max))return;
 b.modelValues[key]=v;render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
});
syncVisibility();
window.ComparisonStudio={render,setEnabled,getState:()=>getState(window.CalculatorApp.getState()),isEnabled:()=>enabled};
})();