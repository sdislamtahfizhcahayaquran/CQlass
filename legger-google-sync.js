/* CQlass — Google Legger Live bridge
   Tidak mengubah alur simpan Academic V7.2.
   Setelah penyimpanan utama selesai, perubahan dikirim ke Legger secara terpisah.
*/
(function(){
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1g5WfGQtS35kYaK8jU60pFkvFm4B_gy6bO_yg0ivKvRI/edit';
  const QUEUE_KEY='cqlass_legger_sync_queue_v1';
  let draining=false;

  const safeJsonParse=(v,fallback)=>{try{return JSON.parse(v)}catch(_){return fallback}};
  const getQueue=()=>safeJsonParse(localStorage.getItem(QUEUE_KEY)||'[]',[]).filter(Boolean);
  const setQueue=q=>localStorage.setItem(QUEUE_KEY,JSON.stringify(q.slice(-500)));
  const getState=()=>{try{return typeof academicGridState!=='undefined'?academicGridState:null}catch(_){return null}};
  const getUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}};

  function scoreComponent(change, objectives){
    if(change.kind==='tp'){
      const idx=(objectives||[]).findIndex(o=>String(o.id)===String(change.learning_objective_id));
      const obj=idx>=0?objectives[idx]:null;
      const code=String(obj?.code||'');
      const parsed=Number((code.match(/TP\s*(\d+)/i)||[])[1]);
      return {jenisKomponen:'TP',urutan:Number.isFinite(parsed)&&parsed>0?parsed:idx+1};
    }
    const t=String(change.assessment_type||'').toUpperCase();
    const m=t.match(/^TUGAS_(\d+)$/);
    if(m)return {jenisKomponen:'Tugas',urutan:Number(m[1])};
    if(t==='WWP')return {jenisKomponen:'WWP',urutan:1};
    if(t==='ASAS')return {jenisKomponen:'ASAS',urutan:1};
    return null;
  }

  function makePayload(snapshot){
    const students=new Map((snapshot.students||[]).map(s=>[String(s.id),s]));
    const changes=[];
    for(const ch of snapshot.changes||[]){
      const s=students.get(String(ch.student_id));
      const c=scoreComponent(ch,snapshot.objectives||[]);
      if(!s||!c||!Number.isFinite(Number(c.urutan))||Number(c.urutan)<1)continue;
      changes.push({nis:String(s.nis||''),nama:String(s.name||s.full_name||''),jenisKomponen:c.jenisKomponen,urutan:c.urutan,nilai:ch.score===null||ch.score===undefined||ch.score===''?'':Number(ch.score)});
    }
    if(!changes.length)return null;
    const u=getUser();
    return {kelas:String(snapshot.assignment?.class_name||''),tahunAjaran:String(snapshot.academicYear||'2026/2027'),semester:String(snapshot.semester||1),mapel:String(snapshot.assignment?.subject_name||''),dicatatOleh:String(u?.nama||u?.name||'CQlass'),username:String(u?.username||'system_sync'),changes};
  }

  function enqueue(snapshot){
    const payload=makePayload(snapshot);
    if(!payload||!payload.kelas||!payload.mapel)return;
    const q=getQueue();
    q.push({id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,payload,attempts:0,nextAt:0,createdAt:Date.now()});
    setQueue(q);
    void drain();
  }

  async function drain(){
    if(draining||typeof callApi!=='function'||!navigator.onLine)return;
    draining=true;
    try{
      let q=getQueue();
      for(let i=0;i<q.length;i++){
        const item=q[i];
        if(Number(item.nextAt||0)>Date.now())continue;
        try{
          const res=await callApi('saveLeggerNilai',item.payload);
          if(!res?.success)throw new Error(res?.error||'sync_failed');
          q=q.filter(x=>x.id!==item.id);setQueue(q);i=-1;
        }catch(err){
          item.attempts=Number(item.attempts||0)+1;
          const delay=Math.min(5*60*1000,Math.max(5000,5000*Math.pow(2,Math.min(item.attempts-1,6))));
          item.nextAt=Date.now()+delay;item.lastError=String(err?.message||err||'sync_failed').slice(0,300);setQueue(q);
        }
      }
    }finally{draining=false;}
  }

  function installAcademicHook(){
    if(typeof academicGridSave!=='function'||academicGridSave.__leggerGoogleHook)return false;
    const original=academicGridSave;
    const wrapped=async function(){
      const state=getState();
      const snapshot=state?{changes:[...(state.dirty?.values?.()||[])].map(x=>({...x})),assignment:state.assignment?{...state.assignment}:null,academicYear:state.academicYear,semester:state.semester,students:(state.students||[]).map(x=>({...x})),objectives:(state.objectives||[]).map(x=>({...x}))}:null;
      await original.apply(this,arguments);
      const after=getState();
      if(snapshot?.changes?.length&&after?.dirty?.size===0)enqueue(snapshot);
    };
    wrapped.__leggerGoogleHook=true;
    window.academicGridSave=wrapped;
    return true;
  }

  function enhanceLeggerUI(){
    const old=document.getElementById('ll-xls');if(old)old.remove();
    const load=document.getElementById('ll-load');
    if(load&&!document.getElementById('ll-google-sheet')){
      const a=document.createElement('a');a.id='ll-google-sheet';a.className='btn btn-sm';a.href=SHEET_URL;a.target='_blank';a.rel='noopener';a.textContent='Buka Legger Nilai';a.style.textDecoration='none';load.insertAdjacentElement('afterend',a);
    }
  }

  function start(){
    let tries=0;const hookTimer=setInterval(()=>{tries++;if(installAcademicHook()||tries>60)clearInterval(hookTimer)},500);
    enhanceLeggerUI();const content=document.getElementById('content');if(content)new MutationObserver(enhanceLeggerUI).observe(content,{childList:true,subtree:true});
    window.addEventListener('online',()=>void drain());setInterval(()=>void drain(),30000);setTimeout(()=>void drain(),1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.CQlassLeggerGoogleSync={drain,open:()=>window.open(SHEET_URL,'_blank','noopener')};
})();
