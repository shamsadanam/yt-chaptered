'use client';

import { useState, useRef, useSyncExternalStore } from 'react';
import { WandSparkles, Loader2, AlertCircle, ArrowRight, Info } from 'lucide-react';
import {
  extractYouTubeId,
  parseTimestamps,
} from '../lib/youtubeParser';
import { ParsedPlaylist, SavedCourse } from '../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
} from '../lib/storage';
import { CourseHistoryShelf } from './CourseHistoryShelf';

interface InputViewProps {
  onGenerate: (playlist: ParsedPlaylist) => void;
}

const SAMPLE_DATA = {
  url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
  title: 'Python for Beginners - Learn Coding with Python in 1 Hour',
  description: `0:00:00 Introduction
0:00:30 What You Can Do With Python
0:01:15 Your First Python Program
0:05:30 Variables
0:09:08 Receiving Input
0:13:21 Type Conversion
0:18:49 Strings
0:24:12 Arithmetic Operators
0:27:05 Operator Precedence
0:29:08 Comparison Operators
0:31:34 Logical Operators
0:33:43 If Statements
0:41:40 While Loops
0:45:21 Lists
0:48:47 List Methods
0:52:17 For Loops
0:54:54 The range() Function
0:57:43 Tuples`,
};

export function InputView({ onGenerate }: InputViewProps) {
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

  const savedCourses = useSyncExternalStore(
    subscribeCourses,
    getSavedCoursesSnapshot,
    getSavedCoursesServerSnapshot
  );

  const hasSavedCourses = savedCourses.length > 0;
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleFocusAddCourse = () => {
    urlInputRef.current?.focus();
    urlInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRefreshCourses = () => {};

  const handleResumeCourse = (course: SavedCourse) => {
    const playlist: ParsedPlaylist = {
      video: course.video,
      chapters: course.chapters,
      rawTimestampsText: course.rawTimestampsText,
      initialStartTime: course.lastPlayedSeconds,
      initialChapterIndex: course.lastPlayedChapterIndex,
    };
    onGenerate(playlist);
  };

  const loadSample = () => {
    setUrl(SAMPLE_DATA.url);
    setTimestampsText(SAMPLE_DATA.description);
    setIsExpandTimestamps(true);
    setErrorMessage(null);
    setAutoFetchStatus('Sample tutorial loaded with 18 chapters');
    setCachedVideoInfo({
      videoId: 'kqtD5dpn9C8',
      title: SAMPLE_DATA.title,
    });
  };

  const fetchFromLocalApi = async (videoId: string) => {
    try {
      const res = await fetch(`/api/youtube-info?videoId=${videoId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.success) {
        return data;
      }
    } catch (err) {
      console.warn('Local auto-fetch failed:', err);
    }
    return null;
  };

  const handleAutoFetchClick = async () => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video URL first');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setAutoFetchStatus('Fetching video details and timestamps...');

    try {
      const autoData = await fetchFromLocalApi(videoId);
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
          setAutoFetchStatus(`Successfully found ${autoData.chapters.length} chapters automatically!`);
        } else {
          setAutoFetchStatus(
            autoData.title
              ? `Found "${autoData.title}", but no timestamps were in description.`
              : 'Found video, but no timestamps were in description.'
          );
        }
        return;
      }

      setAutoFetchStatus('Could not auto-fetch timestamps. You can paste them manually below.');
    } catch {
      setAutoFetchStatus('Error auto-fetching. Please paste timestamps manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video URL or ID (e.g., youtube.com/watch?v=... or youtu.be/...)');
      return;
    }

    let parsedChapters = parseTimestamps(timestampsText);
    const hasCached = cachedVideoInfo?.videoId === videoId;
    let videoTitle = hasCached && cachedVideoInfo?.title ? cachedVideoInfo.title : '';
    let authorName: string | undefined = hasCached ? cachedVideoInfo?.author : undefined;
    let channelId: string | undefined = hasCached ? cachedVideoInfo?.channelId : undefined;
    let channelUrl: string | undefined = hasCached ? cachedVideoInfo?.channelUrl : undefined;
    let thumbnailUrl = (hasCached && cachedVideoInfo?.thumbnailUrl) || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    setIsLoading(true);

    try {
      // If user hasn't provided manual timestamps, attempt automatic fetch
      if (parsedChapters.length === 0) {
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData && autoData.success) {
          if (autoData.title) videoTitle = autoData.title;
          if (autoData.author) authorName = autoData.author;
          if (autoData.channelId) channelId = autoData.channelId;
          if (autoData.channelUrl) channelUrl = autoData.channelUrl;
          if (autoData.thumbnailUrl) thumbnailUrl = autoData.thumbnailUrl;
          if (autoData.chapters && autoData.chapters.length > 0) {
            parsedChapters = autoData.chapters;
            setTimestampsText(autoData.description || '');
            setIsExpandTimestamps(true);
          }
        }
      } else if (!videoTitle) {
        // Fetch video info in background and validate manual timestamps against duration if available
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData && autoData.success) {
          if (autoData.title) videoTitle = autoData.title;
          if (autoData.author) authorName = autoData.author;
          if (autoData.channelId) channelId = autoData.channelId;
          if (autoData.channelUrl) channelUrl = autoData.channelUrl;
          if (autoData.thumbnailUrl) thumbnailUrl = autoData.thumbnailUrl;
          if (autoData.duration && autoData.duration > 0) {
            parsedChapters = parseTimestamps(timestampsText, autoData.duration);
          }
        }
      }
    } catch (err) {
      console.warn('Auto-generation fetch error:', err);
    } finally {
      setIsLoading(false);
    }

    // Direct browser oEmbed fallback if title or channelUrl is still missing
    if (!videoTitle || !channelUrl) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title && !videoTitle) videoTitle = oembedData.title;
          if (oembedData.author_name && !authorName) authorName = oembedData.author_name;
          if (oembedData.author_url && !channelUrl) channelUrl = oembedData.author_url;
          if (oembedData.thumbnail_url && (!thumbnailUrl || thumbnailUrl.includes('hqdefault.jpg'))) {
            thumbnailUrl = oembedData.thumbnail_url;
          }
        }
      } catch {
        // Silent fallback
      }
    }

    if (!videoTitle) {
      videoTitle = 'YouTube Video';
    }

    // Fallback if no timestamps were found
    if (parsedChapters.length === 0) {
      parsedChapters = [
        {
          id: `chap-0-0`,
          index: 1,
          title: 'Full Video',
          startTime: 0,
          endTime: Infinity,
          formattedTime: '0:00',
          status: 'not_started',
        },
      ];
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

    onGenerate(playlist);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10">
      {/* Returning User View: Continue Watching Shelf at Top */}
      {hasSavedCourses && (
        <CourseHistoryShelf
          courses={savedCourses}
          onResumeCourse={handleResumeCourse}
          onRefresh={handleRefreshCourses}
          isTopShelf={true}
          onAddNewCourse={handleFocusAddCourse}
        />
      )}

      {/* First-time User View: Prominent Hero Header */}
      {!hasSavedCourses ? (
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffffff] border border-[#e7e5e4] rounded-[6px] text-[11px] sm:text-xs font-semibold uppercase tracking-[1px] text-[#57534e] mb-3 sm:mb-4">
            Local-first video chapters
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium text-[#1c1917] tracking-tight mb-2 sm:mb-4">
            Turn timestamped videos into structured playlists
          </h1>
          <p className="text-sm sm:text-lg text-[#57534e] max-w-xl mx-auto leading-relaxed">
            Paste any YouTube URL to automatically detect chapters, navigate segments, and track learning progress.
          </p>
        </div>
      ) : (
        <div className="mt-8 sm:mt-12 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-medium text-[#1c1917] tracking-tight">
            Add New Video
          </h2>
          <p className="text-xs sm:text-sm text-[#57534e]">
            Paste a YouTube URL to automatically detect chapters or paste custom timestamps.
          </p>
        </div>
      )}

      {/* Main Input Card */}
      <div
        id="course-input-card"
        className="bg-[#ffffff] border border-[#e7e5e4] rounded-[12px] p-4 sm:p-8 shadow-xs"
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* URL Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label htmlFor="yt-url" className="block text-xs sm:text-sm font-semibold text-[#1c1917]">
                      YouTube Video URL
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFetchClick}
                      disabled={isLoading || !url.trim()}
                      aria-label="Auto-detect timestamps and video info"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0d5c46] bg-[#0d5c46]/5 hover:bg-[#0d5c46]/10 active:bg-[#0d5c46]/15 border border-[#0d5c46]/20 rounded-[8px] transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5c46] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation min-h-[34px]"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin w-3.5 h-3.5 text-[#0d5c46]" aria-hidden="true" />
                      ) : (
                        <WandSparkles className="w-3.5 h-3.5 text-[#0d5c46]" aria-hidden="true" />
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
                      aria-describedby={errorMessage ? 'yt-url-error' : autoFetchStatus ? 'yt-url-status' : undefined}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-[6px] text-[#1c1917] placeholder-[#a8a29e] text-base focus:outline-none focus:ring-2 focus:ring-[#0d5c46] focus:border-[#0d5c46] transition-colors"
                      required
                    />
                  </div>
                  {autoFetchStatus && (
                    <p
                      id="yt-url-status"
                      role="status"
                      aria-live="polite"
                      className="mt-2 text-xs text-[#1c1917] bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1.5 rounded-[6px] font-medium flex items-center gap-1.5"
                    >
                      <span className="text-[#10b981]" aria-hidden="true">●</span>
                      {autoFetchStatus}
                    </p>
                  )}
                  {errorMessage && (
                    <p
                      id="yt-url-error"
                      role="alert"
                      aria-live="assertive"
                      className="mt-2 text-xs sm:text-sm text-[#e11d48] font-medium flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Description / Timestamps Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label htmlFor="yt-timestamps" className="text-xs sm:text-sm font-semibold text-[#1c1917]">
                      Timestamps or Description
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={loadSample}
                        aria-label="Load sample Python tutorial with 18 chapters"
                        className="text-xs font-medium text-[#57534e] hover:text-[#0d5c46] underline focus:outline-none cursor-pointer min-h-[36px] flex items-center touch-manipulation"
                      >
                        Sample
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsExpandTimestamps(!isExpandTimestamps)}
                        aria-expanded={isExpandTimestamps}
                        aria-controls="yt-timestamps-panel"
                        className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] underline focus:outline-none cursor-pointer min-h-[36px] flex items-center touch-manipulation"
                      >
                        {isExpandTimestamps ? 'Collapse' : 'Manual paste'}
                      </button>
                    </div>
                  </div>

                  {/* Collapsed Timestamps Placeholder Button */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                      isExpandTimestamps
                        ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                        : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsExpandTimestamps(true)}
                        aria-expanded={isExpandTimestamps}
                        aria-controls="yt-timestamps-panel"
                        className="w-full text-left px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-[6px] text-xs sm:text-sm text-[#57534e] cursor-pointer hover:bg-[#ffffff] hover:border-[#a8a29e] transition-colors flex items-center justify-between touch-manipulation"
                      >
                        <span>Chapters auto-load; tap to review or paste custom timestamps</span>
                        <span className="text-xs font-semibold text-[#0d5c46] shrink-0 ml-2" aria-hidden="true">+ Expand</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Timestamps Textarea Area */}
                  <div
                    id="yt-timestamps-panel"
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                      isExpandTimestamps
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
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
                          className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-[6px] text-[#1c1917] placeholder-[#a8a29e] font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c46] focus:border-[#0d5c46] transition-colors"
                        />
                        <p className="text-[11px] sm:text-xs text-[#57534e]">
                          Supports timestamps formatted as <span className="font-mono">0:00</span>, <span className="font-mono">00:00</span>, or <span className="font-mono">1:20:00</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-1 sm:pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[#0d5c46] active:bg-[#0a4635] hover:bg-[#0a4635] text-white font-semibold text-sm sm:text-base rounded-[12px] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0d5c46] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" aria-hidden="true" />
                        <span>Fetching & Generating...</span>
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
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#e7e5e4] flex items-start gap-2 text-[11px] sm:text-xs text-[#57534e]">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a8a29e] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong className="text-[#1c1917] font-medium">Playback Note:</strong> A few videos cannot be embedded if disabled by the creator or age/region-restricted. If auto-detection misses timestamps (e.g. in pinned comments), paste them above.
                </p>
              </div>
            </div>

      {/* First-time User: Shelf at bottom for importing backup */}
      {!hasSavedCourses && (
        <CourseHistoryShelf
          courses={savedCourses}
          onResumeCourse={handleResumeCourse}
          onRefresh={handleRefreshCourses}
        />
      )}
    </div>
  );
}
