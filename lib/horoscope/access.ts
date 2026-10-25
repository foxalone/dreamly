import { createHash, randomUUID } from 'node:crypto';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { hasPaidAccess } from '@/lib/subscriptions/status';
import { isSign, utcDay, type Sign } from './model';

export type HoroscopeActor = { uid: string } | { guestId: string };
export type AccessInfo = { day: string; tier: 'guest' | 'member' | 'paid'; unlocked: boolean; freeLeft: number };
export class HoroscopeAccessError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const subjectOf = (actor: HoroscopeActor) => `${'uid' in actor ? 'user' : 'guest'}_${createHash('sha256').update('uid' in actor ? actor.uid : actor.guestId).digest('hex')}`;
export const accessDayPath = (subject: string, day: string) => `horoscope_access/${subject}/days/${day}`;
export const entitlementPath = (subject: string, day: string, sign: Sign) => `${accessDayPath(subject, day)}/signs/${sign}`;
export type AccessDependencies = { db?: FirebaseFirestore.Firestore; now?: () => number };
function context(deps: AccessDependencies) { return { db: deps.db ?? adminFirestore(), now: deps.now?.() ?? Date.now() }; }
function tierOf(actor: HoroscopeActor, profile: unknown, now: number): AccessInfo['tier'] {
  if (!('uid' in actor)) return 'guest';
  return hasPaidAccess(profile as Parameters<typeof hasPaidAccess>[0], now) ? 'paid' : 'member';
}
function count(value: unknown) { const n=Number(value); return Number.isFinite(n)?Math.max(0,Math.floor(n)):0; }
function limit(tier: AccessInfo['tier']) { return tier === 'paid' ? 3 : tier === 'member' ? 1 : 0; }
export async function accessInfo(actor: HoroscopeActor, sign: Sign, deps: AccessDependencies = {}): Promise<AccessInfo> {
  if (!isSign(sign)) throw new HoroscopeAccessError(400,'INVALID_SIGN');
  const { db, now }=context(deps), day=utcDay(new Date(now)), subject=subjectOf(actor);
  const [usage, entitlement, user]=await Promise.all([
    db.doc(accessDayPath(subject,day)).get(), db.doc(entitlementPath(subject,day,sign)).get(),
    'uid' in actor?db.doc(`users/${actor.uid}`).get():Promise.resolve(null),
  ]);
  const tier=tierOf(actor,user?.data(),now);
  return {day,tier,unlocked:entitlement.exists,freeLeft:Math.max(0,limit(tier)-count(usage.data()?.freeUsed))};
}
/** Count distinct signs, never page refreshes, languages, cache hits or polling. */
export async function openFreeAccess(actor: HoroscopeActor, sign: Sign, deps: AccessDependencies = {}) {
  if (!isSign(sign)) throw new HoroscopeAccessError(400,'INVALID_SIGN');
  const {db,now}=context(deps),day=utcDay(new Date(now)),subject=subjectOf(actor);
  return db.runTransaction(async tx=>{
    const dayRef=db.doc(accessDayPath(subject,day)),grantRef=db.doc(entitlementPath(subject,day,sign));
    const [usage,grant,user]=await Promise.all([tx.get(dayRef),tx.get(grantRef),'uid' in actor?tx.get(db.doc(`users/${actor.uid}`)):Promise.resolve(null)]);
    if (grant.exists) return {day,subject,sign,source:'existing' as const};
    const tier=tierOf(actor,user?.data(),now),used=count(usage.data()?.freeUsed);
    if (used>=limit(tier)) throw new HoroscopeAccessError(402,'AD_REQUIRED');
    tx.set(grantRef,{day,sign,source:'free',createdAt:now});
    tx.set(dayRef,{freeUsed:used+1,updatedAt:now},{merge:true});
    return {day,subject,sign,source:'free' as const};
  });
}
export async function startHoroscopeAd(actor: HoroscopeActor, sign: Sign, bucket: string, deps: AccessDependencies = {}) {
  if (!isSign(sign)) throw new HoroscopeAccessError(400,'INVALID_SIGN');
  const {db,now}=context(deps),day=utcDay(new Date(now)),subject=subjectOf(actor),challenge=randomUUID();
  await db.runTransaction(async tx=>{
    const rateRef=db.doc(`horoscope_ad_limits/${day}_${bucket}`),grantRef=db.doc(entitlementPath(subject,day,sign));
    const [rate,grant]=await Promise.all([tx.get(rateRef),tx.get(grantRef)]);
    if (grant.exists) throw new HoroscopeAccessError(409,'ALREADY_UNLOCKED');
    const minute=Math.floor(now/60000),used=rate.data()?.minute===minute?count(rate.data()?.count):0;
    if(used>=5||count(rate.data()?.dailyCount)>=60) throw new HoroscopeAccessError(429,'RATE_LIMITED');
    tx.set(rateRef,{minute,count:used+1,dailyCount:count(rate.data()?.dailyCount)+1});
    tx.set(db.doc(`horoscope_ad_challenges/${challenge}`),{subject,sign,day,createdAt:now,expiresAt:Math.min(now+10*60000,Date.parse(`${day}T00:00:00Z`)+86400000),used:false});
  });
  return {challenge,day};
}
/** Existing Offerwall completion flow; no no-fill/close-without-entitlement fallback. */
export async function completeHoroscopeAd(actor: HoroscopeActor, challenge: string, deps: AccessDependencies = {}) {
  if(!/^[0-9a-f-]{36}$/.test(challenge)) throw new HoroscopeAccessError(400,'INVALID_CHALLENGE');
  const {db,now}=context(deps),day=utcDay(new Date(now)),subject=subjectOf(actor);
  return db.runTransaction(async tx=>{
    const challengeRef=db.doc(`horoscope_ad_challenges/${challenge}`),entry=await tx.get(challengeRef),data=entry.data();
    if(!data||data.subject!==subject||data.day!==day||data.expiresAt<=now||!isSign(data.sign)) throw new HoroscopeAccessError(403,'AD_CHALLENGE_INVALID');
    const grantRef=db.doc(entitlementPath(subject,day,data.sign)),grant=await tx.get(grantRef);
    if(data.used) { if(!grant.exists)throw new HoroscopeAccessError(409,'AD_ALREADY_USED');return {day,subject,sign:data.sign}; }
    if(!grant.exists)tx.set(grantRef,{day,sign:data.sign,source:'ad',createdAt:now});
    tx.set(challengeRef,{used:true,usedAt:now},{merge:true});
    return {day,subject,sign:data.sign};
  });
}
