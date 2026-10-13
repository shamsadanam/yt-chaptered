import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YouTube Chaptered Playlist Creator',
    short_name: 'Chaptered',
    description: 'Turn timestamped YouTube videos into structured local playlists.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffefb',
    theme_color: '#ff4f00',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
