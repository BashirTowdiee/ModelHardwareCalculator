(function () {
'use strict';
const $=id=>document.getElementById(id);
const container=$('visualCanvas');
const devicePanel=container?.querySelector('.viz-compare');
if(!container||!devicePanel)throw Error('Visualisation workspace missing');
const speed=document.createElement('section');
speed.className='panel viz-panel viz-bandwidth';
speed.id='bandwidthPanel';
speed.innerHTML=[
 '<div class="viz-head bandwidth-head"><div><small>03 / MEMORY BANDWIDTH & GENERATION</small><h2>What limits token speed?</h2>',
 '<p>Autoregressive decoding moves weights and attention cache through shared memory bandwidth.</p></div>',
 '<div class="bw-actions"><button id="bwDevices" type="button">Compare devices</button><button id="bwTune" type="button">Tune speed ↗</button></div></div>',
 '<div class="bw-primary">',
 '<div class="bw-tally"><span>Shared memory bandwidth</span><strong id="bwPhysical"></strong><small id="bwBandwidthNote"></small></div>',
 '<div class="bw-tally"><span>Reads / output token</span><strong id="bwReads"></strong><small id="bwReadNote"></small></div>',
 '<div class="bw-tally"><span>Writes / output token</span><strong id="bwWrites"></strong><small>KV write estimate</small></div>',
 '<div class="bw-tally"><span>Optimistic bandwidth ceiling</span><strong id="bwIdeal"></strong><small>Not a benchmark</small></div>',
 '<div class="bw-tally is-highlight"><span>Scenario decode speed</span><strong id="bwScenario"></strong><small id="bwScenarioNote"></small></div>',
 '</div>',
 '<div class="bw-bytes"><div class="bw-row-head"><strong>Approximate memory traffic per generated token</strong><span id="bwTrafficTotal"></span></div>',
 '<div class="bw-traffic-meter" id="bwTrafficBar" role="img" aria-label="Estimated weight reads, KV reads and KV writes"></div>',
 '<div class="bw-legend" id="bwTrafficLegend"></div><div class="bw-traffic-rate" id="bwTrafficRate"></div></div>',
 '<div class="bw-bottom"><div class="bw-interact">',
 '<label for="bwKvBasis">KV read size<select id="bwKvBasis"><option value="active">Average active workload</option><option value="allocated">Entire allocated context</option></select></label>',
 '<label for="bwScanPct">KV scan factor <strong id="bwScanValue">100%</strong><input type="range" id="bwScanPct" min="0" max="100" step="5" value="100"></label>',
 '</div><div class="bw-time">',
 '<span><b>Time to first token</b><strong id="bwPrefillTime"></strong></span>',
 '<span><b>Estimated generation time</b><strong id="bwDecodeTime"></strong></span>',
 '<span><b>Observed decode rate</b><strong id="bwObserved"></strong></span>',
 '</div></div>',
 '<p class="bw-caveat" id="bwCaveat">Aggregate bandwidth is a shared read/write peak. Prefill depends strongly on compute and runtime; GPU bandwidth alone cannot predict it.</p>'
].join('');
container.insertBefore(speed,devicePanel);
devicePanel.hidden=true;
const devicesBack=document.createElement('button');
devicesBack.id='bwBack';devicesBack.type='button';devicesBack.className='bw-devices-back';
devicesBack.textContent='← Throughput';
devicePanel.querySelector('.viz-head')?.appendChild(devicesBack);
const fmt=(x,d=1)=>Number(x).toLocaleString('en-AU',{maximumFractionDigits:d});
const compact=(x)=>x==null?'—':Number(x)<60?fmt(x,1)+' s':fmt(x/60,1)+' min';
let current=null;
function formatTraffic(n){
 if(n>=1)return fmt(n,2)+' GB';
 if(n>=0.001)return fmt(n*1000,2)+' MB';
 return fmt(n*1e6,1)+' kB';
}
function showDevices(show){
 speed.hidden=Boolean(show);devicePanel.hidden=!show;
}
$('bwDevices').addEventListener('click',()=>showDevices(true));
devicesBack.addEventListener('click',()=>showDevices(false));
$('bwTune').addEventListener('click',()=>window.CalculatorLayout?.openDrawer('workload'));
$('bwKvBasis').addEventListener('change',event=>{
 window.CalculatorApp?.updateState({kvReadMode:event.target.value});
});
$('bwScanPct').addEventListener('input',event=>{
 window.CalculatorApp?.updateState({kvReadPct:Number(event.target.value)});
});
function render(s,d){
 if(!s||!d)return;
 current={s,d};
 $('bwKvBasis').value=s.kvReadMode||'active';
 $('bwScanPct').value=String(s.kvReadPct??100);
 $('bwScanValue').textContent=fmt(s.kvReadPct??100,0)+'%';
 $('bwPhysical').textContent=fmt(d.bandwidthGBs,0)+' GB/s';
 $('bwBandwidthNote').textContent=d.count>1&&s.split==='tensor'?
   d.count+' GPUs · ideal aggregate':'Spec peak, shared read + write';
 $('bwReads').textContent=formatTraffic(d.weightReadGB+d.kvReadGB);
 $('bwReadNote').textContent=fmt(d.scannedKvTokens,0)+' KV tokens scanned';
 $('bwWrites').textContent=formatTraffic(d.kvWriteGB);
 $('bwIdeal').textContent=fmt(d.theoreticalTPS,1)+' tok/s';
 $('bwScenario').textContent=d.gpuOnly?fmt(d.estimatedTPS,1)+' tok/s':'Unavailable';
 $('bwScenarioNote').textContent=d.gpuOnly?
   fmt(s.efficiency,0)+'% bandwidth utilisation'+(s.mtp?' · MTP ×'+fmt(s.mtpGain,2):''):
   'Offloaded or memory-overflow scenario';
 $('bwTrafficTotal').textContent=formatTraffic(d.trafficGBPerToken)+' total';
 const meter=$('bwTrafficBar'),legend=$('bwTrafficLegend');
 meter.replaceChildren();legend.replaceChildren();
 const chunks=[
  ['Model weight reads',d.weightReadGB,'#80ddba'],
  ['Attention KV reads',d.kvReadGB,'#74b7ec'],
  ['New-token KV writes',d.kvWriteGB,'#efbf81']
 ];
 for(const [name,value,color]of chunks){
  const segment=document.createElement('span');
  segment.style.width=Math.max(0,value/d.trafficGBPerToken*100)+'%';
  segment.style.background=color;segment.title=name+': '+formatTraffic(value);
  meter.appendChild(segment);
  const item=document.createElement('span'),dot=document.createElement('i'),valueNode=document.createElement('strong');
  dot.style.background=color;valueNode.textContent=formatTraffic(value);
  item.append(dot,document.createTextNode(name+' '),valueNode);
  legend.appendChild(item);
 }
 const obs=window.MeasurementStudio?.getObservation();
 const promptPrefill=d.prefillSeconds != null?d.prefillSeconds:
   obs?.promptTPS>0?d.promptTokens/obs.promptTPS:null;
 $('bwPrefillTime').textContent=promptPrefill==null?'Not measured':compact(promptPrefill);
 $('bwPrefillTime').title=d.prefillSeconds!=null?'Based on the user-entered measured prefill rate.':
   obs?.promptTPS>0?'Projection using imported '+obs.source+' prefill rate; model/hardware may differ.':
   'No prefill measurement available; bandwidth cannot predict prompt processing speed.';
 $('bwDecodeTime').textContent=d.decodeSeconds==null?'Not estimated':compact(d.decodeSeconds);
 $('bwTrafficRate').textContent=d.gpuOnly?
  'At scenario speed: reads ≈ '+fmt((d.weightReadGB+d.kvReadGB)*d.estimatedTPS,1)+' GB/s · KV writes ≈ '+
  fmt(d.kvWriteGB*d.estimatedTPS*1000,2)+' MB/s (aggregate peak '+fmt(d.bandwidthGBs,0)+' GB/s).':
  'Read/write transfer rates are not estimated for offloading or memory overflow.';
 $('bwObserved').textContent=obs?.decodeTPS!=null?fmt(obs.decodeTPS,1)+' tok/s':'No runtime data';
 $('bwObserved').title=obs?.decodeTPS!=null?
   'Imported '+obs.source+' runtime observation'+(obs.model?' ('+obs.model+')':'')+'. Not necessarily the selected model or hardware.':
   'Import observed results in Context → Measured.';
 $('bwCaveat').textContent='Bandwidth (GB/s) is the same shared memory channel for reads and writes. '+
   'The estimate assumes a full weight pass per generated token, KV attention reads scaled by the selected scan factor, and one new KV write per token. '+
   'Memory residency, batch size, kernels and compute can all change actual TPS. Prefill is not derived from bandwidth.';
}
window.BandwidthVisuals={render,showDevices};
if(window.CalculatorApp)render(window.CalculatorApp.getState(),window.CalculatorApp.getResult());
})();
