(function(){
  ['internal-report-center.js?v=20260911-sapras-dashboard1','kesiswaan-points-recap.js?v=20260915-2'].forEach(function(src){
    var s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  });
})();