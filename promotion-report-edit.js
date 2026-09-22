/* CQlass — edit existing Promosi Socmed entries */
(function(){
'use strict';
if(window.__cqPromotionReportEditV1)return;window.__cqPromotionReportEditV1=true;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch{return''}};
const notify=(msg,err=false)=>{try{if(typeof showToast==='function')return showToast(msg,err)}catch{}(err?console.error:console.log)(msg)};
const base=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const key=()=>typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';

function css(){
  if(document.getElementById('promotion-report-edit-style'))return;
  const s=document.createElement('style');s.id='promotion-report-edit-style';s.textContent=`
  .pr-row-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
  .pr-row-actions .pr-delete{grid-column:auto!important}
  .pr-edit{border:1px solid #b8d8d4;background:#eff9f7;color:#0a6f69;border-radius:9px;padding:8px 11px;font-weight:850;cursor:pointer}
  .pr-edit:hover{background:#dff3ef}
  .pr-edit-note{margin:0 0 11px;padding:10px 12px;border-radius:12px;background:#eef8f7;border:1px solid #d5ebe8;color:#315c59;font-size:11px;line-height:1.5}
  .pr-edit-note b{color:#0b6f69}
  .pr-edit-actions{display:grid;grid-template-columns:1fr auto;gap:8px}
  .pr-edit-actions #pr-save{width:100%}
  .pr-cancel-edit{border:1px solid #c9d9d7!important;background:#fff!important;color:#526c69!important;white-space:nowrap}
  .pr-item.pr-being-edited{border-color:#83c9c1;box-shadow:0 0 0 2px rgba(16,135,126,.08)}
  @media(max-width:760px){.pr-row-actions{grid-column:1/-1;justify-content:stretch}.pr-row-actions button{flex:1}.pr-edit-actions{grid-template-columns:1fr}.pr-cancel-edit{width:100%}}
  `;document.head.appendChild(s);
}
function ymd(v){
  const s=String(v||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:'';
}
async function compress(file){
  return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.82))}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Foto tidak dapat dibaca.'))};img.src=url});
}
async function edge(body){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
  try{
    const k=key(),r=await fetch(base()+'/functions/v1/promotion-report',{method:'POST',headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+k,'x-session-token':token()},body:JSON.stringify(body),signal:ctrl.signal});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{throw Error('Respons server promosi tidak valid.')}
    if(!r.ok||d.success===false)throw Error(d.message||d.error||'request_failed');return d;
  }catch(e){if(e?.name==='AbortError')throw Error('Server promosi terlalu lama merespons.');if(e instanceof TypeError)throw Error('Tidak dapat terhubung ke server promosi.');throw e}finally{clearTimeout(timer)}
}
async function updateMetadata(id,date,title,description){
  const k=key();if(!k)throw Error('Konfigurasi aplikasi belum tersedia.');
  const r=await fetch(base()+'/rest/v1/rpc/update_employee_promotion_report',{method:'POST',headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+k},body:JSON.stringify({p_session_token:token(),p_id:id,p_activity_date:date,p_title:title,p_description:description})});
  const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{throw Error('Respons penyimpanan perubahan tidak valid.')}
  if(!r.ok||d?.success===false){const code=d?.error||d?.message||'Gagal menyimpan perubahan.';if(code==='session_invalid')throw Error('Sesi login berakhir. Silakan login ulang.');if(code==='not_found')throw Error('Data tidak ditemukan atau bukan milik akun ini.');throw Error(code)}
  return d;
}
function beginEdit(item,id){
  const form=document.getElementById('pr-form'),date=document.getElementById('pr-date'),title=document.getElementById('pr-title'),desc=document.getElementById('pr-desc'),file=document.getElementById('pr-file'),save=document.getElementById('pr-save');
  if(!form||!date||!title||!desc||!file||!save)return;
  document.querySelectorAll('.pr-item.pr-being-edited').forEach(x=>x.classList.remove('pr-being-edited'));item.classList.add('pr-being-edited');
  form.dataset.editId=id;
  date.value=ymd(item.querySelector('small')?.textContent)||date.value;
  title.value=(item.querySelector('b')?.textContent||'Promosi Socmed').trim();
  const d=(item.querySelector('span')?.textContent||'').trim();desc.value=d==='Tanpa keterangan'?'':d;
  file.required=false;file.value='';
  const preview=document.getElementById('pr-preview'),img=item.querySelector('img');if(preview&&img?.src){preview.src=img.src;preview.style.display='block'}
  let note=document.getElementById('pr-edit-note');if(!note){note=document.createElement('div');note.id='pr-edit-note';note.className='pr-edit-note';form.parentNode.insertBefore(note,form)}note.innerHTML='<b>Mode edit.</b> Ubah tanggal, judul, keterangan, atau pilih foto baru. Jika foto tidak dipilih, foto lama tetap digunakan.';
  let actions=save.parentElement;if(!actions?.classList.contains('pr-edit-actions')){actions=document.createElement('div');actions.className='pr-edit-actions';save.parentNode.insertBefore(actions,save);actions.appendChild(save)}
  let cancel=document.getElementById('pr-cancel-edit');if(!cancel){cancel=document.createElement('button');cancel.type='button';cancel.id='pr-cancel-edit';cancel.className='pr-cancel-edit';cancel.textContent='Batalkan Edit';actions.appendChild(cancel);cancel.onclick=()=>{if(typeof window.renderPromotionReport==='function')window.renderPromotionReport()}}
  save.textContent='Simpan Perubahan';
  try{form.scrollIntoView({behavior:'smooth',block:'start'})}catch{}
}
async function submitEdit(e,form){
  const id=form.dataset.editId;if(!id)return;
  e.preventDefault();e.stopImmediatePropagation();
  const date=document.getElementById('pr-date')?.value||'',title=document.getElementById('pr-title')?.value.trim()||'',description=document.getElementById('pr-desc')?.value.trim()||'',file=document.getElementById('pr-file')?.files?.[0],save=document.getElementById('pr-save');
  if(!date||!title)return notify('Tanggal dan judul kegiatan wajib diisi.',true);
  if(save){save.disabled=true;save.textContent='Menyimpan Perubahan…'}
  try{
    if(file){
      if(!description)throw Error('Isi keterangan singkat terlebih dahulu jika mengganti foto.');
      const encoded=await compress(file);const created=await edge({action:'upload',activity_date:date,title,description,mime_type:'image/jpeg',base64:encoded});
      const newId=created?.item?.id;
      try{await edge({action:'delete',id})}catch(err){if(newId){try{await edge({action:'delete',id:newId})}catch{}}throw err}
    }else{
      await updateMetadata(id,date,title,description);
    }
    notify('Data Promosi Socmed berhasil diperbarui.');
    if(typeof window.renderPromotionReport==='function')window.renderPromotionReport();
  }catch(err){
    const msg=String(err?.message||'Gagal menyimpan perubahan.');
    const mapped=msg==='image_too_large'?'Foto maksimal 2 MB setelah diproses.':msg==='session_invalid'?'Sesi login berakhir. Silakan login ulang.':msg;
    notify(mapped,true);if(save){save.disabled=false;save.textContent='Simpan Perubahan'}
  }
}
function installForm(){
  const form=document.getElementById('pr-form');if(!form||form.dataset.editHooked==='1')return;form.dataset.editHooked='1';form.addEventListener('submit',e=>submitEdit(e,form),true);
}
function installItems(){
  document.querySelectorAll('.pr-item').forEach(item=>{
    const del=item.querySelector('[data-del]');if(!del||item.dataset.editReady==='1')return;item.dataset.editReady='1';
    const wrap=document.createElement('div');wrap.className='pr-row-actions';del.parentNode.insertBefore(wrap,del);wrap.appendChild(del);
    const edit=document.createElement('button');edit.type='button';edit.className='pr-edit';edit.textContent='Edit';edit.setAttribute('aria-label','Edit data Promosi Socmed');wrap.insertBefore(edit,del);edit.onclick=()=>beginEdit(item,del.dataset.del);
  });
}
function install(){css();installForm();installItems()}
function start(){install();const content=document.getElementById('content');if(content&&!content.__cqPromotionEditObserver){content.__cqPromotionEditObserver=true;new MutationObserver(()=>install()).observe(content,{childList:true,subtree:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,180));else setTimeout(start,180);setTimeout(start,700);setTimeout(start,1600);
})();
