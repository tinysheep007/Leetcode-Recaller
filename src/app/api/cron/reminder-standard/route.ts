// Alternate daily UTC slot. The shared handler sends only during 8 a.m. local time.
export { GET } from '../reminder/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
