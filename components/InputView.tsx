"use client";

import { useState, useRef, useCallback } from "react";
import {
  WandSparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { extractYouTubeId, parseTimestamps } from "../lib/youtubeParser";
import { ParsedPlaylist } from "../types/playlist";
import { TurnstileWidget } from "./TurnstileWidget";

interface InputViewProps {
  onGenerate: (playlist: ParsedPlaylist) => void;
}

const SAMPLE_DATA = {
  url: "https://www.youtube.com/watch?v=soTfFFIQQ8U&t=1s",
  videoId: "soTfFFIQQ8U",
  title: "Design Software Systems Like a Senior Engineer – Complete Course",
  author: "freeCodeCamp.org",
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

export function InputView({ onGenerate }: InputViewProps) {
  const [url, setUrl] = useState("");
  const [timestampsText, setTimestampsText] = useState("");
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

  const turnstileTokenRef = useRef<string | null>(null);

  const handleTokenChange = useCallback((token: string | null) => {
    turnstileTokenRef.current = token;
  }, []);

  const waitForToken = useCallback(
    async (timeoutMs = 2500): Promise<string | null> => {
      if (turnstileTokenRef.current) return turnstileTokenRef.current;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (turnstileTokenRef.current) return turnstileTokenRef.current;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return turnstileTokenRef.current;
    },
    [],
  );

  const urlInputRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    setUrl(SAMPLE_DATA.url);
    setTimestampsText(SAMPLE_DATA.description);
    setIsExpandTimestamps(true);
    setErrorMessage(null);
    setAutoFetchStatus("Sample course loaded with 28 chapters");
    setCachedVideoInfo({
      videoId: SAMPLE_DATA.videoId,
      title: SAMPLE_DATA.title,
      author: SAMPLE_DATA.author,
    });
  };

  const fetchFromLocalApi = async (
    videoId: string,
    explicitToken?: string | null,
  ) => {
    try {
      const token =
        explicitToken !== undefined ? explicitToken : await waitForToken(1500);
      const headers: Record<string, string> = {};
      if (token) {
        headers["x-turnstile-token"] = token;
      }
      const res = await fetch(
        `/api/protected/youtube-info?videoId=${videoId}`,
        {
          headers,
        },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success) {
        return data;
      }
      return {
        success: false,
        error: data?.error || `Failed to fetch video details (HTTP ${res.status})`,
      };
    } catch (err) {
      console.warn("Local auto-fetch failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error while fetching video details",
      };
    }
  };

  const handleAutoFetchClick = async () => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage("Please enter a valid YouTube video URL first");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setAutoFetchStatus("Verifying & fetching video details and timestamps...");

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
          setAutoFetchStatus(
            `Successfully found ${autoData.chapters.length} chapters automatically!`,
          );
        } else {
          setAutoFetchStatus(
            autoData.title
              ? `Found "${autoData.title}", but no timestamps were detected.`
              : "Found video, but no timestamps were detected.",
          );
        }
        return;
      }

      setErrorMessage(
        autoData?.error || "Could not auto-fetch timestamps. You can paste them manually below.",
      );
      setIsExpandTimestamps(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error auto-fetching. Please paste timestamps manually.",
      );
      setIsExpandTimestamps(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAutoFetchStatus(null);

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage(
        "Please enter a valid YouTube video URL or ID (e.g., youtube.com/watch?v=... or youtu.be/...)",
      );
      return;
    }

    let parsedChapters = parseTimestamps(timestampsText);
    const hasCached = cachedVideoInfo?.videoId === videoId;
    let videoTitle =
      hasCached && cachedVideoInfo?.title ? cachedVideoInfo.title : "";
    let authorName: string | undefined = hasCached
      ? cachedVideoInfo?.author
      : undefined;
    let channelId: string | undefined = hasCached
      ? cachedVideoInfo?.channelId
      : undefined;
    let channelUrl: string | undefined = hasCached
      ? cachedVideoInfo?.channelUrl
      : undefined;
    let thumbnailUrl =
      (hasCached && cachedVideoInfo?.thumbnailUrl) ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration: number | undefined = hasCached
      ? cachedVideoInfo?.duration
      : undefined;

    setIsLoading(true);

    try {
      if (parsedChapters.length === 0 || !videoTitle || !authorName) {
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData && autoData.success) {
          if (autoData.title && (!videoTitle || videoTitle === "YouTube Video")) videoTitle = autoData.title;
          if (autoData.author && !authorName) authorName = autoData.author;
          if (autoData.channelId && !channelId) channelId = autoData.channelId;
          if (autoData.channelUrl && !channelUrl) channelUrl = autoData.channelUrl;
          if (autoData.thumbnailUrl) thumbnailUrl = autoData.thumbnailUrl;
          if (autoData.duration && !duration) duration = autoData.duration;
          if (parsedChapters.length === 0) {
            if (autoData.chapters && autoData.chapters.length > 0) {
              parsedChapters = autoData.chapters;
              setTimestampsText(autoData.description || "");
              setIsExpandTimestamps(true);
            } else if (autoData.description) {
              parsedChapters = parseTimestamps(autoData.description, duration);
              setTimestampsText(autoData.description);
              setIsExpandTimestamps(true);
            }
          }
        } else if (parsedChapters.length === 0) {
          setErrorMessage(
            autoData?.error || "Could not fetch video details. Please check the URL or paste timestamps manually.",
          );
          setIsExpandTimestamps(true);
          setIsLoading(false);
          return;
        }
      }

      // Direct browser oEmbed fallback if title or channelUrl is still missing
      if (!videoTitle || !channelUrl) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData.title && !videoTitle) videoTitle = oembedData.title;
            if (oembedData.author_name && !authorName)
              authorName = oembedData.author_name;
            if (oembedData.author_url && !channelUrl)
              channelUrl = oembedData.author_url;
            if (
              oembedData.thumbnail_url &&
              (!thumbnailUrl || thumbnailUrl.includes("hqdefault.jpg"))
            ) {
              thumbnailUrl = oembedData.thumbnail_url;
            }
          }
        } catch {
          // Silent fallback
        }
      }

      if (!videoTitle) {
        videoTitle = "YouTube Video";
      }

      // If no chapters could be detected or parsed, report error instead of dummy playlist
      if (parsedChapters.length === 0) {
        if (timestampsText.trim().length > 0) {
          setErrorMessage(
            "No valid timestamps found in the pasted text. Format timestamps as 0:00 Chapter Title.",
          );
        } else {
          setErrorMessage(
            'No chapter timestamps found for this video. Paste timestamps below, or enter "0:00 Full Video" to continue.',
          );
          setIsExpandTimestamps(true);
        }
        setIsLoading(false);
        return;
      }

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

      setIsLoading(false);
      onGenerate(playlist);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred while generating the playlist.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Clean Hero Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium text-stone-900 dark:text-stone-100 tracking-tight mb-3 sm:mb-4">
          Turn timestamped videos into structured playlists
        </h1>
        <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-xl mx-auto leading-relaxed">
          Paste any YouTube URL to automatically detect chapters, navigate segments, and track learning progress locally.
        </p>
      </div>

      {/* Main Input Card */}
      <div
        id="course-input-card"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 sm:p-8 shadow-xs"
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label
                htmlFor="yt-url"
                className="block text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100"
              >
                YouTube Video URL
              </label>
              <button
                type="button"
                onClick={handleAutoFetchClick}
                disabled={isLoading || !url.trim()}
                aria-label="Auto-detect timestamps and video info"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary dark:text-emerald-400 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-primary/20 dark:border-emerald-800/50 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation min-h-8.5"
              >
                {isLoading ? (
                  <Loader2
                    className="animate-spin w-3.5 h-3.5 text-primary dark:text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <WandSparkles
                    className="w-3.5 h-3.5 text-primary dark:text-emerald-400"
                    aria-hidden="true"
                  />
                )}
                <span>Auto Detect</span>
              </button>
            </div>
            <div className="relative">
              <input
                ref={urlInputRef}
                id="yt-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErrorMessage(null);
                  setAutoFetchStatus(null);
                }}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={
                  errorMessage
                    ? "yt-url-error"
                    : autoFetchStatus
                      ? "yt-url-status"
                      : undefined
                }
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                required
              />
            </div>
            {autoFetchStatus && (
              <p
                id="yt-url-status"
                role="status"
                aria-live="polite"
                className="mt-2 text-xs text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5"
              >
                <span className="text-emerald-500" aria-hidden="true">
                  ●
                </span>
                {autoFetchStatus}
              </p>
            )}
            {errorMessage && (
              <p
                id="yt-url-error"
                role="alert"
                aria-live="assertive"
                className="mt-2 text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {errorMessage}
              </p>
            )}
          </div>

          {/* Description / Timestamps Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label
                htmlFor="yt-timestamps"
                className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100"
              >
                Timestamps or Description
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={loadSample}
                  aria-label="Load sample System Design course with 28 chapters"
                  className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-primary dark:hover:text-emerald-400 underline focus:outline-none cursor-pointer min-h-9 flex items-center touch-manipulation"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandTimestamps(!isExpandTimestamps)}
                  aria-expanded={isExpandTimestamps}
                  aria-controls="yt-timestamps-panel"
                  className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline focus:outline-none cursor-pointer min-h-9 flex items-center touch-manipulation"
                >
                  {isExpandTimestamps ? "Collapse" : "Manual paste"}
                </button>
              </div>
            </div>

            {/* Collapsed Timestamps Placeholder Button */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isExpandTimestamps
                  ? "grid-rows-collapse opacity-0 pointer-events-none"
                  : "grid-rows-expand opacity-100"
              }`}
            >
              <div className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsExpandTimestamps(true)}
                  aria-expanded={isExpandTimestamps}
                  aria-controls="yt-timestamps-panel"
                  className="w-full text-left px-3.5 sm:px-4 py-2.5 sm:py-3 bg-stone-50 hover:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md text-xs sm:text-sm text-stone-600 dark:text-stone-400 cursor-pointer transition-colors flex items-center justify-between touch-manipulation group"
                >
                  <span className="truncate">
                    Chapters auto-load; tap to review or paste custom timestamps
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 shrink-0 ml-2 transition-colors"
                    aria-hidden="true"
                  >
                    <span>Add custom</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </div>

            {/* Expanded Timestamps Textarea Area */}
            <div
              id="yt-timestamps-panel"
              className={`grid transition-all duration-300 ease-in-out ${
                isExpandTimestamps
                  ? "grid-rows-expand opacity-100"
                  : "grid-rows-collapse opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-1.5 pt-1.5">
                  <textarea
                    id="yt-timestamps"
                    rows={5}
                    value={timestampsText}
                    onChange={(e) => setTimestampsText(e.target.value)}
                    placeholder={`Optional (automatically detected if left blank):\n00:00 Intro\n03:15 Part 1: Concepts\n12:40 Part 2: Building\n45:00 Summary`}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 font-mono text-xs sm:text-sm font-tnum focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Supports timestamps formatted as{" "}
                    <span className="font-mono font-tnum">0:00</span>,{" "}
                    <span className="font-mono font-tnum">00:00</span>, or{" "}
                    <span className="font-mono font-tnum">1:20:00</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Turnstile verification (interaction-only: hidden unless challenge is required) */}
          <TurnstileWidget
            onTokenChange={handleTokenChange}
            action="create_playlist"
            className="flex justify-start empty:hidden my-1"
          />

          {/* Action Button */}
          <div className="pt-1 sm:pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 inline-flex items-center justify-center gap-2 bg-primary active:bg-primary-hover hover:bg-primary-hover text-white font-semibold text-sm sm:text-base rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    aria-hidden="true"
                  />
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

        {/* Informational Note on Playback Compatibility */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
          <p className="leading-relaxed">
            Auto-detects chapters from video description and timestamps. Local-first & private.
          </p>
        </div>
      </div>
    </div>
  );
}
