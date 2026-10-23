import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  // Block search crawlers on vercel.app domains to prevent duplicate indexing
  if (host.includes('vercel.app')) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ytchaptered.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
