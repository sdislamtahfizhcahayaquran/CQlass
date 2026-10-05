/* CQlass — Download Data Kabid Akademik
   Satu page resmi: Nilai, RPP & LP, Bilingual. */
(function(){
'use strict';
if(window.__CQ_ACADEMIC_DOWNLOAD_DATA__)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function css(){if(document.getElementById('cq-ak-download-css'))return;const s=document.createElement('style');s.id='cq-ak-download-css';s.textContent=`
.akdl{max-width:1250px;margin:auto}.akdl-head{margin-bottom:16px}.akdl-head h1{margin:0;color:#123f3d;font-size:26px}.akdl-head p{color:#6d817e;font-size:12px;margin:5px 0 0}
.akdl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.akdl-card{background:#fff;border:1px solid #dce9e6;border-radius:16px;padding:18px;display:flex;flex-direction:column;min-height:245px}
.akdl-card h2{font-size:17px;margin:0 0 6px;color:#154b46}.akdl-card p{font-size:11px;color:#71817f;line-height:1.55;margin:0}.akdl-list{margin:14px 0 18px;padding:0;list-style:none;font-size:11px;color:#405d58}.akdl-list li{padding:5px 0;border-bottom:1px solid #eef3f2}
.akdl-actions{margin-top:auto;display:flex;gap:7px;flex-wrap:wrap}.akdl-btn{border:1px solid #c9dfdb;border-radius:9px;padding:9px 12px;background:#fff;color:#0d7168;font-weight:800;font-size:11px;cursor:pointer}.akdl-btn.primary{background:#0c7b70;color:#fff;border-color:#0c7b70}.akdl-note{margin-top:14px;background:#eef7f5;border-radius:12px;padding:12px;font-size:10.5px;color:#58716d}
@media(max-width:850px){.akdl-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function go(id){if(typeof setActiveModule==='function')setActiveModule(id)}
function notReady(kind){if(typeof showToast==='function')showToast('Generator Excel '+kind+' sedang disiapkan dari data aktif CQlass.',true)}
window.renderAcademicDownloadData=function(c){css();c.innerHTML=`
<div class="akdl"><div class="akdl-head"><h1>Download Data Akademik</h1><p>Unduh data akademik siap laporan. Setiap workbook memuat Ringkasan, Grafik, dan data detail.</p></div>
<div class="akdl-grid">
<section class="akdl-card"><h2>Nilai</h2><p>Legger nilai Semester 1 TA 2026/2027.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik capaian nilai</li><li>1 sheet = 1 kelas</li><li>Detail nilai siswa per mata pelajaran</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="leger">Buka Nilai</button><button class="akdl-btn primary" data-dl="Nilai">Download Excel</button></div></section>
<section class="akdl-card"><h2>RPP &amp; LP</h2><p>Rekap kelengkapan dokumen pembelajaran guru.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik progres kelengkapan</li><li>Detail guru · mapel · kelas</li><li>Status dan kesesuaian RPP ↔ LP</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="rpp-lp-akademik">Buka RPP &amp; LP</button><button class="akdl-btn primary" data-dl="RPP & LP">Download Excel</button></div></section>
<section class="akdl-card"><h2>Bilingual</h2><p>Rekap perkembangan program vocabulary bilingual.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik progres/capaian</li><li>Detail per kelas dan periode</li><li>Perbandingan target dan capaian</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="bilingual">Buka Bilingual</button><button class="akdl-btn primary" data-dl="Bilingual">Download Excel</button></div></section>
</div><div class="akdl-note"><b>Format wajib:</b> seluruh hasil download memiliki Ringkasan + Grafik + Detail. Nilai menggunakan struktur Legger dengan satu sheet untuk setiap kelas.</div></div>`;
c.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
c.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>notReady(b.dataset.dl));
};
window.__CQ_ACADEMIC_DOWNLOAD_DATA__=true;
})();