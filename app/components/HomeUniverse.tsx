"use client";

import { useState, type CSSProperties } from "react";
import { ArrowUpRight, Globe2, Moon, Pause, Play } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { homeUniverseMessages } from "@/lib/i18n/home-universe";
import { trackMoonClick } from "@/lib/trackMoonClick";
import LocaleLink from "@/lib/i18n/LocaleLink";
import styles from "./HomeUniverse.module.css";

const stars = [
  [58, 72], [136, 140], [186, 44], [298, 92], [358, 28], [396, 320],
  [444, 108], [504, 282], [548, 50], [582, 352], [740, 40], [786, 248],
  [836, 108], [850, 326], [78, 330], [324, 362], [624, 292], [470, 370],
];
const travelers = ["🦋", "🐋", "🌸", "🦊", "🪷", "🐢"];

export default function HomeUniverse({ locale }: { locale: Locale }) {
  const t = homeUniverseMessages[locale];
  const [paused, setPaused] = useState(false);

  return (
    <section id="home-universe" className={styles.section} aria-labelledby="home-universe-title" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={styles.card} data-paused={paused}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="home-universe-title">{t.title}</h2>
          <p className={styles.description}>{t.description}</p>
        </div>
        <button type="button" className={styles.pause} onClick={() => setPaused(!paused)} aria-label={paused ? t.play : t.pause} title={paused ? t.play : t.pause}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>

        <svg className={styles.scene} viewBox="0 0 900 410" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="home-earth-ocean" cx="30%" cy="25%" r="80%">
              <stop stopColor="#7bdbe9" /><stop offset=".5" stopColor="#287fca" /><stop offset="1" stopColor="#102452" />
            </radialGradient>
            <radialGradient id="home-planet-shade" cx="28%" cy="25%" r="78%">
              <stop offset=".35" stopColor="#020818" stopOpacity="0" /><stop offset="1" stopColor="#020818" stopOpacity=".85" />
            </radialGradient>
            <radialGradient id="home-earth-glow">
              <stop offset=".65" stopColor="#67d5ff" stopOpacity=".2" /><stop offset="1" stopColor="#67d5ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="home-moon-glow">
              <stop offset=".55" stopColor="#e1ccff" stopOpacity=".18" /><stop offset="1" stopColor="#e1ccff" stopOpacity="0" />
            </radialGradient>
            <clipPath id="home-earth-clip"><circle cx="236" cy="250" r="105" /></clipPath>
            <clipPath id="home-moon-clip"><circle cx="672" cy="140" r="65" /></clipPath>
          </defs>

          {stars.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.8 : 1} fill="#e5dcff" opacity={i % 3 === 0 ? .7 : .3} />)}
          <path className={styles.orbit} d="M 236 238 Q 408 -6 672 140 Q 574 367 236 238" fill="none" stroke="#c4b5fd" strokeOpacity=".18" strokeDasharray="3 10" />
          <circle cx="236" cy="250" r="152" fill="url(#home-earth-glow)" />
          <circle cx="672" cy="140" r="108" fill="url(#home-moon-glow)" />

          <g>
            <circle cx="236" cy="250" r="105" fill="url(#home-earth-ocean)" />
            <g clipPath="url(#home-earth-clip)">
              <g fill="#80c6a3" stroke="#a9ddbc" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M144 178 171 159 198 164 209 181 197 193 203 208 183 217 179 233 163 229 153 211 136 205Z" />
                <path d="M181 234 198 237 217 255 213 273 203 286 198 310 186 326 180 303 170 279 174 258 167 245Z" />
                <path d="M231 169 253 160 280 169 288 184 308 185 328 201 323 219 304 217 291 231 278 218 266 223 258 209 240 212 230 200 237 188 224 181Z" />
                <path d="M241 220 262 218 278 235 280 257 265 280 251 289 244 270 231 256 228 237Z" />
                <path d="M292 280 316 273 335 287 328 302 306 307 292 297Z" />
                <path d="M202 153 218 148 227 159 217 175 206 170Z" />
              </g>
              <g fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round">
                <path d="M146 192 Q185 180 213 196 M260 178 Q295 174 318 191 M143 274 Q164 264 182 274 M270 310 Q292 316 310 307" />
              </g>
              <circle cx="236" cy="250" r="105" fill="url(#home-planet-shade)" />
            </g>
            <circle cx="236" cy="250" r="105" fill="none" stroke="#a9e9ff" strokeOpacity=".5" strokeWidth="1.5" />
          </g>

          <g>
            <circle cx="672" cy="140" r="65" fill="#bfbaca" />
            <image href="/moon/lroc-color-2k.jpg" x="561" y="75" width="260" height="130" preserveAspectRatio="xMidYMid slice" clipPath="url(#home-moon-clip)" />
            <circle cx="672" cy="140" r="65" fill="url(#home-planet-shade)" />
            <circle cx="672" cy="140" r="65" fill="none" stroke="#ede1ff" strokeOpacity=".4" />
          </g>

          <text x="195" y="207" fontSize="28" className={styles.resident}>🌷</text>
          <text x="265" y="278" fontSize="27" className={styles.resident}>🐘</text>
          <text x="643" y="126" fontSize="24" className={styles.resident}>🦉</text>
          <text x="687" y="158" fontSize="23" className={styles.resident}>🌻</text>
          {travelers.map((icon, i) => (
            <g key={icon} className={styles.traveler} style={{ "--delay": `${i * -1.7}s` } as CSSProperties}>
              <text fontSize="29" textAnchor="middle" dominantBaseline="central">{icon}</text>
            </g>
          ))}
        </svg>

        <div className={styles.actions}>
          <LocaleLink href="/app/map" className={styles.earthLink}>
            <Globe2 size={18} aria-hidden="true" />{t.earth}<ArrowUpRight size={16} aria-hidden="true" />
          </LocaleLink>
          <LocaleLink href="/moon" className={styles.moonLink} onClick={() => void trackMoonClick("home")}>
            <Moon size={18} aria-hidden="true" />{t.moon}<ArrowUpRight size={16} aria-hidden="true" />
          </LocaleLink>
        </div>
      </div>
    </section>
  );
}
