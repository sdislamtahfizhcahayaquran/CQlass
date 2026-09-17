/* CQlass — Rapor PTS Achievement Stars
   Panel 5 bintang pada kotak kanan halaman 1 rapor.
   Hanya bintang yang memenuhi syarat yang dibuat berwarna; lainnya tetap netral.
*/
(function(){
  'use strict';

  function num(v){
    if(v===null||v===undefined||v==='')return null;
    var n=Number(String(v).replace('%','').replace(',','.').trim());
    return Number.isFinite(n)?n:null;
  }
  function txt(v){return String(v==null?'':v).trim().toLowerCase()}
  function arr(v){return Array.isArray(v)?v:[]}
  function allA(list){
    var vals=arr(list).map(function(x){return txt(x&&typeof x==='object'?(x.predicate||x.predikat||x.grade||x.nilai||x.score):x)}).filter(Boolean);
    return vals.length>0&&vals.every(function(v){return v==='a'||v==='excellent'||v==='sangat baik'||v==='4'});
  }
  function tahfizhEarned(r){
    var t=r.tahfizh||{};
    var pct=num(t.percentage);
    var a=txt(t.juz_assessment||t.assessment||t.achievement_status||t.status);
    return (pct!==null&&pct>100)||/beyond|melewati|melampaui|di atas|above/.test(a);
  }
  function academicEarned(r){
    var a=r.academic_summary||r.academic||{};
    var rank=num(a.grade_rank||a.cohort_rank||a.rank||r.grade_rank||r.cohort_rank||r.academic_rank);
    return rank!==null&&rank>=1&&rank<=10;
  }
  function attendanceEarned(r){
    var a=r.attendance||{},p=a.percent||{};
    var present=num(p.present!=null?p.present:(p.hadir!=null?p.hadir:(a.present_percentage!=null?a.present_percentage:a.percentage)));
    return present!==null&&present>=100;
  }
  function activityEarned(r){
    var ex=r.extracurricular||{},ac=r.activities||r.activity||r.school_activities||{};
    var exList=arr(ex.items||ex.list||ex.rows||ex.data||ex);
    var acList=arr(ac.items||ac.list||ac.rows||ac.data||ac);
    var explicit=txt(r.activity_star||r.activity_achievement||ex.activity_star);
    if(['true','yes','earned','a','excellent'].includes(explicit))return true;
    return exList.length>0&&acList.length>0&&allA(exList)&&allA(acList);
  }
  function rewardEarned(r){
    var p=r.points||{};
    var total=num(p.reward_total!=null?p.reward_total:(p.total_reward!=null?p.total_reward:(p.reward_points!=null?p.reward_points:(p.total!=null?p.total:r.reward_points))));
    return total!==null&&total>=150;
  }
  function starSvg(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58-4.78-4.66 6.6-.96L12 2.5z"/></svg>'}
  function rows(r){
    return [
      {key:'tahfizh',label:'Tahfizh Star',desc:'Melewati LP',color:'#49A968',earned:tahfizhEarned(r)},
      {key:'academic',label:'Academic Star',desc:'10 besar seangkatan',color:'#3E86D9',earned:academicEarned(r)},
      {key:'attendance',label:'Attendance Star',desc:'Kehadiran 100%',color:'#E9AD22',earned:attendanceEarned(r)},
      {key:'activity',label:'Activity Star',desc:'Ekskul & activity semua A',color:'#8B59C8',earned:activityEarned(r)},
      {key:'reward',label:'Reward Star',desc:'Mengumpulkan ≥ 150 reward',color:'#EB7A3A',earned:rewardEarned(r)}
    ];
  }
  function injectCss(){
    if(document.getElementById('cq-rapor-stars-style'))return;
    var s=document.createElement('style');s.id='cq-rapor-stars-style';s.textContent=`
      .rpv-paper:first-child .rpv-tahfizh{width:58%;margin-bottom:4mm}
      .rpv-achievement-box{position:absolute;right:14mm;top:49.5mm;width:61mm;height:55mm;border:1px solid #c8d4df;background:#fff;border-radius:1.2mm;padding:2.4mm 2.6mm 2mm;overflow:hidden}
      .rpv-achievement-title{text-align:center;font-size:10px;font-weight:900;letter-spacing:.02em;color:#193d69;margin:0 0 1.4mm;line-height:1.1}
      .rpv-achievement-sub{text-align:center;font-size:7px;color:#758291;margin:-.8mm 0 1.5mm}
      .rpv-star-row{display:grid;grid-template-columns:8mm 1fr;align-items:center;gap:1.6mm;min-height:8.7mm;border-top:.35px solid #e4e9ee;padding:.55mm 0}
      .rpv-star-row:first-of-type{border-top:0}.rpv-star-icon{width:7.2mm;height:7.2mm;display:flex;align-items:center;justify-content:center}.rpv-star-icon svg{width:100%;height:100%;fill:var(--star);filter:drop-shadow(0 .3mm .25mm rgba(0,0,0,.12))}
      .rpv-star-copy{min-width:0;line-height:1.05}.rpv-star-name{font-size:8px;font-weight:900;color:#172d4d;white-space:normal}.rpv-star-desc{font-size:6.8px;color:#4d5968;margin-top:.55mm;white-space:normal}.rpv-star-row.off{opacity:.28;filter:grayscale(1)}
      .rpv-star-row.off .rpv-star-icon svg{fill:#aeb7c1}.rpv-star-row.off .rpv-star-name,.rpv-star-row.off .rpv-star-desc{color:#7d8791}
      @media print{.rpv-achievement-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `;document.head.appendChild(s);
  }
  function panel(r){
    var list=rows(r);
    return '<aside class="rpv-achievement-box" aria-label="Achievement Stars"><div class="rpv-achievement-title">ACHIEVEMENT STARS</div><div class="rpv-achievement-sub">Apresiasi atas capaian siswa</div>'+list.map(function(x){return '<div class="rpv-star-row '+(x.earned?'on':'off')+'" data-star="'+x.key+'" title="'+(x.earned?'Achievement earned':'Belum memenuhi kriteria')+'"><span class="rpv-star-icon" style="--star:'+x.color+'">'+starSvg()+'</span><span class="rpv-star-copy"><span class="rpv-star-name">'+x.label+'</span><span class="rpv-star-desc">'+x.desc+'</span></span></div>'}).join('')+'</aside>';
  }
  function apply(){
    try{
      injectCss();
      var r=window.raporPreviewState&&window.raporPreviewState.report;
      var paper=document.querySelector('#rpv-preview .rpv-paper:first-child');
      if(!r||!paper)return;
      paper.querySelector('.rpv-achievement-box')?.remove();
      paper.insertAdjacentHTML('beforeend',panel(r));
    }catch(e){console.warn('Achievement Stars:',e)}
  }
  function hook(){
    if(typeof window.renderRaporPreview!=='function')return false;
    if(window.renderRaporPreview.__cqStars)return true;
    var original=window.renderRaporPreview;
    var wrapped=function(){var out=original.apply(this,arguments);setTimeout(apply,0);return out};
    wrapped.__cqStars=true;window.renderRaporPreview=wrapped;return true;
  }
  var tries=0,t=setInterval(function(){tries++;if(hook()||tries>80)clearInterval(t)},100);
  document.addEventListener('DOMContentLoaded',function(){hook();setTimeout(apply,800)});
})();
