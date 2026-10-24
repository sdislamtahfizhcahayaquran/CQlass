const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const html=fs.readFileSync('tahfizh-pts.html','utf8'),dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.invalid/'}),w=dom.window,requests=[];
 w.localStorage.setItem('cqlass_session_token','mock');w.fetch=(url,opt)=>new Promise(resolve=>{const body=JSON.parse(opt.body);requests.push({body,resolve:data=>resolve({ok:true,status:200,json:async()=>({success:true,...data})})})});
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())w.eval(m[1]);
 const boot={academic_year_id:'y',academic_year:'2031/2032',semester_no:2,role:'tahfizh',classes:[{id:'c',name:'1A',grade_level:1}],teachers_by_class:{}};
 assert.equal(requests[0].body.action,'bootstrap');assert.equal(requests[0].body.semester_no,undefined);requests[0].resolve(boot);await new Promise(r=>setTimeout(r,0));assert.equal(w.document.getElementById('semester').value,'2');
 w.document.getElementById('kelas').value='c';const pending=w.eval('loadRoster()');assert.equal(requests[1].body.academic_year_id,'y');assert.equal(requests[1].body.semester_no,2);
 const newer=w.eval('init(1)');assert.equal(requests[2].body.semester_no,1);requests[2].resolve({...boot,semester_no:1});await newer;
 requests[1].resolve({students:[{id:'old',full_name:'Old'}],reports:[]});await pending;
 assert.equal(w.document.getElementById('tbody').children.length,0);await w.eval('save()');assert.equal(requests.filter(x=>x.body.action==='save').length,0);
 w.close();console.log('PASS: Tahfizh defaults to active semester; explicit semester switch preserved; pinned year; stale roster and unloaded save blocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
