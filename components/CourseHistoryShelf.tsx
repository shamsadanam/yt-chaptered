'use client';

import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, Upload, Trash2, X, BookOpen, Plus, Play, ArrowRight, Search, Loader2 } from 'lucide-react';
import { SavedCourse } from '../types/playlist';
import {
  deleteSavedCourse,
  exportCoursesJson,
  importCoursesJson,
} from '../lib/storage';
import { secondsToTimestamp } from '../lib/youtubeParser';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useDebounce } from '../hooks/useDebounce';

interface CourseHistoryShelfProps {
  courses: SavedCourse[];
  onResumeCourse: (course: SavedCourse) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  isStandaloneView?: boolean;
  onGoToCreate?: () => void;
  isTopShelf?: boolean;
  onAddNewCourse?: () => void;
}

export function CourseHistorySkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-44 bg-stone-200 dark:bg-stone-800 rounded-lg mb-2" />
      <div className="h-4 w-72 bg-stone-200 dark:bg-stone-800 rounded mb-8" />
      <div className="h-56 bg-stone-200 dark:bg-stone-800 rounded-2xl mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CourseHistoryShelf({
  courses,
  onResumeCourse,
  onRefresh,
  isLoading = false,
  onGoToCreate,
  onAddNewCourse,
}: CourseHistoryShelfProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const isSearching = debouncedQuery.trim().length > 0;
  const isDebouncing = searchQuery !== debouncedQuery && searchQuery.trim() !== '';

  const filteredCourses = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((c) => {
      const titleMatch = c.video.title.toLowerCase().includes(query);
      const authorMatch = c.video.author ? c.video.author.toLowerCase().includes(query) : false;
      const chapterMatch = c.chapters.some((ch) => ch.title.toLowerCase().includes(query));
      return titleMatch || authorMatch || chapterMatch;
    });
  }, [courses, debouncedQuery]);

  const displayCourses = isSearching ? filteredCourses : courses;

  if (isLoading) {
    return <CourseHistorySkeleton />;
  }

  const handleOpenDelete = (videoId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCourseToDelete({ id: videoId, title });
  };

  const handleConfirmDelete = () => {
    if (courseToDelete) {
      deleteSavedCourse(courseToDelete.id);
      onRefresh();
      setCourseToDelete(null);
    }
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

  const handleTriggerAdd = () => {
    if (onAddNewCourse) {
      onAddNewCourse();
    } else if (onGoToCreate) {
      onGoToCreate();
    }
  };

  if (courses.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 mx-auto mb-4 shadow-xs">
          <BookOpen className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
          Your Library is Empty
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-6 leading-relaxed">
          Add any YouTube course with timestamps to track your progress and navigate chapters locally.
        </p>
        <button
          type="button"
          onClick={handleTriggerAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer min-h-11 active:scale-98"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Your First Course</span>
        </button>
      </div>
    );
  }

  // Most recent course for Continue Watching Hero
  const recentCourse = courses[0];
  const recentCompleted = recentCourse.completedChapterIds?.length || 0;
  const recentTotal = recentCourse.chapters.length;
  const recentPercentage = recentTotal > 0 ? Math.round((recentCompleted / recentTotal) * 100) : 0;
  const recentLastChapter = recentCourse.chapters[recentCourse.lastPlayedChapterIndex] || recentCourse.chapters[0];
  const recentUrl = `/watch/${recentCourse.video.id}${recentCourse.lastPlayedSeconds > 0 ? `?t=${Math.floor(recentCourse.lastPlayedSeconds)}` : ''}`;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              My Courses
            </h1>
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-tnum">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            Local-first course chapters and saved learning progress.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Backup dropdown / buttons */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 bg-white hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-9"
            title="Download JSON backup"
            aria-label="Export backup"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 bg-white hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-9"
            title="Import JSON backup"
            aria-label="Import backup"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            aria-label="Upload JSON backup"
            className="hidden"
          />

          {/* Primary + Add Course Button */}
          <button
            type="button"
            onClick={handleTriggerAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer min-h-9 touch-manipulation active:scale-98"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div role="status" aria-live="polite" className="mb-6 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 flex items-center justify-between shadow-xs">
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            aria-label="Dismiss import status"
            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 font-semibold text-xs ml-2 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Hero Continue Watching Banner (hidden when actively searching) */}
      {!isSearching && (
        <div style={{ viewTransitionName: 'continue-watching-hero' }} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-8 transition-all">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
          {/* Thumbnail Container with Corner Delete Button */}
          <div className="relative aspect-video w-full md:w-80 rounded-xl overflow-hidden bg-black shrink-0 group border border-stone-200/50 dark:border-stone-800">
            <Link
              href={recentUrl}
              onClick={() => onResumeCourse(recentCourse)}
              className="absolute inset-0 z-0 block group-hover:opacity-95 transition-opacity"
              aria-label={`Resume course: ${recentCourse.video.title}`}
            >
              {recentCourse.video.thumbnailUrl ? (
                <Image
                  src={recentCourse.video.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-102 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900">
                  <Play className="w-8 h-8 text-stone-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
              {recentCourse.lastPlayedSeconds > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/85 text-white px-1.5 py-0.5 rounded text-2xs font-mono font-tnum">
                  {secondsToTimestamp(recentCourse.lastPlayedSeconds)}
                </div>
              )}
            </Link>

            {/* Corner Delete Button */}
            <button
              type="button"
              onClick={(e) => handleOpenDelete(recentCourse.video.id, recentCourse.video.title, e)}
              title="Remove course from saved list"
              aria-label={`Remove ${recentCourse.video.title} from saved courses`}
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/60 hover:bg-rose-600/90 text-white/80 hover:text-white backdrop-blur-xs flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Details & Resume CTA */}
          <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
            <div>
              <div className="mb-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wider text-primary dark:text-emerald-400">
                  Continue Learning
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                <Link
                  href={recentUrl}
                  onClick={() => onResumeCourse(recentCourse)}
                  className="hover:text-primary dark:hover:text-emerald-400 transition-colors"
                >
                  {recentCourse.video.title}
                </Link>
              </h2>

              {recentCourse.video.author && (
                <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-1 truncate">
                  {recentCourse.video.author}
                </p>
              )}

              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                Resuming at Ch. {recentCourse.lastPlayedChapterIndex + 1}: {recentLastChapter.title}
              </p>
            </div>

            {/* Bottom Progress & Button */}
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-2xs sm:text-xs text-stone-600 dark:text-stone-400 mb-1">
                  <span>{recentCompleted}/{recentTotal} chapters</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono font-tnum">{recentPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${recentPercentage}%` }}
                  />
                </div>
              </div>

              <Link
                href={recentUrl}
                onClick={() => onResumeCourse(recentCourse)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 active:scale-98"
              >
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* All Saved Courses / Search Results */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {isSearching ? 'Search Results' : 'All Saved Courses'}
            </h2>
            <span
              aria-live="polite"
              className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-tnum"
            >
              {isSearching ? `${filteredCourses.length} of ${courses.length}` : courses.length}
            </span>
          </div>

          {/* Debounced Search Bar */}
          <div className="relative w-full sm:w-64 md:w-72">
            {isDebouncing ? (
              <Loader2
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin pointer-events-none"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none"
                aria-hidden="true"
              />
            )}
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses or chapters..."
              aria-label="Search saved courses"
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl text-xs sm:text-sm pl-9 pr-8 py-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-primary min-h-10 sm:min-h-9 transition-colors shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {isSearching && filteredCourses.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 mx-auto mb-3">
              <Search className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              No courses found
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-4">
              No courses or chapters match &ldquo;{debouncedQuery}&rdquo;. Try another search term.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg transition-colors cursor-pointer min-h-9"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear search</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCourses.map((c) => {
              const completedCount = c.completedChapterIds?.length || 0;
              const totalChapters = c.chapters.length;
              const percentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
              const lastChapter = c.chapters[c.lastPlayedChapterIndex] || c.chapters[0];
              const courseUrl = `/watch/${c.video.id}${c.lastPlayedSeconds > 0 ? `?t=${Math.floor(c.lastPlayedSeconds)}` : ''}`;

              // If searching, identify if a specific chapter matched the search query
              const queryLower = debouncedQuery.trim().toLowerCase();
              const matchedChapter =
                isSearching &&
                !c.video.title.toLowerCase().includes(queryLower) &&
                (!c.video.author || !c.video.author.toLowerCase().includes(queryLower))
                  ? c.chapters.find((ch) => ch.title.toLowerCase().includes(queryLower))
                  : null;

              return (
                <div
                  key={c.video.id}
                  style={{ viewTransitionName: `course-card-${c.video.id}` }}
                  className="course-card-transition bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-xs hover:border-primary/50 dark:hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Thumbnail Container with Corner Delete Button */}
                    <div className="relative aspect-video w-full bg-black block overflow-hidden rounded-t-xl">
                      <Link
                        href={courseUrl}
                        onClick={() => onResumeCourse(c)}
                        className="absolute inset-0 z-0 block group-hover:opacity-95 transition-opacity"
                        aria-label={`Open course: ${c.video.title}`}
                      >
                        {c.video.thumbnailUrl ? (
                          <Image
                            src={c.video.thumbnailUrl}
                            alt=""
                            fill
                            className="object-cover group-hover:scale-102 transition-transform duration-300"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-900">
                            <Play className="w-6 h-6 text-stone-500" />
                          </div>
                        )}
                        {c.lastPlayedSeconds > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white px-1.5 py-0.5 rounded text-2xs font-mono font-tnum">
                            {secondsToTimestamp(c.lastPlayedSeconds)}
                          </div>
                        )}
                      </Link>

                      {/* Corner Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(c.video.id, c.video.title, e)}
                        title="Remove course"
                        aria-label={`Remove ${c.video.title}`}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-black/60 hover:bg-rose-600/90 text-white/80 hover:text-white backdrop-blur-xs flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                        <Link
                          href={courseUrl}
                          onClick={() => onResumeCourse(c)}
                          className="hover:text-primary dark:hover:text-emerald-400 transition-colors"
                        >
                          {c.video.title}
                        </Link>
                      </h3>

                      {c.video.author && (
                        <p className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate mt-1">
                          {c.video.author}
                        </p>
                      )}

                      {matchedChapter ? (
                        <p className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 truncate">
                          Matched chapter: &ldquo;{matchedChapter.title}&rdquo;
                        </p>
                      ) : (
                        <p className="text-2xs text-stone-500 dark:text-stone-400 mt-1.5 truncate">
                          Ch. {c.lastPlayedChapterIndex + 1}: {lastChapter?.title || 'Start'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Footer */}
                  <div className="p-3 sm:p-4 pt-0">
                    <div className="flex items-center justify-between text-2xs text-stone-600 dark:text-stone-400 mb-1">
                      <span>{completedCount}/{totalChapters} completed</span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono font-tnum">{percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Course Deletion */}
      <DeleteConfirmModal
        isOpen={Boolean(courseToDelete)}
        courseTitle={courseToDelete?.title || ''}
        onConfirm={handleConfirmDelete}
        onClose={() => setCourseToDelete(null)}
      />
    </div>
  );
}
