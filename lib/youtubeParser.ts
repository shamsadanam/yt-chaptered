import { Chapter, VideoMetadata } from '../types/playlist';

/**
 * Extracts a standard YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Raw 11-character video ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();

  // Direct 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    if (parsed.hostname.includes('youtube.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments[0] === 'embed' || pathSegments[0] === 'shorts' || pathSegments[0] === 'v') {
        if (pathSegments[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathSegments[1])) {
          return pathSegments[1];
        }
      }
    }

    if (parsed.hostname === 'youtu.be') {
      const pathId = parsed.pathname.slice(1).split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(pathId)) {
        return pathId;
      }
    }
  } catch {
    // If URL parsing fails, attempt regex fallback
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Converts timestamp string (e.g., "1:23:45", "02:15", "0:00") into total seconds.
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map((part) => parseInt(part, 10));
  if (parts.some((p) => isNaN(p))) return 0;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Formats seconds into MM:SS or H:MM:SS.
 */
export function secondsToTimestamp(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const formattedSeconds = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }

  return `${minutes}:${formattedSeconds}`;
}

/**
 * Robustly parses text containing timestamps and chapter titles.
 * Handles formats like:
 * - 00:00 Introduction
 * - 01:23 - Setting up the environment
 * - [05:42] Building components
 * - (1:12:00) Summary & Conclusion
 * - 1. 00:00 Welcome
 */
export function parseTimestamps(text: string, maxDuration?: number): Chapter[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const timestampRegex = /(?:\[|\()?\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b(?:\]|\)?)/;

  const rawChapters: Array<{ title: string; startTime: number; formattedTime: string }> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = trimmedLine.match(timestampRegex);
    if (!match || !match[1]) continue;

    const rawTimestamp = match[1];
    const startTime = timestampToSeconds(rawTimestamp);

    // If a max video duration is known, ignore timestamps at or beyond video end
    if (typeof maxDuration === 'number' && maxDuration > 0 && startTime >= maxDuration) {
      continue;
    }

    // Remove the timestamp and any surrounding brackets/delimiters from line
    let title = trimmedLine.replace(match[0], '').trim();

    // Clean up typical delimiters like leading "- ", "— ", ": ", numbering "1. ", etc.
    title = title
      .replace(/^[\s\-–—:|\.\]\)]+/, '')
      .replace(/[\s\-–—:|\.\[\(]+$/, '')
      .trim();

    if (!title) {
      title = `Chapter at ${secondsToTimestamp(startTime)}`;
    }

    rawChapters.push({
      title,
      startTime,
      formattedTime: secondsToTimestamp(startTime),
    });
  }

  if (rawChapters.length === 0) {
    return [];
  }

  // Sort chronologically
  rawChapters.sort((a, b) => a.startTime - b.startTime);

  // Deduplicate entries with exact same start time (keep the one with longest title)
  const uniqueChapters: typeof rawChapters = [];
  for (const chap of rawChapters) {
    const last = uniqueChapters[uniqueChapters.length - 1];
    if (last && last.startTime === chap.startTime) {
      if (chap.title.length > last.title.length) {
        uniqueChapters[uniqueChapters.length - 1] = chap;
      }
    } else {
      uniqueChapters.push(chap);
    }
  }

  // Ensure first chapter starts at 0 if not present, or preserve start times
  const chapters: Chapter[] = uniqueChapters.map((chap, idx) => {
    const nextChapter = uniqueChapters[idx + 1];
    const finalEndTime = typeof maxDuration === 'number' && maxDuration > 0 ? maxDuration : Infinity;
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

  return chapters;
}

/**
 * Fetches video snippet (title, description, author, thumbnail) via YouTube Data API v3 if an API key is provided.
 */
export async function fetchYouTubeMetadataWithApiKey(
  videoId: string,
  apiKey: string
): Promise<{ title: string; description: string; author: string; thumbnailUrl: string } | null> {
  try {
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const snippet = data.items[0].snippet;
    return {
      title: snippet.title || 'Untitled Video',
      description: snippet.description || '',
      author: snippet.channelTitle || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
    };
  } catch {
    return null;
  }
}

/**
 * Creates default initial video metadata object.
 */
export function createDefaultVideoMetadata(videoId: string, title?: string): VideoMetadata {
  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: title || 'YouTube Video',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}
