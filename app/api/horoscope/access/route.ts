import { NextResponse } from 'next/server';
import { accessInfo, openFreeAccess, HoroscopeAccessError, subjectOf } from '@/lib/horoscope/access';
import { horoscopeActor, finishAccess, setAccessPass } from '@/lib/horoscope/access-http';
import { HOROSCOPE_ACCESS_COOKIE, cookieFromRequest, readAccessPass } from '@/lib/horoscope/access-cookie';
import { validateRequest, HoroscopeRequestError } from '@/lib/horoscope/jobs';
import { publicRequestBucket } from '@/lib/horoscope/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function failure(error:unknown){
  const status=error instanceof HoroscopeAccessError||error instanceof HoroscopeRequestError?error.status:error instanceof SyntaxError?400:503;
  return NextResponse.json({error:error instanceof HoroscopeAccessError?error.code:'UNAVAILABLE'},{status,headers});
}
export async function GET(request:Request){
  try{
    const {sign}=validateRequest(Object.fromEntries(new URL(request.url).searchParams));
    const {actor,newGuestId}=await horoscopeActor(request),info=await accessInfo(actor,sign);
    const response=NextResponse.json(info,{headers});
    if(info.unlocked)setAccessPass(response,request,{subject:subjectOf(actor),day:info.day,sign});
    else if(readAccessPass(cookieFromRequest(request,HOROSCOPE_ACCESS_COOKIE))?.signs.includes(sign))response.cookies.delete(HOROSCOPE_ACCESS_COOKIE);
    return finishAccess(response,newGuestId);
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    publicRequestBucket(request);
    const text=await request.text();if(text.length>512)throw new HoroscopeAccessError(400,'INVALID_REQUEST');
    const {sign}=validateRequest(JSON.parse(text)),{actor,newGuestId}=await horoscopeActor(request);
    const grant=await openFreeAccess(actor,sign);
    return finishAccess(setAccessPass(NextResponse.json({unlocked:true,day:grant.day},{headers}),request,grant),newGuestId);
  }catch(error){return failure(error);}
}
export async function DELETE(request:Request){
  try{
    publicRequestBucket(request);
    const response=NextResponse.json({ok:true},{headers});response.cookies.delete(HOROSCOPE_ACCESS_COOKIE);return response;
  }catch(error){return failure(error);}
}
