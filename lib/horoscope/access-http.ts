import { NextResponse } from 'next/server';
import { adminAuth } from '@/app/api/admin/_lib/firebaseAdmin';
import { newGuestId, readGuestId, setGuestCookie } from '@/app/api/dreams/_lib/guestQuota';
import { createAccessPass, cookieFromRequest, HOROSCOPE_ACCESS_COOKIE } from './access-cookie';
import { HoroscopeAccessError, type HoroscopeActor } from './access';
import type { Sign } from './model';
export async function horoscopeActor(request:Request):Promise<{actor:HoroscopeActor;newGuestId?:string}>{
  const auth=request.headers.get('authorization');
  if(auth){
    if(!auth.startsWith('Bearer '))throw new HoroscopeAccessError(401,'AUTH_REQUIRED');
    try{const decoded=await adminAuth().verifyIdToken(auth.slice(7));return {actor:{uid:decoded.uid}};}
    catch{throw new HoroscopeAccessError(401,'AUTH_REQUIRED');}
  }
  const existing=readGuestId(request),guestId=existing??newGuestId();
  return {actor:{guestId},...(!existing?{newGuestId:guestId}:{})};
}
export function finishAccess<T extends NextResponse>(response:T,guestId?:string){return guestId?setGuestCookie(response,guestId):response;}
export function setAccessPass<T extends NextResponse>(response:T,request:Request,grant:{subject:string;day:string;sign:Sign}){
  const maxAge=Math.max(1,Math.ceil((Date.parse(`${grant.day}T00:00:00Z`)+86400000-Date.now())/1000));
  response.cookies.set(HOROSCOPE_ACCESS_COOKIE,createAccessPass(grant.subject,grant.day,grant.sign,cookieFromRequest(request,HOROSCOPE_ACCESS_COOKIE)),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge});
  return response;
}
