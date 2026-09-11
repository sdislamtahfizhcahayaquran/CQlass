/* CQlass — Google Legger sync repair
   Nilai utama tetap di Supabase. Sinkron ke Google Legger dibuat per nilai
   supaya Apps Script tidak timeout saat menulis batch besar. */
(function(){
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const QUEUE_URL=BASE+'/functions/v1/legger-sync-queue';
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1g5WfGQtS35kYaK8jU60pFkvFm4B_gy6bO_yg0ivKvRI/edit';
  const CLAIM_LIMIT=1;
  const MAX_BATCHES_PER_DRAIN=60;
  const LEGGER_TIMEOUT_MS=45000;
  let draining=false;

  const getUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}};
  const getToken=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  function headers(){const key=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');const token=getToken();const h={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key};if(token)h['x-session-token']=token;return h}
  async function queueReq(action,payload={}){const r=await fetch(QUEUE_URL,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload})});const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons antrean Legger tidak valid.')}if(!r.ok||d.success===false)throw new Error(d.detail||d.error||'Antrean Legger gagal.');return d}
  async function callLegger(action,params={}){
    if(typeof APPS_SCRIPT_URL==='undefined'||typeof APP_SECRET==='undefined')throw new Error('Konfigurasi Legger tidak tersedia.');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),LEGGER_TIMEOUT_MS);
    try{
      const r=await fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,secret:APP_SECRET,...params}),redirect:'follow',signal:controller.signal});
      const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons Google Legger tidak valid.');}
      if(!r.ok||d.success===false)throw new Error(d.error||`Google Legger HTTP ${r.status}`);
      return d;
    }catch(err){if(err?.name==='AbortError')throw new Error('Google Legger terlalu lama merespons.');throw err}finally{clearTimeout(timer)}
  }
  async function syncGroup(group){
    const u=getUser();
    try{
      await callLegger('saveLeggerNilai',{kelas:group.kelas,tahunAjaran:group.tahunAjaran,semester:group.semester,mapel:group.mapel,dicatatOleh:String(u?.nama||u?.name||'CQlass'),username:String(u?.username||'system_sync'),changes:Array.isArray(group.changes)?group.changes:[]});
      await queueReq('ack',{items:group.items||[]});
      return true;
    }catch(err){try{await queueReq('fail',{items:group.items||[],error:String(err?.message||err||'sync_failed')})}catch(_){}return false}
  }
  async function drain(){
    if(draining||!navigator.onLine||!getToken())return;
    draining=true;
    try{
      for(let batch=0;batch<MAX_BATCHES_PER_DRAIN;batch++){
        const claimed=await queueReq('claim',{limit:CLAIM_LIMIT});
        const groups=Array.isArray(claimed.groups)?claimed.groups:[];
        if(!groups.length)break;
        for(const group of groups)await syncGroup(group);
        if(Number(claimed.count||0)<CLAIM_LIMIT)break;
      }
    }catch(err){console.warn('Legger sync:',err)}finally{draining=false}
  }
  function start(){
    setTimeout(()=>void drain(),800);
    setInterval(()=>void drain(),10000);
    window.addEventListener('online',()=>void drain());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.CQlassLeggerGoogleSync={drain,open:()=>window.open(SHEET_URL,'_blank','noopener')};
})();
