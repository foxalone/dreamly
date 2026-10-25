'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogIn, Play, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithOptions } from '@/lib/auth/signInWithOptions';
import { ensureUserProfileOnSignIn } from '@/lib/auth/ensureUserProfile';
import { clearOfferwallEntitlement } from '@/lib/adUnlock';
import { localePath } from '@/lib/i18n/path';
import type { Locale } from '@/lib/i18n/config';
import type { Sign } from '@/lib/horoscope/model';
import type { AccessInfo } from '@/lib/horoscope/access';
import { horoscopeAccess } from '@/lib/i18n/horoscope-access';
export function HoroscopeAccess({locale,sign,sessionOnly=false}:{locale:Locale;sign:Sign;sessionOnly?:boolean}){
  const router=useRouter(),t=horoscopeAccess[locale];
  const [user,setUser]=useState<User|null|undefined>(undefined),[info,setInfo]=useState<AccessInfo|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[cycle,setCycle]=useState(0);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  useEffect(()=>{
    if(user===undefined)return;
    let cancelled=false;
    void (async()=>{
      const headers:Record<string,string>={};if(user)headers.Authorization=`Bearer ${await user.getIdToken()}`;
      const response=await fetch(`/api/horoscope/access?sign=${sign}&locale=${locale}`,{headers,cache:'no-store'});
      if(!response.ok)throw new Error('Access');
      const data=await response.json() as AccessInfo;
      if(cancelled)return;
      setInfo(data);setError(false);if(data.unlocked!==sessionOnly)router.refresh();
    })().catch(()=>{if(!cancelled)setError(true);});
    return()=>{cancelled=true;};
  },[user,sign,locale,router,sessionOnly,cycle]);
  async function perform(ad:boolean,account=user){
    if(busy)return;setBusy(true);setError(false);
    try{
      const headers:Record<string,string>={'Content-Type':'application/json','x-horoscope-request':'1'};
      if(account)headers.Authorization=`Bearer ${await account.getIdToken()}`;
      const response=await fetch(ad?'/api/horoscope/ad':'/api/horoscope/access',{method:'POST',headers,body:JSON.stringify({sign,locale,...(ad?{action:'start'}:{})})});
      if(!response.ok){if(response.status===402){setInfo(old=>old?{...old,freeLeft:0}:old);return;}if(response.status===409){router.refresh();return;}throw new Error('Access');}
      const result=await response.json();
      if(ad){
        clearOfferwallEntitlement();
        const params=new URLSearchParams({kind:'horoscope',challenge:result.challenge,next:localePath(`/horoscope/${sign}`,locale),locale});
        window.location.assign(`/ad/unlock?${params}`);return;
      }
      // An unlocked sign remains available even if generation must be retried.
      await fetch('/api/horoscope/request',{method:'POST',headers,body:JSON.stringify({sign,locale})});
      router.refresh();
    }catch{setError(true);}finally{setBusy(false);}
  }
  async function signIn(){
    if(busy)return;setBusy(true);setError(false);
    try{const result=await signInWithOptions();if(result)await ensureUserProfileOnSignIn(result.user);}
    catch(e){if((e as {code?:string}).code!=='auth/popup-closed-by-user')setError(true);}
    finally{setBusy(false);}
  }
  if(sessionOnly)return null;
  const guest=user==null,free=!!user&&!!info&&info.freeLeft>0;
  return <div aria-busy={busy}>
    <p>{guest?t.guest:info?free?(info.tier==='paid'?t.paid:t.member):t.limit:t.busy}</p>
    <div className="hc-button-row">
      {guest?<button type="button" className="hc-button" disabled={busy||user===undefined} onClick={()=>void signIn()}><LogIn size={16} aria-hidden/>{t.signIn}</button>:null}
      <button type="button" className="hc-button hc-button-gold" disabled={busy||user===undefined||(!guest&&!info)} onClick={()=>void perform(!free)}>{free?<Sparkles size={16} aria-hidden/>:<Play size={16} aria-hidden/>}{busy?t.busy:free?t.open:t.ad}</button>
    </div>
    {error?<><p role="alert">{t.error}</p>{!info?<button type="button" className="hc-button" onClick={()=>{setError(false);setCycle(value=>value+1);}}>{t.retry}</button>:null}</>:null}
  </div>;
}
