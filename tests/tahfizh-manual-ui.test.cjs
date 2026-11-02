const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<div id="content"></div>',{runScripts:'outside-only',url:'https://example.invalid/'}),w=dom.window;
 w.setTimeout=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};w.getAuthToken=()=> 'test';w.showToast=()=>{};w.cqTsRangeIsGap=()=>true;
 let profile='tahfizh';const saves=[];
 w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);let data={success:true};
 if(url.endsWith('teacher-work-schedule'))data={...data,profile,items:[]};
 else if(b.action==='bootstrap')data={...data,teacher:{id:'t'},activities:[],teaching:[],saturdays:[],activity_master:[{id:'m',name:'Administrasi'}]};
 else if(b.action==='save_activity'){saves.push(b);data.row={id:'saved'}};
 return {ok:true,json:async()=>data};};
 w.eval(fs.readFileSync('teacher-timesheet-v2.js','utf8'));
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate)};
 w.renderTeacherTimesheet();await flush();
 for(const [date,start,end] of [['2026-11-06','07:00','08:00'],['2026-11-07','07:30','09:00']]){
 const dateField=w.document.getElementById('tsv2-date');dateField.value=date;w.tsv2ActivityDateChanged(date);
 const field=w.document.getElementById('tsv2-act');assert.equal(field.tagName,'INPUT','typed activity field must be shown');
 field.value='Persiapan materi <hafalan>';w.document.getElementById('tsv2-start').value=start;w.document.getElementById('tsv2-end').value=end;
 await w.tsv2Save();await flush();assert.equal(saves.at(-1).activity,'Persiapan materi <hafalan>');assert.equal(saves.at(-1).work_date,date);assert(!('activity_master_id' in saves.at(-1)));
 w.document.getElementById('tsv2-date').value=date;w.tsv2ActivityDateChanged(date);w.document.getElementById('tsv2-act').value='Pola hafalan';w.document.getElementById('tsv2-start').value=start;w.document.getElementById('tsv2-end').value=end;
 let pattern;w.cqRecurringSaveFromGap=async b=>{pattern=b};await w.tsv2SavePattern();assert.equal(pattern.activity_name,'Pola hafalan');assert.equal(pattern.date,date);
 }
 w.document.getElementById('tsv2-date').value='2026-11-02';w.tsv2ActivityDateChanged('2026-11-02');assert.equal(w.document.getElementById('tsv2-act').tagName,'SELECT','Tahfizh weekday retains master');
 profile='mapel';w.renderTeacherTimesheet();await flush();w.tsv2ActivityDateChanged('2026-11-06');assert.equal(w.document.getElementById('tsv2-act').tagName,'SELECT','other role keeps activity master');
 w.close();console.log('PASS: Tahfizh Friday/Saturday typed input, manual save and weekly pattern payloads; Mapel dropdown unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
