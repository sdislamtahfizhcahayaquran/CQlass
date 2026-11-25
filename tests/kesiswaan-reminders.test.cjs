const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const U='0e91ad73-707c-454f-81c1-b15b77356a31';
function fixture(){return{success:true,today:'2026-11-25',period:{year:'2026/2027',semester_no:1},
 rules:{absent_days:3,walas_points:50,kesiswaan_points:100,late_letters:[{kind:'sp1',min:5,label:'SP 1'}]},
 counts:{absent:1,walas_call:1,kesiswaan_call:1,late:1,walas_reports:1,salam:1},
 absent:[{key:`absent:${U}:2026-11-20`,student_id:U,student_name:'Siswa A',class_name:'1A',walas:'W',days:3,start_date:'2026-11-20',end_date:'2026-11-24',ongoing:true,statuses:{Alfa:3},acked:false}],
 walas_call:[{key:`walas:${U}:50`,student_id:U,student_name:'Siswa B',class_name:'2A',walas:'W',balance:55,stage:'Proses 1',action:'Panggil',acked:false}],
 kesiswaan_call:[{key:`kes:${U}:100:0:0`,student_id:U,student_name:'Siswa C',class_name:'3A',balance:120,stage:'Proses 2',reason:'Proses 2',acked:false}],
 late:[{key:`late:${U}:sp1`,student_id:U,student_name:'Siswa D',class_name:'4A',late_count:6,due:[{kind:'sp1',label:'SP 1'}],issued:{},acked:false}],
 walas_reports:[{key:`case:${U}`,id:U,student_name:'Siswa E',class_name:'5A',problem:'Masalah',forwarded:false,acked:false}],
 salam:[{key:`salam:${U}`,id:U,ticket_code:'T1',student_name:'Ortu',class_name:'6A',message:'Halo',status:'diterima',pic:'Ust',target_follow_up:'2026-11-30',follow_up_note:'catatan lama'}]}}
function setup(){
 const dom=new JSDOM('<div id="sidebar"></div><div id="content"></div>',{url:'https://example.invalid',runScripts:'outside-only'}),w=dom.window,req=[];
 w.currentUser={role:'kesiswaan'};w.getAuthToken=()=>'tok';w.SUPABASE_URL='https://x.supabase.co';w.SUPABASE_PUBLISHABLE_KEY='pk';w.showToast=()=>{};
 w.fetch=async(url,o)=>{const b=JSON.parse(o.body);req.push({url,b});const d=url.endsWith('/rpc/kesiswaan_reminders')?fixture():{success:true};return{ok:true,json:async()=>d}};
 w.renderSidebar=()=>{};w.setActiveModule=id=>{w.activeModule=id};w.enterApp=()=>{};w.activeModule='kes-pengingat';
 w.eval(fs.readFileSync('kesiswaan-reminders.js','utf8'));w.eval(fs.readFileSync('kesiswaan-navigation.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,req};
}
const tick=()=>new Promise(r=>setTimeout(r,0));

test('Pengingat memanggil RPC dengan token sesi dan menampilkan 6 kategori', async()=>{
 const {w,req,dom}=setup();await w.renderKesiswaanReminders(w.document.getElementById('content'));
 assert.ok(req.length>=1);assert.ok(req.every(r=>r.url==='https://x.supabase.co/rest/v1/rpc/kesiswaan_reminders'&&r.b.p_token==='tok'));
 assert.equal(w.document.querySelectorAll('.cqk-card').length,6);
 await tick();assert.equal(w.document.querySelector('[data-cqk-badge]').textContent,'6');
 dom.window.close();
});

test('Sudah ditangani mengirim kunci + catatan ke RPC ack, lalu bisa dibatalkan', async()=>{
 const {w,req,dom}=setup();const c=w.document.getElementById('content');await w.renderKesiswaanReminders(c);
 c.querySelector('[data-tab="walas_call"]').click();c.querySelector('[data-ack]').click();c.querySelector('[data-q]').click();c.querySelector('[data-save]').click();await tick();await tick();
 const ack=req.at(-1);assert.match(ack.url,/rpc\/kesiswaan_reminder_ack$/);assert.equal(ack.b.p_key,`walas:${U}:50`);assert.equal(ack.b.p_undo,false);assert.ok(ack.b.p_note);
 assert.equal(c.querySelector('[data-tab="walas_call"] b').textContent,'0');
 c.querySelector('#cqk-done').click();c.querySelector('[data-undo]').click();await tick();await tick();
 assert.equal(req.at(-1).b.p_undo,true);assert.equal(c.querySelector('[data-tab="walas_call"] b').textContent,'1');
 dom.window.close();
});

test('SALAM selesai lewat student-affairs-center tanpa menghapus PIC/target/catatan lama', async()=>{
 const {w,req,dom}=setup();const c=w.document.getElementById('content');await w.renderKesiswaanReminders(c);
 c.querySelector('[data-tab="salam"]').click();c.querySelector('[data-salam][data-st="selesai"]').click();await tick();await tick();
 const r=req.at(-1);assert.match(r.url,/functions\/v1\/student-affairs-center$/);
 assert.deepEqual(r.b,{action:'salam_followup',id:U,status:'selesai',pic:'Ust',target_follow_up:'2026-11-30',follow_up_note:'catatan lama'});
 dom.window.close();
});

test('Sidebar Kesiswaan: ada Pengingat, tanpa menu kembar/placeholder, menu jarang di Lainnya', ()=>{
 const {w,dom}=setup();const ids=[...w.document.querySelectorAll('#sidebar [data-kes-nav]')].map(x=>x.dataset.kesNav);
 assert.ok(ids.includes('kes-pengingat'));assert.ok(!ids.includes('kes-laporan-kelas'));assert.ok(!ids.includes('kes-controlling-mt'));assert.ok(!ids.includes('kes-perizinan'));
 w.document.querySelector('[data-kes-more]').click();
 assert.ok([...w.document.querySelectorAll('#sidebar [data-kes-nav]')].some(x=>x.dataset.kesNav==='kes-perizinan'));
 dom.window.close();
});

test('Role lain tidak mendapat sidebar/halaman Pengingat', async()=>{
 const {w,dom}=setup();w.currentUser={role:'walas'};const c=w.document.getElementById('content');await w.renderKesiswaanReminders(c);
 assert.match(c.textContent,/Khusus Kabid Kesiswaan/);dom.window.close();
});
