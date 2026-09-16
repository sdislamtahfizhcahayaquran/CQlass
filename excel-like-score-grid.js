/* CQlass — Excel-like input untuk Nilai Mapel & Tahfizh. Sel kalkulasi/rumus tidak disentuh. */
(function(){
  'use strict';
  const EDITABLE='input.lg-score-input,input.vc-score-input,input.nilai-input,#tbody input.cell,#tbody select.cell';
  const FORMULA='.lg-calc,.lg-calc-cell,.vc-calc,.vc-total,[data-formula],input[readonly],input[disabled]';
  function ok(el){return el&&el.matches&&el.matches(EDITABLE)&&!el.matches(FORMULA)&&!el.readOnly&&!el.disabled;}
  function grid(el){const table=el.closest('table');if(!table)return null;const rows=[...table.querySelectorAll('tbody tr')];return rows.map(r=>[...r.querySelectorAll(EDITABLE)].filter(ok));}
  function pos(el,g){for(let r=0;r<g.length;r++){const c=g[r].indexOf(el);if(c>=0)return [r,c];}return null;}
  function focusAt(g,r,c){if(r<0||r>=g.length)return;const row=g[r];if(!row.length)return;const x=row[Math.max(0,Math.min(c,row.length-1))];if(x){x.focus();if(x.select)x.select();x.scrollIntoView({block:'nearest',inline:'nearest'});}}
  function setVal(el,v){if(!ok(el))return false;if(el.tagName==='SELECT'){const opts=[...el.options];const hit=opts.find(o=>o.value===v||o.text.trim()===v.trim());if(!hit)return false;el.value=hit.value;}else{if(el.type==='number'&&v!==''){let n=Number(String(v).replace(',','.'));if(!Number.isFinite(n))return false;const min=el.min!==''?Number(el.min):-Infinity,max=el.max!==''?Number(el.max):Infinity;n=Math.max(min,Math.min(max,n));v=String(n);}el.value=v;}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}
  document.addEventListener('keydown',function(e){const el=e.target;if(!ok(el))return;const g=grid(el),p=g&&pos(el,g);if(!p)return;let [r,c]=p;if(e.key==='Enter'){e.preventDefault();focusAt(g,r+(e.shiftKey?-1:1),c);return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;if(el.tagName==='SELECT'&&(e.key==='ArrowUp'||e.key==='ArrowDown'))return;e.preventDefault();if(e.key==='ArrowLeft')c--;if(e.key==='ArrowRight')c++;if(e.key==='ArrowUp')r--;if(e.key==='ArrowDown')r++;focusAt(g,r,c);
  },true);
  document.addEventListener('paste',function(e){const el=e.target;if(!ok(el))return;const text=(e.clipboardData||window.clipboardData)?.getData('text');if(!text||(!text.includes('\t')&&!text.includes('\n')))return;const g=grid(el),p=g&&pos(el,g);if(!p)return;e.preventDefault();const data=text.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(x=>x.split('\t'));let n=0;data.forEach((row,dr)=>row.forEach((v,dc)=>{const target=g[p[0]+dr]?.[p[1]+dc];if(target&&setVal(target,v))n++;}));if(typeof showToast==='function')showToast(n?'Berhasil ditempel':'Tidak ada sel yang diubah');
  },true);
  // Fill/drag sederhana: Alt + drag dari sel sumber ke sel tujuan. Hanya sel editable yang diisi.
  let source=null;
  document.addEventListener('pointerdown',function(e){if(e.altKey&&ok(e.target)){source=e.target;e.target.setPointerCapture?.(e.pointerId);}},true);
  document.addEventListener('pointerup',function(e){if(!source)return;const target=document.elementFromPoint(e.clientX,e.clientY);const dest=target?.closest?.(EDITABLE);if(dest&&ok(dest)){const g=grid(source),a=g&&pos(source,g),b=g&&pos(dest,g);if(a&&b&&a[1]===b[1]){const step=b[0]>=a[0]?1:-1;for(let r=a[0]+step;;r+=step){const x=g[r]?.[a[1]];if(x)setVal(x,source.value);if(r===b[0])break;}}}source=null;},true);
})();