'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import LocaleLink from '@/lib/i18n/LocaleLink';
import { useLocale, useMessages } from '@/lib/i18n/LocaleProvider';
import { stripLocalePrefix } from '@/lib/i18n/path';
import { trackEvent } from '@/lib/analytics';
import styles from './DreamMapGlobe.module.css';
import moonStyles from './moon/MoonGate.module.css';

// Listen to the existing game event without importing its animation implementation.
const BUILDING_PLACED_EVENT = 'dreamly:building-placed';
const CREATURES = ['🦊','🦋','🐢','🦉','🐈','🕊️'];
const HIDDEN = ['/app/map','/moon','/app/game','/signin','/payment-success','/app/profile/admin-dashboard','/app/chat','/app/tiktok-studio','/app/upgrade'];
export default function DreamMapGlobe() {
  const pathname = usePathname() ?? '/', { path } = stripLocalePrefix(pathname);
  const t = useMessages(), locale = useLocale();
  const [blocked, setBlocked] = useState(false), [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const celebrate = () => { setCelebrating(true); clearTimeout(timer); timer = setTimeout(() => setCelebrating(false),5000); };
    window.addEventListener(BUILDING_PLACED_EVENT, celebrate);
    return () => { clearTimeout(timer); window.removeEventListener(BUILDING_PLACED_EVENT,celebrate); };
  }, []);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      const focus = document.activeElement;
      const editing = !!focus?.matches('input,textarea,select,[contenteditable="true"]');
      const globe = document.getElementById('dream-map-globe');
      const bounds = globe?.getBoundingClientRect();
      const overlaps = (rect: DOMRect) => !!bounds && rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top;
      // Dreams autofocuses its textarea. Focus alone must not hide Map access;
      // only an actual collision with the editor (e.g. above a keyboard) should.
      const fieldOverlap = editing && !!focus && overlaps(focus.getBoundingClientRect());
      const obstacle = Array.from(document.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"],[data-floating-obstacle]')).some(element => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || getComputedStyle(element).visibility === 'hidden') return false;
        return element.matches('dialog,[aria-modal="true"],[role="dialog"]') || overlaps(rect);
      });
      setBlocked(fieldOverlap || obstacle || !!document.fullscreenElement);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(check); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['open','aria-hidden','aria-modal','hidden'] });
    observer.observe(document.documentElement, { attributes:true, attributeFilter:['data-pwa-launch'] });
    document.addEventListener('scroll',schedule,{capture:true,passive:true});
    document.addEventListener('focusin',schedule); document.addEventListener('focusout',schedule);
    document.addEventListener('fullscreenchange',schedule); window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('scroll',schedule,true); document.removeEventListener('focusin',schedule); document.removeEventListener('focusout',schedule); document.removeEventListener('fullscreenchange',schedule); window.removeEventListener('resize',schedule); window.visualViewport?.removeEventListener('resize',schedule); };
  }, [pathname]);
  if (HIDDEN.some(prefix => path === prefix || path.startsWith(prefix+'/'))) return null;
  return <LocaleLink id="dream-map-globe" data-horoscope={path.startsWith('/horoscope') || undefined} href="/app/map" className={`${styles.button} ${celebrating ? styles.celebrating : ''}`} style={{ visibility:blocked ? 'hidden' : undefined }} aria-label={t.nav.map} title={t.nav.map} onClick={() => trackEvent('map_globe_click',{ locale, section: path.split('/').filter(Boolean).slice(0,2).join('/') || 'home' })}>
    <span className={styles.orb} aria-hidden><span className={styles.surface} /></span>
    <span className={`${moonStyles.particles} ${styles.creatures}`} aria-hidden>
      {CREATURES.map((emoji, index) => <span key={emoji} style={{ '--i': index, '--drift': `${index * 12}px` } as CSSProperties}>{emoji}</span>)}
    </span>
    <span className={styles.tooltip}>{t.nav.map}</span>
  </LocaleLink>;
}
