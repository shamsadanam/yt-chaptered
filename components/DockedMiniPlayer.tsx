'use client';

import Image from 'next/image';
import { Play, ArrowRight } from 'lucide-react';
import { SavedCourse } from '../types/playlist';
import { secondsToTimestamp, getYouTubeThumbnail } from '../lib/youtubeParser';

interface DockedMiniPlayerProps {
  course: SavedCourse;
  onResume: (course: SavedCourse) => void;
}

export function DockedMiniPlayer({ course, onResume }: DockedMiniPlayerProps) {
  const lastChapter =
    course.chapters[course.lastPlayedChapterIndex] || course.chapters[0];
  const thumbnailUrl = getYouTubeThumbnail(course.video.id, course.video.thumbnailUrl);

  return (
    <aside
      aria-label="Resume active course"
      className="md:hidden fixed left-3 right-3 z-40 animate-in fade-in slide-in-from-bottom-2"
      style={{
        bottom: 'calc(3.75rem + max(env(safe-area-inset-bottom, 0px), 8px))',
      }}
    >
      <button
        type="button"
        onClick={() => onResume(course)}
        aria-label={`Resume course: ${course.video.title}`}
        className="w-full bg-stone-900/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-800/80 text-white p-2 sm:p-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 cursor-pointer active:scale-98 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex items-center gap-2.5 min-w-0 text-left">
          <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-stone-700/60 shadow-xs">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-800">
                <Play size={14} strokeWidth={2} className="text-stone-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white shadow-xs">
                <Play size={10} strokeWidth={2.5} className="fill-current ml-0.5" />
              </span>
            </div>
            {course.lastPlayedSeconds > 0 && (
              <div className="absolute bottom-0.5 right-0.5 bg-black/85 text-white px-1 py-0 rounded text-3xs font-mono font-tnum leading-none">
                {secondsToTimestamp(course.lastPlayedSeconds)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span className="text-2xs text-emerald-400 font-semibold uppercase tracking-wider block">
                Resume Course
              </span>
            </div>
            <p className="text-xs font-semibold truncate text-white leading-tight">
              {course.video.title}
            </p>
            {lastChapter && (
              <p className="text-2xs text-stone-400 truncate mt-0.5 leading-tight">
                Ch. {course.lastPlayedChapterIndex + 1}: {lastChapter.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
          <span className="text-xs font-semibold">Resume</span>
          <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
        </div>
      </button>
    </aside>
  );
}
