// Pure mock: no credentials or network; run with Node 22+.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let handler,role='teacher',rpcCalls=0,writes=0;
const sb={from(table){const q={};for(const key of ['select','eq','limit','order','in','match'])q[key]=()=>q;
 q.upsert=()=>{writes++;return q};
 const result=()=>({data:table==='user_sessions'?{user_account_id:'u',expires_at:'2099-01-01'}:table==='user_accounts'?{id:'u',username:'teacher',status:'active'}:table==='user_account_roles'?[{role_code:role}]:table==='school_units'?{id:'school'}:table==='academic_years'?{id:'year'}:table==='semesters'?{id:'semester'}:table==='classes'?{id:'class'}:null,error:null});
 q.maybeSingle=async()=>result();q.then=(resolve,reject)=>Promise.resolve(result()).then(resolve,reject);return q;},rpc:async()=>{rpcCalls++;return {error:{message:'period_changed'}}}};
const source=fs.readFileSync('supabase/functions/admin-academic-period/index.ts','utf8').replace(/^import .*;$/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>sb,Deno:{env:{get:()=> 'mock'},serve:f=>handler=f},Response,Request,TextEncoder,crypto:require('node:crypto').webcrypto,console});
async function call(body,token=true,method='POST'){return handler(new Request('https://example.invalid',{method,headers:token?{'x-session-token':'mock'}:{},...(method==='POST'?{body:JSON.stringify(body)}:{})}));}
(async()=>{
 assert.equal((await call({action:'activate_period'},false)).status,401);
 for(const action of ['create_year','save_dates','activate_period','preview_activation','save_effective_days'])assert.equal((await call({action})).status,403);
 assert.equal(rpcCalls,0);assert.equal(writes,0);
 role='admin';assert.equal((await call({action:'create_year',name:'2026/2028'})).status,400);
 assert.equal((await call({action:'save_dates',start_date:'2026-02-30'})).status,400);
 assert.equal((await call({action:'activate_period',academic_year_id:'year',semester_no:2})).status,409);
 for(const effective_days of [null,'',-1,367,1.5])assert.equal((await call({action:'save_effective_days',academic_year_id:'year',semester_no:1,assessment_period:'PTS',rows:[{class_id:'class',effective_days}]})).status,400);
 assert.equal(writes,0);
 assert.equal((await call({action:'save_effective_days',academic_year_id:'year',semester_no:1,assessment_period:'PTS',rows:[{class_id:'class',effective_days:0}]})).status,200);assert.equal(writes,1);
 assert.equal((await call({},false,'GET')).status,405);
 console.log('PASS: session/admin boundaries; invalid dates/year/days; conflict status; explicit zero accepted.');
})().catch(e=>{console.error(e);process.exitCode=1});
