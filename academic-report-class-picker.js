/* CQlass — pilihan kelas untuk viewer Rapor lintas kelas (Kabid Akademik/Admin/Pimpinan) */
(function(){
  'use strict';
  if(window.__cqAcademicReportClassPicker)return;

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]});
  }

  function install(){
    if(typeof renderRaporControls!=='function' || typeof rpChangeClass!=='function')return false;
    if(renderRaporControls.__cqClassPickerPatched)return true;

    var originalRender=renderRaporControls;
    var originalChangeClass=rpChangeClass;

    renderRaporControls=function(){
      originalRender();
      try{
        if(typeof raporPreviewState==='undefined')return;
        var root=document.getElementById('rpv-root');
        if(!root)return;

        var chip=root.querySelector('.rpv-status-chip');
        var unlocked=!Boolean(raporPreviewState.classLocked);
        var classes=Array.isArray(raporPreviewState.classes)?raporPreviewState.classes:[];
        var selected=String(raporPreviewState.classId||'');

        if(unlocked){
          var holder=document.createElement('div');
          holder.className='rpv-class-picker-wrap';
          holder.innerHTML='<div class="rpv-field rpv-class-picker-field">'+
            '<label for="rpv-class">KELAS</label>'+
            '<select id="rpv-class" class="rpv-control">'+
              '<option value="">— Pilih kelas —</option>'+
              classes.map(function(c){
                var id=String(c&&c.id||'');
                var name=String(c&&c.name||c&&c.code||'-');
                return '<option value="'+esc(id)+'" '+(id===selected?'selected':'')+'>'+esc(name)+'</option>';
              }).join('')+
            '</select></div>';

          var select=holder.querySelector('#rpv-class');
          if(select){
            select.addEventListener('change',function(){ rpChangeClass(this.value); });
          }

          if(chip)chip.replaceWith(holder);
          else{
            var toolbar=root.querySelector('.rpv-toolbar');
            if(toolbar)toolbar.parentNode.insertBefore(holder,toolbar);
          }

          var student=document.getElementById('rpv-student');
          if(student && !selected){
            student.disabled=true;
            student.innerHTML='<option value="">— Pilih kelas terlebih dahulu —</option>';
          }

          var sub=document.querySelector('.page-sub');
          if(sub)sub.textContent='Pilih jenis rapor dan kelas, lalu preview atau cetak rapor siswa.';
        }else if(chip){
          var className=classes.find(function(c){return String(c&&c.id||'')===selected;});
          chip.textContent='Kelas: '+String(className&&(className.name||className.code)||'-');
        }
      }catch(err){ console.warn('Rapor class picker:',err); }
    };
    renderRaporControls.__cqClassPickerPatched=true;

    rpChangeClass=async function(id){
      var result=await originalChangeClass(id);
      try{
        var area=document.getElementById('rpv-preview-area');
        if(area)area.innerHTML='<div class="card" style="color:#6f817d">Pilih siswa lalu klik <b>Preview Rapor</b>.</div>';
      }catch(_){}
      return result;
    };

    var style=document.createElement('style');
    style.id='cq-academic-report-class-picker-css';
    style.textContent='.rpv-class-picker-wrap{margin:0 0 12px}.rpv-class-picker-field{max-width:390px}.rpv-class-picker-field label{display:block;margin-bottom:6px;font-weight:800;color:#536f69;font-size:12px}.rpv-class-picker-field .rpv-control{width:100%}';
    if(!document.getElementById(style.id))document.head.appendChild(style);

    window.__cqAcademicReportClassPicker=true;
    return true;
  }

  if(!install()){
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },100);
  }
})();
