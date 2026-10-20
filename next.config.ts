import type { NextConfig } from 'next';
const config: NextConfig = {
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      { key: 'Service-Worker-Allowed', value: '/' },
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
    ] }];
  },
};
export default config;
