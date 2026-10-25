import type { ReactNode } from 'react';
import { Sparkles, Star } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
import { horoscopeCopy, horoscopeDate } from '@/lib/i18n/horoscope';
import { horoscopeDesign } from '@/lib/i18n/horoscope-design';
import type { Reading } from '@/lib/horoscope/model';

/** Primary forecast prose is rendered on the server, including pending states. */
export function CosmicForecast({ locale, day, selected, reading, publishedAt, refresh }: {
  locale: Locale; day: string; selected: boolean; reading?: Reading | null; publishedAt?: string; refresh?: ReactNode;
}) {
  const t = horoscopeCopy[locale], d = horoscopeDesign[locale];
  return (
      <article className="hc-panel hc-forecast" aria-labelledby="forecast-title">
        <div className="hc-section-heading"><span className="hc-icon-badge"><Sparkles size={21} aria-hidden/></span><div><p className="hc-eyebrow">{t.forecastDate} <time dateTime={day}>{horoscopeDate(day,locale)}</time></p><h2 id="forecast-title">{d.forecast}</h2></div></div>
        {reading?<>{reading.headline?<h3 className="hc-reading-headline">{reading.headline}</h3>:null}{reading.general.split(/\n\s*\n/).map((paragraph,index)=><p key={index} className="hc-reading-text">{paragraph}</p>)}<div className="hc-reading-context"><span><Star size={14} aria-hidden/>{t.fields.explanation}</span><p>{reading.explanation}</p></div></>:!selected?<p className="hc-reading-text">{d.pick}</p>:<div className="hc-preparing">{refresh??<ForecastWaiting/>}</div>}
        {publishedAt?<p className="hc-publication">{t.updated}: <time dateTime={publishedAt}>{new Intl.DateTimeFormat(locale==='pt'?'pt-BR':locale,{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}).format(new Date(publishedAt))}</time> · UTC</p>:null}
      </article>
  );
}

/** Loading bars describe an active request, never an untouched forecast card. */
export function ForecastWaiting({ active = false, busy = false, message, children }: {
  active?: boolean; busy?: boolean; message?: string; children?: ReactNode;
}) {
  return <div aria-busy={busy}>
    {message?<p role="status" aria-live="polite">{message}</p>:null}
    {active?<div className="hc-skeleton" aria-hidden><i/><i/><i/></div>:null}
    {children}
  </div>;
}
