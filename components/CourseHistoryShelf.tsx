'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, Upload, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
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
  isLoading?: boolean;
  isStandaloneView?: boolean;
  onGoToCreate?: () => void;
  isTopShelf?: boolean;
  onAddNewCourse?: () => void;
}

export function CourseHistorySkeleton({
  isStandaloneView = false,
  isTopShelf = false,
  hasAddNewCourse = false,
}: {
  isStandaloneView?: boolean;
  isTopShelf?: boolean;
  hasAddNewCourse?: boolean;
}) {
  return (
    <div
      className={`w-full ${
        isStandaloneView
          ? 'py-4 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8'
          : isTopShelf
          ? ''
          : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-stone-200 dark:border-stone-800'
      }`}
      aria-busy="true"
      aria-label="Loading saved courses"
    >
      <span className="sr-only">Loading saved courses...</span>

      {/* Header & Placeholder Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-medium text-stone-900 dark:text-stone-100 tracking-tight">
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Resume previous learning sessions or backup progress locally.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap" aria-hidden="true">
          {hasAddNewCourse && (
            <div className="h-10 sm:h-11 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse shrink-0" />
          )}
          <div className="h-10 sm:h-11 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse shrink-0" />
          <div className="h-10 sm:h-11 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse shrink-0" />
        </div>
      </div>

      {/* Carousel Viewport Skeleton */}
      <div className="overflow-hidden">
        <div className="flex -ml-3 sm:-ml-4">
          {[1, 2].map((id) => (
            <div
              key={id}
              className="min-w-0 shrink-0 grow-0 pl-3 sm:pl-4 basis-full md:basis-1/2"
              aria-hidden="true"
            >
              <div className="h-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-xs animate-pulse">
                <div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="w-20 h-14 sm:w-24 sm:h-16 bg-stone-200 dark:bg-stone-800 rounded-md shrink-0 border border-stone-200 dark:border-stone-800" />

                    {/* Title and author placeholder */}
                    <div className="min-w-0 flex-1 pt-0.5 space-y-2">
                      <div className="h-3.5 sm:h-4 bg-stone-200 dark:bg-stone-800 rounded w-5/6" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/2" />
                    </div>

                    {/* Delete button placeholder */}
                    <div className="w-11 h-11 rounded-md bg-stone-100 dark:bg-stone-800/60 shrink-0" />
                  </div>

                  {/* Last watched placeholder */}
                  <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5">
                    <div className="h-3 w-12 bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="h-3 w-28 sm:w-36 bg-stone-200 dark:bg-stone-800 rounded" />
                  </div>
                </div>

                {/* Footer progress bar and resume link placeholder */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="h-2.5 w-20 bg-stone-200 dark:bg-stone-800 rounded" />
                      <div className="h-2.5 w-8 bg-stone-200 dark:bg-stone-800 rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full bg-stone-200 dark:bg-stone-700 rounded-full w-1/3" />
                    </div>
                  </div>

                  <div className="h-3.5 w-12 bg-stone-200 dark:bg-stone-800 rounded shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CourseHistoryShelf({
  courses,
  onResumeCourse,
  onRefresh,
  isLoading = false,
  isStandaloneView = false,
  onGoToCreate,
  isTopShelf = false,
  onAddNewCourse,
}: CourseHistoryShelfProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    const onReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onReInit);

    queueMicrotask(onReInit);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onReInit);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, courses.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  if (isLoading) {
    return (
      <CourseHistorySkeleton
        isStandaloneView={isStandaloneView}
        isTopShelf={isTopShelf}
        hasAddNewCourse={Boolean(onAddNewCourse)}
      />
    );
  }

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
                <span>Import</span>
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
            <span>Import</span>
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
    <section
      role="region"
      aria-roledescription="carousel"
      aria-labelledby="history-shelf-heading"
      className={`w-full ${isStandaloneView ? 'py-4 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8' : isTopShelf ? '' : 'mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-stone-200 dark:border-stone-800'}`}
    >
      {/* Live region for screen reader slide changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing slide {selectedIndex + 1} of {scrollSnaps.length}
      </div>

      {/* Header & Export/Import Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h2 id="history-shelf-heading" className="text-lg sm:text-2xl font-medium text-stone-900 dark:text-stone-100 tracking-tight">
            Continue Watching
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Resume previous learning sessions or backup progress locally.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {onAddNewCourse && (
            <button
              type="button"
              onClick={onAddNewCourse}
              aria-label="Add new video"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-hover rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Video</span>
            </button>
          )}

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary shrink-0 whitespace-nowrap"
            title="Download JSON backup"
            aria-label="Export saved courses to JSON backup file"
          >
            <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
            <span>Export</span>
          </button>

          {/* Import */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors cursor-pointer min-h-11 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary shrink-0 whitespace-nowrap"
            title="Import JSON backup"
            aria-label="Import courses from JSON backup file"
          >
            <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
            <span>Import</span>
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

      {/* Course Cards Carousel Viewport */}
      <div
        id="history-carousel-viewport"
        ref={emblaRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Course history carousel, use left and right arrow keys to navigate slides"
        className="overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex -ml-3 sm:-ml-4">
          {courses.map((c, index) => {
            const completedCount = c.completedChapterIds?.length || 0;
            const totalChapters = c.chapters.length;
            const percentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
            const lastChapter = c.chapters[c.lastPlayedChapterIndex] || c.chapters[0];

            const courseUrl = `/watch/${c.video.id}${c.lastPlayedSeconds > 0 ? `?t=${Math.floor(c.lastPlayedSeconds)}` : ''}`;

            return (
              <div
                key={c.video.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${courses.length}: ${c.video.title}`}
                className="min-w-0 shrink-0 grow-0 pl-3 sm:pl-4 basis-full md:basis-1/2"
              >
                <div className="h-full relative group bg-white dark:bg-stone-900 hover:border-primary dark:hover:border-emerald-500 border border-stone-200 dark:border-stone-800 rounded-xl p-3 sm:p-4 transition-all duration-200 flex flex-col justify-between shadow-xs touch-manipulation">
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
                        className="relative z-10 w-11 h-11 -mr-1.5 -mt-1.5 flex items-center justify-center text-stone-500 hover:text-rose-600 active:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 rounded-md transition-colors touch-manipulation shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-600"
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel Pagination & Navigation Controls */}
      {scrollSnaps.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-400">
          <span aria-hidden="true" className="font-medium shrink-0">
            Course {selectedIndex + 1} of {scrollSnaps.length}
          </span>

          <div
            role="tablist"
            aria-label="Course carousel pagination"
            className="flex items-center gap-1 overflow-x-auto py-1"
          >
            {scrollSnaps.map((_, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Go to slide ${index + 1} of ${scrollSnaps.length}`}
                  onClick={() => scrollTo(index)}
                  className="min-h-11 min-w-8 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full touch-manipulation"
                >
                  <span
                    className={`h-2 rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'w-6 bg-primary dark:bg-emerald-500'
                        : 'w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 dark:hover:bg-stone-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              aria-label="Previous courses"
              aria-controls="history-carousel-viewport"
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation shadow-2xs"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canScrollNext}
              aria-label="Next courses"
              aria-controls="history-carousel-viewport"
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation shadow-2xs"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
