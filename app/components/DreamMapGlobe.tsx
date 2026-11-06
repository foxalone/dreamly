'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import LocaleLink from '@/lib/i18n/LocaleLink';
import { useLocale, useMessages } from '@/lib/i18n/LocaleProvider';
import { stripLocalePrefix } from '@/lib/i18n/path';
import { trackEvent } from '@/lib/analytics';
import { trackEarthClick } from '@/lib/trackEarthClick';
import { TarotDailyDraw } from './tarot/TarotDailyDraw';
import ZodiacArt from '@/app/horoscope/ZodiacArt';
import styles from './DreamMapGlobe.module.css';
import moonStyles from './moon/MoonGate.module.css';

// Listen to the existing game event without importing its animation implementation.
const BUILDING_PLACED_EVENT = 'dreamly:building-placed';
const CREATURES = ['🦊','🦋','🐢','🦉','🐈','🕊️'];
const EARTH_HOVER_RATE = 8;
const CRYSTAL_RAYS = [
  { angle: 0, color: '#fff6c8', reach: '-28' },
  { angle: 30, color: '#ff7eb8', reach: '-16' },
  { angle: 60, color: '#ffd36a', reach: '-24' },
  { angle: 90, color: '#8ee7ff', reach: '-14' },
  { angle: 120, color: '#d2a6ff', reach: '-28' },
  { angle: 150, color: '#ff9a6a', reach: '-18' },
  { angle: 180, color: '#f48bff', reach: '-26' },
  { angle: 210, color: '#7dffc3', reach: '-15' },
  { angle: 240, color: '#ffe1f2', reach: '-24' },
  { angle: 270, color: '#9ab6ff', reach: '-17' },
  { angle: 300, color: '#ffb3e0', reach: '-28' },
  { angle: 330, color: '#fff1a8', reach: '-20' },
];
const HIDDEN = ['/app/game','/signin','/payment-success','/app/profile/admin-dashboard','/app/chat','/app/tiktok-studio','/app/upgrade'];
export default function DreamMapGlobe() {
  const pathname = usePathname() ?? '/', { path } = stripLocalePrefix(pathname);
  const t = useMessages(), locale = useLocale();
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const setEarthRate = (rate: number) => {
    surfaceRef.current?.getAnimations().forEach(animation => { animation.playbackRate = rate; });
  };
  const [blocked, setBlocked] = useState(false), [celebrating, setCelebrating] = useState(false), [caught, setCaught] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const catchMatch = () => { setCaught(true); clearTimeout(timer); timer = setTimeout(() => setCaught(false), 700); };
    window.addEventListener("dreamly:love-saved", catchMatch);
    return () => { clearTimeout(timer); window.removeEventListener("dreamly:love-saved", catchMatch); };
  }, []);
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
    const onLaunchEnd = (event: AnimationEvent) => {
      if (event.animationName === 'pwa-launch-dismiss') schedule();
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['open','aria-hidden','aria-modal','hidden'] });
    observer.observe(document.documentElement, { attributes:true, attributeFilter:['data-pwa-launch'] });
    document.addEventListener('scroll',schedule,{capture:true,passive:true});
    document.addEventListener('animationend',onLaunchEnd,true);
    document.addEventListener('focusin',schedule); document.addEventListener('focusout',schedule);
    document.addEventListener('fullscreenchange',schedule); window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('scroll',schedule,true); document.removeEventListener('animationend',onLaunchEnd,true); document.removeEventListener('focusin',schedule); document.removeEventListener('focusout',schedule); document.removeEventListener('fullscreenchange',schedule); window.removeEventListener('resize',schedule); window.visualViewport?.removeEventListener('resize',schedule); };
  }, [pathname]);
  if (HIDDEN.some(prefix => path === prefix || path.startsWith(prefix+'/')) || /^\/tarot\/\d{4}-\d{2}-\d{2}\/[^/]+$/.test(path)) return null;
  const horoscope = <LocaleLink
    href="/horoscope"
    className={styles.horoscopeFab}
    data-map-rail={path === '/moon' || path === '/app/map' || undefined}
    style={{ visibility: blocked ? 'hidden' : undefined }}
    aria-label={t.nav.horoscope}
    title={t.nav.horoscope}
    aria-current={path === '/horoscope' || path.startsWith('/horoscope/') ? 'page' : undefined}
  >
    <span className={styles.horoscopeWheel}><ZodiacArt /></span>
    <span className={styles.horoscopeTooltip}>{t.nav.horoscope}</span>
  </LocaleLink>;
  const compatibility = <LocaleLink
    href="/love-compatibility"
    className={`${styles.compatibilityFab}${caught ? ` ${styles.caught}` : ""}`}
    data-love-crystal=""
    data-map-rail={path === '/moon' || path === '/app/map' || undefined}
    style={{ visibility: blocked ? 'hidden' : undefined }}
    aria-label={t.nav.loveCompatibility}
    title={t.nav.loveCompatibility}
    aria-current={path === '/love-compatibility' ? 'page' : undefined}
  >
    <svg className={styles.crystalBall} viewBox="0 0 100 112" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="dreamly-crystal-glass" cx="32%" cy="24%" r="80%">
          <stop offset="0" stopColor="#f2e7ff" />
          <stop offset=".35" stopColor="#a987db" />
          <stop offset=".7" stopColor="#604184" />
          <stop offset="1" stopColor="#251b42" />
        </radialGradient>
        <radialGradient id="dreamly-crystal-mist" cx="50%" cy="46%" r="56%">
          <stop offset="0" stopColor="#fce0f8" stopOpacity=".88" />
          <stop offset=".55" stopColor="#9d89e8" stopOpacity=".42" />
          <stop offset="1" stopColor="#9d89e8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dreamly-crystal-stand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe1a1" />
          <stop offset=".48" stopColor="#ba8554" />
          <stop offset="1" stopColor="#604060" />
        </linearGradient>
        <clipPath id="dreamly-crystal-clip"><circle cx="50" cy="43" r="34" /></clipPath>
      </defs>
      <g className={styles.crystalRays}>
        {CRYSTAL_RAYS.map((ray, index) => <g
          key={ray.angle}
          className={styles.crystalRay}
          style={{ '--ray': `${ray.angle}deg`, animationDelay: `${index * 0.08}s` } as CSSProperties}
        >
          <line x1="50" y1="4" x2="50" y2={ray.reach} stroke={ray.color} strokeWidth={index % 2 ? 2.2 : 3.2} strokeLinecap="round" />
          <circle cx="50" cy={ray.reach} r={index % 2 ? 2.1 : 2.8} fill={ray.color} />
        </g>)}
      </g>
      <ellipse cx="50" cy="105" rx="28" ry="5" fill="#10091e" opacity=".35" />
      <path d="M35 76h30l-4 11H39Z" fill="url(#dreamly-crystal-stand)" stroke="#efd097" strokeWidth="1.5" />
      <path d="M40 87h20l5 12H35Z" fill="#513459" stroke="#d7aa75" strokeWidth="1.5" />
      <path d="M30 99h40l4 8H26Z" fill="url(#dreamly-crystal-stand)" stroke="#efd097" strokeWidth="1.5" />
      <path d="M27 104h46" stroke="#fff1cc" strokeOpacity=".55" strokeWidth="1.5" />
      <circle className={styles.crystalSphere} cx="50" cy="43" r="36" fill="url(#dreamly-crystal-glass)" stroke="#e6d5fa" strokeWidth="1.7" />
      <circle className={styles.crystalMist} cx="50" cy="44" r="30" fill="url(#dreamly-crystal-mist)" />
      <g className={styles.crystalSwirl} clipPath="url(#dreamly-crystal-clip)" fill="none" strokeLinecap="round">
        <path d="M14 45c16-23 30-9 43-24 9-10 24-4 32 5" stroke="#f5d5ff" strokeOpacity=".5" strokeWidth="5" />
        <path d="M12 65c17-19 27-1 43-12 10-7 23-3 35 8" stroke="#a7d9ff" strokeOpacity=".4" strokeWidth="7" />
      </g>
      <g className={styles.crystalSheen} clipPath="url(#dreamly-crystal-clip)">
        <ellipse cx="27" cy="43" rx="8" ry="35" transform="rotate(24 27 43)" fill="#fff" opacity=".5" />
      </g>
      <path d="M22 34c4-12 13-20 25-22" fill="none" stroke="#fff" strokeOpacity=".8" strokeLinecap="round" strokeWidth="4" />
      <path d="M25 52c2 10 8 17 17 21" fill="none" stroke="#ddc9fc" strokeOpacity=".45" strokeLinecap="round" strokeWidth="2" />
      <path d="M49 33c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Z" fill="#fff5e9" className={styles.crystalGlimmer} />
      <circle cx="64" cy="28" r="2" fill="#fff5e9" opacity=".8" />
      <path className={styles.crystalSparkle} d="M9 24c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z" fill="#f7e8ff" />
      <path className={styles.crystalSparkle} d="M90 57c.4 2.5 1.7 3.8 4.2 4.2-2.5.4-3.8 1.7-4.2 4.2-.4-2.5-1.7-3.8-4.2-4.2 2.5-.4 3.8-1.7 4.2-4.2Z" fill="#f7e8ff" />
    </svg>
    <span className={styles.compatibilityTooltip}>{t.nav.loveCompatibility}</span>
  </LocaleLink>;
  const onMapRail = path === '/moon' || path === '/app/map';
  const rail = (nodes: ReactNode) => (
    <div className={styles.iconRail} data-map-rail={onMapRail || undefined} style={{ visibility: blocked ? 'hidden' : undefined }}>
      {nodes}
    </div>
  );
  if (path === '/app/map') return rail(<><TarotDailyDraw blocked={blocked} path={path} />{horoscope}{compatibility}</>);
  return rail(<>
    <LocaleLink id="dream-map-globe" data-moon={path === '/moon' || undefined} href="/app/map" className={`${styles.button} ${celebrating ? styles.celebrating : ''}`} aria-label={t.nav.map} title={t.nav.map} onMouseEnter={() => setEarthRate(EARTH_HOVER_RATE)} onMouseLeave={() => setEarthRate(1)} onFocus={() => setEarthRate(EARTH_HOVER_RATE)} onBlur={() => setEarthRate(1)} onClick={() => { trackEvent('map_globe_click',{ locale, section: path.split('/').filter(Boolean).slice(0,2).join('/') || 'home' }); void trackEarthClick('globe'); }}>
      <span className={styles.orb} aria-hidden><span ref={surfaceRef} className={styles.surface} /></span>
      <span className={`${moonStyles.particles} ${styles.creatures}`} aria-hidden>
        {CREATURES.map((emoji, index) => <span key={emoji} style={{ '--i': index, '--drift': `${(index - 2.5) * 6}px` } as CSSProperties}>{emoji}</span>)}
      </span>
      <span className={styles.tooltip}>{t.nav.map}</span>
    </LocaleLink>
    <TarotDailyDraw blocked={blocked} path={path} />
    {horoscope}
    {compatibility}
  </>);
}
