(function(){
  [
    'internal-report-center.js?v=20260911-sapras-dashboard1',
    'kesiswaan-points-recap.js?v=20260915-3',
    'extracurricular-raw-ui.js?v=20260916-raw2',
    'kegiatan-exkul-capacity.js?v=20260916-exkul4'
  ].forEach(function(src){
    var s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  });
})();