(function () {
'use strict';
const $=id=>document.getElementById(id);
const make=(tag,className,parent,text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!=null)el.textContent=text;
 if(parent)parent.appendChild(el);
 return el;
};
function move(id,parent,selector){
 const el=$(id);
 if(!el)throw Error('Missing simulator control: '+id);
 const block=el.closest(selector||'.slider-field');
 if(!block)throw Error('Missing control wrapper: '+id);
 parent.appendChild(block);
}
const main=document.querySelector('main');
const grid=document.querySelector('.app-grid');
const footer=main.querySelector('footer');
const head=document.querySelector('.hero-head');
if(!main||!grid||!head)throw Error('Simulator page structure unavailable');

// Primary controls are always exposed immediately adjacent to the live diagram.
const strip=make('div','config-strip',null);
main.insertBefore(strip,head.nextSibling);
function addSearch(name,id,placeholder){
 const group=make('div','lookup-group',strip);
 const input=make('input','catalog-search',group);
 input.type='search';input.id=id+'Search';input.autocomplete='off';
 input.placeholder=placeholder;input.setAttribute('aria-label','Search '+name);
 move(id,group,'.field');
 return group;
}
addSearch('GPU','hardware','Find GPU / Mac…');
addSearch('model','model','Find model…');

const studio=make('div','studio-main',null);
main.insertBefore(studio,strip.nextSibling);
const quick=make('section','panel studio-quick',studio);
quick.setAttribute('aria-label','Quick configuration');
make('div','studio-overline',quick,'ACTIVE CONFIGURATION');
const actionRow=make('div','studio-action-row',quick);
function action(id,text,section){
 const btn=make('button','studio-action',actionRow,text);
 btn.id=id;btn.type='button';btn.dataset.drawer=section;
 return btn;
}
action('customGpu','Custom GPU','hardware');
action('customModel','Custom model','model');
const quickControls=make('div','studio-quick-controls',quick);
move('context',quickControls);
move('cacheGroup',quickControls,'.field');
move('vision',quickControls,'.toggle-row');
move('mtp',quickControls,'.toggle-row');
const summary=make('div','studio-summary',quick);
summary.innerHTML='<div id="studioFit"></div><div class="studio-stats">'+
 '<div><span>GPU demand</span><strong id="studioDemand"></strong></div>'+
 '<div><span>Available GPU</span><strong id="studioCapacity"></strong></div>'+
 '<div><span>Max GPU-only context</span><strong id="studioMaxContext"></strong></div>'+
 '<div><span>Decode proxy</span><strong id="studioSpeed"></strong></div></div>';
const actions=make('div','studio-detail-actions',quick);
for(const [key,label] of [['hardware','GPU settings'],['model','Model settings'],['workload','Workload & speed'],['advanced','Advanced'],['costs','Costs'],['details','Detailed analysis']]){
 const b=make('button','studio-detail-button',actions,label);
 b.type='button';b.dataset.drawer=key;b.id='open-'+key;
}
const canvas=make('div','visual-canvas',studio);
canvas.id='visualCanvas';
const toggle=make('button','button studio-compare-toggle',document.querySelector('.hero-actions'),'Compare A / B');
toggle.id='compareToggle';toggle.type='button';toggle.setAttribute('aria-pressed','false');
const hint=make('p','studio-hint',quick,'All calculations are planning estimates, not hardware benchmarks.');

const backdrop=make('div','studio-drawer-backdrop',main);
backdrop.hidden=true;backdrop.id='studioBackdrop';
const drawer=make('aside','studio-drawer',main);
drawer.id='studioDrawer';drawer.hidden=true;
drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-labelledby','studioDrawerTitle');
drawer.tabIndex=-1;
const drawerHead=make('header','studio-drawer-head',drawer);
const title=make('h2','',drawerHead,'Settings');title.id='studioDrawerTitle';
const close=make('button','studio-drawer-close',drawerHead,'Close ×');
close.type='button';close.id='closeDrawer';
const body=make('div','studio-drawer-body',drawer);
const drawers={};
function drawerSection(name,title){
 const section=make('section','studio-drawer-section',body);
 section.id='drawer-'+name;section.hidden=true;
 make('div','studio-overline',section,title);
 drawers[name]=section;return section;
}
const hardware=drawerSection('hardware','GPU MEMORY & HARDWARE');
// Discrete or unified memory is configurable in the primary custom hardware preset.
const memType=make('label','field studio-memory-type',hardware);
make('span','field-name',memType,'Memory architecture');
const memSelect=make('select','',memType);
memSelect.id='memoryType';memSelect.innerHTML='<option value="discrete">Discrete GPU / VRAM</option><option value="unified">Unified memory (Apple-style)</option>';
move('gpuCount',hardware,'.field');
move('split',hardware,'.field');
for(let count=5;count<=16;count++){
 const option=make('option','',$('gpuCount'),count+' GPUs');option.value=String(count);
}
move('vram',hardware);move('bandwidth',hardware);move('ram',hardware);move('metalPct',hardware);
move('appleNotice',hardware,'.notice');
make('p','fine-print',hardware,'Custom GPU: set memory architecture, memory capacity, bandwidth, number of GPUs, system RAM and split mode. For unified memory, adjust the Metal working-set budget.');
const hardwareExact=make('div','studio-custom-exacts',hardware);
hardwareExact.id='studioHardwareExacts';
make('div','studio-overline',hardwareExact,'CUSTOM EXACT VALUES');
function exact(parent,key,text,min,max,step){
 const label=make('label','studio-exact',parent);
 make('span','',label,text);
 const input=make('input','',label);
 input.type='number';input.id='exact-'+key;input.min=min;input.max=max;input.step=step;
 input.dataset.exactState=key;
 input.addEventListener('change',()=>{
  const value=Number(input.value);
  if(input.value!==''&&Number.isFinite(value)&&value>=Number(input.min)&&value<=Number(input.max))
   window.CalculatorApp?.updateState({[key]:value});
 });
 return input;
}
for(const [key,name,min,max,step] of [
 ['vram','Memory per GPU (GiB)',1,8192,1],
 ['bandwidth','Bandwidth per GPU (GB/s)',1,30000,1],
 ['ram','System RAM (GiB)',1,16384,1],
 ['gpuCount','GPU count',1,16,1],
 ['metalPct','Metal working-set (%)',1,100,1]
])exact(hardwareExact,key,name,min,max,step);
const model=drawerSection('model','MODEL CONFIGURATION');
move('modelGB',model);move('kvKiB',model);move('modelLimit',model);
move('visionGB',model);move('mtpGB',model);
move('modelHint',model,'.fine-print');
make('p','fine-print',model,'Custom model: set the model weight file size, FP16 KV footprint per token, native context limit and optional vision/MTP weights. KV precision and allocated context remain directly editable in the quick controls.');
const modelExact=make('div','studio-custom-exacts',model);
modelExact.id='studioModelExacts';
make('div','studio-overline',modelExact,'CUSTOM EXACT VALUES');
for(const [key,name,min,max,step] of [
 ['modelGB','Weights file (GB)',.1,10000,.1],
 ['kvKiB','KV footprint per token (KiB)',1,8192,1],
 ['modelLimit','Native context (tokens)',1024,2097152,1024],
 ['visionGB','Vision weights (GB)',0,1000,.01],
 ['mtpGB','MTP weights (GB)',0,1000,.01]
])exact(modelExact,key,name,min,max,step);
const workload=drawerSection('workload','AGENT TOKENS & DECODE SPEED');
workload.appendChild(document.querySelector('.workload-panel'));
workload.appendChild(document.querySelector('.performance-panel'));
const advanced=drawerSection('advanced','ADVANCED MEMORY SETTINGS');
move('reserve',advanced);move('overhead',advanced);
move('cpuWeights',advanced);move('kvOffload',advanced,'.toggle-row');move('autoSpill',advanced,'.toggle-row');
const costs=drawerSection('costs','RUNNING COST COMPARISON');
costs.appendChild(document.querySelector('.economics-panel'));
const details=drawerSection('details','CAPACITY & ANALYSIS');
details.appendChild(document.querySelector('.result-panel'));
details.appendChild(document.querySelector('.graph-panel'));
details.appendChild(document.querySelector('.comparison-panel'));
grid.remove();
if(footer){footer.classList.add('site-footer');}

// Only one drawer at a time, with a focus return target and Escape/backdrop dismissal.
let currentDrawer=null,lastFocus=null;
function openDrawer(section){
 if(!drawers[section])return;
 if(!currentDrawer)lastFocus=document.activeElement;
 currentDrawer=section;
 for(const [key,pane]of Object.entries(drawers))pane.hidden=key!==section;
 title.textContent=({hardware:'Hardware settings',model:'Model settings',workload:'Workload & performance',advanced:'Advanced settings',costs:'Costs',details:'Detailed analysis',comparison:'Alternative configuration B',measurement:'Import runtime measurement'})[section];
 backdrop.hidden=false;drawer.hidden=false;
 drawer.scrollTop=0;body.scrollTop=0;close.focus();
}
function closeDrawer(){
 if(!currentDrawer)return;
 currentDrawer=null;drawer.hidden=true;backdrop.hidden=true;
 lastFocus?.focus?.();
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-drawer]');
 if(button)openDrawer(button.dataset.drawer);
});
$('customGpu').addEventListener('click',()=>{
 const sel=$('hardware');sel.value='custom';sel.dispatchEvent(new Event('change',{bubbles:true}));
 openDrawer('hardware');
});
$('customModel').addEventListener('click',()=>{
 const sel=$('model');sel.value='custom';sel.dispatchEvent(new Event('change',{bubbles:true}));
 openDrawer('model');
});
backdrop.addEventListener('click',closeDrawer);close.addEventListener('click',closeDrawer);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&currentDrawer){event.preventDefault();closeDrawer();}
});
function handleSelect(kind,state){
 if(kind==='hardware'&&state.hardware==='custom')openDrawer('hardware');
 if(kind==='model'&&state.model==='custom')openDrawer('model');
}
function updateSummary(s,d){
 $('studioFit').textContent=d.status==='fit'?'Fits in GPU memory':d.status==='offload'?'Offloading to system RAM':
 d.status==='overflow'?'GPU memory exceeded':d.status==='host'?'System RAM exceeded':'Model context limit exceeded';
 $('studioFit').dataset.status=d.status;
 $('studioDemand').textContent=d.gpuDemand.toFixed(2)+' GiB';
 $('studioCapacity').textContent=d.cap.toFixed(2)+' GiB';
 $('studioMaxContext').textContent=Math.round(d.maxGpuContext).toLocaleString('en-AU');
 $('studioSpeed').textContent=d.gpuOnly?d.estimatedTPS.toFixed(1)+' tok/s':'Not estimated';
 $('customGpu').classList.toggle('active',s.hardware==='custom');
 $('customModel').classList.toggle('active',s.model==='custom');
 $('studioHardwareExacts').hidden=s.hardware!=='custom';
 $('studioModelExacts').hidden=s.model!=='custom';
 document.querySelectorAll('[data-exact-state]').forEach(el=>{if(document.activeElement!==el)el.value=s[el.dataset.exactState];});
 $('exact-gpuCount').disabled=s.memoryType==='unified';

}
window.CalculatorLayout={openDrawer,closeDrawer,handleSelect,updateSummary,drawers,canvas};
})();