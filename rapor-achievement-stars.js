/* CQlass — Dynamic PTS Achievement Stars
   Only earned stars are rendered. Technical thresholds stay internal.
*/
(function(){
'use strict';
function num(v){if(v===null||v===undefined||v==='')return null;var n=Number(String(v).replace('%','').replace(',','.').trim());return Number.isFinite(n)?n:null}
function txt(v){return String(v==null?'':v).trim().toLowerCase()}
function arr(v){return Array.isArray(v)?v:[]}
function allA(list){var vals=arr(list).map(function(x){return txt(x&&typeof x==='object'?(x.predicate||x.predikat||x.grade||x.nilai||x.score):x)}).filter(Boolean);return vals.length>0&&vals.every(function(v){return v==='a'||v==='excellent'||v==='sangat baik'||v==='4'})}
function tahfizhEarned(r){var t=r.tahfizh||{},pct=num(t.percentage),s=txt(t.juz_assessment||t.assessment||t.achievement_status||t.status);return (pct!==null&&pct>100)||/beyond|melewati|melampaui|di atas|above/.test(s)}
function academicEarned(r){var a=r.academic_summary||r.academic||{},rank=num(a.grade_rank||a.cohort_rank||a.rank||r.grade_rank||r.cohort_rank||r.academic_rank);return rank!==null&&rank>=1&&rank<=10}
function attendanceEarned(r){var a=r.attendance||{},p=a.percent||{},present=num(p.present!=null?p.present:(p.hadir!=null?p.hadir:(a.present_percentage!=null?a.present_percentage:a.percentage)));return present!==null&&present>=100}
function activityEarned(r){var ex=r.extracurricular||{},ac=r.activities||r.activity||r.school_activities||{},exList=arr(ex.items||ex.list||ex.rows||ex.data||ex),acList=arr(ac.items||ac.list||ac.rows||ac.data||ac),explicit=txt(r.activity_star||r.activity_achievement||ex.activity_star);if(['true','yes','earned','a','excellent'].includes(explicit))return true;return exList.length>0&&acList.length>0&&allA(exList)&&allA(acList)}
function characterEarned(r){var p=r.points||r.character_discipline||{},reward=num(p.reward_total!=null?p.reward_total:(p.total_reward!=null?p.total_reward:(p.reward_points!=null?p.reward_points:r.reward_points))),violation=num(p.violation_total!=null?p.violation_total:(p.total_violation!=null?p.total_violation:(p.violation_points!=null?p.violation_points:(r.violation_points!=null?r.violation_points:0))));return reward!==null&&reward>=50&&(violation===null||violation===0)}
function starSvg(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58-4.78-4.66 6.6-.96L12 2.5z"/></svg>'}
function rows(r){return [
{key:'tahfizh',label:'Tahfizh Star',desc:'Beyond Tahfizh Target',color:'#49A968',earned:tahfizhEarned(r)},
{key:'academic',label:'Academic Star',desc:'Outstanding Achievement',color:'#3E86D9',earned:academicEarned(r)},
{key:'attendance',label:'Attendance Star',desc:'Perfect Attendance',color:'#E9AD22',earned:attendanceEarned(r)},
{key:'activity',label:'Activity Star',desc:'Active & Accomplished',color:'#8B59C8',earned:activityEarned(r)},
{key:'character',label:'Character Star',desc:'Positive & Disciplined',color:'#EB7A3A',earned:characterEarned(r)}
].filter(function(x){return x.earned})}
function injectCss(){if(document.getElementById('cq-rapor-stars-style'))return;var s=document.createElement('style');s.id='cq-rapor-stars-style';s.textContent=`
.rpv-paper:first-child .rpv-tahfizh{width:58%;margin-bottom:4mm}
.rpv-achievement-box{position:absolute;right:14mm;top:49.5mm;width:61mm;min-height:28mm;max-height:55mm;border:1px solid #c8d4df;background:#fff;border-radius:1.5mm;padding:2.5mm;overflow:hidden;box-sizing:border-box}
.rpv-achievement-title{text-align:center;font-size:9px;font-weight:900;letter-spacing:.04em;color:#193d69;margin:0 0 1.5mm;line-height:1.1}
.rpv-achievement-list{display:grid;gap:1mm}.rpv-achievement-list.count-1 .rpv-star-row{min-height:18mm}.rpv-achievement-list.count-2 .rpv-star-row{min-height:12mm}
.rpv-star-row{display:grid;grid-template-columns:9mm 1fr;align-items:center;gap:1.7mm;min-height:8mm;border-top:.35px solid #e4e9ee;padding:.7mm 0}.rpv-star-row:first-child{border-top:0}
.rpv-star-icon{width:8mm;height:8mm;display:flex;align-items:center;justify-content:center}.rpv-star-icon svg{width:100%;height:100%;fill:var(--star);filter:drop-shadow(0 .3mm .25mm rgba(0,0,0,.13))}
.rpv-star-copy{min-width:0;line-height:1.08}.rpv-star-name{display:block;font-size:8px;font-weight:900;color:#172d4d}.rpv-star-desc{display:block;font-size:6.7px;color:#4d5968;margin-top:.5mm;white-space:normal}
@media print{.rpv-achievement-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;document.head.appendChild(s)}
function panel(r){var list=rows(r);if(!list.length)return '';return '<aside class="rpv-achievement-box" aria-label="Achievement Stars"><div class="rpv-achievement-title">ACHIEVEMENT STARS</div><div class="rpv-achievement-list count-'+list.length+'">'+list.map(function(x){return '<div class="rpv-star-row" data-star="'+x.key+'"><span class="rpv-star-icon" style="--star:'+x.color+'">'+starSvg()+'</span><span class="rpv-star-copy"><span class="rpv-star-name">'+x.label+'</span><span class="rpv-star-desc">'+x.desc+'</span></span></div>'}).join('')+'</div></aside>'}
function apply(){try{injectCss();var r=window.raporPreviewState&&window.raporPreviewState.report,paper=document.querySelector('#rpv-preview .rpv-paper:first-child');if(!r||!paper)return;var old=paper.querySelector('.rpv-achievement-box');if(old)old.remove();var html=panel(r);if(html)paper.insertAdjacentHTML('beforeend',html)}catch(e){console.warn('Achievement Stars:',e)}}
function hook(){if(typeof window.renderRaporPreview!=='function')return false;if(window.renderRaporPreview.__cqStars)return true;var original=window.renderRaporPreview,wrapped=function(){var out=original.apply(this,arguments);setTimeout(apply,0);return out};wrapped.__cqStars=true;window.renderRaporPreview=wrapped;return true}
var tries=0,t=setInterval(function(){tries++;if(hook()||tries>80)clearInterval(t)},100);document.addEventListener('DOMContentLoaded',function(){hook();setTimeout(apply,800)});
})();