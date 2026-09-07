/* CQlass — pisahkan Nilai PTS dan Laporan Bulanan Tahfizh untuk Guru Partner */
(function(){
  let patched=false;
  function patch(){
    if(patched||typeof MODULE_GROUPS==='undefined')return false;
    const g=MODULE_GROUPS.find(x=>x.id==='partner-tasks');
    if(!g)return false;
    const pts=(g.items||[]).find(x=>x.id==='partner-pts');
    if(!pts)return false;
    pts.label='Nilai PTS';
    if(!pts.__cqPtsWrapped){
      const old=pts.render;
      pts.render=async function(content){
        const r=old?old(content):null;
        if(r&&typeof r.then==='function')await r;
        setTimeout(function(){
          const title=content&&content.querySelector('.page-title');
          if(title&&title.textContent.trim()==='Nilai Tahfizh')title.textContent='Nilai PTS';
          const sub=content&&content.querySelector('.page-sub');
          if(sub&&sub.textContent.includes('Daftar siswa otomatis mengikuti halaqah'))sub.textContent='Input nilai PTS Tahfizh sesuai halaqah. Nama siswa mengikuti data resmi CQlass.';
        },0);
      };
      pts.__cqPtsWrapped=true;
    }
    if(!(g.items||[]).some(x=>x.id==='partner-monthly')){
      g.items.push({
        id:'partner-monthly',
        label:'Laporan Bulanan',
        roles:['partner'],
        built:true,
        render:function(content){
          content.innerHTML='<div class="card"><span class="spinner"></span> Membuka Laporan Bulanan Tahfizh...</div>';
          setTimeout(function(){window.location.href='tahfizh-monthly.html?v=20260907-datafix2'},30);
        }
      });
    }
    patched=true;
    if(typeof renderSidebar==='function'&&window.currentUser?.role==='partner')renderSidebar();
    return true;
  }
  if(!patch()){
    const timer=setInterval(function(){if(patch())clearInterval(timer)},150);
    setTimeout(function(){clearInterval(timer);patch()},5000);
  }
})();
