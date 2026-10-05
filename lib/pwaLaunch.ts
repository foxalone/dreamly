/** Runs before first paint. Only installed-app entry routes get the welcome. */
export const PWA_LAUNCH_SCRIPT = `(function(){try{
  var installed=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
  var path=location.pathname.replace(/^\\/(es|ar|pt|de|ru)(?=\\/|$)/,'')||'/';
  if(!installed||!/^\\/(?:app(?:\\/dreams)?\\/?)?$/.test(path)||location.search||location.hash)return;
  var index=Math.floor(Math.random()*3);
  try{var previous=localStorage.getItem('dreamly:launch-art');if(previous!==null&&/^[0-2]$/.test(previous))index=(Number(previous)+1)%3;localStorage.setItem('dreamly:launch-art',String(index));}catch(e){}
  var root=document.documentElement;
  root.setAttribute('data-pwa-launch',String(index));
  root.setAttribute('data-pwa-launch-start',String(Date.now()));
}catch(e){}})();`;
