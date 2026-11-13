'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search, Play, Check } from 'lucide-react';
import { Chapter } from '../../types/playlist';

interface FullscreenChapterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
  totalChapters: number;
  completedIdsSet: Set<string>;
  onSelectChapter: (index: number) => void;
  onToggleComplete: (chapterId: string, e?: React.MouseEvent) => void;
  onUserActivity: () => void;
  onHoverControls: (hovering: boolean) => void;
}

export function FullscreenChapterDrawer({
  isOpen,
  onClose,
  chapters,
  currentChapterIndex,
  totalChapters,
  completedIdsSet,
  onSelectChapter,
  onToggleComplete,
  onUserActivity,
  onHoverControls,
}: FullscreenChapterDrawerProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'remaining' | 'completed'>('all');
  const drawerListRef = useRef<HTMLOListElement>(null);
  const activeChapterRef = useRef<HTMLLIElement | null>(null);
  const drawerSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen, currentChapterIndex]);

  const filteredChapters = useMemo(() => {
    let result = chapters;
    if (filterStatus === 'remaining') {
      result = result.filter((chap) => !completedIdsSet.has(chap.id));
    } else if (filterStatus === 'completed') {
      result = result.filter((chap) => completedIdsSet.has(chap.id));
    }

    if (!filterQuery.trim()) return result;
    const query = filterQuery.toLowerCase();
    return result.filter(
      (chap) =>
        chap.title.toLowerCase().includes(query) ||
        chap.formattedTime.toLowerCase().includes(query)
    );
  }, [chapters, completedIdsSet, filterStatus, filterQuery]);

  const chapterIndexMap = useMemo(() => {
    return new Map(chapters.map((chap, i) => [chap.id, i]));
  }, [chapters]);

  const completedCount = completedIdsSet.size;
  const courseProgressPercentage =
    totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  return (
    <aside
      id="fullscreen-chapter-drawer"
      role="dialog"
      aria-modal="false"
      aria-label="Course chapters"
      onMouseEnter={() => onHoverControls(true)}
      onMouseLeave={() => onHoverControls(false)}
      className={`absolute top-0 right-0 bottom-0 z-40 w-80 sm:w-88 md:w-96 flex flex-col bg-stone-950/95 backdrop-blur-md border-l border-white/10 shadow-2xl transition-transform duration-200 ease-out pointer-events-auto motion-reduce:transition-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      <div className="p-4 border-b border-white/10 bg-stone-900/40">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Course Chapters</h2>
            <p className="text-xs text-stone-300 font-mono font-tnum">
              {completedCount} of {totalChapters} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-tnum font-semibold text-emerald-400">
              {courseProgressPercentage}%
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chapter list"
              className="min-h-10 min-w-10 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={courseProgressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course completion progress"
          className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${courseProgressPercentage}%` }}
          />
        </div>

        <div className="mt-3 relative">
          <Search
            className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={drawerSearchInputRef}
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter chapters..."
            aria-label="Filter chapters"
            className="w-full h-9 pl-8 pr-10 text-xs bg-stone-900 border border-stone-700/80 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
              className="absolute right-0 top-1/2 -translate-y-1/2 min-h-10 min-w-10 flex items-center justify-center text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5" role="group" aria-label="Filter chapters by completion">
          {(
            [
              { id: 'all', label: 'All', count: chapters.length },
              { id: 'remaining', label: 'Remaining', count: chapters.length - completedCount },
              { id: 'completed', label: 'Done', count: completedCount },
            ] as const
          ).map((chip) => {
            const isActive = filterStatus === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterStatus(chip.id)}
                aria-pressed={isActive}
                className={`text-2xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer min-h-7 select-none flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 border border-stone-800 hover:border-stone-700'
                }`}
              >
                <span>{chip.label}</span>
                <span className="font-mono font-tnum opacity-75">({chip.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <ol
        ref={drawerListRef}
        role="list"
        aria-label="Chapter items"
        className="flex-1 overflow-y-auto p-2 divide-y divide-white/5"
      >
        {filteredChapters.length === 0 ? (
          <li className="p-4 text-center text-xs text-stone-400">
            {filterQuery
              ? `No chapters matching "${filterQuery}"`
              : filterStatus === 'remaining'
              ? 'All chapters completed!'
              : 'No completed chapters yet.'}
          </li>
        ) : (
          filteredChapters.map((chap) => {
            const originalIndex = chapterIndexMap.get(chap.id) ?? chap.index - 1;
            const isActive = originalIndex === currentChapterIndex;
            const isCompleted = completedIdsSet.has(chap.id);

            return (
              <li
                key={chap.id}
                ref={isActive ? (node) => { activeChapterRef.current = node; } : undefined}
                className={`content-visibility-auto w-full p-2 rounded-lg flex items-center gap-2 my-0.5 transition-colors ${
                  isActive
                    ? 'bg-stone-800/90 border border-emerald-500/50 shadow-xs'
                    : 'hover:bg-stone-800/50 border border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectChapter(originalIndex);
                    onUserActivity();
                  }}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`Play chapter ${chap.index}: ${chap.title}, timestamp ${chap.formattedTime}${isCompleted ? ', completed' : ''}`}
                  className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md p-1 -m-1"
                >
                  <div
                    className={`shrink-0 w-6 h-6 rounded-md text-2xs font-semibold flex items-center justify-center ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                    aria-hidden="true"
                  >
                    {isActive ? (
                      <Play className="w-3 h-3 fill-current ml-0.5 animate-pulse text-white" />
                    ) : (
                      <span>{chap.index}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug break-words line-clamp-2 ${
                        isCompleted
                          ? 'text-stone-400 line-through decoration-stone-500'
                          : 'text-stone-100'
                      } ${isActive ? 'font-semibold text-emerald-300' : 'font-normal'}`}
                    >
                      {chap.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono font-tnum px-1 py-0.5 rounded-xs bg-stone-900 border border-stone-800 text-stone-300">
                        {chap.formattedTime}
                      </span>
                      {isActive && (
                        <span className="text-2xs font-medium text-emerald-400">
                          Now playing
                        </span>
                      )}
                      {isCompleted && !isActive && (
                        <span className="text-2xs font-medium text-stone-400">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isCompleted}
                  onClick={(e) => {
                    onToggleComplete(chap.id, e);
                    onUserActivity();
                  }}
                  title={isCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                  aria-label={isCompleted ? `Mark chapter ${chap.index} as incomplete` : `Mark chapter ${chap.index} as completed`}
                  className="shrink-0 min-h-11 min-w-11 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md"
                >
                  <div
                    className={`w-5 h-5 rounded-xs border flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-primary border-primary text-white'
                        : 'bg-stone-900 border-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {isCompleted && (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                    )}
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ol>

      <div className="p-2.5 border-t border-white/10 text-center text-2xs text-stone-400">
        Tip: <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">I</kbd> chapters, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">C</kbd> captions, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">M</kbd> mute, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">↑/↓</kbd> volume, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">Space</kbd> play/pause
      </div>
    </aside>
  );
}
