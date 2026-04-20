import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'FORGE — Performance Index',
    short_name: 'FORGE',
    description:
      'Four-pillar golf drill scoring. Track your FORGE Performance Index across Driving, Approach, Chipping, and Putting.',
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    categories: ['sports', 'health', 'fitness'],
    icons: [
      { src: '/icon-192.png',     sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png',     sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'New session',
        short_name: 'New',
        description: 'Start scoring a FORGE practice session',
        url: '/sessions/new',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'History',
        short_name: 'History',
        description: 'View past sessions and trend',
        url: '/history',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
