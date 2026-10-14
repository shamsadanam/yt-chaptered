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

    // Attempt to extract YouTube's verified native chapters first
    let chapters: ReturnType<typeof parseTimestamps> = [];
    try {
      const initDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (initDataMatch && initDataMatch[1]) {
        const initData = JSON.parse(initDataMatch[1]);

        // Deep-search for macroMarkersListItemRenderer entries
        const findMarkers = (obj: unknown, list: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> => {
          if (!obj || typeof obj !== 'object') return list;
          if (Array.isArray(obj)) {
            for (const item of obj) findMarkers(item, list);
            return list;
          }
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (k === 'macroMarkersListItemRenderer' && v && typeof v === 'object') {
              list.push(v as Record<string, unknown>);
            } else {
              findMarkers(v, list);
            }
          }
          return list;
        };

        const markerItems = findMarkers(initData);
        if (markerItems.length > 0) {
          const seenTimes = new Set<number>();
          const parsedNative: Array<{ title: string; startTime: number; formattedTime: string }> = [];

          for (const item of markerItems) {
            const itemTitleObj = item.title as { simpleText?: string; runs?: Array<{ text?: string }> } | undefined;
            const itemTitle =
              itemTitleObj?.simpleText ||
              (itemTitleObj?.runs ? itemTitleObj.runs.map((r) => r.text || '').join('') : '') ||
              '';

            const tapEndpoint = item.onTap as { watchEndpoint?: { startTimeSeconds?: number } } | undefined;
            const startTime = tapEndpoint?.watchEndpoint?.startTimeSeconds;

            if (typeof startTime === 'number' && !seenTimes.has(startTime)) {
              if (duration > 0 && startTime >= duration) {
                continue;
              }
              seenTimes.add(startTime);
              const timeDesc = item.timeDescription as { simpleText?: string } | undefined;
              parsedNative.push({
                title: itemTitle.trim() || `Chapter at ${startTime}`,
                startTime,
                formattedTime: timeDesc?.simpleText || `${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')}`,
              });
            }
          }

          if (parsedNative.length > 0) {
            parsedNative.sort((a, b) => a.startTime - b.startTime);
            const finalEndTime = duration > 0 ? duration : Infinity;
            chapters = parsedNative.map((chap, idx) => {
              const nextChapter = parsedNative[idx + 1];
              return {
                id: `chap-${idx}-${chap.startTime}`,
                index: idx + 1,
                title: chap.title,
                startTime: chap.startTime,
                endTime: nextChapter ? nextChapter.startTime : finalEndTime,
                formattedTime: chap.formattedTime,
                status: 'not_started',
              };
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to extract native chapters from ytInitialData:', err);
    }

    // Fall back to description timestamps if native chapters were not present
    if (chapters.length === 0) {
      chapters = parseTimestamps(description, duration > 0 ? duration : undefined);
    }

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
