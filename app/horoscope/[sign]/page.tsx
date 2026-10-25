import HoroscopeView, { horoscopeMetadata } from '../HoroscopeView';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ sign: string }> };
export async function generateMetadata({ params }: Props) { return horoscopeMetadata('en',(await params).sign); }
export default async function Page({ params }: Props) { return <HoroscopeView locale="en" sign={(await params).sign} />; }
