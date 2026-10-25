import { createHmac, timingSafeEqual } from 'node:crypto';
import { isSign, utcDay, type Sign } from './model';
export const HOROSCOPE_ACCESS_COOKIE='dreamly_horoscope_access';
type AccessPass={subject:string;day:string;signs:Sign[]};
function secret(){return process.env.CRON_SECRET?.trim()??'';}
export function readAccessPass(token: string | undefined, now=Date.now()): AccessPass|null {
  try {
    if(!token||token.length>3500||!secret())return null;
    const [payload,signature,extra]=token.split('.');if(extra||!payload||!signature)return null;
    const expected=createHmac('sha256',secret()).update(payload).digest(),actual=Buffer.from(signature,'base64url');
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
    const value=JSON.parse(Buffer.from(payload,'base64url').toString()) as AccessPass;
    if(value.day!==utcDay(new Date(now))||!/^((user|guest)_[a-f0-9]{64})$/.test(value.subject)||!Array.isArray(value.signs)||value.signs.length>12||!value.signs.every(isSign))return null;
    return value;
  }catch{return null;}
}
export function createAccessPass(subject:string,day:string,sign:Sign,previous?:string){
  if(!secret())throw new Error('CRON_SECRET is not configured');
  const old=readAccessPass(previous),signs=old?.subject===subject&&old.day===day?[...new Set([...old.signs,sign])]:[sign];
  const payload=Buffer.from(JSON.stringify({subject,day,signs} satisfies AccessPass)).toString('base64url');
  return `${payload}.${createHmac('sha256',secret()).update(payload).digest('base64url')}`;
}
export function cookieFromRequest(req:Request,name:string){
  const item=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${name}=`));
  try{return item?decodeURIComponent(item.slice(name.length+1)):undefined;}catch{return undefined;}
}
export function requestHasHoroscopeAccess(req:Request,sign:Sign){return !!readAccessPass(cookieFromRequest(req,HOROSCOPE_ACCESS_COOKIE))?.signs.includes(sign);}
