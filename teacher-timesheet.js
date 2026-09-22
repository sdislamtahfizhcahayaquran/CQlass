// CQlass Timesheet loader V4 — access guard first, deterministic order, UI polish last
(function(){
  function add(src,id){
    return new Promise(function(resolve){
      var old=document.getElementById(id);
      if(old){resolve();return;}
      var s=document.createElement('script');
      s.id=id;
      s.src=src;
      s.onload=function(){resolve()};
      s.onerror=function(){console.warn('Timesheet module gagal dimuat:',src);resolve()};
      document.head.appendChild(s);
    });
  }

  (async function(){
    await add('timesheet-access-fix.js?v=20260922-access1','cq-ts-access-fix');
    await add('teacher-timesheet-v2.js?v=20260922-layout3','cq-ts-v2');
    await add('timesheet-recurring.js?v=20260922-layout4','cq-ts-recurring');
    await add('admin-timesheet-master.js?v=20260922-layout3','cq-ts-admin-master');
    await add('timesheet-saturday-manual.js?v=20260922-layout3','cq-ts-saturday-manual');
    await add('timesheet-ui-polish.js?v=20260922-polish3','cq-ts-ui-polish');
    await add('timesheet-ui-order-fix.js?v=20260922-order2','cq-ts-ui-order-fix');
  })();
})();