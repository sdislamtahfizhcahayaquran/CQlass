(function(){
  window.__CQ_ATTENDANCE_RECAP_MODE_LEGACY_DISABLED__=true;
  if(document.querySelector('script[data-cq-profile-photo]')) return;
  var s=document.createElement('script');
  s.src='profile-photo.js?v=20260907-profile1';
  s.dataset.cqProfilePhoto='1';
  document.body.appendChild(s);
})();