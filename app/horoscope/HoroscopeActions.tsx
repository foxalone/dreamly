'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Share2, RefreshCw, Check } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
import { horoscopeDesign } from '@/lib/i18n/horoscope-design';
import { trackEvent } from '@/lib/analytics';

export function RefreshReading({locale}:{locale:Locale}) {
  const router=useRouter(), [pending,start]=useTransition(), t=horoscopeDesign[locale];
  return <button className="hc-button" type="button" disabled={pending} onClick={()=>start(()=>router.refresh())}><RefreshCw size={16} aria-hidden/>{pending?t.refreshing:t.refresh}</button>;
}
export function ShareForecast({locale,url,name,date}:{locale:Locale;url:string;name:string;date:string}) {
  const t=horoscopeDesign[locale], [status,setStatus]=useState<'copied'|'error'|null>(null);
  const copy=async()=>{try{await navigator.clipboard.writeText(url);setStatus('copied');trackEvent('horoscope_share',{locale,method:'copy'});}catch{setStatus('error');}};
  const share=async()=>{
    if (!navigator.share) { await copy(); return; }
    try {await navigator.share({title:name,text:t.shareText.replace('{sign}',name).replace('{date}',date),url});trackEvent('horoscope_share',{locale,method:'native'});}
    catch(error){if(!(error instanceof Error && error.name==='AbortError')) await copy();}
  };
  return <div className="hc-share-actions"><div className="hc-button-row"><button type="button" className="hc-button hc-button-gold" onClick={share}><Share2 size={17} aria-hidden/>{t.shareAction}</button><button type="button" className="hc-button" onClick={copy}>{status==='copied'?<Check size={17} aria-hidden/>:<Copy size={17} aria-hidden/>}{status==='copied'?t.copied:t.copy}</button></div><p role="status" className="hc-share-status">{status==='error'?<>{t.shareError} <a href={url}>{url}</a></>:status==='copied'?t.copied:null}</p></div>;
}
