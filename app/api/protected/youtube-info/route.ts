import { NextRequest, NextResponse } from 'next/server';
import { parseTimestamps } from '@/lib/youtubeParser';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/turnstile';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YT_INITIAL_PLAYER_RESPONSE_REGEX = /ytInitialPlayerResponse\s*=\s*({.+?});(?:var\s+|const\s+|let\s+|window\[|<)/;
const YT_INITIAL_DATA_REGEX = /ytInitialData\s*=\s*({.+?});<\/script>/;
const PRIMARY_TITLE_REGEX = /"videoPrimaryInfoRenderer"\s*:\s*\{[^}]*?"title"\s*:\s*\{"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/;
const OVERLAY_TITLE_REGEX = /"playerOverlayVideoDetailsRenderer"\s*:\s*\{"title"\s*:\s*\{"simpleText"\s*:\s*"([^"]+)"/;
const VIDEO_DETAILS_TITLE_REGEX = /"videoDetails"\s*:\s*\{[^}]*?"title"\s*:\s*"([^"]+)"/;

// Search recursively for macroMarkersListItemRenderer entries in YouTube responses
function findMarkers(obj: unknown, list: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
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
}

function extractChaptersFromMarkers(
  markerItems: Array<Record<string, unknown>>,
  videoDuration: number
): ReturnType<typeof parseTimestamps> {
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
      if (videoDuration > 0 && startTime >= videoDuration) {
        continue;
      }
      seenTimes.add(startTime);
      const timeDesc = item.timeDescription as { simpleText?: string } | undefined;
      parsedNative.push({
        title: itemTitle.trim() || `Chapter at ${startTime}`,
        startTime,
        formattedTime:
          timeDesc?.simpleText ||
          `${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')}`,
      });
    }
  }

  if (parsedNative.length === 0) return [];

  parsedNative.sort((a, b) => a.startTime - b.startTime);
  const finalEndTime = videoDuration > 0 ? videoDuration : Infinity;
  return parsedNative.map((chap, idx) => {
    const nextChapter = parsedNative[idx + 1];
    return {
      id: `chap-${idx}-${chap.startTime}`,
      index: idx + 1,
      title: chap.title,
      startTime: chap.startTime,
      endTime: nextChapter ? nextChapter.startTime : finalEndTime,
      formattedTime: chap.formattedTime,
      status: 'not_started' as const,
    };
  });
}

export async function GET(request: NextRequest) {
  // Reject cross-origin and direct-access requests (browser fetch always sends at least Referer)
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  let requestOriginHost = '';
  if (origin) {
    try {
      requestOriginHost = new URL(origin).host;
    } catch {
      /* malformed */
    }
  } else if (referer) {
    try {
      requestOriginHost = new URL(referer).host;
    } catch {
      /* malformed */
    }
  }

  if (!requestOriginHost || requestOriginHost !== host) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  // CF-Connecting-IP is the real client IP when proxied through Cloudflare
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  if (process.env.NODE_ENV === 'production') {
    const limit = checkRateLimit(clientIp);
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing YouTube video ID' },
      { status: 400 }
    );
  }

  const turnstileToken = request.headers.get('x-turnstile-token');
  const isDev = process.env.NODE_ENV !== 'production';

  if (!turnstileToken) {
    if (!isDev || process.env.TURNSTILE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Turnstile verification token missing' },
        { status: 403 }
      );
    }
  } else {
    const verification = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!verification.success) {
      if (!isDev || process.env.TURNSTILE_SECRET_KEY) {
        return NextResponse.json(
          { success: false, error: verification.error || 'Bot verification failed' },
          { status: 403 }
        );
      }
    }
  }

  try {
    let title = '';
    let author = '';
    let channelId = '';
    let channelUrl = '';
    let description = '';
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration = 0;
    let chapters: ReturnType<typeof parseTimestamps> = [];

    // 1. YouTube Innertube API (Player and Next endpoints)
    // Server-side HTML scraping triggers HTTP 429 rate-limiting; Innertube v1 provides structured metadata and markers.
    try {
      const innertubeBody = {
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'en',
            gl: 'US',
          },
        },
      };

      const [playerRes, nextRes] = await Promise.all([
        fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(innertubeBody),
          next: { revalidate: 3600 },
        }).catch(() => null),
        fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(innertubeBody),
          next: { revalidate: 3600 },
        }).catch(() => null),
      ]);

      if (playerRes && playerRes.ok) {
        const playerData = await playerRes.json();
        const details = playerData.videoDetails;
        if (details) {
          title = details.title || '';
          author = details.author || '';
          channelId = details.channelId || '';
          description = details.shortDescription || '';
          if (details.lengthSeconds) {
            duration = parseInt(details.lengthSeconds, 10);
          }
          if (details.thumbnail?.thumbnails?.length) {
            const thumbs = details.thumbnail.thumbnails;
            thumbnailUrl = thumbs[thumbs.length - 1].url || thumbnailUrl;
          }
        }
        const micro = playerData.microformat?.playerMicroformatRenderer;
        if (micro) {
          if (!author && micro.ownerChannelName) author = micro.ownerChannelName;
          if (micro.ownerProfileUrl) {
            channelUrl = micro.ownerProfileUrl.replace('http://', 'https://');
          }
        }
        if (!channelUrl && channelId) {
          channelUrl = `https://www.youtube.com/channel/${channelId}`;
        }
      }

      if (nextRes && nextRes.ok) {
        const nextData = await nextRes.json();
        const markerItems = findMarkers(nextData);
        if (markerItems.length > 0) {
          chapters = extractChaptersFromMarkers(markerItems, duration);
        }
      }
    } catch (err) {
      console.warn('Innertube fetch failed, attempting fallback:', err);
    }

    // 2. Fall back to watch page HTML scraping if Innertube did not provide full data
    let html = '';
    if (!title || chapters.length === 0) {
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

        if (response.ok) {
          html = await response.text();
        }
      } catch (err) {
        console.warn('Direct YouTube watch page fetch fallback failed:', err);
      }
    }

    // Extract from ytInitialPlayerResponse JSON if present in HTML
    if (html && (!title || !description)) {
      const playerResponseMatch = html.match(YT_INITIAL_PLAYER_RESPONSE_REGEX);

      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const playerData = JSON.parse(playerResponseMatch[1]);
          const details = playerData.videoDetails;
          if (details) {
            if (!title) title = details.title || '';
            if (!author) author = details.author || '';
            if (!channelId) channelId = details.channelId || '';
            if (!channelUrl && channelId) {
              channelUrl = `https://www.youtube.com/channel/${channelId}`;
            }
            if (!description) description = details.shortDescription || '';
            if (!duration && details.lengthSeconds) {
              duration = parseInt(details.lengthSeconds, 10);
            }
            if ((!thumbnailUrl || thumbnailUrl.includes('hqdefault.jpg')) && details.thumbnail?.thumbnails?.length) {
              const thumbs = details.thumbnail.thumbnails;
              thumbnailUrl = thumbs[thumbs.length - 1].url || thumbnailUrl;
            }
          }
        } catch (err) {
          console.error('Error parsing ytInitialPlayerResponse:', err);
        }
      }
    }

    // Extract chapters and metadata from ytInitialData if present in HTML
    if (html && chapters.length === 0) {
      try {
        const initDataMatch = html.match(YT_INITIAL_DATA_REGEX);
        if (initDataMatch && initDataMatch[1]) {
          const initData = JSON.parse(initDataMatch[1]);
          const markerItems = findMarkers(initData);
          if (markerItems.length > 0) {
            chapters = extractChaptersFromMarkers(markerItems, duration);
          }
        }
      } catch (err) {
        console.warn('Failed to extract native chapters from ytInitialData:', err);
      }
    }

    // Fall back to raw HTML title patterns if title is still missing
    if (!title && html) {
      const m1 = html.match(PRIMARY_TITLE_REGEX);
      if (m1 && m1[1]) title = m1[1];
    }
    if (!title && html) {
      const m2 = html.match(OVERLAY_TITLE_REGEX);
      if (m2 && m2[1]) title = m2[1];
    }
    if (!title && html) {
      const m3 = html.match(VIDEO_DETAILS_TITLE_REGEX);
      if (m3 && m3[1]) title = m3[1];
    }

    // 3. Fall back to official YouTube oEmbed endpoint if title, author, or channelUrl is still missing
    if (!title || !author || !channelUrl) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { next: { revalidate: 86400 } }
        );
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          if (!title && oembed.title) title = oembed.title;
          if (!author && oembed.author_name) author = oembed.author_name;
          if (!channelUrl && oembed.author_url) {
            channelUrl = oembed.author_url;
          }
          if ((!thumbnailUrl || thumbnailUrl.includes('hqdefault.jpg')) && oembed.thumbnail_url) {
            thumbnailUrl = oembed.thumbnail_url;
          }
        }
      } catch (err) {
        console.warn('YouTube oEmbed fallback error:', err);
      }
    }

    // 4. Fall back to parsing timestamps from description if native chapters were not found
    if (chapters.length === 0 && description) {
      chapters = parseTimestamps(description, duration > 0 ? duration : undefined);
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch video information from YouTube' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId,
      title: title.trim(),
      author: author.trim(),
      channelId,
      channelUrl,
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
