/* CQlass — surgical restore: Badal Guru Mapel for Kabid Akademik only */
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_BADAL_SIDEBAR_RESTORE__)return;
  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
  function userRole(){
    try{
      var u=(typeof currentUser!=='undefined'&&currentUser)||JSON.parse(localStorage.getItem('cqlass_user')||'{}')||{};
      return norm(u.role_code||u.role||u.primary_role||(Array.isArray(u.roles)&&u.roles[0])||'');
    }catch(_){return''}
  }
  function isAcademic(){
    var r=userRole();
    return r==='akademik'||r==='kabid_akademik'||r==='academic'||r.indexOf('kabid_akademik')>=0;
  }
  function renderBadal(c){
    if(typeof window.renderAcademicBadal==='function')return window.renderAcademicBadal(c);
    if(!document.querySelector('script[data-cq-academic-badal-restore-module]')){
      var s=document.createElement('script');
      s.src='academic-badal-v2.js?v=20260929-restore2';
      s.async=false;s.dataset.cqAcademicBadalRestoreModule='1';
      s.onload=function(){if(typeof window.renderAcademicBadal==='function')window.renderAcademicBadal(c)};
      (document.body||document.head).appendChild(s);
    }
    if(c)c.innerHTML='<div class="card">Memuat Badal Guru Mapel...</div>';
  }
  function ensure(){
    if(!isAcademic())return false;
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
      var g=MODULE_GROUPS.find(function(x){return x&&x.id==='akademik'});
      if(!g)return false;
      if(!Array.isArray(g.roles))g.roles=[];
      ['akademik','kabid_akademik'].forEach(function(r){if(!g.roles.includes(r))g.roles.push(r)});
      if(!Array.isArray(g.items))g.items=[];
      var item=g.items.find(function(x){return x&&x.id==='akd-badal'});
      if(!item){
        item={id:'akd-badal',label:'Badal Guru Mapel',roles:['akademik','kabid_akademik'],built:true,render:renderBadal};
        var pos=g.items.findIndex(function(x){return x&&x.id==='rapor'});
        if(pos<0)g.items.push(item);else g.items.splice(pos,0,item);
      }else{
        item.label='Badal Guru Mapel';
        item.roles=['akademik','kabid_akademik'];
        item.built=true;
        item.render=renderBadal;
      }
      return true;
    }catch(e){console.warn('Badal Guru Mapel restore:',e);return false}
  }
  function repaint(){
    if(!ensure())return;
    try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}
  }
  var tries=0;
  (function wait(){
    if(ensure()){
      if(typeof renderSidebar==='function'&&!renderSidebar.__cqAcademicBadalRestore){
        var old=renderSidebar;
        renderSidebar=function(){ensure();return old.apply(this,arguments)};
        renderSidebar.__cqAcademicBadalRestore=true;
      }
      setTimeout(repaint,0);setTimeout(repaint,250);setTimeout(repaint,1000);
      window.__CQ_ACADEMIC_BADAL_SIDEBAR_RESTORE__=true;
      return;
    }
    if(++tries<120)setTimeout(wait,100);
  })();
})();