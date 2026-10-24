const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
function db(rows){const calls=[];return {calls,from(table){const filters=[];calls.push({table,filters});const q={};for(const m of ['select','order','limit','not'])q[m]=()=>q;q.eq=(k,v)=>{filters.push([k,v]);return q};const result=()=>({data:rows[table]??null,error:null});q.single=q.maybeSingle=async()=>result();q.then=(a,b)=>Promise.resolve(result()).then(a,b);return q}}}
(async()=>{
 const report=fs.readFileSync('supabase/functions/report-preview/index.ts','utf8');
 const c={SCHOOL_UNIT_CODE:'SD',t:v=>String(v??'').trim(),low:v=>String(v??'').trim().toLowerCase()};vm.createContext(c);
 vm.runInContext(stripTypeScriptTypes(report.slice(report.indexOf('async function activeReportPeriod('),report.indexOf('async function period('))),c);
 let s=db({school_units:{id:'u'},academic_years:{id:'y2',name:'2028/2029'},semesters:{semester_no:2}});
 let p=await c.activeReportPeriod(s);assert.equal(p.year.name,'2028/2029');assert.equal(p.semesterNo,2);
 assert.deepEqual(s.calls[1].filters,[['school_unit_id','u'],['is_active',true]]);
 await assert.rejects(()=>c.activeReportPeriod(db({school_units:{id:'u'}})),/active_academic_year_not_found/);
 await assert.rejects(()=>c.activeReportPeriod(db({school_units:{id:'u'},academic_years:{id:'y'}})),/active_semester_not_found/);
 assert.equal((report.match(/report_class_assignments"\)\.select\("\*"\)\.eq\("academic_year_id",p.year.id\)\.eq\("semester_no",p.semesterNo\)/g)||[]).length,2,'Walas access and report signatures both scoped to year/semester');
 const partner=fs.readFileSync('supabase/functions/partner-tasks/index.ts','utf8');
 const pc={T:c.t,L:c.low};vm.createContext(pc);vm.runInContext(stripTypeScriptTypes(partner.slice(partner.indexOf('async function context('),partner.indexOf('async function classRows('))),pc);
 const rows={academic_years:{id:'y',name:'2028/2029'},semesters:{semester_no:2},report_class_assignments:[{class_id:'c'}],tahfizh_teacher_assignments:[{class_id:'c'}],teachers:{full_name:'Teacher'},partner_tahfizh_halaqah_roster:[{class_id:'c'}]};
 s=db(rows);p=await pc.context(s,{teacher_id:'t'},0,{action:'bootstrap'});assert.equal(p.semesterNo,2);
 for(const table of ['report_class_assignments','tahfizh_teacher_assignments','partner_tahfizh_halaqah_roster'])assert(s.calls.find(x=>x.table===table).filters.some(([k,v])=>k==='semester_no'&&v===2));
 await assert.rejects(()=>pc.context(db(rows),{teacher_id:'t'},2,{action:'save',academic_year_id:'old'}),/period_changed/);
 await assert.rejects(()=>pc.context(db(rows),{teacher_id:'t'},1,{action:'save',academic_year_id:'y'}),/period_changed/);
 assert.equal((await pc.context(db(rows),{teacher_id:'t'},2,{action:'save',academic_year_id:'y'})).yearId,'y');
 console.log('PASS: report active period; missing configuration fails closed; Walas scope; Partner assignment period; stale year/semester save rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
