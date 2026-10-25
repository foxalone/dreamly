import { moonShape } from '@/lib/horoscope/presentation';

export default function MoonVisual({ phase, illuminated }: { phase: number; illuminated: number }) {
  const shape = moonShape(phase,illuminated);
  return <svg className="hc-lunar-disc" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="hc-moon-disc"><circle cx="100" cy="100" r="80"/></clipPath>
      <clipPath id="hc-moon-light"><path d={shape.path} transform={`translate(100 100) scale(${shape.mirror?-1:1} 1)`}/></clipPath>
      <radialGradient id="hc-moon-shade" cx="40%" cy="35%" r="65%"><stop offset="50%" stopColor="#070713" stopOpacity="0"/><stop offset="100%" stopColor="#070713" stopOpacity=".65"/></radialGradient>
    </defs>
    <circle cx="100" cy="100" r="93" fill="none" stroke="currentColor" opacity=".14"/>
    <g clipPath="url(#hc-moon-disc)">
      <image href="/moon/lroc-color-2k.jpg" x="20" y="20" width="160" height="160" preserveAspectRatio="xMidYMid slice" opacity=".12"/>
      <image href="/moon/lroc-color-2k.jpg" x="20" y="20" width="160" height="160" preserveAspectRatio="xMidYMid slice" clipPath="url(#hc-moon-light)"/>
      <circle cx="100" cy="100" r="80" fill="url(#hc-moon-shade)"/>
    </g>
  </svg>;
}
