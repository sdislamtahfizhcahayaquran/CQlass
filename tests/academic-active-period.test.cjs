const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync('supabase/functions/academic-scores/index.ts','utf8');
const active=src.slice(src.indexOf('async function resolveBootstrapPeriod('),src.indexOf('async function resolvePeriod('));
const context={SCHOOL_UNIT_CODE:'school'};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(active),context);
function mock(rows){const queries=[];return {queries,from(table){const filters=[];queries.push({table,filters});return {select(){return this},eq(...v){filters.push(v);return this},async single(){return rows[table]||{data:null,error:null}}}}}}
(async()=>{
 const sb=mock({school_units:{data:{id:'u'}},academic_years:{data:{id:'y',name:'2031/2032'}},semesters:{data:{semester_no:2}}});
 const p=await context.resolveBootstrapPeriod(sb);assert.equal(p.year.name,'2031/2032');assert.equal(p.semesterNo,2);assert.deepEqual(sb.queries[1].filters,[['school_unit_id','u'],['is_active',true]]);assert.deepEqual(sb.queries[2].filters,[['academic_year_id','y'],['is_active',true]]);
 await assert.rejects(()=>context.resolveBootstrapPeriod(mock({school_units:{data:{id:'u'}}})),/active_academic_year_not_found/);
 await assert.rejects(()=>context.resolveBootstrapPeriod(mock({school_units:{data:{id:'u'}},academic_years:{data:{id:'y'}}})),/active_semester_not_found/);
 const app=fs.readFileSync('app-core.js','utf8');const bootstrap=app.slice(app.indexOf('async function academicGridBootstrap('),app.indexOf('function academicSelectedAssignment('));
 const calls=[],state={academicYear:'2026/2027',semester:1,loadToken:0,assignments:[]};
 const c={academicGridState:state,document:{getElementById:()=>({innerHTML:''})},academicGridRequest:async(a,b)=>{calls.push(JSON.parse(JSON.stringify(b)));return {academic_year:'2031/2032',semester_no:2,assignments:[]}},escapeHtml:String};vm.createContext(c);vm.runInContext(bootstrap,c);
 await c.academicGridBootstrap(true);assert.deepEqual(calls[0],{});assert.equal(state.academicYear,'2031/2032');assert.equal(state.semester,2);
 state.academicYear='2025/2026';state.semester=1;await c.academicGridBootstrap();assert.deepEqual(calls[1],{academic_year:'2025/2026',semester_no:1});
 assert.match(app,/academicGridBootstrap\(true\);/);
 console.log('PASS: active year/semester resolution; missing active period fails closed; initial request omits fixed year; explicit archive selection remains explicit.');
})().catch(e=>{console.error(e);process.exitCode=1});
