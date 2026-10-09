(function () {
  'use strict';
  const { HARDWARE, MODELS, DEFAULTS, calculate, hardwareState, modelState, fitHardware, GIB, round } = window.LLMLab;
  const byId = id => document.getElementById(id);
  let s = { ...DEFAULTS };
  const num = (n, p = 1) => Number.isFinite(n) ? n.toLocaleString('en-AU', { maximumFractionDigits: p, minimumFractionDigits: p === 0 ? 0 : 0 }) : '—';
  const compact = n => n >= 1000 ? `${num(n / 1000, 1)}k` : num(n, 0);
  const gib = (n, p = 2) => `${num(n, p)} GiB`;
  const money = n => n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('en-AU', {style:'currency',currency:s.currency,maximumFractionDigits:2}).format(n);
  const colors = { weight: '#82d7b8', kv: '#6ca9d7', extra: '#e5b778', guard: '#636f82', unused: '#2e3d46', overflow:'#fc8a7f' };
  function setText(id, text) { byId(id).textContent = text; }
  function populateSelects() {
    byId('hardware').innerHTML = Object.entries(HARDWARE).sort(([a],[b])=>a==='custom'?-1:b==='custom'?1:0).map(([key, h]) => `<option value="${key}">${h.name} · ${h.vendor==='Apple'?'':h.vram+' GB · '}${h.bandwidth} GB/s</option>`).join('');
    byId('model').innerHTML = Object.entries(MODELS).sort(([a],[b])=>a==='custom'?-1:b==='custom'?1:0).map(([key, m]) => `<option value="${key}">${m.name} · ${m.detail}</option>`).join('');
  }
  const rangeFormats = {
    vram: x => `${num(x,0)} GiB`, bandwidth: x => `${num(x,0)} GB/s`, ram: x => `${num(x,0)} GiB`,
    metalPct: x => `${num(x,0)}%`, modelGB: x => `${num(x,1)} GB`, kvKiB: x => `${num(x,0)} KiB`,
    modelLimit: x => `${compact(x)} tokens`, visionGB: x => `${num(x,2)} GB`, mtpGB: x => `${num(x,2)} GB`,
    context: x => `${compact(x)} tokens`, reserve: x => gib(x,1), overhead: x => gib(x,1),
    cpuWeights: x => `${num(x,0)}%`, agentBase: x => compact(x), agentTools: x => compact(x), agentOutput: x => compact(x),
    efficiency: x => `${num(x,0)}%`, mtpGain: x => `${num(x,2)}×`, power: x => `${num(x,0)} W`,
    hours: x => `${num(x,0)} h`, duty: x => `${num(x,0)}%`,
  };
  const rangeIds = Object.keys(rangeFormats);
  const numericIds = ['prefill', 'price', 'tariff', 'apiPrice'];
  const checkIds = ['vision', 'mtp', 'kvOffload', 'autoSpill'];
  function paintControls() {
    ['hardware','model','gpuCount','split','cache','currency'].forEach(id => { if(id === 'cache')return; byId(id).value = s[id]; });
    rangeIds.forEach(id => { const el = byId(id); el.value = s[id]; setText(`${id}Val`, rangeFormats[id](s[id])); const f = (Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))*100; el.style.background=`linear-gradient(90deg,#9be3b1 ${f}%,#35464e ${f}%)`; });
    numericIds.forEach(id => byId(id).value = s[id]);
    checkIds.forEach(id => byId(id).checked = Boolean(s[id]));
    document.querySelectorAll('#cacheGroup button').forEach(b => { const active=b.dataset.cache===s.cache; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
    const apple = HARDWARE[s.hardware].vendor === 'Apple' || (s.hardware==='custom' && s.memoryType==='unified');
    byId('memoryType').value=s.memoryType||'discrete';
    byId('memoryType').disabled=s.hardware!=='custom';
    byId('context').max = Math.max(262144, Number(s.modelLimit));
    document.querySelectorAll('.apple-only').forEach(el=>el.classList.toggle('hidden',!apple));
    byId('appleNotice').classList.toggle('hidden', !apple);
    ['gpuCount','split','cpuWeights','kvOffload','autoSpill'].forEach(id => byId(id).disabled = apple);
    byId('vision').disabled = Number(s.visionGB) === 0;
    byId('mtp').disabled = Number(s.mtpGB) === 0;
    byId('modelHint').textContent = MODELS[s.model].detail + '. Model file sizes and optional files are treated as decimal GB; memory pools are reported as GiB.';
  }
  function updateStatus(d) {
    const statusText={fit:'FITS IN GPU MEMORY',overflow:'VRAM CAPACITY EXCEEDED',offload:'SYSTEM RAM IN USE',host:'SYSTEM RAM EXCEEDED',limit:'MODEL CONTEXT LIMIT'};
    const statusClass=d.status==='fit'?'status-ok':d.status==='offload'?'status-warn':'status-error';
    byId('status').className=`status ${statusClass}`; setText('status',statusText[d.status]);
    const hdr={fit:'Room to run.',overflow:'The model fits. The session does not.',offload:'It can run, but offloading changes the game.',host:'Not enough combined memory.',limit:'Beyond the declared model limit.'};
    const descr={
      fit:'Your selected context and model allocation fit inside the configured GPU memory budget, including the safety margins.',
      overflow:`The selected context overshoots the GPU budget by ${gib(d.excess)}. Reduce context, compress the KV cache or move allocations to system RAM.`,
      offload:'GPU memory can be kept within budget, but host memory access may severely limit speed. The decode estimate is intentionally withheld.',
      host:'This setup needs more host RAM than the remaining system budget. Reduce context, select a smaller model or increase system RAM.',
      limit:'The context selected exceeds the stated native limit for this model preset. Change the model limit only if your runtime supports extension.'
    };
    setText('resultHeadline',hdr[d.status]);setText('resultExplanation',descr[d.status]);
    setText('capNumber',gib(d.cap,1));setText('capCaption',d.apple?'estimated Metal working set':'available GPU memory');
    setText('maxContext',`${num(d.maxGpuContext,0)}`);setText('maxContextDetail',d.kvOffload&&!d.apple?'if KV cache were kept on the GPU':'tokens at current model, cache and extras');
    setText('kvNumber',gib(d.kvGiB));setText('kvDetail',`${num(s.kvKiB*window.LLMLab.QUANTS[s.cache],1)} KiB / token · ${s.cache.toUpperCase()}`);
    setText('freeMemory',gib(Math.max(0,d.left)));setText('freeMemoryDetail',d.left<0?`${gib(-d.left)} over budget`:'after selected context and reserves');
    let warning='';
    if(d.apple)warning='Apple shared memory: the Metal working-set percentage is a planning assumption, not an OS guarantee. The rest of unified memory is not a separate VRAM spill tier.';
    else if(d.hostDemand>0) warning=`Host RAM used: ${gib(d.hostDemand)} / ${gib(d.availableHostGiB)} estimated available. GPU spill: ${gib(d.spillGiB)}. Performance with offloaded tensors is backend-dependent and not predicted.`;
    else if(d.excess>0) warning='No host offloading is enabled. This context allocation exceeds the configured GPU memory budget.';
    byId('offloadWarning').classList.toggle('hidden',!warning);setText('offloadWarning',warning);
  }
  function memoryBar(d) {
    const parts = [
      ['Weights',d.gpuWeightsGiB,colors.weight], ['KV cache',d.gpuKvGiB,colors.kv],
      ['Extras',d.extrasGiB,colors.extra], ['Reserve + runtime',d.guardGiB,colors.guard],
    ];
    let sum=0;
    const visible=parts.map(([name,n,color])=>{const visibleGiB=Math.max(0,Math.min(n,d.cap-sum));sum+=n;return {name,n,color,visibleGiB};});
    byId('memoryBar').innerHTML=visible.map(x=>`<span style="background:${x.color};width:${(x.visibleGiB/d.cap*100)||0}%" title="${x.name}: ${gib(x.n)}"></span>`).join('') + (d.excess>0?`<span style="position:absolute;right:0;top:0;bottom:0;width:5px;background:${colors.overflow}"></span>`:'');
    byId('memoryBar').setAttribute('aria-label',`GPU memory demand ${gib(d.gpuDemand)} of ${gib(d.cap)}${d.excess>0?', exceeds budget':''}`);
    setText('memoryPercent',`${num(d.gpuDemand/d.cap*100,1)}% ALLOCATED · ${gib(d.gpuDemand)} / ${gib(d.cap)}`);
    byId('memoryLegend').innerHTML = visible.map(x=>`<span><i class="swatch" style="background:${x.color}"></i>${x.name} ${gib(x.n)}</span>`).join('') + `<span><i class="swatch" style="background:${colors.unused}"></i>Unallocated ${gib(Math.max(0,d.left))}</span>`;
  }
  function lineChart(d) {
    const w=920,h=204,left=46,right=17,top=12,bottom=29;
    const plotW=w-left-right,plotH=h-top-bottom;
    const maxT=Math.max(8192,Number(s.modelLimit));
    const maxM=Math.max(d.cap*1.25,d.gpuDemand*1.05,8);
    const x=t=>left+plotW*t/maxT;
    const y=m=>top+plotH-(m/maxM)*plotH;
    const points = Array.from({length:65},(_,i)=>{let t=i*maxT/64;let m=d.fixedGiB+(d.gpuKvGiB>0 ? t*(s.kvKiB*window.LLMLab.QUANTS[s.cache])/(1024*1024):0);return {t,m,x:x(t),y:y(m)};});
    const curve=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const crossTokens=(d.cap-d.fixedGiB)*1048576/(s.kvKiB*window.LLMLab.QUANTS[s.cache]);
    const clippedCross= Math.max(0,Math.min(maxT,crossTokens));
    let grid='';for(let i=0;i<5;i++){const v=i*maxM/4;grid+=`<line class="gridline" x1="${left}" y1="${y(v)}" x2="${w-right}" y2="${y(v)}"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${num(v,0)}</text>`;}
    [0,.25,.5,.75,1].forEach(f=>{grid+=`<text x="${x(maxT*f)}" y="${h-5}" text-anchor="middle">${compact(maxT*f)}</text>`;});
    const rangeShade=d.gpuKvGiB===0?'':`<rect x="${x(clippedCross)}" y="${top}" width="${Math.max(0,w-right-x(clippedCross))}" height="${plotH}" fill="#ff9289" opacity=".07"/>`;
    const maxLine=`<line x1="${left}" x2="${w-right}" y1="${y(d.cap)}" y2="${y(d.cap)}" stroke="#f4c38c" stroke-dasharray="6 6" opacity=".8"/><text x="${w-right-5}" y="${y(d.cap)-7}" text-anchor="end" fill="#f4c38c">GPU budget</text>`;
    const ptT=Math.min(maxT,Number(s.context));const currM=d.fixedGiB + (d.gpuKvGiB>0?d.kvGiB:0);
    const dot=`<line x1="${x(ptT)}" x2="${x(ptT)}" y1="${top}" y2="${top+plotH}" stroke="#d5f0e0" opacity=".65" stroke-dasharray="4 5"/><circle cx="${x(ptT)}" cy="${y(currM)}" r="5.5" fill="#bff6d7" stroke="#0c161b" stroke-width="2"/><text class="marker-label" x="${Math.min(w-130,Math.max(65,x(ptT)+9))}" y="${Math.max(15,y(currM)-11)}">${compact(s.context)} tokens</text>`;
    byId('contextChart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="underCurve" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#74dfbd" stop-opacity=".22"/><stop offset="100%" stop-color="#74dfbd" stop-opacity="0"/></linearGradient></defs>${rangeShade}${grid}<path d="${curve} L${x(maxT)},${top+plotH} L${left},${top+plotH} Z" fill="url(#underCurve)"/>${maxLine}<path d="${curve}" fill="none" stroke="#7ddbbc" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dot}</svg>`;
  }
  function workload(d) {
    const used=d.totalAgentTokens;const ctxt=Number(s.context);
    const fraction=d.usedFraction;
    const pill=byId('usedPill');pill.textContent=`${num(fraction*100,0)}% OF CONTEXT`;pill.style.color=fraction>1?'#ffa7a1':'#9fddcb';
    const parts=[['System + agent',Number(s.agentBase),'#9be3b1'],['Tools + files',Number(s.agentTools),'#8cb8e9'],['Generated',Number(s.agentOutput),'#e5b778']];
    const denominator=Math.max(ctxt,used,1);
    byId('workloadParts').innerHTML=parts.map(([name,v,color])=>`<span style="width:${v/denominator*100}%;background:${color}" title="${name}: ${num(v,0)} tokens"></span>`).join('');
    byId('workloadLabels').innerHTML=parts.map(([name,v,color])=>`<span><i class="swatch" style="background:${color}"></i>${name} · ${compact(v)}</span>`).join('')+`<span>Unused · ${compact(Math.max(0,ctxt-used))}</span>`;
    setText('prefillTime',d.prefillSeconds===null?'No measurement':d.prefillSeconds<60?`${num(d.prefillSeconds,1)} sec`:`${num(d.prefillSeconds/60,1)} min`);
  }
  function performance(d) {
    setText('speedCeiling',`${num(d.theoreticalTPS,1)} tok/s`);
    setText('speedEstimate',d.gpuOnly?`${num(d.estimatedTPS,1)} tok/s`:'Not estimated');
    const explanation=d.gpuOnly?`Assumes ${s.efficiency}% of the ideal bandwidth-only ceiling${s.mtp?` and a ${num(s.mtpGain,2)}× speculative-decoding benefit`:''}. This is a user-controlled scenario, not measured performance.`:'The selected setup has GPU memory pressure or host RAM offloading. Offloaded performance cannot be reliably inferred from memory bandwidth alone.';
    setText('speedMessage',explanation);
  }
  function comparison() {
    const ids=['mini-m4-24','mini-m4pro-48','mbp-m5pro-48','studio-m4max40-64','studio-m3ultra80-256','3090','4090','5090','7900xtx','a100'];
    byId('comparisonBody').innerHTML=ids.map(id=>{
      const h=HARDWARE[id];const state=hardwareState(id,s);state.gpuCount=1;state.cpuWeights=0;state.kvOffload=false;state.autoSpill=false;const d=calculate(state);
      const cls=d.status==='fit'?'good':d.status==='offload'?'off':'bad';
      const status=d.status==='fit'?'FITS':d.status==='overflow'?'OVER VRAM':d.status==='limit'?'MODEL LIMIT':'NOT FIT';
      return `<tr data-device="${id}" class="${id===s.hardware?'selected':''}" tabindex="0" role="button" aria-label="Load ${h.name}"><td><strong>${h.name}</strong><small>${h.detail}</small></td><td>${gib(d.cap,1)}</td><td>${compact(d.maxGpuContext)}</td><td><span class="table-status ${cls}">${status}</span></td><td>${num(d.theoreticalTPS,1)} tok/s</td></tr>`;
    }).join('');
    byId('comparisonBody').querySelectorAll('tr').forEach(tr=>{const fn=()=>{s=hardwareState(tr.dataset.device,s);render();};tr.addEventListener('click',fn);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});});
  }
  function economics(d){
    setText('cloudMonthly',money(d.monthlyCloud));setText('powerMonthly',money(d.monthlyElectricity));
    const price=Number(s.price)*d.count;
    let verdict='';let note='';
    if(!d.gpuOnly){verdict='Unavailable';note='Payback is not estimated for a configuration that does not fully fit on the GPU.';}
    else if(price===0){verdict='Enter a price';note='A nonzero hardware price is needed for payback.';}
    else if(d.monthlySavings<=0){verdict='No break-even';note='Under these assumptions, the hosted service is cheaper than GPU electricity alone.';}
    else{verdict=`${num(d.breakEvenMonths,1)} months`;note=`${money(d.monthlySavings)} simulated net savings per month. Ignores host overhead, input tokens, maintenance and depreciation.`;}
    setText('payback',verdict);setText('paybackNote',note);
  }
  function render() {
    paintControls();const d=calculate(s);updateStatus(d);memoryBar(d);lineChart(d);workload(d);performance(d);comparison();economics(d);window.CalculatorVisuals?.render(s,d);window.CalculatorLayout?.updateSummary(s,d);window.ComparisonStudio?.render(s,d);window.MeasurementStudio?.render(s,d);window.BandwidthVisuals?.render(s,d);
  }
  function wire() {
    byId('hardware').addEventListener('change',e=>{s=hardwareState(e.target.value,s);render();window.CalculatorLayout?.handleSelect('hardware',s);});
    byId('model').addEventListener('change',e=>{s=modelState(e.target.value,s);render();window.CalculatorLayout?.handleSelect('model',s);});
    ['gpuCount','split','currency','memoryType'].forEach(id=>byId(id).addEventListener('change',e=>{s[id]=id==='gpuCount'?Number(e.target.value):e.target.value;if(id==='memoryType'&&s.memoryType==='unified'){s.gpuCount=1;s.cpuWeights=0;s.kvOffload=false;}render();}));
    rangeIds.forEach(id=>byId(id).addEventListener('input',e=>{s[id]=Number(e.target.value);if(id==='modelLimit')s.context=Math.min(s.context,s.modelLimit);render();}));
    numericIds.forEach(id=>byId(id).addEventListener('input',e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0){s[id]=n;const d=calculate(s);updateStatus(d);performance(d);workload(d);economics(d);window.BandwidthVisuals?.render(s,d);} }));
    numericIds.forEach(id=>byId(id).addEventListener('change',()=>render()));
    checkIds.forEach(id=>byId(id).addEventListener('change',e=>{s[id]=e.target.checked;render();}));
    byId('cacheGroup').addEventListener('click',e=>{const b=e.target.closest('button[data-cache]');if(!b)return;s.cache=b.dataset.cache;render();});
    byId('presetDefault').addEventListener('click',()=>{s={...DEFAULTS};render();});
    byId('presetOptimised').addEventListener('click',()=>{s={...hardwareState('5060ti',DEFAULTS),vision:false,mtp:false,cache:'q8',context:106496,agentTools:45000};render();});
    byId('downloadConfig').addEventListener('click',()=>{
      const d=calculate(s);const blob=new Blob([JSON.stringify({settings:s,result:{status:d.status,gpuGiB:d.cap,gpuDemandGiB:d.gpuDemand,kvGiB:d.kvGiB,gpuOnlyContextTokens:d.maxGpuContext,bandwidthOnlyTPS:d.theoreticalTPS,scenarioTPS:d.gpuOnly?d.estimatedTPS:null},comparison:window.ComparisonStudio?.isEnabled()?(()=>{const alternative=window.ComparisonStudio.getState();const dAlt=calculate(alternative);return {settings:alternative,result:{status:dAlt.status,gpuGiB:dAlt.cap,gpuDemandGiB:dAlt.gpuDemand,kvGiB:dAlt.kvGiB,gpuOnlyContextTokens:dAlt.maxGpuContext,bandwidthOnlyTPS:dAlt.theoreticalTPS,scenarioTPS:dAlt.gpuOnly?dAlt.estimatedTPS:null}};})():null,disclaimer:'Capacity estimate and hypothetical bandwidth proxy; not a measured benchmark.'},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='local-inference-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  window.CalculatorApp={getState:()=>({...s}),getResult:()=>calculate(s),updateState:patch=>{s={...s,...patch};if(s.memoryType==='unified'){s.gpuCount=1;s.cpuWeights=0;s.kvOffload=false;}render();}};
  populateSelects();wire();render();
})();