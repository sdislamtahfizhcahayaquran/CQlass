(function(){
  'use strict';
  if(window.__CQ_MT_EFFECTIVE_SAFE__) return;
  window.__CQ_MT_EFFECTIVE_SAFE__=true;
  var BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
  var URL=BASE+'/functions/v1/mt-active-days';
  var cache={classId:null,value:null,loaded:false};
  function state(){try{return typeof absensiState!=='undefined'?absensiState:null}catch(_){return null}}
  function gradeDefault(){var s=state()||{},name=String(s.kelasNama||'');var m=name.match(/\b([1-6])(?:[A-B])?\b/i);var g=m?Number(m[1]):0;return g>=4?54:53}
  async function req(action,value){var s=state();if(!s||!s.kelasId)throw Error('Kelas belum dipilih');var token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';var key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';var r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token},body:JSON.stringify({action:action,class_id:s.kelasId,active_days:value})});var d=await r.json().catch(function(){return{}});if(!r.ok||d.success===false)throw Error(d.error||'Gagal memuat hari efektif');return d}
  function editable(){var b=document.querySelector('.mt9-mode[data-mode="editable"]');return !!(b&&b.classList.contains('active'))}
  function remove(){var x=document.getElementById('mt-effective-safe');if(x)x.remove()}
  async function ensure(){
    if(!editable()){remove();return}
    var toolbar=document.querySelector('#mt9-recap .mt9-toolbar');if(!toolbar)return;
    var s=state();if(!s||!s.kelasId)return;
    if(cache.classId!==s.kelasId){cache={classId:s.kelasId,value:null,loaded:false}}
    var box=document.getElementById('mt-effective-safe');
    if(!box){box=document.createElement('div');box.id='mt-effective-safe';box.className='mt9-field';box.innerHTML='<label>Hari Efektif</label><div style="display:flex;gap:6px;align-items:center"><input id="mt-effective-input" type="number" min="0" max="366" inputmode="numeric" style="width:82px"><button id="mt-effective-save" type="button" class="mt9-btn">Simpan</button></div><small id="mt-effective-note" style="font-size:9px;color:var(--muted)">Otomatis dari Kaldik, tetap dapat diedit.</small>';toolbar.appendChild(box);document.getElementById('mt-effective-save').onclick=save}
    var input=document.getElementById('mt-effective-input');
    if(!cache.loaded){input.value=gradeDefault();try{var d=await req('load');cache.value=Number(d.active_days||gradeDefault());input.value=cache.value;var n=document.getElementById('mt-effective-note');if(n)n.textContent='Hari efektif Rekap Editable · dapat diedit';}catch(_){cache.value=gradeDefault()}cache.loaded=true}else if(document.activeElement!==input)input.value=cache.value==null?gradeDefault():cache.value;
  }
  async function save(){var i=document.getElementById('mt-effective-input');if(!i)return;var n=Number(i.value);if(!Number.isInteger(n)||n<0||n>366){if(typeof showToast==='function')showToast('Hari efektif harus 0–366',true);return}try{await req('save',n);cache.value=n;cache.loaded=true;if(typeof showToast==='function')showToast('Hari efektif Rekap Editable disimpan.')}catch(e){if(typeof showToast==='function')showToast(e.message||'Gagal menyimpan hari efektif',true)}}
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.mt9-mode'))setTimeout(ensure,20)});
  new MutationObserver(function(){clearTimeout(window.__cqMtEffTimer);window.__cqMtEffTimer=setTimeout(ensure,50)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(ensure,1000);setTimeout(ensure,2200);
})();