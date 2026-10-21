import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ytChaptered — YouTube Chaptered Playlist Creator',
    short_name: 'ytChaptered',
    description: 'Turn timestamped YouTube videos into structured local playlists.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#0d5c46',
    orientation: 'any',
    categories: ['education', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/desktop-preview.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'ytChaptered desktop playlist and course organizer',
      },
      {
        src: '/screenshots/mobile-preview.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'ytChaptered mobile chapter navigation and progress tracking',
      },
    ],
    shortcuts: [
      {
        name: 'Quick Create Course',
        short_name: 'Create',
        description: 'Create a new chaptered course from a YouTube link',
        url: '/?tab=create',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'My Courses',
        short_name: 'Courses',
        description: 'View your saved courses and history',
        url: '/?tab=history',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
