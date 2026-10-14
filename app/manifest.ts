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
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
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
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
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
