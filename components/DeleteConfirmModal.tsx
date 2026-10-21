'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  courseTitle: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  courseTitle,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cachedTitle, setCachedTitle] = useState(courseTitle);

  useEffect(() => {
    if (courseTitle) {
      setCachedTitle(courseTitle);
    }
  }, [courseTitle]);

  // Smooth enter and exit animation
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleConfirmClick = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onConfirm();
    }, 200);
  }, [onConfirm]);

  // Lock scroll without layout shift
  useScrollLock(isRendered);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isRendered) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Auto-focus the safe "Cancel" button for safety
    const focusTimer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isRendered, handleRequestClose]);

  if (!isRendered) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ease-out pr-scrollbar-compensation ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        ref={modalRef}
        className={`w-full sm:max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 transition-all duration-200 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-6 sm:translate-y-2 sm:scale-95'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Cancel and close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <h2 id="delete-dialog-title" className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
          Remove Course?
        </h2>

        <p id="delete-dialog-desc" className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
          Are you sure you want to remove <strong className="font-semibold text-stone-900 dark:text-stone-100">"{cachedTitle || courseTitle}"</strong> from your library? Your saved playback position and completed chapters will be removed from this browser.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleRequestClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors cursor-pointer min-h-10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-10"
          >
            Remove Course
          </button>
        </div>
      </div>
    </div>
  );
}
