import { SavedCourse } from '../types/playlist';

const DB_NAME = 'yt_chaptered_db';
const DB_VERSION = 2;
const STORE_NAME = 'courses';
const LEGACY_STORAGE_KEY = 'yt_chaptered_courses_v2';
const STORAGE_CHANGE_EVENT = 'yt_chaptered_courses_change';

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT));
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable in SSR'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        db.createObjectStore(STORE_NAME, { keyPath: 'video.id' });
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

let memoryCoursesCache: SavedCourse[] = [];
let isInitialized = false;
let initPromise: Promise<void> | null = null;
const emptyCourses: SavedCourse[] = [];

async function idbGetAll(): Promise<SavedCourse[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as SavedCourse[]) || []);
    request.onerror = () => reject(request.error);
  });
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }
  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return true;
    return await navigator.storage.persist();
  } catch (err) {
    console.warn('Storage persistence request failed:', err);
    return false;
  }
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number } | null> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return { usage, quota, percentUsed };
  } catch {
    return null;
  }
}

async function idbPut(course: SavedCourse): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(course);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      const error = request.error;
      if (error?.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded when writing to IndexedDB:', error);
      }
      reject(error);
    };
  });
}

async function idbDelete(videoId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(videoId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCourses(): Promise<void> {
  if (typeof window === 'undefined') return;
  memoryCoursesCache = [];
  notifyListeners();
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.error('Failed to clear courses from IndexedDB:', err);
  }
}

export function initStorage(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let courses = await idbGetAll();

      // One-time automatic migration from legacy localStorage
      try {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const parsedLegacy = JSON.parse(legacyRaw);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            const courseMap = new Map<string, SavedCourse>();
            courses.forEach((c) => courseMap.set(c.video.id, c));

            for (const item of parsedLegacy) {
              if (item?.video?.id && !courseMap.has(item.video.id)) {
                await idbPut(item);
                courseMap.set(item.video.id, item);
              }
            }
            courses = Array.from(courseMap.values());
          }
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } catch (legacyErr) {
        console.warn('Legacy localStorage migration notice:', legacyErr);
      }

      memoryCoursesCache = courses.sort((a, b) => b.updatedAt - a.updatedAt);
      isInitialized = true;
      notifyListeners();

      requestPersistentStorage().catch(() => {});
    } catch (err) {
      console.error('Failed to initialize IndexedDB storage:', err);
    }
  })();

  return initPromise;
}

if (typeof window !== 'undefined') {
  initStorage();
}

export function subscribeCourses(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window !== 'undefined') {
    if (!isInitialized) {
      initStorage();
    }
    window.addEventListener(STORAGE_CHANGE_EVENT, callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORAGE_CHANGE_EVENT, callback);
    }
  };
}

export function getSavedCoursesSnapshot(): SavedCourse[] {
  if (typeof window === 'undefined') return emptyCourses;
  return memoryCoursesCache;
}

export function getSavedCoursesServerSnapshot(): SavedCourse[] {
  return emptyCourses;
}

export function getSavedCourses(): SavedCourse[] {
  return getSavedCoursesSnapshot();
}

export function getSavedCourse(videoId: string): SavedCourse | null {
  const courses = getSavedCoursesSnapshot();
  return courses.find((c) => c.video.id === videoId) || null;
}

const emptyCompletedIds: string[] = [];

export function getCompletedChapterIdsSnapshot(videoId: string): string[] {
  const course = getSavedCourse(videoId);
  return course?.completedChapterIds || emptyCompletedIds;
}

export function getCompletedChapterIdsServerSnapshot(): string[] {
  return emptyCompletedIds;
}

export function saveCourse(course: SavedCourse): void {
  if (typeof window === 'undefined') return;
  const updatedCourse: SavedCourse = {
    ...course,
    updatedAt: Date.now(),
  };

  const nextCourses = [...memoryCoursesCache];
  const existingIndex = nextCourses.findIndex((c) => c.video.id === course.video.id);

  if (existingIndex >= 0) {
    nextCourses[existingIndex] = updatedCourse;
  } else {
    nextCourses.unshift(updatedCourse);
  }

  memoryCoursesCache = nextCourses.sort((a, b) => b.updatedAt - a.updatedAt);
  notifyListeners();

  idbPut(updatedCourse).catch((err) => {
    console.error('Failed to save course to IndexedDB:', err);
  });
}

export function updateCoursePlaybackProgress(
  videoId: string,
  lastPlayedChapterIndex: number,
  lastPlayedSeconds: number
): void {
  if (typeof window === 'undefined') return;
  const course = memoryCoursesCache.find((c) => c.video.id === videoId);
  if (!course) return;

  const updatedCourse: SavedCourse = {
    ...course,
    lastPlayedChapterIndex,
    lastPlayedSeconds: Math.max(0, Math.floor(lastPlayedSeconds)),
    updatedAt: Date.now(),
  };

  memoryCoursesCache = memoryCoursesCache
    .map((c) => (c.video.id === videoId ? updatedCourse : c))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  notifyListeners();

  idbPut(updatedCourse).catch((err) => {
    console.error('Failed to update playback progress in IndexedDB:', err);
  });
}

export function markChapterCompleted(videoId: string, chapterId: string): SavedCourse | null {
  if (typeof window === 'undefined') return null;
  const course = memoryCoursesCache.find((c) => c.video.id === videoId);
  if (!course) return null;

  if (course.completedChapterIds.includes(chapterId)) {
    return course;
  }

  const updatedCourse: SavedCourse = {
    ...course,
    completedChapterIds: [...course.completedChapterIds, chapterId],
    updatedAt: Date.now(),
  };

  memoryCoursesCache = memoryCoursesCache
    .map((c) => (c.video.id === videoId ? updatedCourse : c))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  notifyListeners();

  idbPut(updatedCourse).catch((err) => {
    console.error('Failed to mark chapter completed in IndexedDB:', err);
  });

  return updatedCourse;
}

export function toggleChapterCompletion(videoId: string, chapterId: string): SavedCourse | null {
  if (typeof window === 'undefined') return null;
  const course = memoryCoursesCache.find((c) => c.video.id === videoId);
  if (!course) return null;

  const isCompleted = course.completedChapterIds.includes(chapterId);
  const updatedCompletedIds = isCompleted
    ? course.completedChapterIds.filter((id) => id !== chapterId)
    : [...course.completedChapterIds, chapterId];

  const updatedCourse: SavedCourse = {
    ...course,
    completedChapterIds: updatedCompletedIds,
    updatedAt: Date.now(),
  };

  memoryCoursesCache = memoryCoursesCache
    .map((c) => (c.video.id === videoId ? updatedCourse : c))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  notifyListeners();

  idbPut(updatedCourse).catch((err) => {
    console.error('Failed to toggle chapter completion in IndexedDB:', err);
  });

  return updatedCourse;
}

export function deleteSavedCourse(videoId: string): void {
  if (typeof window === 'undefined') return;
  memoryCoursesCache = memoryCoursesCache.filter((c) => c.video.id !== videoId);
  notifyListeners();

  idbDelete(videoId).catch((err) => {
    console.error('Failed to delete course from IndexedDB:', err);
  });
}

export function exportCoursesJson(): string {
  const courses = getSavedCourses();
  return JSON.stringify(courses, null, 2);
}

export function importCoursesJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  if (typeof window === 'undefined') return { success: false, count: 0, error: 'Window not available' };
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'Imported file must contain an array of courses' };
    }

    const courseMap = new Map<string, SavedCourse>();
    for (const c of memoryCoursesCache) {
      courseMap.set(c.video.id, c);
    }

    const itemsToSave: SavedCourse[] = [];
    let addedOrUpdated = 0;

    for (const item of parsed) {
      if (item && item.video && item.video.id && Array.isArray(item.chapters)) {
        const courseItem: SavedCourse = {
          video: item.video,
          chapters: item.chapters,
          rawTimestampsText: item.rawTimestampsText || '',
          completedChapterIds: Array.isArray(item.completedChapterIds) ? item.completedChapterIds : [],
          lastPlayedChapterIndex: typeof item.lastPlayedChapterIndex === 'number' ? item.lastPlayedChapterIndex : 0,
          lastPlayedSeconds: typeof item.lastPlayedSeconds === 'number' ? item.lastPlayedSeconds : 0,
          updatedAt: item.updatedAt || Date.now(),
        };
        courseMap.set(item.video.id, courseItem);
        itemsToSave.push(courseItem);
        addedOrUpdated++;
      }
    }

    memoryCoursesCache = Array.from(courseMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    notifyListeners();

    Promise.all(itemsToSave.map((course) => idbPut(course))).catch((err) => {
      console.error('Failed to persist imported courses to IndexedDB:', err);
    });

    return { success: true, count: addedOrUpdated };
  } catch (err) {
    return { success: false, count: 0, error: err instanceof Error ? err.message : 'Invalid JSON format' };
  }
}
