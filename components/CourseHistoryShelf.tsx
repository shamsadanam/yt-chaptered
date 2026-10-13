'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { SavedCourse } from '../types/playlist';
import {
  deleteSavedCourse,
  exportCoursesJson,
  importCoursesJson,
} from '../lib/storage';
import { secondsToTimestamp } from '../lib/youtubeParser';

interface CourseHistoryShelfProps {
  courses: SavedCourse[];
  onResumeCourse: (course: SavedCourse) => void;
  onRefresh: () => void;
}

export function CourseHistoryShelf({
  courses,
  onResumeCourse,
  onRefresh,
}: CourseHistoryShelfProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (courses.length === 0) {
    return null;
  }

  const handleDelete = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedCourse(videoId);
    onRefresh();
  };

  const handleExport = () => {
    const json = exportCoursesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaptered-courses-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importCoursesJson(content);
        if (res.success) {
          setImportStatus(`Successfully restored ${res.count} course(s).`);
          onRefresh();
        } else {
          setImportStatus(`Import error: ${res.error || 'Failed to parse JSON'}`);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#c5c0b1]/60">
      {/* Header & Export/Import Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-medium text-[#201515] tracking-tight">
            Saved Courses & History
          </h2>
          <p className="text-xs sm:text-sm text-[#605d52]">
            Resume previous learning sessions or backup progress locally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#201515] bg-[#fffefb] active:bg-[#e7e2d7] hover:bg-[#e7e2d7] border border-[#c5c0b1] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            title="Download JSON backup"
          >
            <svg className="w-3.5 h-3.5 text-[#605d52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export JSON</span>
          </button>

          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#201515] bg-[#fffefb] active:bg-[#e7e2d7] hover:bg-[#e7e2d7] border border-[#c5c0b1] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            title="Import JSON backup"
          >
            <svg className="w-3.5 h-3.5 text-[#605d52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {importStatus && (
        <div className="mb-4 p-3 bg-[#fffefb] border border-[#c5c0b1] rounded-[8px] text-xs text-[#201515] flex items-center justify-between">
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            className="text-[#939084] hover:text-[#201515] font-semibold text-xs ml-2 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {courses.map((c) => {
          const completedCount = c.completedChapterIds?.length || 0;
          const totalChapters = c.chapters.length;
          const percentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
          const lastChapter = c.chapters[c.lastPlayedChapterIndex] || c.chapters[0];

          return (
            <div
              key={c.video.id}
              onClick={() => onResumeCourse(c)}
              className="group bg-[#f8f4f0] hover:bg-[#fffefb] active:bg-[#fffefb] border border-[#c5c0b1]/80 hover:border-[#ff4f00] rounded-[12px] p-3 sm:p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs touch-manipulation active:scale-[0.99]"
            >
              <div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {/* Video Thumbnail */}
                  <div className="w-20 h-14 sm:w-24 sm:h-16 bg-[#201515] rounded-[6px] overflow-hidden shrink-0 relative border border-[#c5c0b1]/60">
                    {c.video.thumbnailUrl ? (
                      <Image
                        src={c.video.thumbnailUrl}
                        alt={c.video.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#fffefb]">
                        ▶
                      </div>
                    )}
                    {c.lastPlayedSeconds > 0 && (
                      <div className="absolute bottom-0.5 right-0.5 bg-[#201515]/90 text-[#fffefb] px-1 py-0.2 text-[9px] sm:text-[10px] font-mono rounded">
                        {secondsToTimestamp(c.lastPlayedSeconds)}
                      </div>
                    )}
                  </div>

                  {/* Title & Channel */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-[#201515] group-hover:text-[#ff4f00] transition-colors line-clamp-2 leading-tight">
                      {c.video.title}
                    </h3>
                    {c.video.author && (
                      <p className="text-[11px] sm:text-xs text-[#605d52] truncate mt-0.5 sm:mt-1">{c.video.author}</p>
                    )}
                  </div>

                  {/* Delete button with 44px tap zone */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.video.id, e)}
                    title="Remove course from saved list"
                    className="w-10 h-10 -mr-1.5 -mt-1.5 flex items-center justify-center text-[#939084] hover:text-[#ff4f00] active:text-[#ff4f00] rounded-[6px] transition-colors touch-manipulation shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Last Watched Segment */}
                <div className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs text-[#605d52] flex items-center gap-1.5">
                  <span className="font-medium text-[#201515]">Last at:</span>
                  <span className="truncate">
                    {lastChapter ? `Ch. ${c.lastPlayedChapterIndex + 1}: ${lastChapter.title}` : 'Start'}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Resume Button */}
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#c5c0b1]/40 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#605d52] mb-1">
                    <span>{completedCount}/{totalChapters} completed</span>
                    <span className="font-semibold text-[#201515] font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#e7e2d7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff4f00] rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#ff4f00] group-hover:translate-x-0.5 transition-transform">
                  <span>Resume</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
