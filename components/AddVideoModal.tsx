'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ParsedPlaylist } from '../types/playlist';
import { useScrollLock } from '../hooks/useScrollLock';
import { OmniVideoInput } from './OmniVideoInput';

export interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (playlist: ParsedPlaylist) => void;
  onSwitchToSearch?: () => void; // Maintained for backward compatibility
}

export type AddCourseModalProps = AddVideoModalProps;

export function AddVideoModal({ isOpen, onClose, onGenerate }: AddVideoModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  if (isOpen && !isRendered) {
    setIsRendered(true);
  }

  // Smooth opening and closing animation coordination
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useScrollLock(isRendered);

  useEffect(() => {
    if (!isRendered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, handleRequestClose]);

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-video-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-200 ${
        isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none pointer-events-none'
      }`}
    >
      <div
        className="fixed inset-0 bg-stone-900/60 dark:bg-black/75 transition-opacity cursor-pointer"
        onClick={handleRequestClose}
        aria-hidden="true"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-modal overflow-hidden transition-all duration-200 ${
          isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-5 border-b border-stone-200/80 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <h2
                id="add-video-modal-title"
                className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight"
              >
                Add Video
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden xs:block truncate">
                Search YouTube or paste a direct video link
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close modal"
            className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          <OmniVideoInput
            variant="modal"
            autoFocus
            onGenerate={onGenerate}
            onCloseModal={handleRequestClose}
          />
        </div>
      </div>
    </div>
  );
}

// Backwards-compatible aliases
export { AddVideoModal as AddCourseModal };
