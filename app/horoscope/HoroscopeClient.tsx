'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
import { trackEvent } from '@/lib/analytics';
import { isSign, SIGNS, SYMBOLS, utcDay, type Sign } from '@/lib/horoscope/model';
import { horoscopeCopy } from '@/lib/i18n/horoscope';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import './horoscope.css';
import { localePath, stripLocalePrefix } from '@/lib/i18n/path';

const KEY = 'dreamly_zodiac_sign';
export default function HoroscopeClient({ sign, mode = 'horoscope' }: { sign?: Sign; mode?: 'horoscope' | 'profile' }) {
  const locale = useLocale(), t = horoscopeCopy[locale];
  const [preferred, setPreferred] = useState<Sign | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const followingLink = useRef(false);
  const viewed = useRef('');
  const revision = useRef(0);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      try { const local = localStorage.getItem(KEY); if (isSign(local)) setPreferred(local); } catch {}
      const currentRevision = ++revision.current;
      setReady(!user);
      if (!user) return;
      void getDoc(doc(firestore, 'users', user.uid)).then(snapshot => {
        if (currentRevision !== revision.current) return;
        const value = snapshot.data()?.preferredZodiacSign;
        if (isSign(value)) { setPreferred(value); try { localStorage.setItem(KEY, value); } catch {} }
        setReady(true);
      }).catch(() => { if (currentRevision === revision.current) setReady(true); });
    });
    // Invalidate pending profile reads; this ref is a request counter, not a DOM node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++revision.current; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (mode !== 'horoscope') return;
    const key = `${locale}:${sign ?? 'landing'}`;
    if (viewed.current === key) return;
    viewed.current = key;
    // Feature events supplement the single page_view emitted by FirebaseAnalytics.
    trackEvent(sign ? 'horoscope_sign_view' : 'horoscope_landing_view', { locale, sign: sign ?? 'all' });
    try {
      const day = utcDay(), previous = localStorage.getItem('dreamly_horoscope_visit');
      if (previous && previous !== day) trackEvent('horoscope_return_visit', { locale });
      localStorage.setItem('dreamly_horoscope_visit', day);
    } catch {}
  }, [locale, sign, mode]);
  useEffect(() => { followingLink.current = false; }, [sign, locale]);
  useEffect(() => {
    if (mode === 'horoscope' && !sign && ready && preferred && !followingLink.current) {
      router.replace(localePath(`/horoscope/${preferred}`, locale));
    }
  }, [mode, sign, ready, preferred, locale, router]);
  const choose = useCallback((value: Sign) => {
    ++revision.current;
    setPreferred(value); setError(false); setReady(true);
    try { localStorage.setItem(KEY, value); } catch {}
    trackEvent('horoscope_zodiac_select', { sign: value, locale, source: mode });
    const user = auth.currentUser;
    if (user) void setDoc(doc(firestore, 'users', user.uid), { preferredZodiacSign: value }, { merge: true }).catch(() => setError(true));
  }, [locale, mode]);
  useEffect(() => {
    if (mode !== 'horoscope') return;
    const listener = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]');
      if (!anchor) return;
      const url = new URL((anchor as HTMLAnchorElement).href, location.href);
      if (url.origin !== location.origin) return;
      const path = stripLocalePrefix(url.pathname).path;
      const selected = path.split('/')[2];
      if (!sign && !preferred && path.startsWith('/horoscope/') && isSign(selected)) { followingLink.current = true; choose(selected); }
      if (!path.startsWith('/horoscope')) trackEvent('horoscope_exit', { locale, section: path.split('/').filter(Boolean).slice(0,2).join('/') || 'home' });
    };
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
  }, [locale, choose, mode, sign, preferred]);
  // After selection, preference changes belong in the personal profile.
  if (mode === 'horoscope' && (sign || preferred)) return null;
  return <div className={`hc-preference${mode === 'profile' ? ' hc-preference-profile' : ''}`}>
    <label htmlFor="zodiac-preference">{sign || preferred ? t.change : t.choose}</label>
    <select id="zodiac-preference" value={sign ?? preferred ?? ''} disabled={!ready} onChange={event => {
      const value = event.target.value;
      if (!isSign(value)) return;
      choose(value);
    }}>
      <option value="" disabled>{t.choose}</option>
      {SIGNS.map((value,i) => <option key={value} value={value}>{SYMBOLS[i]} {t.signs[value]}</option>)}
    </select>
    {error ? <p role="status">{t.saveError}</p> : null}
  </div>;
}
