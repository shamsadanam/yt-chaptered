'use client';

import { useState, useRef, useSyncExternalStore } from 'react';
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

  const savedCourses = useSyncExternalStore(
    subscribeCourses,
    getSavedCoursesSnapshot,
    getSavedCoursesServerSnapshot
  );

  const hasSavedCourses = savedCourses.length > 0;
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAddCourse = () => {
    setIsFormExpanded(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      urlInputRef.current?.focus();
    }, 60);
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
        if (autoData.description) {
          setTimestampsText(autoData.description);
          setIsExpandTimestamps(true);
        }
        if (autoData.chapters && autoData.chapters.length > 0) {
          setAutoFetchStatus(`Successfully found ${autoData.chapters.length} chapters automatically!`);
        } else {
          setAutoFetchStatus(`Found video "${autoData.title}", but no timestamps were in description.`);
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
    let videoTitle = `Video ${videoId}`;
    let authorName: string | undefined;
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    setIsLoading(true);

    try {
      // If user hasn't provided manual timestamps, attempt automatic fetch
      if (parsedChapters.length === 0) {
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData && autoData.success) {
          if (autoData.title) videoTitle = autoData.title;
          if (autoData.author) authorName = autoData.author;
          if (autoData.thumbnailUrl) thumbnailUrl = autoData.thumbnailUrl;
          if (autoData.chapters && autoData.chapters.length > 0) {
            parsedChapters = autoData.chapters;
            setTimestampsText(autoData.description || '');
            setIsExpandTimestamps(true);
          }
        }
      } else {
        // Fetch video info in background and validate manual timestamps against duration if available
        const autoData = await fetchFromLocalApi(videoId);
        if (autoData?.title) {
          videoTitle = autoData.title;
          authorName = autoData.author;
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
          onAddNewCourse={handleOpenAddCourse}
        />
      )}

      {/* First-time User View: Prominent Hero Header */}
      {!hasSavedCourses && (
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
      )}

      {/* Returning User Collapsed State: Accordion Trigger */}
      {hasSavedCourses && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isFormExpanded
              ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
              : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2 sm:pt-4">
              <button
                type="button"
                onClick={handleOpenAddCourse}
                className="w-full bg-[#ffffff] hover:bg-[#fafaf9] active:bg-[#f5f5f4] border border-dashed border-[#d6d3d1] hover:border-[#0d5c46] rounded-[12px] p-4 sm:p-5 transition-all text-left flex items-center justify-between gap-4 cursor-pointer min-h-[56px] touch-manipulation group shadow-2xs"
                aria-expanded={isFormExpanded}
                aria-controls="course-input-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[10px] bg-[#0d5c46]/10 text-[#0d5c46] flex items-center justify-center shrink-0 group-hover:bg-[#0d5c46] group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-[#1c1917] group-hover:text-[#0d5c46] transition-colors">
                      Add New Course
                    </h3>
                    <p className="text-xs text-[#57534e] truncate">
                      Paste a YouTube URL to auto-detect chapters and create a new course
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0d5c46] shrink-0 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>+ Add</span>
                  <span>→</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Input Card (smoothly animated accordion for returning users, static for new users) */}
      <div
        className={
          hasSavedCourses
            ? `grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                isFormExpanded
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`
            : ''
        }
      >
        <div className={hasSavedCourses ? 'overflow-hidden' : ''}>
          <div className={hasSavedCourses ? 'pt-2 sm:pt-4' : ''}>
            <div
              ref={formRef}
              id="course-input-card"
              className="bg-[#ffffff] border border-[#e7e5e4] rounded-[12px] p-4 sm:p-8 shadow-xs"
            >
              {hasSavedCourses && (
                <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-[#e7e5e4]">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#1c1917]">
                      Add New Course
                    </h3>
                    <p className="text-xs text-[#57534e]">
                      Paste a YouTube URL to auto-detect chapters or paste custom timestamps.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFormExpanded(false)}
                    className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] px-2.5 py-1.5 rounded-[6px] hover:bg-[#f5f5f4] active:bg-[#e7e5e4] cursor-pointer min-h-[36px] flex items-center gap-1 transition-colors touch-manipulation"
                    aria-label="Collapse add course form"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden xs:inline">Collapse</span>
                  </button>
                </div>
              )}

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
                      className="text-xs font-semibold text-[#0d5c46] hover:text-[#0a4635] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 min-h-[36px] touch-manipulation"
                    >
                      <span>⚡ Auto-detect</span>
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
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-[6px] text-[#1c1917] placeholder-[#a8a29e] text-base focus:outline-none focus:ring-2 focus:ring-[#0d5c46] focus:border-[#0d5c46] transition-colors"
                      required
                    />
                  </div>
                  {autoFetchStatus && (
                    <p className="mt-2 text-xs text-[#1c1917] bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1.5 rounded-[6px] font-medium flex items-center gap-1.5">
                      <span className="text-[#10b981]">●</span>
                      {autoFetchStatus}
                    </p>
                  )}
                  {errorMessage && (
                    <p className="mt-2 text-xs sm:text-sm text-[#e11d48] font-medium flex items-center gap-1.5">
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
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
                        className="text-xs font-medium text-[#57534e] hover:text-[#0d5c46] underline focus:outline-none cursor-pointer min-h-[36px] flex items-center touch-manipulation"
                      >
                        Sample
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsExpandTimestamps(!isExpandTimestamps)}
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
                      <div
                        onClick={() => setIsExpandTimestamps(true)}
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-[6px] text-xs sm:text-sm text-[#57534e] cursor-pointer hover:bg-[#ffffff] hover:border-[#a8a29e] transition-colors flex items-center justify-between touch-manipulation"
                      >
                        <span>Chapters auto-load; tap to review or paste custom timestamps</span>
                        <span className="text-xs font-semibold text-[#0d5c46] shrink-0 ml-2">+ Expand</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timestamps Textarea Area */}
                  <div
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
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Fetching & Generating...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Playlist</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Informational Note on Playback Compatibility */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#e7e5e4] flex items-start gap-2 text-[11px] sm:text-xs text-[#57534e]">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a8a29e] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="leading-relaxed">
                  <strong className="text-[#1c1917] font-medium">Playback Note:</strong> A few videos cannot be embedded if disabled by the creator or age/region-restricted. If auto-detection misses timestamps (e.g. in pinned comments), paste them above.
                </p>
              </div>
            </div>
          </div>
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
