/* CQlass — Google Legger Live bridge
   Nilai utama tetap disimpan oleh Academic V7.2.
   Sinkronisasi Legger berjalan terpisah melalui antrean persisten CQlass.
*/
(function(){
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const QUEUE_URL=BASE+'/functions/v1/legger-sync-queue';
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1g5WfGQtS35kYaK8jU60pFkvFm4B_gy6bO_yg0ivKvRI/edit';
  let draining=false;

  const getUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}};
  const getState=()=>{try{return typeof academicGridState!=='undefined'?academicGridState:null}catch(_){return null}};
  const getToken=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};

  function headers(){
    const key=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
    const token=getToken();
    const h={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key};
    if(token)h['x-session-token']=token;
    return h;
  }

  async function queueReq(action,payload={}){
    const r=await fetch(QUEUE_URL,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload})});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons sinkronisasi tidak valid.');}
    if(!r.ok||d.success===false)throw new Error(d.detail||d.error||'Sinkronisasi belum berhasil.');
    return d;
  }

  async function syncGroup(group){
    const u=getUser();
    try{
      const res=await callApi('saveLeggerNilai',{
        kelas:group.kelas,
        tahunAjaran:group.tahunAjaran,
        semester:group.semester,
        mapel:group.mapel,
        dicatatOleh:String(u?.nama||u?.name||'CQlass'),
        username:String(u?.username||'system_sync'),
        changes:Array.isArray(group.changes)?group.changes:[]
      });
      if(!res?.success)throw new Error(res?.error||'Legger belum berhasil diperbarui.');
      await queueReq('ack',{items:group.items||[]});
      return true;
    }catch(err){
      try{await queueReq('fail',{items:group.items||[],error:String(err?.message||err||'sync_failed')});}catch(_){}
      return false;
    }
  }

  async function drain(){
    if(draining||!navigator.onLine||typeof callApi!=='function'||!getToken())return;
    draining=true;
    try{
      for(let batch=0;batch<3;batch++){
        const claimed=await queueReq('claim',{limit:80});
        const groups=Array.isArray(claimed.groups)?claimed.groups:[];
        if(!groups.length)break;
        for(const group of groups)await syncGroup(group);
        if(Number(claimed.count||0)<80)break;
      }
    }catch(_){
      // Antrean tetap tersimpan di CQlass dan akan dicoba kembali otomatis.
    }finally{draining=false;}
  }

  function installAcademicHook(){
    if(typeof academicGridSave!=='function'||academicGridSave.__leggerGoogleHook)return false;
    const original=academicGridSave;
    const wrapped=async function(){
      const before=getState();
      const hadChanges=Boolean(before?.dirty?.size);
      await original.apply(this,arguments);
      const after=getState();
      if(hadChanges&&after?.dirty?.size===0)setTimeout(()=>void drain(),0);
    };
    wrapped.__leggerGoogleHook=true;
    window.academicGridSave=wrapped;
    return true;
  }

  function enhanceLeggerUI(){
    const old=document.getElementById('ll-xls');if(old)old.remove();
    const load=document.getElementById('ll-load');
    if(load&&!document.getElementById('ll-google-sheet')){
      const a=document.createElement('a');
      a.id='ll-google-sheet';a.className='btn btn-sm';a.href=SHEET_URL;a.target='_blank';a.rel='noopener';a.textContent='Buka Legger Nilai';a.style.textDecoration='none';
      load.insertAdjacentElement('afterend',a);
    }
  }

  function start(){
    let tries=0;
    const hookTimer=setInterval(()=>{tries++;if(installAcademicHook()||tries>60)clearInterval(hookTimer)},500);
    enhanceLeggerUI();
    const content=document.getElementById('content');if(content)new MutationObserver(enhanceLeggerUI).observe(content,{childList:true,subtree:true});
    window.addEventListener('online',()=>void drain());
    setInterval(()=>void drain(),20000);
    setTimeout(()=>void drain(),1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.CQlassLeggerGoogleSync={drain,open:()=>window.open(SHEET_URL,'_blank','noopener')};
})();
