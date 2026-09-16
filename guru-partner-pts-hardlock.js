/* CQlass — fail-safe lock for Guru Partner PTS percentage */
(function(){
'use strict';
function num(v){const s=String(v??'').trim().replace(/,/g,'.').replace(/[^0-9.\-]/g,'');if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null}
function pct(a,b){a=num(a);b=num(b);return a===null||b===null||b<=0?'':`${Math.round(a/b*100)}%`}
function calc(tr){if(!tr)return;const a=tr.querySelector('[data-key="jumlah_baris"]'),b=tr.querySelector('[data-key="jumlah_baris_lp"]'),out=tr.querySelector('[data-cq-pct-lock]')||tr.querySelector('[data-formula="persentase"]');if(out)out.textContent=pct(a?.value,b?.value)}
function lock(root=document){
  root.querySelectorAll?.('input[data-key="persentase"],textarea[data-key="persentase"]').forEach(input=>{
    const tr=input.closest('tr'),d=document.createElement('div');d.className='gp-formula cq-pct-lock';d.dataset.cqPctLock='1';d.dataset.formula='persentase';d.title='Otomatis: Jumlah Baris ÷ Jumlah Baris LP × 100';d.style.cssText='min-width:100px;padding:8px;border:1px solid #d9e0e5;border-radius:6px;background:#eef2f5;color:#445;font-weight:800;text-align:center;user-select:none;pointer-events:none';input.replaceWith(d);calc(tr);
  });
  root.querySelectorAll?.('tr').forEach(tr=>{
    if(!tr.querySelector('[data-cq-pct-lock]'))return;
    ['jumlah_baris','jumlah_baris_lp'].forEach(k=>{const x=tr.querySelector(`[data-key="${k}"]`);if(x&&!x.dataset.cqPctBound){x.dataset.cqPctBound='1';x.addEventListener('input',()=>calc(tr));x.addEventListener('change',()=>calc(tr))}});calc(tr);
  });
}
lock();
const ob=new MutationObserver(m=>{for(const x of m)for(const n of x.addedNodes)if(n.nodeType===1)lock(n)});ob.observe(document.documentElement,{subtree:true,childList:true});
})();