import Link from 'next/link';
import { Heart, BriefcaseBusiness, Wallet, Sun, Sparkles, Orbit, Quote } from 'lucide-react';
import { localeDir, type Locale } from '@/lib/i18n/config';
import { absoluteLocaleUrl, localePath } from '@/lib/i18n/path';
import { horoscopeCopy, horoscopeDate } from '@/lib/i18n/horoscope';
import { horoscopeDesign } from '@/lib/i18n/horoscope-design';
import { SIGNS, SYMBOLS, type Sign } from '@/lib/horoscope/model';
import type { Sky } from '@/lib/horoscope/astronomy';
import type { ForecastEdition } from '@/lib/horoscope/cache';
import ArticleAdBanner from '@/app/components/ArticleAdBanner';
import DreamDictionaryHeader from '@/app/dreams/DreamDictionaryHeader';
import DictionaryFooter from '@/app/dreams/DictionaryFooter';
import HoroscopeClient from './HoroscopeClient';
import ZodiacArt from './ZodiacArt';
import MoonVisual from './MoonVisual';
import { HoroscopeAccess } from './HoroscopeAccess';
import { RefreshReading, ShareForecast } from './HoroscopeActions';
import { CosmicForecast } from './CosmicForecast';
import './horoscope.css';

const INSIGHTS = [{field:'love',Icon:Heart},{field:'career',Icon:BriefcaseBusiness},{field:'money',Icon:Wallet},{field:'energy',Icon:Sun}] as const;
export function HoroscopeContent({locale,sign,today,forecast,sky,accessAllowed=false}:{locale:Locale;sign?:Sign;today:string;forecast:ForecastEdition|null;stale:boolean;sky:Sky;accessAllowed?:boolean}) {
  const t=horoscopeCopy[locale], d=horoscopeDesign[locale];
  const reading=sign?forecast?.locales[locale]?.[sign]:null;
  const displaySky=forecast?.sky??sky;
  const n=new Intl.NumberFormat(locale==='pt'?'pt-BR':locale,{maximumFractionDigits:1});
  const name=sign?t.signs[sign]:t.title;
  const path=`/horoscope${sign?`/${sign}`:''}`, url=absoluteLocaleUrl(path,locale);
  const dated=forecast?.day??today;
  const positionTitle=(body:string,value:Sign)=>d.inSign.replace('{planet}',t.planets[body]).replace('{sign}',t.signs[value]);
  const theme=(value:Sign)=>d.tradition.replace('{theme}',d.elements[SIGNS.indexOf(value)%4]);
  // Tightest existing aspect involving a personal body; never invent an influence.
  const aspect=displaySky.aspects.find(a=>['Sun','Moon','Mercury','Venus','Mars'].includes(a.a)||['Sun','Moon','Mercury','Venus','Mars'].includes(a.b));
  const influences=displaySky.planets.filter(p=>p.body==='Sun'||p.body==='Moon');
  return <div key={`${locale}:${sign??'landing'}`} className="dream-dictionary hc-shell" tabIndex={0} role="region" aria-label={t.title} lang={locale} dir={localeDir(locale)}>
    {forecast?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({
      '@context':'https://schema.org','@type':'WebPage',name:sign?`${name} · ${t.title}`:t.title,url,inLanguage:locale,dateModified:forecast.publishedAt,
      description:t.description.replace('{sign}',name),publisher:{'@type':'Organization',name:'Dreamly',url:'https://dreamly.art'}
    }).replace(/</g,'\\u003c')}}/>:null}
    <DreamDictionaryHeader/>
    <main className="hc-main">
      <header className="hc-hero">
        <div className="hc-hero-art"><ZodiacArt sign={sign}/></div>
        <div className="hc-hero-copy"><p className="hc-eyebrow"><Sparkles size={13} aria-hidden/>{t.nav} · Dreamly</p><h1>{name}</h1><p className="hc-hero-date"><time dateTime={today}>{horoscopeDate(today,locale)}</time> · UTC</p><p className="hc-intro">{sign?d.intro[SIGNS.indexOf(sign)]:t.lead}</p></div>
      </header>
      <HoroscopeClient sign={sign}/>
      {sign&&accessAllowed?<HoroscopeAccess locale={locale} sign={sign} sessionOnly/>:null}
      <CosmicForecast locale={locale} day={dated} selected={!!sign} reading={reading} publishedAt={forecast?.publishedAt} refresh={sign?(accessAllowed?<RefreshReading key={`${today}:${locale}:${sign}`} day={today} sign={sign} locale={locale}/>:<HoroscopeAccess locale={locale} sign={sign}/>):null}/>
      {reading?<>
        <section className="hc-insights" aria-labelledby="glance-title"><div className="hc-section-label"><span/><h2 id="glance-title">{d.glance}</h2><span/></div><div className="hc-insight-grid">{INSIGHTS.map(({field,Icon})=><section key={field} className={`hc-insight hc-insight-${field}`}><span className="hc-icon-badge"><Icon size={20} aria-hidden/></span><h3>{t.fields[field]}</h3><p>{reading[field]}</p></section>)}</div></section>
        <section className="hc-advice" aria-labelledby="advice-title"><Quote size={25} aria-hidden/><h2 id="advice-title">{d.advice}</h2><blockquote>{reading.tip}</blockquote><span aria-hidden>✦</span></section>
      </>:null}
      <section className="hc-panel hc-moon" aria-labelledby="moon-title">
        <div className="hc-moon-art"><MoonVisual phase={sky.moon.phase} illuminated={sky.moon.illuminated}/></div>
        <div className="hc-moon-copy"><p className="hc-eyebrow">{t.moon}</p><h2 id="moon-title">{t.phases[sky.moon.phaseIndex]}</h2><div className="hc-moon-facts"><span>{positionTitle('Moon',sky.moon.sign)}</span><span>{t.illuminated}: <bdi>{n.format(sky.moon.illuminated*100)}%</bdi></span></div><p>{theme(sky.moon.sign)} {d.phaseThemes[sky.moon.phaseIndex]}</p><p className="hc-timestamp">{t.reference} · <time dateTime={sky.referenceTime}>{horoscopeDate(sky.day,locale)}</time></p></div>
      </section>
      <section className="hc-influences" aria-labelledby="influences-title"><div className="hc-section-label"><span/><h2 id="influences-title">{d.influences}</h2><span/></div><p className="hc-timestamp">{t.reference} · <time dateTime={displaySky.referenceTime}>{horoscopeDate(displaySky.day,locale)}</time></p><div className="hc-influence-list">{influences.map(planet=><div className="hc-influence" key={planet.body}><span className="hc-influence-symbol" aria-hidden>{planet.body==='Sun'?'☉':'☽'}</span><div><h3>{positionTitle(planet.body,planet.sign)}</h3><p>{theme(planet.sign)}</p></div></div>)}{aspect?<div className="hc-influence"><span className="hc-influence-symbol"><Orbit size={25} aria-hidden/></span><div><h3>{t.planets[aspect.a]} · {t.aspects[aspect.name]} · {t.planets[aspect.b]}</h3><p>{d.aspectThemes[aspect.name]}</p></div></div>:null}</div></section>
      <section className="hc-panel hc-positions" aria-labelledby="positions-title"><h2 id="positions-title">{d.positions}</h2><p className="hc-timestamp">{t.reference} · <time dateTime={displaySky.referenceTime}>{horoscopeDate(displaySky.day,locale)}</time></p><div className="hc-planets">{displaySky.planets.map(planet=><div key={planet.body}><strong>{t.planets[planet.body]}</strong><span>{t.signs[planet.sign]} · <bdi>{n.format(planet.degree)}°</bdi></span><small>{planet.retrograde?t.retrograde:t.direct}</small></div>)}</div></section>
      <ArticleAdBanner locale={locale} slot={process.env.ADSENSE_ARTICLE_SLOT?.trim() || undefined}/>
      <section className="hc-panel hc-share" aria-labelledby="share-title"><Sparkles size={22} aria-hidden/><h2 id="share-title">{d.share}</h2><ShareForecast locale={locale} url={url} name={name} date={horoscopeDate(dated,locale)}/></section>
      <section className="hc-explore" aria-labelledby="signs-title"><div className="hc-section-label"><span/><h2 id="signs-title">{d.explore}</h2><span/></div><nav className="hc-zodiac-nav" aria-label={d.explore}>{SIGNS.map((value,i)=><Link key={value} href={localePath(`/horoscope/${value}`,locale)} data-sign={value} className="hc-sign" aria-current={sign===value?'page':undefined}><span className="hc-symbol" aria-hidden>{SYMBOLS[i]}</span><span>{t.signs[value]}</span>{!sign&&forecast?.locales[locale]?.[value]?<p>{forecast.locales[locale][value].general}</p>:null}</Link>)}</nav></section>
      <details className="hc-panel hc-details"><summary>{d.details}</summary><div className="hc-details-content"><p className="hc-timestamp">{t.reference} · <time dateTime={displaySky.referenceTime}>{horoscopeDate(displaySky.day,locale)}</time></p><ul className="hc-aspects">{displaySky.aspects.map(a=><li key={`${a.a}-${a.b}`}>{t.planets[a.a]} · {t.aspects[a.name]} · {t.planets[a.b]} <bdi>({n.format(a.angle)}° ± {n.format(a.orb)}°)</bdi></li>)}</ul><h2>{t.method}</h2><p>{t.methodology}</p><p>{d.artwork}</p><a href="https://github.com/cosinekitty/astronomy" rel="noopener noreferrer">Astronomy Engine</a></div></details>
    </main>
    <DictionaryFooter/>
  </div>;
}
