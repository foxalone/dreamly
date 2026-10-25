import { CONSTELLATIONS } from '@/lib/horoscope/presentation';
import { SIGNS, SYMBOLS, type Sign } from '@/lib/horoscope/model';

export default function ZodiacArt({ sign }: { sign?: Sign }) {
  const pattern = sign ? CONSTELLATIONS[sign] : null;
  return <svg className="hc-zodiac-art" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <circle className="hc-orbit" cx="120" cy="120" r="110" />
    <circle className="hc-orbit hc-orbit-inner" cx="120" cy="120" r="99" />
    {Array.from({length:24},(_,i) => <path key={i} className="hc-tick" d="M120 10V15" transform={`rotate(${i*15} 120 120)`} />)}
    {[[22,113],[205,38],[184,209],[44,196],[116,21],[216,124]].map(([x,y],i) => <circle key={i} className="hc-dust" cx={x} cy={y} r={i%2 ? 1 : 1.7} />)}
    {pattern ? <g className="hc-constellation">
      {pattern.paths.map((path,i) => <polyline key={i} points={path.map(index=>pattern.points[index].join(',')).join(' ')} />)}
      {pattern.points.map(([x,y],i)=><g key={i} className={`hc-star-point hc-star-point-${i%3}`}><circle className="hc-star-halo" cx={x} cy={y} r="9"/><circle cx={x} cy={y} r={i%3===0?3:2}/>{i%3===0?<path d={`M${x-6} ${y}h12 M${x} ${y-6}v12`}/>:null}</g>)}
      <text x="195" y="211" className="hc-art-glyph">{SYMBOLS[SIGNS.indexOf(sign!)]}</text>
    </g> : <g className="hc-wheel">{SYMBOLS.map((glyph,i)=>{const angle=(i*30-90)*Math.PI/180;return <text key={glyph} x={120+77*Math.cos(angle)} y={126+77*Math.sin(angle)} textAnchor="middle">{glyph}</text>;})}<path d="M120 75L132 108L165 120L132 132L120 165L108 132L75 120L108 108Z"/></g>}
  </svg>;
}
