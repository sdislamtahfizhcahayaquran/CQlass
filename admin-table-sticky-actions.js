/* CQlass Admin table UX
   Keeps action/edit controls reachable on wide tables and save/cancel reachable while editing.
*/
(function(){
'use strict';
if(window.__CQ_ADMIN_TABLE_STICKY_V1__)return;
window.__CQ_ADMIN_TABLE_STICKY_V1__=true;

function role(){try{return String((window.currentUser&&window.currentUser.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'').toLowerCase()}catch(e){return''}}
function isAdmin(){return role()==='admin'}
function addStyle(){if(document.getElementById('cq-admin-sticky-style'))return;var s=document.createElement('style');s.id='cq-admin-sticky-style';s.textContent=`
body.cq-admin-ux #content table{border-collapse:separate;border-spacing:0}
body.cq-admin-ux #content .cq-table-scroll{overflow:auto;max-width:100%;-webkit-overflow-scrolling:touch;position:relative}
body.cq-admin-ux #content table th:last-child.cq-action-col,
body.cq-admin-ux #content table td:last-child.cq-action-col{position:sticky;right:0;z-index:3;background:#fff;box-shadow:-7px 0 10px -10px rgba(15,23,42,.45);white-space:nowrap}
body.cq-admin-ux #content table thead th:last-child.cq-action-col{z-index:5;background:#f8fafc}
body.cq-admin-ux #content table thead th{position:sticky;top:0;z-index:2}
body.cq-admin-ux #content table thead th.cq-action-col{z-index:6}
body.cq-admin-ux #content .cq-sticky-form-actions{position:sticky!important;bottom:8px!important;z-index:40!important;background:rgba(255,255,255,.96)!important;padding:10px 12px!important;border:1px solid #e5e7eb!important;border-radius:12px!important;box-shadow:0 8px 24px rgba(15,23,42,.12)!important;backdrop-filter:blur(8px);display:flex!important;gap:8px!important;justify-content:flex-end!important}
@media(max-width:760px){body.cq-admin-ux #content table{min-width:max-content}body.cq-admin-ux #content table th,body.cq-admin-ux #content table td{max-width:260px}body.cq-admin-ux #content .cq-sticky-form-actions{bottom:6px!important;margin-left:0!important;margin-right:0!important}}
`;document.head.appendChild(s)}
function text(el){return String(el&&el.textContent||'').trim().toLowerCase()}
function actionLike(cell){if(!cell)return false;var t=text(cell);return /aksi|action/.test(t)||!!cell.querySelector('button,[onclick],a.btn,.btn')}
function wrapTable(table){if(table.closest('.cq-table-scroll'))return;var p=table.parentElement;if(!p)return;var w=document.createElement('div');w.className='cq-table-scroll';p.insertBefore(w,table);w.appendChild(table)}
function enhanceTable(table){if(table.dataset.cqStickyDone==='1')return;var rows=table.rows;if(!rows||!rows.length)return;var head=table.tHead&&table.tHead.rows.length?table.tHead.rows[table.tHead.rows.length-1]:rows[0];var last=head&&head.cells&&head.cells[head.cells.length-1];if(!last)return;var hasAction=actionLike(last);if(!hasAction){for(var i=1;i<Math.min(rows.length,6);i++){var c=rows[i].cells[rows[i].cells.length-1];if(actionLike(c)){hasAction=true;break}}}
wrapTable(table);if(hasAction){for(var r=0;r<rows.length;r++){var cell=rows[r].cells[rows[r].cells.length-1];if(cell)cell.classList.add('cq-action-col')}}table.dataset.cqStickyDone='1'}
function enhanceForms(root){var candidates=root.querySelectorAll('form, #cq-role-form, .modal-box, .card');candidates.forEach(function(box){if(box.dataset.cqStickyActions==='1')return;var buttons=Array.from(box.querySelectorAll('button')).filter(function(b){var t=text(b);return /^(simpan|save|batal|cancel)|simpan | simpan$/.test(t)});if(!buttons.some(function(b){return /^simpan|^save/.test(text(b))}))return;var groups=new Map();buttons.forEach(function(b){var p=b.parentElement;if(!p)return;groups.set(p,(groups.get(p)||0)+1)});var target=null,max=0;groups.forEach(function(n,p){if(n>max){max=n;target=p}});if(target){target.classList.add('cq-sticky-form-actions');box.dataset.cqStickyActions='1'}})}
function run(){if(!isAdmin())return;document.body.classList.add('cq-admin-ux');addStyle();var c=document.getElementById('content');if(!c)return;c.querySelectorAll('table').forEach(enhanceTable);enhanceForms(c)}
var timer=0;function queue(){clearTimeout(timer);timer=setTimeout(run,40)}
document.addEventListener('DOMContentLoaded',function(){run();var c=document.getElementById('content');if(c)new MutationObserver(queue).observe(c,{childList:true,subtree:true})});
window.addEventListener('load',run);
})();
