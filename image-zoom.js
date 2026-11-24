/* CQlass global image zoom: klik foto apa pun -> lightbox dengan zoom (scroll, pinch, double-click, tombol +/-) dan geser (drag).
   Opt-out: beri atribut data-no-zoom pada <img> atau elemen induknya. */
(function(){
  if(window.__cqImageZoom)return;window.__cqImageZoom=true;
  var MIN=1,MAX=8;
  var SKIP_SRC=/(logo|wordmark|kop|footer|header|icon|favicon|login-bg|gedung)/i;
  var SKIP_PARENT='[data-no-zoom],button,label,select,#sidebar,.sidebar,.topbar,header,nav,.rpv-paper,.srp-page,.cv-page,.cq-izoom,[contenteditable="true"]';

  var css='.cq-izoom{position:fixed;inset:0;z-index:2147483000;background:rgba(10,14,20,.92);display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;animation:cqizIn .15s ease}'+
  '@keyframes cqizIn{from{opacity:0}to{opacity:1}}'+
  '.cq-izoom img{max-width:94vw;max-height:86vh;object-fit:contain;transform-origin:0 0;will-change:transform;cursor:grab;box-shadow:0 10px 40px rgba(0,0,0,.5);border-radius:4px;background:#fff}'+
  '.cq-izoom.drag img{cursor:grabbing}'+
  '.cq-izoom-bar{position:fixed;top:12px;right:12px;display:flex;gap:6px;z-index:2}'+
  '.cq-izoom-bar button,.cq-izoom-bar a{width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font:600 20px/40px system-ui,sans-serif;text-align:center;cursor:pointer;text-decoration:none;padding:0;display:inline-block}'+
  '.cq-izoom-bar button:hover,.cq-izoom-bar a:hover{background:rgba(255,255,255,.28)}'+
  '.cq-izoom-pct{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.45);padding:4px 12px;border-radius:999px;font:600 12px system-ui,sans-serif;z-index:2}'+
  '.cq-izoom-hint{opacity:.75;font-weight:400;margin-left:8px}'+
  'img.cq-izoomable{cursor:zoom-in}';
  function addCss(){if(document.getElementById('cq-izoom-css'))return;var s=document.createElement('style');s.id='cq-izoom-css';s.textContent=css;(document.head||document.documentElement).appendChild(s)}

  function zoomable(img){
    if(!img||img.tagName!=='IMG')return false;
    var src=img.currentSrc||img.src||'';if(!src)return false;
    if(img.closest(SKIP_PARENT))return false;
    if(SKIP_SRC.test(src.split('?')[0].split('/').pop()))return false;
    if(/^data:image\/svg/i.test(src))return false;
    var r=img.getBoundingClientRect();
    if(r.width<36||r.height<36)return false;
    if(img.naturalWidth&&img.naturalWidth<48&&img.naturalHeight<48)return false;
    return true;
  }

  var box,im,pct,s=1,tx=0,ty=0,bw=0,bh=0,bx=0,by=0;
  function apply(){
    if(s<=MIN+0.001)s=MIN;
    // geser bebas, tapi sisakan minimal 80px foto di layar agar tidak hilang
    var w=bw*s,h=bh*s,m=Math.min(80,w/2,h/2);
    tx=Math.min(innerWidth-m-bx,Math.max(m-w-bx,tx));
    ty=Math.min(innerHeight-m-by,Math.max(m-h-by,ty));
    im.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')';
    box.classList.toggle('zoomed',s>MIN);
    pct.firstChild.nodeValue=Math.round(s*100)+'%';
  }
  function zoomAt(ns,cx,cy){
    ns=Math.max(MIN,Math.min(MAX,ns));
    // titik layar (cx,cy) tetap di bawah kursor
    var lx=(cx-bx-tx)/s,ly=(cy-by-ty)/s;
    s=ns;tx=cx-bx-lx*s;ty=cy-by-ly*s;apply();
  }
  function measure(){im.style.transform='none';var r=im.getBoundingClientRect();bw=r.width;bh=r.height;bx=r.left;by=r.top;apply()}

  function close(){if(!box)return;box.remove();box=null;document.removeEventListener('keydown',onKey,true);document.documentElement.style.overflow=prevOverflow}
  var prevOverflow='';
  function onKey(e){
    if(!box)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
    else if(e.key==='+'||e.key==='='){zoomAt(s*1.4,innerWidth/2,innerHeight/2)}
    else if(e.key==='-'){zoomAt(s/1.4,innerWidth/2,innerHeight/2)}
    else if(e.key==='0'){s=1;tx=0;ty=0;apply()}
  }

  function open(src,alt){
    addCss();close();
    s=1;tx=0;ty=0;
    box=document.createElement('div');box.className='cq-izoom';box.setAttribute('role','dialog');box.setAttribute('aria-label','Perbesar foto');
    box.innerHTML='<div class="cq-izoom-bar"><button type="button" data-a="in" title="Perbesar (+)">+</button><button type="button" data-a="out" title="Perkecil (-)">&minus;</button><button type="button" data-a="reset" title="Ukuran asli (0)">&#8634;</button><a data-a="open" target="_blank" rel="noopener noreferrer" title="Buka di tab baru">&#8599;</a><button type="button" data-a="close" title="Tutup (Esc)">&times;</button></div><img alt=""><div class="cq-izoom-pct">100%<span class="cq-izoom-hint">scroll / cubit untuk zoom · tekan &amp; seret untuk geser</span></div>';
    im=box.querySelector('img');pct=box.querySelector('.cq-izoom-pct');
    im.alt=alt||'';im.draggable=false;box.addEventListener('dragstart',function(e){e.preventDefault()});im.referrerPolicy='no-referrer';
    var link=box.querySelector('[data-a=open]');
    if(/^(https?:|blob:)/i.test(src))link.href=src;else link.style.display='none';
    im.onload=measure;im.src=src;
    document.body.appendChild(box);
    prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    if(im.complete&&im.naturalWidth)measure();
    document.addEventListener('keydown',onKey,true);

    box.querySelector('.cq-izoom-bar').addEventListener('click',function(e){
      var a=e.target.closest('[data-a]');if(!a)return;var k=a.getAttribute('data-a');
      if(k==='open')return;e.preventDefault();
      if(k==='in')zoomAt(s*1.5,innerWidth/2,innerHeight/2);
      else if(k==='out')zoomAt(s/1.5,innerWidth/2,innerHeight/2);
      else if(k==='reset'){s=1;tx=0;ty=0;apply()}
      else close();
    });
    box.addEventListener('wheel',function(e){e.preventDefault();zoomAt(s*Math.exp(-e.deltaY*0.0018),e.clientX,e.clientY)},{passive:false});
    im.addEventListener('dblclick',function(e){e.preventDefault();if(s>1.05){s=1;tx=0;ty=0;apply()}else zoomAt(2.5,e.clientX,e.clientY)});

    // pointer: drag (1 jari / mouse) + pinch (2 jari)
    var pts={},moved=false,startD=0,startS=1,last=null,downOnImg=false,sx=0,sy=0;
    box.addEventListener('pointerdown',function(e){
      if(e.target.closest('.cq-izoom-bar'))return;
      pts[e.pointerId]={x:e.clientX,y:e.clientY};moved=false;downOnImg=e.target===im;sx=e.clientX;sy=e.clientY;
      try{box.setPointerCapture(e.pointerId)}catch(_){}
      var k=Object.keys(pts);
      if(k.length===2){var a=pts[k[0]],b=pts[k[1]];startD=Math.hypot(a.x-b.x,a.y-b.y);startS=s}
      last={x:e.clientX,y:e.clientY};
    });
    box.addEventListener('pointermove',function(e){
      if(!pts[e.pointerId])return;
      pts[e.pointerId]={x:e.clientX,y:e.clientY};
      var k=Object.keys(pts);
      if(k.length>=2){
        var a=pts[k[0]],b=pts[k[1]],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(startD>0)zoomAt(startS*d/startD,(a.x+b.x)/2,(a.y+b.y)/2);moved=true;
      }else if(last){
        var dx=e.clientX-last.x,dy=e.clientY-last.y;
        if(!moved&&Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>4)moved=true;
        if(moved){tx+=dx;ty+=dy;box.classList.add('drag');apply();last={x:e.clientX,y:e.clientY}}
      }
    });
    function up(e){
      var wasTap=!moved&&Object.keys(pts).length===1;
      delete pts[e.pointerId];box&&box.classList.remove('drag');
      var k=Object.keys(pts);last=k.length?pts[k[0]]:null;
      if(wasTap&&!downOnImg&&e.type==='pointerup')close(); // ketuk area gelap = tutup
    }
    box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
    addEventListener('resize',function onR(){if(!box){removeEventListener('resize',onR);return}s=1;tx=0;ty=0;measure()});
  }
  window.cqOpenImageZoom=open;

  // tandai kursor zoom-in pada foto yang bisa diperbesar
  document.addEventListener('mouseover',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&!t.classList.contains('cq-izoomable')&&zoomable(t)){addCss();t.classList.add('cq-izoomable')}},true);

  // klik foto -> buka zoom (fase capture agar mendahului link target=_blank / onclick lama)
  document.addEventListener('click',function(e){
    if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey)return;
    var t=e.target;
    var img=t&&t.tagName==='IMG'?t:null;
    if(!img){ // klik di kartu foto <a href=foto><img>…</a>
      var a=t&&t.closest&&t.closest('a[href]');
      if(a&&(a.target==='_blank'||/\.(jpe?g|png|webp|gif|bmp|avif)(\?|#|$)/i.test(a.getAttribute('href')))){var inner=a.querySelector('img');if(inner&&a.querySelectorAll('img').length===1)img=inner}
    }
    if(!img||!zoomable(img))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    var a2=img.closest('a[href]'),href=a2&&a2.getAttribute('href');
    var src=href&&/\.(jpe?g|png|webp|gif|bmp|avif)(\?|#|$)/i.test(href)?a2.href:(img.currentSrc||img.src);
    open(src,img.alt);
  },true);
})();
