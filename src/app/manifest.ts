import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'LeetCode Recall', short_name: 'Recall',
    description: 'Review your solved problems with your own notes, even offline.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#f6f5f0', theme_color: '#25392f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
