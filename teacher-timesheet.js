// CQlass Timesheet loader V2
(function(){
  function add(src,id){
    if(document.getElementById(id)) return;
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    document.head.appendChild(s);
  }
  add('teacher-timesheet-v2.js?v=20260908-tsv2','cq-ts-v2');
  add('admin-timesheet-master.js?v=20260908-atsm1','cq-ts-admin-master');
})();
