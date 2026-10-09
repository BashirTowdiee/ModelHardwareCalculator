(function () {
  'use strict';
  const { HARDWARE, MODELS } = window.LLMLab;
  const specs = { hardware: HARDWARE, model: MODELS, cmpHardware: HARDWARE, cmpModel: MODELS };
  for (const [kind, catalogue] of Object.entries(specs)) {
    const input = document.getElementById(kind + 'Search');
    const select = document.getElementById(kind);
    if (!input || !select) throw new Error('Search controls missing: ' + kind);
    const box = input.closest('.lookup-group');
    box.classList.add('searchable-catalogue');
    const results = document.createElement('div');
    results.id = kind + 'SearchResults';
    results.className = 'catalog-results';
    results.setAttribute('role', 'listbox');
    results.setAttribute('aria-label', kind.toLowerCase().includes('hardware') ? 'Matching hardware' : 'Matching models');
    results.hidden = true;
    box.appendChild(results);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', results.id);
    input.setAttribute('aria-expanded','false');

    const entries = Object.entries(catalogue);
    const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ');
    const words = phrase => normalise(phrase).trim().split(/\s+/).filter(Boolean);
    const rank = (id, item, query) => {
      const label = item.name + ' ' + (item.detail || '') + ' ' + id + ' ' +
        (kind.toLowerCase().includes('hardware') ? item.vram + 'gb ' + item.bandwidth + 'gbps ' + item.vendor : '');
      const haystack = normalise(label);
      const terms = words(query);
      if (!terms.every(term => haystack.includes(term))) return -1;
      const primary = normalise(item.name);
      return terms.reduce((total,term) => total + (primary.includes(term)?3:0),0) + (primary.startsWith(terms[0])?2:0);
    };

    let candidates = [];
    let current = 0;
    function dismiss() {
      results.hidden = true;
      results.innerHTML = '';
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
      candidates = [];
    }
    function commit(id) {
      if (!catalogue[id]) return;
      select.value = id;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      input.value = '';
      dismiss();
    }
    function paint() {
      const query = input.value.trim();
      results.innerHTML = '';
      if (!query) { dismiss(); return; }
      candidates = entries.map(([id,item],index)=>({id,item,index,score:rank(id,item,query)}))
        .filter(x=>x.score >= 0)
        .sort((a,b)=>b.score-a.score || a.index-b.index)
        .slice(0,10);
      current = 0;
      if (!candidates.length) {
        const empty = document.createElement('div');
        empty.className='catalog-empty';empty.textContent='No matches. Use a custom setup or model.';
        results.appendChild(empty);
      } else {
        for (const [index,{id,item}] of candidates.entries()) {
          const button = document.createElement('button');
          button.type='button';button.id = kind + '-result-' + index;
          button.className='catalog-choice';
          button.setAttribute('role','option');
          button.setAttribute('aria-selected',String(index===current));
          button.dataset.index=String(index);
          const title = document.createElement('span');
          title.className='catalog-choice-title';title.textContent=item.name;
          const meta = document.createElement('small');
          meta.textContent=kind.toLowerCase().includes('hardware')
            ? item.vendor + ' · ' + item.vram + ' GB · ' + item.bandwidth + ' GB/s bandwidth'
            : item.detail + ' · ~' + item.gb + ' GB weights';
          button.append(title,meta);
          button.addEventListener('click',()=>commit(id));
          results.appendChild(button);
        }
      }
      results.hidden = false;
      input.setAttribute('aria-expanded','true');
      active();
    }
    function active() {
      const choices=results.querySelectorAll('.catalog-choice');
      choices.forEach((button,index)=>button.setAttribute('aria-selected',String(index===current)));
      if (choices[current]) input.setAttribute('aria-activedescendant',choices[current].id);
      else input.removeAttribute('aria-activedescendant');
    }
    input.addEventListener('input',paint);
    input.addEventListener('keydown',event=>{
      if (event.key==='Escape') { event.preventDefault();input.value='';dismiss();return; }
      if (event.key==='ArrowDown' || event.key==='ArrowUp') {
        if (results.hidden) {paint();return;}
        if (candidates.length) {
          event.preventDefault();
          current=(current+(event.key==='ArrowDown'?1:-1)+candidates.length)%candidates.length;
          active();
          results.querySelectorAll('.catalog-choice')[current].scrollIntoView({block:'nearest'});
        }
      }
      if (event.key==='Enter' && candidates.length && !results.hidden) {
        event.preventDefault();commit(candidates[current].id);
      }
    });
    document.addEventListener('pointerdown',event=>{if(!box.contains(event.target))dismiss();});
    select.addEventListener('change',()=>{input.value='';dismiss();});

    if (kind==='hardware') {
      const link=document.createElement('a');
      link.className='hardware-spec-link';
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Apple specifications ↗';
      link.hidden=true;
      const refresh=()=>{
        const h=HARDWARE[select.value];
        link.hidden=!h || !h.source;
        if (h?.source) link.href=h.source;
        else link.removeAttribute('href');
      };
      box.appendChild(link);
      select.addEventListener('change',refresh);
      refresh();
    }
  }
})();
