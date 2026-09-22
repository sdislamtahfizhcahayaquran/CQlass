// CQlass Timesheet loader V2
(function(){
  function add(src,id){
    if(document.getElementById(id)) return;
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    document.head.appendChild(s);
  }
  add('teacher-timesheet-v2.js?v=20260922-saturday-workday1','cq-ts-v2');
  add('timesheet-recurring.js?v=20260922-recurring2','cq-ts-recurring');
  add('timesheet-ui-polish.js?v=20260922-polish1','cq-ts-ui-polish');
  add('admin-timesheet-master.js?v=20260922-hrd-saturday1','cq-ts-admin-master');
  add('timesheet-saturday-manual.js?v=20260922-priority1','cq-ts-saturday-manual');
})();