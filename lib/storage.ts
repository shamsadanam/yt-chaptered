import { SavedCourse } from '../types/playlist';

const STORAGE_KEY = 'yt_chaptered_courses_v2';
const STORAGE_CHANGE_EVENT = 'yt_chaptered_courses_change';

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT));
  }
}

export function subscribeCourses(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent | Event) => {
    if ('key' in event && event.key !== null && event.key !== STORAGE_KEY) return;
    callback();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener(STORAGE_CHANGE_EVENT, callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STORAGE_CHANGE_EVENT, callback);
    }
  };
}

let cachedCoursesRaw: string | null = null;
let cachedCoursesParsed: SavedCourse[] = [];
const emptyCourses: SavedCourse[] = [];

export function getSavedCoursesSnapshot(): SavedCourse[] {
  if (typeof window === 'undefined') return emptyCourses;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedCoursesRaw) {
      cachedCoursesRaw = raw;
      if (!raw) {
        cachedCoursesParsed = [];
      } else {
        const parsed = JSON.parse(raw);
        cachedCoursesParsed = Array.isArray(parsed)
          ? parsed.sort((a, b) => b.updatedAt - a.updatedAt)
          : [];
      }
    }
    return cachedCoursesParsed;
  } catch (err) {
    console.error('Failed to read saved courses snapshot:', err);
    return cachedCoursesParsed;
  }
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
  try {
    const courses = [...getSavedCourses()];
    const existingIndex = courses.findIndex((c) => c.video.id === course.video.id);

    const updatedCourse = {
      ...course,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      courses[existingIndex] = updatedCourse;
    } else {
      courses.unshift(updatedCourse);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    cachedCoursesRaw = null;
    notifyListeners();
  } catch (err) {
    console.error('Failed to save course to localStorage:', err);
  }
}

export function updateCoursePlaybackProgress(
  videoId: string,
  lastPlayedChapterIndex: number,
  lastPlayedSeconds: number
): void {
  if (typeof window === 'undefined') return;
  try {
    const courses = [...getSavedCourses()];
    const course = courses.find((c) => c.video.id === videoId);
    if (course) {
      course.lastPlayedChapterIndex = lastPlayedChapterIndex;
      course.lastPlayedSeconds = Math.max(0, Math.floor(lastPlayedSeconds));
      course.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      cachedCoursesRaw = null;
      notifyListeners();
    }
  } catch (err) {
    console.error('Failed to update playback progress:', err);
  }
}

export function toggleChapterCompletion(videoId: string, chapterId: string): SavedCourse | null {
  if (typeof window === 'undefined') return null;
  try {
    const courses = [...getSavedCourses()];
    const course = courses.find((c) => c.video.id === videoId);
    if (course) {
      const isCompleted = course.completedChapterIds.includes(chapterId);
      if (isCompleted) {
        course.completedChapterIds = course.completedChapterIds.filter((id) => id !== chapterId);
      } else {
        course.completedChapterIds = [...course.completedChapterIds, chapterId];
      }
      course.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
      cachedCoursesRaw = null;
      notifyListeners();
      return course;
    }
  } catch (err) {
    console.error('Failed to toggle chapter completion:', err);
  }
  return null;
}

export function deleteSavedCourse(videoId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const courses = getSavedCourses().filter((c) => c.video.id !== videoId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    cachedCoursesRaw = null;
    notifyListeners();
  } catch (err) {
    console.error('Failed to delete course from localStorage:', err);
  }
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

    const currentCourses = getSavedCourses();
    const courseMap = new Map<string, SavedCourse>();

    for (const c of currentCourses) {
      courseMap.set(c.video.id, c);
    }

    let addedOrUpdated = 0;
    for (const item of parsed) {
      if (item && item.video && item.video.id && Array.isArray(item.chapters)) {
        courseMap.set(item.video.id, {
          video: item.video,
          chapters: item.chapters,
          rawTimestampsText: item.rawTimestampsText || '',
          completedChapterIds: Array.isArray(item.completedChapterIds) ? item.completedChapterIds : [],
          lastPlayedChapterIndex: typeof item.lastPlayedChapterIndex === 'number' ? item.lastPlayedChapterIndex : 0,
          lastPlayedSeconds: typeof item.lastPlayedSeconds === 'number' ? item.lastPlayedSeconds : 0,
          updatedAt: item.updatedAt || Date.now(),
        });
        addedOrUpdated++;
      }
    }

    const merged = Array.from(courseMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    cachedCoursesRaw = null;
    notifyListeners();

    return { success: true, count: addedOrUpdated };
  } catch (err) {
    return { success: false, count: 0, error: err instanceof Error ? err.message : 'Invalid JSON format' };
  }
}
