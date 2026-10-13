import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ytChaptered — YouTube Chaptered Playlist Creator',
    short_name: 'ytChaptered',
    description: 'Turn timestamped YouTube videos into structured local playlists.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#0d5c46',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
