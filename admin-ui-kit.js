/* CQlass — Admin UI kit: satu gaya visual untuk semua halaman admin.
   Hanya aktif saat body memiliki kelas cq-admin-ui (dipasang oleh admin-sidebar-clean.js untuk role admin). */
(function(){
'use strict';
if(document.getElementById('cq-admin-ui-kit'))return;
const R='body.cq-admin-ui #content';
const TITLE=['.av2title','.cqaa2-title','.cqpa-title','.cqarr-title','.ah-title','.iac-title','.cq-rp-admin .page-title','.amtitle'];
const SUB=['.av2sub','.av2hint','.amnote','.cqaa2-muted','.cqarr-sub','.cqpa-sub','.iac-section-sub','.cq-rp-help','.asehint','.ah-note','.cq-auks-info','.asainfo'];
const CARD=['.av2card','.amcard','.cqaa2-card','.cqaa2-panel','.asecard','.ah-card','.cqpa-card','.iac-card','.cqarr-card','.cq-auks-card','.cq-rp-admin .card','#content>.card','.asawrap>.card'];
const BTN=['.av2btn','.av2add','.ambtn','.cqaa2-btn','.asebtn','.ah-btn','.cqpa-btn','.iac-btn','.cqarr-btn','.cq-auks-btn','.asabtn','.cq-rp-admin .btn'];
const INPUT=['.av2in','.av2sel','.av2search','.amin','.amsel','.cqaa2-field input','.cqaa2-field select','.asefield input','.asefield select','.ah-in','.iac-input','.iac-select','.cq-rp-control','.asain','.cq-auks-field input','.cq-auks-field select'];
const TABLE=['.av2table','.amtable','.cqaa2-table','.asetable','.ah-table','.cqarr-table','.asatable','.iac-card table'];
const sel=(list,suffix='')=>list.map(x=>`${R} ${x}${suffix}`).join(',');
const NOCHK=':not([type=checkbox]):not([type=radio])';
const s=document.createElement('style');s.id='cq-admin-ui-kit';
s.textContent=`
${R}{color:#123634}
${sel(TITLE)}{font-size:clamp(21px,2.3vw,25px)!important;font-weight:800!important;letter-spacing:-.02em!important;color:#123634!important;line-height:1.2!important}
${sel(SUB)}{font-size:12px!important;line-height:1.55!important;color:#5f7775!important}
${sel(CARD)}{background:#fff!important;border:1px solid #dbe8e6!important;border-radius:18px!important;box-shadow:0 6px 22px rgba(10,80,76,.05)!important}
${sel(BTN)}{min-height:38px!important;border-radius:10px!important;font-weight:700!important;font-size:12.5px!important;padding-left:14px!important;padding-right:14px!important;transition:filter .15s,background .15s!important;cursor:pointer}
${sel(BTN,':hover:not(:disabled)')}{filter:brightness(1.06)}
${sel(BTN,':disabled')}{opacity:.55!important;cursor:not-allowed!important}
${sel(INPUT,NOCHK)}{min-height:40px!important;border:1px solid #cddfdc!important;border-radius:10px!important;background-color:#fff!important;font-size:13px!important;color:#123634!important;transition:border-color .15s,box-shadow .15s!important}
${sel(INPUT,NOCHK+':focus')}{outline:0!important;border-color:#0c8a7c!important;box-shadow:0 0 0 3px rgba(12,138,124,.15)!important}
${R} textarea:is(.av2in,.amin,.ah-in,.iac-input,.asain),${R} .cqaa2-field textarea{min-height:84px!important;border-radius:10px!important;border:1px solid #cddfdc!important}
${sel(TABLE)}{border-collapse:separate!important;border-spacing:0!important;width:100%}
${sel(TABLE,' th')}{background:#f4f8f8!important;color:#5f7775!important;font-size:10.5px!important;font-weight:800!important;letter-spacing:.07em!important;text-transform:uppercase!important;padding:11px 14px!important;border-bottom:1px solid #e1eceb!important;text-align:left}
${sel(TABLE,' td')}{padding:11px 14px!important;border-bottom:1px solid #edf3f3!important;font-size:13px!important;vertical-align:middle}
${sel(TABLE,' tbody tr:hover td')}{background:#f8fbfb!important}
${sel(TABLE,' tbody tr:last-child td')}{border-bottom:0!important}
${R} :is(.av2wrap,.amtablewrap,.asewrap,.ah-wrap,.asatablewrap,.cqarr-scroll){border-radius:14px!important;border:1px solid #e1eceb!important;overflow:auto!important}
${R} :is(.av2pill,.ampill,.cqaa2-chip,.cqarr-pill,.asachip,.cq-auks-chip){border-radius:999px!important;font-weight:700!important}
`;
(document.head||document.documentElement).appendChild(s);
})();
