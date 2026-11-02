import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  isClientCleared,
  grantClientClearance,
  verifyTurnstileToken,
} from '@/lib/turnstile';
import { YouTubeSearchResultItem } from '@/types/search';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const TIMESTAMP_REGEX = /(?:\[|\()?\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b(?:\]|\)?)/;

// In-memory server cache for search results (15-minute TTL)
interface SearchCacheEntry {
  results: YouTubeSearchResultItem[];
  expiresAt: number;
}

const searchCache = new Map<string, SearchCacheEntry>();
let lastCacheCleanup = Date.now();

function evictStaleCache(now: number) {
  if (now - lastCacheCleanup < 60_000) return;
  lastCacheCleanup = now;
  for (const [key, entry] of searchCache) {
    if (now > entry.expiresAt) searchCache.delete(key);
  }
}

function getCachedSearch(query: string): YouTubeSearchResultItem[] | null {
  const now = Date.now();
  evictStaleCache(now);
  const entry = searchCache.get(query.toLowerCase());
  if (!entry) return null;
  if (now > entry.expiresAt) {
    searchCache.delete(query.toLowerCase());
    return null;
  }
  return entry.results;
}

function setCachedSearch(
  query: string,
  results: YouTubeSearchResultItem[],
  ttlMs = 15 * 60 * 1000
) {
  const now = Date.now();
  evictStaleCache(now);
  searchCache.set(query.toLowerCase(), {
    results,
    expiresAt: now + ttlMs,
  });
}

interface InnertubeVideoRenderer {
  videoId?: string;
  title?: {
    runs?: Array<{ text?: string }>;
    simpleText?: string;
  };
  ownerText?: {
    runs?: Array<{ text?: string; browseEndpoint?: { browseId?: string } }>;
  };
  shortBylineText?: {
    runs?: Array<{ text?: string }>;
  };
  lengthText?: {
    simpleText?: string;
  };
  viewCountText?: {
    simpleText?: string;
  };
  shortViewCountText?: {
    simpleText?: string;
  };
  publishedTimeText?: {
    simpleText?: string;
  };
  thumbnail?: {
    thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  };
  expandableMetadata?: {
    expandableMetadataRenderer?: {
      header?: {
        collapsedTitle?: {
          runs?: Array<{ text?: string }>;
        };
      };
    };
  };
  detailedMetadataSnippets?: Array<{
    snippetText?: {
      runs?: Array<{ text?: string }>;
    };
  }>;
}

// Traverse YouTube Innertube JSON response to find all videoRenderer objects
function extractVideoRenderers(
  obj: unknown,
  list: InnertubeVideoRenderer[] = []
): InnertubeVideoRenderer[] {
  if (!obj || typeof obj !== 'object') return list;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractVideoRenderers(item, list);
    }
    return list;
  }

  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'videoRenderer' && value && typeof value === 'object') {
      list.push(value as InnertubeVideoRenderer);
    } else {
      extractVideoRenderers(value, list);
    }
  }

  return list;
}

export async function GET(request: NextRequest) {
  // Reject cross-origin and direct-access requests
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
    const limit = checkRateLimit(`search:${clientIp}`, {
      windowMs: 60_000,
      max: 30,
    });
    if (!limit.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Search rate limit exceeded. Please wait a moment or paste the direct video URL.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        }
      );
    }
  }

  const turnstileToken = request.headers.get('x-turnstile-token');
  const isDev = process.env.NODE_ENV !== 'production';

  // Enforce Cloudflare Turnstile bot verification unless the client IP has an active session clearance
  if (!isClientCleared(clientIp)) {
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
      // Grant 15-minute search session clearance for verified human clients
      grantClientClearance(clientIp);
    }
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'Search query must be at least 2 characters long' },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  // Check server cache first (saves outbound calls to YouTube)
  const cachedResults = getCachedSearch(trimmedQuery);
  if (cachedResults) {
    return NextResponse.json({
      success: true,
      results: cachedResults,
      cached: true,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const innertubeBody = {
      query: trimmedQuery,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
          hl: 'en',
          gl: 'US',
        },
      },
    };

    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(innertubeBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `YouTube search error: HTTP ${res.status}`,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const renderers = extractVideoRenderers(data);

    const seenIds = new Set<string>();
    const results: YouTubeSearchResultItem[] = [];

    for (const vr of renderers) {
      const vid = vr.videoId;
      if (!vid || !YOUTUBE_ID_REGEX.test(vid) || seenIds.has(vid)) {
        continue;
      }
      seenIds.add(vid);

      const title =
        vr.title?.runs?.map((r) => r.text || '').join('') ||
        vr.title?.simpleText ||
        '';

      if (!title) continue;

      const author =
        vr.ownerText?.runs?.[0]?.text ||
        vr.shortBylineText?.runs?.[0]?.text ||
        '';

      const duration = vr.lengthText?.simpleText || '';
      const views =
        vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || '';
      const publishedTime = vr.publishedTimeText?.simpleText || '';

      const thumbs = vr.thumbnail?.thumbnails || [];
      let thumbnailUrl =
        thumbs.length > 0
          ? thumbs[thumbs.length - 1].url
          : `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

      if (thumbnailUrl.startsWith('//')) {
        thumbnailUrl = 'https:' + thumbnailUrl;
      }

      // Detect chapters via expandableMetadata (native chapters) or description snippets
      let hasChapters = false;
      let chapterTitles: string[] | undefined;

      const expRuns =
        vr.expandableMetadata?.expandableMetadataRenderer?.header?.collapsedTitle
          ?.runs;
      if (expRuns && expRuns.length > 0) {
        const expText = expRuns.map((r) => r.text || '').join('');
        if (expText.includes('|')) {
          const splitParts = expText
            .split('|')
            .map((p) => p.trim())
            .filter(Boolean);
          if (splitParts.length > 1) {
            hasChapters = true;
            chapterTitles = splitParts;
          }
        } else if (TIMESTAMP_REGEX.test(expText)) {
          hasChapters = true;
        }
      }

      const snippetRuns =
        vr.detailedMetadataSnippets?.[0]?.snippetText?.runs || [];
      const descriptionSnippet = snippetRuns
        .map((r) => r.text || '')
        .join('');

      if (!hasChapters && descriptionSnippet && TIMESTAMP_REGEX.test(descriptionSnippet)) {
        hasChapters = true;
      }

      results.push({
        videoId: vid,
        title: title.trim(),
        author: author.trim(),
        duration,
        views,
        publishedTime,
        thumbnailUrl,
        hasChapters,
        chapterCount: chapterTitles ? chapterTitles.length : undefined,
        chapterTitles: chapterTitles ? chapterTitles.slice(0, 10) : undefined,
        descriptionSnippet,
      });

      // Limit results to top 20 items for fast rendering and bandwidth efficiency
      if (results.length >= 20) {
        break;
      }
    }

    // Cache successful search results
    setCachedSearch(trimmedQuery, results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('YouTube search route error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'YouTube search request timed out'
            : 'Could not complete YouTube search',
      },
      { status: 500 }
    );
  }
}
