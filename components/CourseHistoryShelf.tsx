'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, Upload, Plus, Trash2, X } from 'lucide-react';
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
        <div className={`w-full ${isTopShelf ? '' : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-stone-200 dark:border-stone-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-medium text-stone-900 dark:text-stone-100 tracking-tight">
                Continue Watching
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Restore your previous learning progress or backups.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
                title="Import JSON backup"
                aria-label="Import courses from JSON backup file"
              >
                <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
                <span>Import JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json,application/json"
                aria-label="Upload JSON backup file"
                className="hidden"
              />
            </div>
          </div>
          {importStatus && (
            <div role="status" aria-live="polite" className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-stone-900 dark:text-stone-100 flex items-center justify-between">
              <span>{importStatus}</span>
              <button
                type="button"
                onClick={() => setImportStatus(null)}
                aria-label="Dismiss import status"
                className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 font-semibold text-xs ml-2 p-1 focus:outline-none focus:ring-1 focus:ring-primary rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 mx-auto mb-3 shadow-xs">
          📚
        </div>
        <h2 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-2">No saved courses yet</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-6">
          Paste any YouTube URL in the Create tab to generate a chaptered course, or restore a backup from a JSON file.
        </p>

        {importStatus && (
          <div role="status" aria-live="polite" className="max-w-md mx-auto mb-6 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-stone-900 dark:text-stone-100 flex items-center justify-between">
            <span>{importStatus}</span>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              aria-label="Dismiss import status"
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 font-semibold text-xs ml-2 p-1 focus:outline-none focus:ring-1 focus:ring-primary rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onGoToCreate && (
            <button
              type="button"
              onClick={onGoToCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-xs active:bg-primary-hover touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>+ Create First Playlist</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import courses from JSON backup file"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-semibold border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs touch-manipulation cursor-pointer min-h-11 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Download className="w-4 h-4 text-stone-600 dark:text-stone-400" aria-hidden="true" />
            <span>Import JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            aria-label="Upload JSON backup file"
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isStandaloneView ? 'py-4 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8' : isTopShelf ? '' : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-stone-200 dark:border-stone-800'}`}>
      {/* Header & Export/Import Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-medium text-stone-900 dark:text-stone-100 tracking-tight">
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Resume previous learning sessions or backup progress locally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAddNewCourse && (
            <button
              type="button"
              onClick={onAddNewCourse}
              aria-label="Add new video"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-hover rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Video</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            title="Download JSON backup"
            aria-label="Export saved courses to JSON backup file"
          >
            <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
            <span className="hidden xs:inline">Export JSON</span>
            <span className="xs:hidden">Export</span>
          </button>

          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            title="Import JSON backup"
            aria-label="Import courses from JSON backup file"
          >
            <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
            <span className="hidden xs:inline">Import JSON</span>
            <span className="xs:hidden">Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            aria-label="Upload JSON backup file"
            className="hidden"
          />
        </div>
      </div>

      {importStatus && (
        <div role="status" aria-live="polite" className="mb-4 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-stone-900 dark:text-stone-100 flex items-center justify-between">
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            aria-label="Dismiss import status"
            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 font-semibold text-xs ml-2 p-1 focus:outline-none focus:ring-1 focus:ring-primary rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
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
            <div
              key={c.video.id}
              className="relative group bg-white dark:bg-stone-900 hover:border-primary dark:hover:border-emerald-500 border border-stone-200 dark:border-stone-800 rounded-xl p-3 sm:p-4 transition-all duration-200 flex flex-col justify-between shadow-xs touch-manipulation"
            >
              <div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {/* Video Thumbnail */}
                  <div className="w-20 h-14 sm:w-24 sm:h-16 bg-black rounded-md overflow-hidden shrink-0 relative border border-stone-200 dark:border-stone-800" aria-hidden="true">
                    {c.video.thumbnailUrl ? (
                      <Image
                        src={c.video.thumbnailUrl}
                        alt=""
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
                      <div className="absolute bottom-0.5 right-0.5 bg-black/90 text-white px-1 py-0.5 text-2xs font-mono rounded">
                        {secondsToTimestamp(c.lastPlayedSeconds)}
                      </div>
                    )}
                  </div>

                  {/* Title & Channel */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-primary dark:text-stone-100 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                      <Link
                        href={courseUrl}
                        onClick={() => onResumeCourse(c)}
                        aria-label={`Resume course ${c.video.title}, chapter ${c.lastPlayedChapterIndex + 1}, ${percentage}% completed`}
                        className="focus:outline-none focus:underline after:absolute after:inset-0 after:z-0"
                      >
                        {c.video.title}
                      </Link>
                    </h3>
                    {c.video.author && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 truncate mt-0.5 sm:mt-1">{c.video.author}</p>
                    )}
                  </div>

                  {/* Delete button with 44px tap zone - elevated above the stretched link */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.video.id, e)}
                    title="Remove course from saved list"
                    aria-label={`Remove ${c.video.title} from saved courses`}
                    className="relative z-10 w-10 h-10 -mr-1.5 -mt-1.5 flex items-center justify-center text-stone-500 hover:text-rose-600 active:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 rounded-md transition-colors touch-manipulation shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Last Watched Segment */}
                <div className="mt-2.5 sm:mt-3 text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <span className="font-medium text-stone-900 dark:text-stone-100">Last at:</span>
                  <span className="truncate">
                    {lastChapter ? `Ch. ${c.lastPlayedChapterIndex + 1}: ${lastChapter.title}` : 'Start'}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Resume Indicator */}
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-2xs sm:text-xs text-stone-600 dark:text-stone-400 mb-1">
                    <span>{completedCount}/{totalChapters} completed</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono">{percentage}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Course completion progress: ${percentage}%`}
                    className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
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
