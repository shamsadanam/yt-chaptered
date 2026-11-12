'use client';

import { ParsedPlaylist } from '../types/playlist';
import { OmniVideoInput } from './OmniVideoInput';

interface InputViewProps {
  onGenerate: (playlist: ParsedPlaylist) => void;
}

export function InputView({ onGenerate }: InputViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium text-stone-900 dark:text-stone-100 tracking-tight mb-3 sm:mb-4">
          Turn timestamped videos into structured courses
        </h1>
        <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-xl mx-auto leading-relaxed">
          Search YouTube or paste any video link to automatically detect chapters, navigate segments, and track learning progress locally.
        </p>
      </div>

      <div
        id="course-input-card"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-8 shadow-xs"
      >
        <OmniVideoInput variant="inline" onGenerate={onGenerate} />
      </div>
    </div>
  );
}
