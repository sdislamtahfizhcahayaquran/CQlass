/* CQlass — Sistem penilaian (satu sumber untuk semua halaman: nilai guru, Monitoring Nilai, Download Data, rapor, rekap, legger).
   Nilai murni  = rata-rata Tugas yang terisi x 10% + rata-rata TP x 30% + WWP x 20% + ASAS x 40%
                  (minimal 1 Tugas terisi; semua TP, WWP dan ASAS wajib terisi).
   Nilai per TP = rata-rata Tugas x 10% + nilai TP itu x 30% + WWP x 20% + ASAS x 40%   (huruf Penilaian Intrakurikuler & narasi IKM).
   Nilai rapor  = nilai murni dibulatkan; berakhiran 4 atau 9 dinaikkan 1; minimal 77, maksimal 96.
   Huruf        = A 89-96, B 82-88, C 75-81, D < 75. Huruf per TP minimal C (sejalan dengan nilai rapor minimal 77).
   Rumus yang sama ada di supabase/functions/admin-academic-period/semester-report.ts (tes memastikan keduanya sama). */
(function(){
'use strict';
const W=Object.freeze({tugas:.10,tp:.30,wwp:.20,asas:.40});
const MIN=77,MAX=96;
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const r2=n=>Math.round(n*100)/100;
const filled=a=>(a||[]).map(num).filter(x=>x!==null);
// Lengkap bila minimal 1 Tugas, semua TP, WWP dan ASAS terisi.
function complete(tasks,tps,wwp,asas){const p=(tps||[]).map(num);return filled(tasks).length>0&&p.length>0&&p.every(x=>x!==null)&&num(wwp)!==null&&num(asas)!==null}
function raw(tasks,tps,wwp,asas){if(!complete(tasks,tps,wwp,asas))return null;return r2(avg(filled(tasks))*W.tugas+avg(tps.map(num))*W.tp+num(wwp)*W.wwp+num(asas)*W.asas)}
function rapor(x){const n0=num(x);if(n0===null)return null;let n=Math.round(n0);if(n%10===4||n%10===9)n+=1;return Math.max(MIN,Math.min(MAX,n))}
function tpScore(tasks,tp,wwp,asas){const t=filled(tasks);if(!t.length||num(tp)===null||num(wwp)===null||num(asas)===null)return null;return r2(avg(t)*W.tugas+num(tp)*W.tp+num(wwp)*W.wwp+num(asas)*W.asas)}
function letter(x){const n=num(x);if(n===null)return'';return n>=89?'A':n>=82?'B':n>=75?'C':'D'}
// Huruf per TP (Intrakurikuler & narasi IKM): minimal C.
function tpLetter(x){const l=letter(x);return l==='D'?'C':l}
window.CQ_SCORE=Object.freeze({W,MIN,MAX,num,complete,raw,rapor,tpScore,letter,tpLetter,
 text:'Tugas 10% + TP 30% + WWP 20% + ASAS 40%',rules:'Nilai rapor: dibulatkan, angka akhir 4/9 dinaikkan 1, minimal 77, maksimal 96.'});
})();
