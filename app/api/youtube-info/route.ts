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
    let html = '';
    let pageFetchSucceeded = false;

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
        pageFetchSucceeded = true;
      }
    } catch (err) {
      console.warn('Direct YouTube watch page fetch failed:', err);
    }

    let title = '';
    let author = '';
    let channelId = '';
    let channelUrl = '';
    let description = '';
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration = 0;

    // 1. Extract from ytInitialPlayerResponse JSON if present
    if (html) {
      const playerResponseMatch = html.match(
        /ytInitialPlayerResponse\s*=\s*({.+?});(?:var\s+|const\s+|let\s+|window\[|<)/
      );

      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const playerData = JSON.parse(playerResponseMatch[1]);
          const details = playerData.videoDetails;
          if (details) {
            title = details.title || '';
            author = details.author || '';
            channelId = details.channelId || '';
            if (channelId) {
              channelUrl = `https://www.youtube.com/channel/${channelId}`;
            }
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
    }

    // 2. Extract chapters and fallback title from ytInitialData
    let chapters: ReturnType<typeof parseTimestamps> = [];
    if (html) {
      try {
        const initDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (initDataMatch && initDataMatch[1]) {
          const initData = JSON.parse(initDataMatch[1]);

          // Deep search for title and author in initial data
          const findMetadata = (obj: unknown): { title?: string; author?: string } => {
            if (!obj || typeof obj !== 'object') return {};
            const rec = obj as Record<string, unknown>;

            if (rec.videoPrimaryInfoRenderer && typeof rec.videoPrimaryInfoRenderer === 'object') {
              const p = rec.videoPrimaryInfoRenderer as Record<string, unknown>;
              const titleObj = p.title as { runs?: Array<{ text?: string }>; simpleText?: string } | undefined;
              const foundTitle = titleObj?.runs?.[0]?.text || titleObj?.simpleText;
              if (foundTitle) return { title: foundTitle };
            }

            if (rec.playerOverlayVideoDetailsRenderer && typeof rec.playerOverlayVideoDetailsRenderer === 'object') {
              const p = rec.playerOverlayVideoDetailsRenderer as Record<string, unknown>;
              const titleObj = p.title as { simpleText?: string; runs?: Array<{ text?: string }> } | undefined;
              const foundTitle = titleObj?.simpleText || titleObj?.runs?.[0]?.text;
              if (foundTitle) return { title: foundTitle };
            }

            for (const v of Object.values(rec)) {
              if (typeof v === 'object' && v !== null) {
                const res = findMetadata(v);
                if (res.title) return res;
              }
            }
            return {};
          };

          const foundMeta = findMetadata(initData);
          if (!title && foundMeta.title) {
            title = foundMeta.title;
          }

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
    }

    // 3. Fall back to raw HTML title patterns if title is still missing
    if (!title && html) {
      const m1 = html.match(/"videoPrimaryInfoRenderer"\s*:\s*\{[^}]*?"title"\s*:\s*\{"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
      if (m1 && m1[1]) title = m1[1];
    }
    if (!title && html) {
      const m2 = html.match(/"playerOverlayVideoDetailsRenderer"\s*:\s*\{"title"\s*:\s*\{"simpleText"\s*:\s*"([^"]+)"/);
      if (m2 && m2[1]) title = m2[1];
    }
    if (!title && html) {
      const m3 = html.match(/"videoDetails"\s*:\s*\{[^}]*?"title"\s*:\s*"([^"]+)"/);
      if (m3 && m3[1]) title = m3[1];
    }

    // 4. Fall back to free official YouTube oEmbed endpoint if title, author, or channelUrl is still missing
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
          if (oembed.author_url) {
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

    if (!pageFetchSucceeded && !title) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch video information from YouTube' },
        { status: 502 }
      );
    }

    // Fall back to description timestamps if native chapters were not present
    if (chapters.length === 0 && description) {
      chapters = parseTimestamps(description, duration > 0 ? duration : undefined);
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
