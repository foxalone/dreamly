import HoroscopeView, { horoscopeMetadata } from './HoroscopeView';
export const dynamic = 'force-dynamic';
export const generateMetadata = () => horoscopeMetadata('en');
export default function Page() { return <HoroscopeView locale="en" />; }
