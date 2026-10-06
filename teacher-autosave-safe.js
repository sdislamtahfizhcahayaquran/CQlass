// CQlass Teacher Autosave — conservative safety layer
(function(){
  'use strict';

  var ALLOWED_ROLES=new Set(['guru','walas','partner','tahfizh','pengabdian']);
  var timers=new WeakMap();
  var busy=new WeakSet();

  function role(){
    return String((window.currentUser&&window.currentUser.role)||'').toLowerCase();
  }
  function enabled(){
    return ALLOWED_ROLES.has(role());
  }
  function debounce(el,fn,delay){
    var old=timers.get(el);
    if(old)clearTimeout(old);
    var t=setTimeout(fn,delay||3000);
    timers.set(el,t);
  }
  function complete(ids){
    return ids.every(function(id){
      var el=document.getElementById(id);
      return el&&String(el.value||'').trim()!=='';
    });
  }
  function validRange(startId,endId){
    var s=document.getElementById(startId),e=document.getElementById(endId);
    return !!(s&&e&&s.value&&e.value&&e.value>s.value);
  }
  async function runOnce(key,fn){
    if(!key||busy.has(key))return;
    busy.add(key);
    try{await fn()}catch(e){console.warn('Autosave guru gagal:',e)}
    finally{busy.delete(key)}
  }

  function bindCard2(root){
    var card=root.querySelector('#tsv2-card2');
    if(!card||card.dataset.cqAutosave==='1')return;
    card.dataset.cqAutosave='1';
    card.addEventListener('input',schedule);
    card.addEventListener('change',schedule);
    function schedule(e){
      if(!enabled())return;
      if(!e.target.matches('#tsv2-date,#tsv2-start,#tsv2-end,#tsv2-act,#tsv2-note'))return;
      debounce(card,async function(){
        if(!complete(['tsv2-date','tsv2-start','tsv2-end','tsv2-act'])||!validRange('tsv2-start','tsv2-end'))return;
        var d=document.getElementById('tsv2-date').value,
            s=document.getElementById('tsv2-start').value,
            en=document.getElementById('tsv2-end').value;
        if(typeof window.cqTsRangeIsGap==='function'&&!window.cqTsRangeIsGap(d,s,en))return;
        if(typeof window.tsv2Save==='function')await runOnce(card,function(){return window.tsv2Save(true)});
      },3000);
    }
  }

  function bindFixed(root){
    var card=root.querySelector('#tsv2-card1 .tsv2-fixed-slot-editor');
    if(!card||card.dataset.cqAutosave==='1')return;
    card.dataset.cqAutosave='1';
    card.addEventListener('input',schedule);
    card.addEventListener('change',schedule);
    function schedule(e){
      if(!enabled())return;
      if(!e.target.matches('#tsv2-fixed-act,#tsv2-fixed-note'))return;
      debounce(card,async function(){
        var form=root.querySelector('#tsv2-card1 .tsv2-form');
        if(!form||form.dataset.fixedSelected!=='1')return;
        if(!complete(['tsv2-fixed-date','tsv2-fixed-start','tsv2-fixed-end','tsv2-fixed-act'])||!validRange('tsv2-fixed-start','tsv2-fixed-end'))return;
        if(typeof window.tsv2SaveFixed==='function')await runOnce(card,function(){return window.tsv2SaveFixed(true)});
      },3000);
    }
  }

  function bindRecap(root){
    root.querySelectorAll('[data-edit-key]').forEach(function(tr){
      if(tr.dataset.cqAutosave==='1')return;
      tr.dataset.cqAutosave='1';
      function schedule(e){
        if(!enabled()||!e.target.matches('[data-er]'))return;
        debounce(tr,async function(){
          var key=tr.getAttribute('data-edit-key')||'',
              cut=key.indexOf('-');
          if(cut<1)return;
          var kind=key.slice(0,cut),id=key.slice(cut+1);
          var get=function(n){var el=tr.querySelector('[data-er="'+n+'"]');return el?String(el.value||'').trim():''};
          var d=get('date'),s=get('start'),en=get('end'),a=get('activity');
          if(!d||!s||!en||!a||en<=s)return;
          if(typeof window.tsv2SaveRecapRow==='function')await runOnce(tr,function(){return window.tsv2SaveRecapRow(kind,id,true)});
        },3000);
      }
      tr.addEventListener('input',schedule);
      tr.addEventListener('change',schedule);
    });
  }

  function scan(){
    if(!enabled())return;
    var root=document.getElementById('content');
    if(!root)return;
    bindCard2(root);
    bindFixed(root);
    bindRecap(root);
  }

  var mo=new MutationObserver(function(){scan()});
  function boot(){
    if(!enabled())return;
    scan();
    var root=document.getElementById('content')||document.body;
    mo.observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();