/* CQlass — clean sidebar for Guru Mapel & Walas
   Guru: Pembelajaran + Kesiswaan + Laporan.
   Walas: sama, ditambah Rapor Kegiatan + Cetak Rapor sebagai grup Akademik terakhir.
   Request/Laporan Kesiswaan tidak boleh tampil untuk Guru/Walas.
   Laporan Guru Bulanan disembunyikan karena sudah tidak relevan.
*/
(function(){
  'use strict';
  if(window.__cqTeacherWalasSidebarClean) return;

  const TEACHER_ROLES=['guru','walas'];
  const LEARNING_IDS=['leger','rpp-lp','pjbl','bilingual'];
  const LABELS={leger:'Input Nilai','rpp-lp':'RPP & LP',pjbl:'PjBL',bilingual:'Bilingual'};
  const PRAMUKA_USERS=['luthfi','aryobimo'];

  function without(arr,vals){
    arr=Array.isArray(arr)?arr:[];
    return arr.filter(x=>!vals.includes(x));
  }
  function cloneItem(item,roles,label){
    return {...item,label:label||item.label,roles:[...roles]};
  }
  function activityItem(roles){
    return {
      id:'rapor-kegiatan',
      label:'Rapor Kegiatan',
      roles:[...roles],
      built:true,
      render:function(content){
        window.__cqPramukaInputOnly=false;
        if(typeof window.renderSchoolActivityReport==='function') return window.renderSchoolActivityReport(content);
        content.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat Rapor Kegiatan...</div></div>';
        let n=0;const t=setInterval(function(){n++;if(typeof window.renderSchoolActivityReport==='function'){clearInterval(t);window.__cqPramukaInputOnly=false;window.renderSchoolActivityReport(content)}else if(n>30){clearInterval(t);content.innerHTML='<div class="kv2"><div class="kv2-card kv2-empty">Modul Rapor Kegiatan belum termuat. Silakan refresh halaman.</div></div>'}},100);
      }
    };
  }
  function findItem(id){
    if(typeof MODULE_GROUPS==='undefined') return null;
    for(const g of MODULE_GROUPS){
      const item=(g?.items||[]).find(x=>x&&x.id===id);
      if(item) return item;
    }
    return null;
  }
  function removeGroup(id){
    const i=MODULE_GROUPS.findIndex(g=>g&&g.id===id);
    if(i>=0) MODULE_GROUPS.splice(i,1);
  }
  function isKesiswaanReportRequest(item){
    if(!item) return false;
    const text=`${item.id||''} ${item.label||''}`.toLowerCase();
    return (text.includes('request')||text.includes('permintaan')) && text.includes('laporan');
  }

  function cleanStructure(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return false;

      for(const group of MODULE_GROUPS){
        if(!group) continue;
        if(Array.isArray(group.items)){
          group.items.forEach(item=>{
            if(isKesiswaanReportRequest(item)) item.roles=without(item.roles,TEACHER_ROLES);
          });
        }
      }

      const reports=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(reports&&Array.isArray(reports.items)){
        reports.items=reports.items.filter(x=>x&&x.id!=='laporan-guru');
        if(!Array.isArray(reports.roles)) reports.roles=[];
        TEACHER_ROLES.forEach(r=>{if(!reports.roles.includes(r)) reports.roles.push(r)});
      }

      const academic=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!academic||!Array.isArray(academic.items)) return false;

      const learningItems=[];
      for(const id of LEARNING_IDS){
        const src=findItem(id);
        if(src) learningItems.push(cloneItem(src,TEACHER_ROLES,LABELS[id]));
      }

      for(const id of LEARNING_IDS){
        const src=findItem(id);
        if(src) src.roles=without(src.roles,TEACHER_ROLES);
      }
      academic.roles=without(academic.roles,TEACHER_ROLES);

      removeGroup('pembelajaran-guru');
      const learningGroup={id:'pembelajaran-guru',label:'Pembelajaran',roles:[...TEACHER_ROLES],items:learningItems};
      const studentIndex=MODULE_GROUPS.findIndex(g=>g&&g.id==='kesiswaan');
      MODULE_GROUPS.splice(studentIndex>=0?studentIndex:0,0,learningGroup);

      // Satu sumber struktur sidebar Walas/Guru: jangan biarkan patch lain menyebarkan menu Kesiswaan ke Laporan.
      const student=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');
      if(student&&Array.isArray(student.items)){
        student.roles=[...new Set([...(student.roles||[]),...TEACHER_ROLES])];
        const byId=id=>student.items.find(x=>x&&x.id===id);
        const abs=byId('absensi'),dis=byId('kedisiplinan'),rew=byId('reward'),mas=byId('masalah');
        const ordered=[];
        if(abs)ordered.push({...abs,roles:[...new Set([...(abs.roles||[]),'walas'])]});
        if(dis)ordered.push({...dis,label:'Kedisiplinan',roles:[...new Set([...(dis.roles||[]),...TEACHER_ROLES])]});
        if(rew)ordered.push({...rew,label:'Reward',roles:[...new Set([...(rew.roles||[]),...TEACHER_ROLES])]});
        if(mas)ordered.push({...mas,roles:[...new Set([...(mas.roles||[]),'walas'])]});
        student.items=ordered;
      }
      if(reports&&Array.isArray(reports.items)){
        const allowed=new Set(['timesheet','laporan-promosi','internal-feedback']);
        for(const it of reports.items){
          if(!it||!Array.isArray(it.roles))continue;
          if(!allowed.has(String(it.id||'')))it.roles=without(it.roles,TEACHER_ROLES);
        }
        const order=['timesheet','laporan-promosi','internal-feedback'];
        reports.items.sort((a,b)=>{
          const ai=order.indexOf(String(a?.id||'')),bi=order.indexOf(String(b?.id||''));
          return (ai<0?99:ai)-(bi<0?99:bi);
        });
      }

      // Akademik Walas hanya dua menu: Rapor Kegiatan dan Cetak Rapor.
      const rapor=academic.items.find(x=>x&&x.id==='rapor');
      removeGroup('akademik-walas');
      if(rapor){
        rapor.roles=without(rapor.roles,['walas']);
        MODULE_GROUPS.push({
          id:'akademik-walas',
          label:'Akademik',
          roles:['walas'],
          items:[activityItem(['walas']),cloneItem(rapor,['walas'],'Cetak Rapor')]
        });
      }

      // Akun pengisi Pramuka non-Walas tetap memiliki jalur khusus; menu generik akan dibersihkan oleh pramuka-special-access.
      removeGroup('akademik-pramuka-special');
      const user=(typeof currentUser!=='undefined'&&currentUser)?currentUser:null;
      const username=String(user?.username||'').toLowerCase();
      const userRole=String(user?.role||'guru').toLowerCase();
      if(PRAMUKA_USERS.includes(username)&&userRole!=='walas'){
        MODULE_GROUPS.push({
          id:'akademik-pramuka-special',
          label:'Akademik',
          roles:[userRole],
          items:[activityItem([userRole])]
        });
      }

      // Final invariant: Walas/Guru tidak boleh punya grup Kesiswaan duplikat.
      let seenStudent=false;
      for(let i=MODULE_GROUPS.length-1;i>=0;i--){
        const g=MODULE_GROUPS[i];if(!g)continue;
        const isStudent=(g.id==='kesiswaan'||g.id==='kesiswaan-input-center');
        if(!isStudent)continue;
        if(g.id==='kesiswaan-input-center'){MODULE_GROUPS.splice(i,1);continue}
      }
      // Pastikan hanya grup id=kesiswaan yang menjadi sumber tunggal.
      const duplicates=MODULE_GROUPS.map((g,i)=>({g,i})).filter(x=>x.g&&String(x.g.label||'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().toLowerCase()==='kesiswaan'&&x.g.id!=='kesiswaan');
      for(let i=duplicates.length-1;i>=0;i--)MODULE_GROUPS.splice(duplicates[i].i,1);

      return true;
    }catch(err){
      console.warn('Sidebar guru/walas gagal dirapikan:',err);
      return false;
    }
  }

  function install(){
    cleanStructure();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqTeacherWalasClean){
      const original=renderSidebar;
      const wrapped=function(){
        cleanStructure();
        return original.apply(this,arguments);
      };
      wrapped.__cqTeacherWalasClean=true;
      renderSidebar=wrapped;
    }
    try{
      if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function') renderSidebar();
    }catch(_){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  window.__cqTeacherWalasSidebarClean=true;
})();

/* Load Rapor Kegiatan. */
(function(){
  if(document.querySelector('script[data-cq-school-activity-report]')) return;
  const s=document.createElement('script');
  s.src='school-activity-report.js?v=20260916-activity3';
  s.dataset.cqSchoolActivityReport='1';
  s.onload=function(){try{if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function')renderSidebar()}catch(_){}};
  document.head.appendChild(s);
})();

/* Load realtime UKS duty report after the teacher/walas menu structure is ready. */
(function(){
  if(document.querySelector('script[data-cq-uks-duty]')) return;
  const s=document.createElement('script');
  s.src='uks-duty.js?v=20260914-uks2';
  s.dataset.cqUksDuty='1';
  s.onload=function(){
    if(document.querySelector('script[data-cq-uks-camera-compat]')) return;
    const c=document.createElement('script');
    c.src='uks-camera-compat.js?v=20260914-camera1';
    c.dataset.cqUksCameraCompat='1';
    document.head.appendChild(c);
  };
  document.head.appendChild(s);
})();
