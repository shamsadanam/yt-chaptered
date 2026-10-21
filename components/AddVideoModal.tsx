'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WandSparkles, Loader2, AlertCircle, ArrowRight, ChevronDown, X } from 'lucide-react';
import { extractYouTubeId, parseTimestamps } from '../lib/youtubeParser';
import { ParsedPlaylist } from '../types/playlist';
import { TurnstileWidget } from './TurnstileWidget';
import { useScrollLock } from '../hooks/useScrollLock';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (playlist: ParsedPlaylist) => void;
}

const SAMPLE_DATA = {
  url: 'https://www.youtube.com/watch?v=soTfFFIQQ8U&t=1s',
  videoId: 'soTfFFIQQ8U',
  title: 'Design Software Systems Like a Senior Engineer – Complete Course',
  author: 'freeCodeCamp.org',
  description: `0:00:00 Why System Design Matters
0:02:16 Interview Formats Overview
0:09:14 The 5 Step Framework
0:18:24 Tradeoffs and Extensions
0:23:55 Requirements and Capacity Planning
0:29:24 Architecture and Data Flows
0:35:23 API Design
0:40:04 Storage and Schema Design
0:44:37 Scaling to Millions
0:50:52 Non-Functional Targets
0:58:22 Capacity Math and Architecture
1:11:02 API Design and Idempotency
1:22:34 Data Modeling and Inventory Logic
1:33:05 Concurrency and Race Conditions
1:34:44 Sharding, Caching and Scaling
1:40:41 Search at Scale (Elasticsearch)
1:45:19 Replication and Global Routing
1:50:45 Scale Estimation
1:56:38 Architecture and Real Time Communication
2:07:04 Data Modeling and API Flows
2:13:10 Multi Device Sync and Offline Delivery
2:22:37 Fanout, Media Storage and CDN Delivery
2:31:44 Event Driven Architecture and Batch Processing
2:39:18 Encryption and Rate Limiting
2:49:45 Sharding and Cleanup Jobs
2:57:53 Failure Handling and Global Scaling
3:09:08 Feature Flags and Rollouts
3:11:14 How to Actually Get Better`,
};

export function AddVideoModal({ isOpen, onClose, onGenerate }: AddVideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [url, setUrl] = useState('');
  const [timestampsText, setTimestampsText] = useState('');
  const [isExpandTimestamps, setIsExpandTimestamps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchStatus, setAutoFetchStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cachedVideoInfo, setCachedVideoInfo] = useState<{
    videoId: string;
    title: string;
    author?: string;
    channelId?: string;
    channelUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  } | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);

  const handleTokenChange = useCallback((token: string | null) => {
    turnstileTokenRef.current = token;
    setTurnstileToken(token);
  }, []);

  const waitForToken = useCallback(async (timeoutMs = 2500): Promise<string | null> => {
    if (turnstileTokenRef.current) return turnstileTokenRef.current;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (turnstileTokenRef.current) return turnstileTokenRef.current;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return turnstileTokenRef.current;
  }, []);

  // Smooth opening and closing animation coordination
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsLoading(false);
      setErrorMessage(null);
      setAutoFetchStatus(null);
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    setIsVisible(false);
    setIsLoading(false);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Lock body & document scroll while modal is active without layout shift
  useScrollLock(isRendered);

  // Focus management and keyboard navigation
  useEffect(() => {
    if (!isRendered) return;

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRendered, handleRequestClose]);

  const fetchFromLocalApi = async (videoId: string, explicitToken?: string | null) => {
    try {
      const token = explicitToken !== undefined ? explicitToken : await waitForToken(1500);
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-turnstile-token'] = token;
      }
      const res = await fetch(`/api/protected/youtube-info?videoId=${videoId}`, { headers });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success) {
        return data;
      }
      return {
        success: false,
        error: data?.error || `Failed to fetch video details (HTTP ${res.status})`,
      };
    } catch (err) {
      console.warn('Local auto-fetch failed:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error while fetching video details',
      };
    }
  };

  const handleAutoFetchClick = async () => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video URL first');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setAutoFetchStatus('Verifying & fetching video details...');

    try {
      const token = await waitForToken(1500);
      const autoData = await fetchFromLocalApi(videoId, token);
      if (autoData && autoData.success) {
        if (autoData.title) {
          setCachedVideoInfo({
            videoId,
            title: autoData.title,
            author: autoData.author,
            channelId: autoData.channelId,
            channelUrl: autoData.channelUrl,
            thumbnailUrl: autoData.thumbnailUrl,
            duration: autoData.duration,
          });
        }
        if (autoData.description) {
          setTimestampsText(autoData.description);
          setIsExpandTimestamps(true);
        }
        if (autoData.chapters && autoData.chapters.length > 0) {
          setAutoFetchStatus(`Found ${autoData.chapters.length} chapters automatically!`);
        } else {
          setAutoFetchStatus(
            autoData.title
              ? `Found "${autoData.title}", but no timestamps were detected.`
              : 'Found video, but no timestamps were detected.'
          );
        }
        return;
      }

      setErrorMessage(
        autoData?.error || 'Could not auto-fetch timestamps. You can paste them manually below.'
      );
      setIsExpandTimestamps(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error auto-fetching. Please paste timestamps manually.'
      );
      setIsExpandTimestamps(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = () => {
    setUrl(SAMPLE_DATA.url);
    setTimestampsText(SAMPLE_DATA.description);
    setIsExpandTimestamps(true);
    setErrorMessage(null);
    setAutoFetchStatus('Sample course loaded with 28 chapters');
    setCachedVideoInfo({
      videoId: SAMPLE_DATA.videoId,
      title: SAMPLE_DATA.title,
      author: SAMPLE_DATA.author,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAutoFetchStatus(null);

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube URL or ID');
      return;
    }

    let parsedChapters = parseTimestamps(timestampsText);
    const hasCached = cachedVideoInfo?.videoId === videoId;
    let videoTitle = hasCached && cachedVideoInfo?.title ? cachedVideoInfo.title : '';
    let authorName: string | undefined = hasCached ? cachedVideoInfo?.author : undefined;
    let channelId: string | undefined = hasCached ? cachedVideoInfo?.channelId : undefined;
    let channelUrl: string | undefined = hasCached ? cachedVideoInfo?.channelUrl : undefined;
    const thumbnailUrl =
      (hasCached && cachedVideoInfo?.thumbnailUrl) ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration: number | undefined = hasCached ? cachedVideoInfo?.duration : undefined;

    setIsLoading(true);

    try {
      if (parsedChapters.length === 0 || !videoTitle || !authorName) {
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData && autoData.success) {
          if (autoData.title && (!videoTitle || videoTitle === 'YouTube Video')) videoTitle = autoData.title;
          if (autoData.author && !authorName) authorName = autoData.author;
          if (autoData.channelId && !channelId) channelId = autoData.channelId;
          if (autoData.channelUrl && !channelUrl) channelUrl = autoData.channelUrl;
          if (autoData.duration && !duration) duration = autoData.duration;
          if (parsedChapters.length === 0) {
            if (autoData.chapters && autoData.chapters.length > 0) {
              parsedChapters = autoData.chapters;
            } else if (autoData.description) {
              parsedChapters = parseTimestamps(autoData.description, duration);
            }
          }
        } else if (parsedChapters.length === 0) {
          setErrorMessage(
            autoData?.error || 'Could not fetch video details. Please check the URL or paste timestamps manually.'
          );
          setIsExpandTimestamps(true);
          setIsLoading(false);
          return;
        }
      }

      // Direct browser oEmbed fallback if title or author is still missing
      if (!videoTitle || !authorName) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData.title && (!videoTitle || videoTitle === 'YouTube Video')) videoTitle = oembedData.title;
            if (oembedData.author_name && !authorName) authorName = oembedData.author_name;
            if (oembedData.author_url && !channelUrl) channelUrl = oembedData.author_url;
          }
        } catch {
          // Silent fallback
        }
      }

      if (!videoTitle) {
        videoTitle = 'YouTube Video';
      }

      // If no chapters could be detected or parsed, report error to user instead of creating a dummy single-chapter playlist
      if (parsedChapters.length === 0) {
        if (timestampsText.trim().length > 0) {
          setErrorMessage('No valid timestamps found in the pasted text. Format timestamps as 0:00 Chapter Title.');
        } else {
          setErrorMessage('No chapter timestamps found for this video. Paste timestamps below, or enter "0:00 Full Video" to continue.');
          setIsExpandTimestamps(true);
        }
        setIsLoading(false);
        return;
      }

      // Build valid playlist
      const playlist: ParsedPlaylist = {
        video: {
          id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: videoTitle,
          author: authorName,
          channelId,
          channelUrl,
          thumbnailUrl,
        },
        chapters: parsedChapters,
        rawTimestampsText: timestampsText,
      };

      // Clear input fields and reset loading state upon successful conversion
      setUrl('');
      setTimestampsText('');
      setIsExpandTimestamps(false);
      setCachedVideoInfo(null);
      setAutoFetchStatus(null);
      setErrorMessage(null);
      setIsLoading(false);

      onGenerate(playlist);
      handleRequestClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred while generating the playlist.');
      setIsLoading(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-video-modal-title"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ease-out pr-scrollbar-compensation ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        ref={modalRef}
        className={`w-full sm:max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] transition-all duration-200 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-6 sm:translate-y-2 sm:scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div>
            <h2 id="add-video-modal-title" className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
              Add Video Course
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Paste a YouTube URL to automatically detect chapters
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto overscroll-contain space-y-4">
          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="modal-yt-url" className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                YouTube Video URL
              </label>
              <button
                type="button"
                onClick={handleAutoFetchClick}
                disabled={isLoading || !url.trim()}
                aria-label="Auto-detect timestamps and video info"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary dark:text-emerald-400 bg-primary/5 hover:bg-primary/10 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-3 h-3" aria-hidden="true" />
                ) : (
                  <WandSparkles className="w-3 h-3" aria-hidden="true" />
                )}
                <span>Auto Detect</span>
              </button>
            </div>
            <input
              ref={inputRef}
              id="modal-yt-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setErrorMessage(null);
                setAutoFetchStatus(null);
              }}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              required
            />
            {autoFetchStatus && (
              <p className="mt-1.5 text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-500">●</span>
                <span>{autoFetchStatus}</span>
              </p>
            )}
            {errorMessage && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Timestamps Accordion */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Timestamps or Description
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSample}
                  aria-label="Load sample System Design course with 28 chapters"
                  className="text-xs text-stone-500 hover:text-primary dark:hover:text-emerald-400 underline cursor-pointer"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandTimestamps(!isExpandTimestamps)}
                  className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 underline cursor-pointer"
                >
                  {isExpandTimestamps ? 'Collapse' : 'Manual paste'}
                </button>
              </div>
            </div>

            {isExpandTimestamps ? (
              <textarea
                rows={4}
                value={timestampsText}
                onChange={(e) => setTimestampsText(e.target.value)}
                placeholder={'Optional (automatically detected if left blank):\n00:00 Intro\n03:15 Getting Started\n10:00 Building'}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg font-mono font-tnum text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsExpandTimestamps(true)}
                className="w-full text-left px-3 py-2 bg-stone-50 hover:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-stone-500 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>Auto-loads from YouTube description</span>
                <span className="inline-flex items-center gap-1 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 font-medium">
                  <span>Custom timestamps</span>
                  <ChevronDown className="w-3 h-3" />
                </span>
              </button>
            )}
          </div>

          <TurnstileWidget
            onTokenChange={handleTokenChange}
            action="create_playlist"
            className="flex justify-start empty:hidden"
          />

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-primary active:bg-primary-hover hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
                  <span>Generating Playlist...</span>
                </>
              ) : (
                <>
                  <span>Generate Playlist</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
