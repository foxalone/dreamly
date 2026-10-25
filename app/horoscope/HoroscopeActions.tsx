'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Share2, RefreshCw, Check } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
import { horoscopeDesign } from '@/lib/i18n/horoscope-design';
import { trackEvent } from '@/lib/analytics';
import { horoscopeJobs } from '@/lib/i18n/horoscope-jobs';
import type { Sign } from '@/lib/horoscope/model';
import type { PublicStatus } from '@/lib/horoscope/jobs';
import { watchReading } from '@/lib/horoscope/polling';
import { ForecastWaiting } from './CosmicForecast';

export function RefreshReading({locale,sign,day}:{locale:Locale;sign:Sign;day:string}) {
  const router = useRouter(), [, start] = useTransition(), copy = horoscopeJobs[locale];
  const [phase, setPhase] = useState<PublicStatus['status'] | 'timedOut' | 'unavailable' | 'rateLimited'>('missing');
  const [checking, setChecking] = useState(true), [cycle, setCycle] = useState(0), [canRetry, setCanRetry] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const stop = watchReading(async () => {
      const response = await fetch(`/api/horoscope/request?sign=${sign}&locale=${locale}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Unavailable');
      return response.json() as Promise<PublicStatus>;
    }, {
      day,
      update: status => { setPhase(status.status); setCanRetry(!!status.canRetry); setChecking(false); },
      ready: () => { setChecking(false); setPhase('ready'); start(() => router.refresh()); },
      timedOut: () => { setPhase('timedOut'); setChecking(false); },
      unavailable: () => { setPhase('unavailable'); setChecking(false); },
    });
    return () => { stop(); controller.abort(); };
  }, [day, sign, locale, router, cycle]);
  useEffect(() => () => requestController.current?.abort(), []);
  const request = async () => {
    if (checking) return;
    setChecking(true); setPhase('queued'); setCanRetry(false);
    const controller = new AbortController(); requestController.current = controller;
    try {
      const response = await fetch('/api/horoscope/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-horoscope-request': '1' }, body: JSON.stringify({ sign, locale }), signal: controller.signal });
      if (!response.ok) { setPhase(response.status === 429 ? 'rateLimited' : 'unavailable'); setChecking(false); return; }
      const result = await response.json() as PublicStatus;
      if (result.day !== day || result.status === 'ready') { setChecking(false); setPhase('ready'); start(() => router.refresh()); return; }
      setPhase(result.status); setCanRetry(!!result.canRetry); setChecking(false); setCycle(value => value + 1);
    } catch { if (!controller.signal.aborted) { setPhase('unavailable'); setChecking(false); } }
  };
  const active = phase === 'queued' || phase === 'processing' || phase === 'retrying';
  const enqueue = phase === 'missing' || phase === 'unavailable' || (phase === 'retrying' && canRetry);
  const message = phase === 'missing' || phase === 'ready' ? null : copy[phase as keyof typeof copy];
  return <ForecastWaiting active={phase==='queued'||phase==='processing'} busy={checking || active} message={message??undefined}>
    <button className="hc-button" type="button" disabled={checking || (active && !canRetry)} onClick={() => {
      if (enqueue) void request(); else { setChecking(true); setCycle(value => value + 1); }
    }}><RefreshCw size={16} aria-hidden/>{phase==='missing'?copy.start:checking?horoscopeDesign[locale].refreshing:enqueue?copy.retry:copy.check}</button>
  </ForecastWaiting>;
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
