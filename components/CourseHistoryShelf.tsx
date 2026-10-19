'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  isStandaloneView?: boolean;
  onGoToCreate?: () => void;
  isTopShelf?: boolean;
  onAddNewCourse?: () => void;
}

export function CourseHistoryShelf({
  courses,
  onResumeCourse,
  onRefresh,
  isStandaloneView = false,
  onGoToCreate,
  isTopShelf = false,
  onAddNewCourse,
}: CourseHistoryShelfProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleDelete = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  if (courses.length === 0) {
    if (!isStandaloneView) {
      return (
        <div className={`w-full ${isTopShelf ? '' : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#e7e5e4]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-medium text-[#1c1917] tracking-tight">
                Continue Watching
              </h2>
              <p className="text-xs text-[#57534e]">
                Restore your previous learning progress or backups.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1c1917] bg-[#ffffff] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                title="Import JSON backup"
              >
                <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[8px] text-xs text-[#1c1917] flex items-center justify-between">
              <span>{importStatus}</span>
              <button
                type="button"
                onClick={() => setImportStatus(null)}
                className="text-[#a8a29e] hover:text-[#1c1917] font-semibold text-xs ml-2 p-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="w-12 h-12 rounded-[12px] bg-[#ffffff] border border-[#e7e5e4] flex items-center justify-center text-[#57534e] mx-auto mb-3 shadow-xs">
          📚
        </div>
        <h2 className="text-xl font-medium text-[#1c1917] mb-2">No saved courses yet</h2>
        <p className="text-sm text-[#57534e] max-w-sm mx-auto mb-6">
          Paste any YouTube URL in the Create tab to generate a chaptered course, or restore a backup from a JSON file.
        </p>

        {importStatus && (
          <div className="max-w-md mx-auto mb-6 p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[8px] text-xs text-[#1c1917] flex items-center justify-between">
            <span>{importStatus}</span>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              className="text-[#a8a29e] hover:text-[#1c1917] font-semibold text-xs ml-2 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onGoToCreate && (
            <button
              type="button"
              onClick={onGoToCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d5c46] text-white text-sm font-semibold rounded-[12px] shadow-xs active:bg-[#0a4635] touch-manipulation cursor-pointer"
            >
              <span>+ Create First Playlist</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] text-[#1c1917] text-sm font-semibold border border-[#e7e5e4] rounded-[12px] shadow-xs touch-manipulation cursor-pointer min-h-[44px]"
          >
            <svg className="w-4 h-4 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    );
  }

  return (
    <div className={`w-full ${isStandaloneView ? 'py-4 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8' : isTopShelf ? '' : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#e7e5e4]'}`}>
      {/* Header & Export/Import Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-medium text-[#1c1917] tracking-tight">
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-[#57534e]">
            Resume previous learning sessions or backup progress locally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAddNewCourse && (
            <button
              type="button"
              onClick={onAddNewCourse}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Course</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1c1917] bg-[#ffffff] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            title="Download JSON backup"
          >
            <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden xs:inline">Export JSON</span>
            <span className="xs:hidden">Export</span>
          </button>

          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1c1917] bg-[#ffffff] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[8px] transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            title="Import JSON backup"
          >
            <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden xs:inline">Import JSON</span>
            <span className="xs:hidden">Import</span>
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
        <div className="mb-4 p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[8px] text-xs text-[#1c1917] flex items-center justify-between">
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            className="text-[#a8a29e] hover:text-[#1c1917] font-semibold text-xs ml-2 p-1"
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

          const courseUrl = `/watch/${c.video.id}${c.lastPlayedSeconds > 0 ? `?t=${Math.floor(c.lastPlayedSeconds)}` : ''}`;

          return (
            <Link
              key={c.video.id}
              href={courseUrl}
              onClick={() => onResumeCourse(c)}
              className="group bg-[#ffffff] hover:bg-[#ffffff] active:bg-[#ffffff] border border-[#e7e5e4] hover:border-[#0d5c46] rounded-[12px] p-3 sm:p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs touch-manipulation active:scale-[0.99]"
            >
              <div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {/* Video Thumbnail */}
                  <div className="w-20 h-14 sm:w-24 sm:h-16 bg-[#000000] rounded-[6px] overflow-hidden shrink-0 relative border border-[#e7e5e4]">
                    {c.video.thumbnailUrl ? (
                      <Image
                        src={c.video.thumbnailUrl}
                        alt={c.video.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white">
                        ▶
                      </div>
                    )}
                    {c.lastPlayedSeconds > 0 && (
                      <div className="absolute bottom-0.5 right-0.5 bg-[#000000]/90 text-white px-1 py-0.2 text-[9px] sm:text-[10px] font-mono rounded">
                        {secondsToTimestamp(c.lastPlayedSeconds)}
                      </div>
                    )}
                  </div>

                  {/* Title & Channel */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-[#1c1917] group-hover:text-[#0d5c46] transition-colors line-clamp-2 leading-tight">
                      {c.video.title}
                    </h3>
                    {c.video.author && (
                      <p className="text-[11px] sm:text-xs text-[#57534e] truncate mt-0.5 sm:mt-1">{c.video.author}</p>
                    )}
                  </div>

                  {/* Delete button with 44px tap zone */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.video.id, e)}
                    title="Remove course from saved list"
                    className="w-10 h-10 -mr-1.5 -mt-1.5 flex items-center justify-center text-[#a8a29e] hover:text-[#e11d48] active:text-[#e11d48] rounded-[6px] transition-colors touch-manipulation shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Last Watched Segment */}
                <div className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs text-[#57534e] flex items-center gap-1.5">
                  <span className="font-medium text-[#1c1917]">Last at:</span>
                  <span className="truncate">
                    {lastChapter ? `Ch. ${c.lastPlayedChapterIndex + 1}: ${lastChapter.title}` : 'Start'}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Resume Button */}
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[#e7e5e4] flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#57534e] mb-1">
                    <span>{completedCount}/{totalChapters} completed</span>
                    <span className="font-semibold text-[#1c1917] font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0d5c46] rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#0d5c46] group-hover:translate-x-0.5 transition-transform">
                  <span>Resume</span>
                  <span>→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
