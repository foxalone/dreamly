import { NextResponse } from 'next/server';
import { startHoroscopeAd, completeHoroscopeAd, HoroscopeAccessError } from '@/lib/horoscope/access';
import { horoscopeActor, finishAccess, setAccessPass } from '@/lib/horoscope/access-http';
import { cookieFromRequest } from '@/lib/horoscope/access-cookie';
import { validateRequest, HoroscopeRequestError } from '@/lib/horoscope/jobs';
import { publicRequestBucket } from '@/lib/horoscope/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
  try{
    const bucket=publicRequestBucket(request),text=await request.text();
    if(text.length>512)throw new HoroscopeAccessError(400,'INVALID_REQUEST');
    const input=JSON.parse(text);
    if(!input||typeof input!=='object'||Array.isArray(input))throw new HoroscopeAccessError(400,'INVALID_REQUEST');
    const {actor,newGuestId}=await horoscopeActor(request);
    if(input.action==='start'){
      const {sign}=validateRequest({sign:input.sign,locale:input.locale});
      if(Object.keys(input).some(key=>!['action','sign','locale'].includes(key)))throw new HoroscopeAccessError(400,'INVALID_REQUEST');
      const result=await startHoroscopeAd(actor,sign,bucket);
      return finishAccess(NextResponse.json(result,{headers}),newGuestId);
    }
    if(input.action!=='complete'||typeof input.challenge!=='string'||Object.keys(input).some(key=>!['action','challenge'].includes(key)))throw new HoroscopeAccessError(400,'INVALID_REQUEST');
    // Offerwall client entitlement is the existing provider integration signal,
    // not cryptographic SSV. A dismissed/unfilled ad never grants horoscope access.
    if(!cookieFromRequest(request,'FCOEC'))throw new HoroscopeAccessError(403,'AD_NOT_COMPLETED');
    const grant=await completeHoroscopeAd(actor,input.challenge);
    return finishAccess(setAccessPass(NextResponse.json({unlocked:true,day:grant.day,sign:grant.sign},{headers}),request,grant),newGuestId);
  }catch(error){
    const status=error instanceof HoroscopeAccessError||error instanceof HoroscopeRequestError?error.status:error instanceof SyntaxError?400:503;
    return NextResponse.json({error:error instanceof HoroscopeAccessError?error.code:'UNAVAILABLE'},{status,headers});
  }
}
