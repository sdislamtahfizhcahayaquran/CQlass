/* CQlass — Kabid Kegiatan: Live Report khusus pelatih ekskul */
(function(){
  'use strict';
  if(window.__cqKegiatanLiveReportCoachesOnly)return;
  window.__cqKegiatanLiveReportCoachesOnly=true;

  function cleanTitle(v){
    let s=String(v||'');
    s=s.replace(/\bMiss\.\s+/g,'Miss ');
    s=s.replace(/^Miss\s+Khoerunnisa\b/i,'Ms. Khoerunnisa');
    return s;
  }

  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

  function apply(){
    const root=document.getElementById('kegiatan-live-report');
    if(!root)return;

    const title=root.querySelector('.kglr-title');
    if(title)setText(title,'Live Report Pelatih Ekskul');

    const source=document.getElementById('kglr-source');
    if(source){
      const activity=source.querySelector('option[value="activity"]');
      if(activity)activity.remove();
      const all=source.querySelector('option[value="all"]');
      if(all)setText(all,'Semua pelatih');
      if(source.value==='activity'){source.value='all';source.dispatchEvent(new Event('change',{bubbles:true}))}
    }

    const search=document.getElementById('kglr-q');
    if(search&&search.placeholder!=='Cari pelatih / siswa / ekskul...')search.placeholder='Cari pelatih / siswa / ekskul...';

    const table=root.querySelector('.kglr-table');
    if(!table)return;
    const th=table.querySelector('thead th:first-child');
    if(th)setText(th,'PELATIH');

    const rows=[...table.querySelectorAll('#kglr-body tr')];
    const coaches=[];
    for(const tr of rows){
      if(tr.querySelector('td[colspan]'))continue;
      const isCoach=tr.classList.contains('kglr-click')||!!tr.querySelector('.kglr-progress')||!!tr.querySelector('button[onclick*="kglrOpenDetail"]');
      tr.style.display=isCoach?'':'none';
      if(!isCoach)continue;
      coaches.push(tr);

      const name=tr.querySelector('.kglr-name');
      if(name){const x=cleanTitle(name.textContent);if(name.textContent!==x)name.textContent=x}
      const mini=tr.querySelector('td:first-child .kglr-mini');
      if(mini){
        const parts=String(mini.textContent||'').split(' · ').map(x=>x.trim()).filter(x=>x&&x!=='Kegiatan'&&x!=='Penanggung jawab');
        const label=parts.join(' · ')||'Pelatih ekskul';
        setText(mini,label);
      }
    }

    const count=document.getElementById('kglr-count');
    if(count)setText(count,coaches.length+' pelatih');

    const kpis=[...root.querySelectorAll('.kglr-kpi')];
    if(kpis[0]){
      setText(kpis[0].querySelector('strong'),String(coaches.length));
      setText(kpis[0].querySelector('span'),'Pelatih Terpantau');
    }
    const statuses=coaches.map(tr=>String(tr.querySelector('.kglr-badge')?.textContent||'').trim());
    if(kpis[1])setText(kpis[1].querySelector('strong'),String(statuses.filter(x=>x==='Selesai').length));
    if(kpis[2])setText(kpis[2].querySelector('strong'),String(statuses.filter(x=>x==='Belum Lengkap').length));
    if(kpis[3])setText(kpis[3].querySelector('strong'),String(statuses.filter(x=>x==='Belum Input').length));
    if(kpis[4])kpis[4].style.display='none';
  }

  const mo=new MutationObserver(apply);
  function boot(){mo.observe(document.body,{childList:true,subtree:true});apply()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
