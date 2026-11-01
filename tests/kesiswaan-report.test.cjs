const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const {tables,workbook,attendanceStatus}=require('../kesiswaan-report-workbook.js');
const filter={from:'2026-10-01',to:'2026-10-02',classId:'a'};
function fixture(){return {complete:true,classes:[{id:'a',name:'1A Banin'},{id:'b',name:'1A Banat'}],roster:[{student_id:'s',class_id:'a',student_name:'=1+1',class_name:'1A Banin',nis:'0012'}],attendance:[{date:'2026-10-01',student_id:'s',class_id:'a',student_name:'=1+1',class_name:'1A Banin',status:'unexcused'},{date:'2026-10-02',student_id:'s',class_id:'a',student_name:'=1+1',class_name:'1A Banin',status:'hadir'},{date:'2026-09-30',class_id:'a',status:'hadir'},{date:'2026-10-01',class_id:'b',status:'hadir'}],attendance_days:[{date:'2026-10-01',class_id:'a'}],point_confirmations:[{date:'2026-10-01',class_id:'a',kind:'discipline'},{date:'2026-10-01',class_id:'a',kind:'reward'}],rewards:[],violations:[],cases:[],affairs:[]}}
test('inclusive dates, class filter, alpa, zero denominator, and nihil remain distinct',()=>{
 const result=tables(fixture(),filter),summary=result[0].rows[0],abs=result[1].rows[0],daily=result.find(s=>s.id==='pemantauan').rows;
 assert.equal(summary[3],2);assert.equal(summary[7],1);assert.equal(summary[9],.5);assert.equal(abs[2],'0012');assert.equal(abs[6],1);
 assert.equal(daily[0][3],'Nihil');assert.equal(daily[0][5],'Lengkap');assert.equal(daily[1][3],'Belum dilaporkan');assert.equal(daily.length,2);
 assert.equal(attendanceStatus('unexcused'),'Alpa');
 const empty=tables({...fixture(),attendance:[]},filter)[1].rows[0];assert.equal(empty[9],null);
});
test('XLSX round trip preserves all rows, styles, filters, text names and leading-zero NIS',async()=>{
 const ExcelJS=require('exceljs'),data=fixture();
 data.violations=Array.from({length:121},(_,i)=>({id:i,date:'2026-10-01',class_id:'a',class_name:'1A Banin',student_name:'=1+1',violation_name:'Contoh',points:1}));
 const wb=await workbook(ExcelJS,data,filter),buffer=await wb.xlsx.writeBuffer(),loaded=new ExcelJS.Workbook();await loaded.xlsx.load(buffer);
 assert.equal(loaded.worksheets.length,7);const abs=loaded.getWorksheet('Absensi');assert.equal(abs.getCell('B7').value,'=1+1');assert.equal(abs.getCell('B7').type,ExcelJS.ValueType.String);assert.equal(abs.getCell('C7').value,'0012');assert.equal(abs.getCell('J7').numFmt,'0.0%');assert.equal(abs.getCell('B7').font.name,'Tahoma');assert.equal(abs.views[0].ySplit,6);assert.equal(abs.pageSetup.orientation,'landscape');assert.equal(loaded.getWorksheet('Kedisiplinan').rowCount,127);assert.ok(abs.autoFilter);
 fs.writeFileSync('/tmp/cq-report-qa.xlsx',buffer);
});
function backend(rows={},failTable=''){
 let handler,reads=0;
 class Q{
  constructor(name){this.name=name;this.filters=[];this.orders=[];this.start=0;this.end=Infinity;this.single=false}
  select(){return this}eq(k,v){this.filters.push(x=>x[k]===v);return this}in(k,vs){this.filters.push(x=>vs.includes(x[k]));return this}gte(k,v){this.filters.push(x=>x[k]>=v);return this}lte(k,v){this.filters.push(x=>x[k]<=v);return this}order(k){this.orders.push(k);return this}range(a,b){this.start=a;this.end=b;return this}maybeSingle(){this.single=true;return this}
  then(resolve,reject){reads++;if(this.name===failTable)return Promise.resolve({data:null,error:Error('read failed')}).then(resolve,reject);let data=(rows[this.name]||[]).filter(x=>this.filters.every(f=>f(x)));data=data.slice().sort((a,b)=>{for(const k of this.orders){const c=String(a[k]).localeCompare(String(b[k]));if(c)return c}return 0}).slice(this.start,this.end+1);return Promise.resolve({data:this.single?data[0]||null:data,error:null}).then(resolve,reject)}
 }
 const context={createClient:()=>({from:name=>new Q(name)}),Deno:{env:{get:()=> 'test'},serve:f=>handler=f},crypto:require('node:crypto').webcrypto,TextEncoder,Response,Request,console,Intl,Date};
 const source=fs.readFileSync('supabase/functions/student-affairs-center/index.ts','utf8').replace(/^import .*\n/gm,'');
 const exportSource=fs.readFileSync('supabase/functions/student-affairs-center/report-export.ts','utf8').replace('export async function','async function');
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes('(function(){'+exportSource+';globalThis.reportExport=reportExport;})();'),context);vm.runInContext(stripTypeScriptTypes(source)+'\nglobalThis.runReport=b=>reportExport(sb,b);',context);
 return {context,handler,reads:()=>reads};
}
test('read-only backend pagination exceeds 10,000 and deduplicates live/archive attendance',async()=>{
 const sessions=Array.from({length:120},(_,i)=>({id:'session'+i,class_id:'a',attendance_date:'2026-10-01'}));
 const attendance=Array.from({length:10626},(_,i)=>({id:'a'+i,session_id:'session'+(i%120),student_id:'s'+i,status:i===0?'unexcused':'hadir'}));
 const rows={academic_years:[{id:'year',is_active:true}],semesters:[{academic_year_id:'year',semester_no:1,is_active:true}],classes:[{id:'a',name:'1A',is_active:true}],students:[{id:'s0',full_name:'Siswa',status:'aktif'}],student_enrollments:[{id:'e',student_id:'s0',class_id:'a',academic_year_id:'year',semester_no:1,is_active:true}],morning_talk_sessions:sessions,morning_talk_attendance:attendance,morning_talk_attendance_history:[{id:'history',class_id:'a',student_id:'s0',attendance_date:'2026-10-01',status:'hadir'}]};
 const b=backend(rows),out=await b.context.runReport({start_date:'2026-10-01',end_date:'2026-10-01',class_id:'a'});
 assert.equal(out.attendance.length,10626);assert.equal(out.summary.attendance.alpha,1);assert.equal(out.summary.attendance.izin,0);assert.equal(out.complete,true);
 const fail=backend(rows,'student_rewards');await assert.rejects(fail.context.runReport({start_date:'2026-10-01',end_date:'2026-10-01'}),/read failed/);
});
test('backend rejects unauthenticated/unauthorized access and invalid dates',async()=>{
 const b=backend();assert.equal((await b.handler(new Request('https://test',{method:'POST',body:'{}'}))).status,401);
 await assert.rejects(b.context.runReport({start_date:'2026-02-30',end_date:'2026-03-01'}),/invalid_date_range/);
 const hash=require('node:crypto').createHash('sha256').update('test-session').digest('hex');
 const denied=backend({user_sessions:[{token_hash:hash,user_account_id:'u',expires_at:'2099-01-01'}],user_accounts:[{id:'u',status:'aktif'}],user_account_roles:[{user_account_id:'u',role_code:'walas',is_active:true}]});
 assert.equal((await denied.handler(new Request('https://test',{method:'POST',headers:{'x-session-token':'test-session'},body:'{"action":"report_export"}'}))).status,403);
});
test('UI blocks stale export, keeps one sidebar route, and recovers after a request failure',async()=>{
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="sidebar"></div><div id="content"></div>',{url:'https://example.invalid',runScripts:'outside-only'}),w=dom.window;
 w.currentUser={role:'kabid_kesiswaan'};w.getAuthToken=()=> 'test-session';w.SUPABASE_PUBLISHABLE_KEY='public';let requests=[],pending=[];
 w.fetch=(url,options)=>new Promise(resolve=>{requests.push(JSON.parse(options.body));pending.push(data=>resolve({ok:data.success!==false,text:async()=>JSON.stringify(data)}))});
 w.eval(fs.readFileSync('kesiswaan-report-workbook.js','utf8'));w.eval(fs.readFileSync('kesiswaan-super-report.js','utf8'));w.renderKesiswaanSuperReport();
 const settle=()=>new Promise(r=>setImmediate(r));
 assert.equal(w.document.getElementById('ksr2-excel').disabled,true);pending.shift()(fixture());await settle();assert.equal(w.document.getElementById('ksr2-excel').disabled,false);
 const input=w.document.getElementById('ksr2-from');input.value='2026-10-01';input.dispatchEvent(new w.Event('change'));assert.equal(w.document.getElementById('ksr2-excel').disabled,true);
 w.document.getElementById('ksr2-apply').click();assert.equal(requests[1].start_date,'2026-10-01');pending.shift()({success:false,error:'offline'});await settle();assert.equal(w.document.getElementById('ksr2-excel').disabled,true);assert.match(w.document.getElementById('ksr2-status').textContent,/gagal/);
 w.document.getElementById('ksr2-apply').click();pending.shift()(fixture());await settle();assert.equal(w.document.getElementById('ksr2-excel').disabled,false);
 w.activeModule='laporan-kesiswaan-super';w.openGroupId='kes-laporan';w.renderSidebar=()=>{};w.setActiveModule=()=>{};w.enterApp=()=>{};
 w.eval(fs.readFileSync('kesiswaan-navigation.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal([...w.document.querySelectorAll('#sidebar .nav-item span')].filter(x=>x.textContent==='Laporan Kesiswaan').length,1);
 w.currentUser={role:'walas'};w.renderKesiswaanSuperReport();assert.match(w.document.getElementById('content').textContent,/tidak memiliki akses/);dom.window.close();
});
