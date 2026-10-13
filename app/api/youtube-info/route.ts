import { NextRequest, NextResponse } from 'next/server';
import { parseTimestamps } from '@/lib/youtubeParser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing YouTube video ID' },
      { status: 400 }
    );
  }

  try {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch YouTube page (status: ${response.status})` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Extract ytInitialPlayerResponse JSON
    const playerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*({.+?});(?:var\s+|const\s+|let\s+|window\[|<)/
    );

    let title = '';
    let author = '';
    let description = '';
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration = 0;

    if (playerResponseMatch && playerResponseMatch[1]) {
      try {
        const playerData = JSON.parse(playerResponseMatch[1]);
        const details = playerData.videoDetails;
        if (details) {
          title = details.title || '';
          author = details.author || '';
          description = details.shortDescription || '';
          if (details.lengthSeconds) {
            duration = parseInt(details.lengthSeconds, 10);
          }
          if (details.thumbnail?.thumbnails?.length) {
            const thumbs = details.thumbnail.thumbnails;
            thumbnailUrl = thumbs[thumbs.length - 1].url || thumbnailUrl;
          }
        }
      } catch (err) {
        console.error('Error parsing ytInitialPlayerResponse:', err);
      }
    }

    // Fallback title from <title> tag if not found
    if (!title) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\s*-\s*YouTube$/, '').trim();
      }
    }

    // Parse chapters from description
    const chapters = parseTimestamps(description);

    return NextResponse.json({
      success: true,
      videoId,
      title: title || `Video (${videoId})`,
      author,
      description,
      thumbnailUrl,
      duration,
      chapters,
    });
  } catch (error) {
    console.error('Server error fetching YouTube details:', error);
    return NextResponse.json(
      { success: false, error: 'Could not fetch video information from YouTube' },
      { status: 500 }
    );
  }
}
