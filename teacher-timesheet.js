// CQlass Timesheet loader V5 — v2 API route, access guard, deterministic order, UI polish last
(function(){
  function add(src,id){
    return new Promise(function(resolve){
      var old=document.getElementById(id);
      if(old){resolve();return;}
      var s=document.createElement('script');
      s.id=id;
      s.src=src;
      s.onload=function(){resolve()};
      s.onerror=function(){console.warn('Timesheet module gagal dimuat:',src);resolve()};
      document.head.appendChild(s);
    });
  }

  function enablePengabdianTimesheet(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      var reports=MODULE_GROUPS.find(function(g){return g&&g.id==='laporan'});
      if(!reports){reports={id:'laporan',label:'Laporan',roles:[],items:[]};MODULE_GROUPS.push(reports)}
      reports.roles=Array.isArray(reports.roles)?reports.roles:[];
      if(!reports.roles.includes('pengabdian'))reports.roles.push('pengabdian');
      reports.items=Array.isArray(reports.items)?reports.items:[];
      var item=null;
      for(var i=0;i<MODULE_GROUPS.length;i++){
        var g=MODULE_GROUPS[i];if(!Array.isArray(g&&g.items))continue;
        var found=g.items.find(function(x){return x&&x.id==='timesheet'});if(found){item=found;break}
      }
      if(!item&&typeof window.renderTeacherTimesheet==='function'){
        item={id:'timesheet',label:'Timesheet',roles:['pengabdian'],built:true,render:window.renderTeacherTimesheet};
        reports.items.push(item);
      }
      if(item){
        item.roles=Array.isArray(item.roles)?item.roles:[];
        if(!item.roles.includes('pengabdian'))item.roles.push('pengabdian');
        item.render=window.renderTeacherTimesheet||item.render;
        item.built=true;
      }
    }catch(e){console.warn('Akses Timesheet Pengabdian:',e)}
  }

  (async function(){
    await add('timesheet-api-v2-route.js?v=20260922-pengabdian1','cq-ts-api-v2-route');
    await add('timesheet-access-fix.js?v=20260922-access1','cq-ts-access-fix');
    await add('teacher-timesheet-v2.js?v=20260922-layout3','cq-ts-v2');
    await add('timesheet-recurring.js?v=20260922-layout4','cq-ts-recurring');
    await add('admin-timesheet-master.js?v=20260922-layout3','cq-ts-admin-master');
    await add('timesheet-saturday-manual.js?v=20260922-layout3','cq-ts-saturday-manual');
    await add('timesheet-ui-polish.js?v=20260922-polish3','cq-ts-ui-polish');
    await add('timesheet-ui-order-fix.js?v=20260922-order2','cq-ts-ui-order-fix');
    enablePengabdianTimesheet();
    try{
      if(typeof currentUser!=='undefined'&&currentUser&&String(currentUser.role||'').toLowerCase()==='pengabdian'&&typeof renderSidebar==='function')renderSidebar();
    }catch(_){}
  })();
})();