// Run with NODE_PATH pointing to a jsdom installation. No production requests.
const {JSDOM}=require('jsdom');const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM('<div id="sidebar"></div><div id="content"></div>',{url:'https://example.invalid/',runScripts:'outside-only'}),w=dom.window;
 const calls=[];Object.assign(w,{currentUser:{role:'admin',nama:'Admin'},SUPABASE_PUBLISHABLE_KEY:'k',getAuthToken:()=>'t'});
 const years=[{id:'y1',name:'2026/2027',is_active:true,semesters:[{semester_no:1,is_active:true},{semester_no:2,is_active:false}]}];
 w.fetch=async(u,o)=>{const b=JSON.parse(o.body);calls.push([u.split('/').pop(),b.action]);let d={success:true};
  if(u.endsWith('role-dashboard'))d={success:true,master_counts:{students:555,teachers:48,classes:22,subjects:14,accounts:61}};
  else if(u.endsWith('admin-schedule-editor'))d={success:true,summary:{teacher_conflicts:2,class_conflicts:0}};
  else if(b.action==='list')d={success:true,years};
  else if(b.action==='effective_days')d={success:true,classes:[{id:'a',effective_days:90},{id:'b',effective_days:null}]};
  else if(b.action==='report_config_get')d={success:true,config:{configured:true}};
  else if(b.action==='preview_activation')d={success:true,counts:{classes:22,students:0,mapel:0,tahfizh:0}};
  return {ok:true,json:async()=>d}};
 w.eval(fs.readFileSync('admin-home.js','utf8'));
 const c=w.document.getElementById('content');await w.renderAdminDashboard(c);
 const titles=[...c.querySelectorAll('.adh-task b')].map(x=>x.textContent);
 assert.match(titles[0],/bentrok jadwal/,'conflicts are listed first');
 assert(titles.some(t=>/Tanggal tahun ajaran/.test(t)),'missing dates flagged');
 assert(titles.some(t=>/Hari efektif/.test(t)),'missing effective days flagged');
 assert(!titles.some(t=>/Pengaturan rapor/.test(t)),'configured report settings are not a task');
 assert.equal(c.querySelector('.adh-hero-stat b').textContent,String(titles.length));
 assert(c.textContent.includes('555'));
 assert(calls.every(([,a])=>!/save|activate|create|deactivate/.test(a)),'dashboard is read-only');
 w.currentUser.role='guru';c.innerHTML='x';await w.renderAdminDashboard(c);assert.equal(c.innerHTML,'x','non-admin untouched');
 w.close();console.log('PASS: admin home ranks tasks, read-only calls, non-admin untouched.');
})().catch(e=>{console.error(e);process.exitCode=1});
