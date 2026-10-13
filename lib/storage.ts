import { SavedCourse } from '../types/playlist';

const STORAGE_KEY = 'yt_chaptered_courses_v2';

export function getSavedCourses(): SavedCourse[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const courses = JSON.parse(data);
    if (Array.isArray(courses)) {
      return courses.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (err) {
    console.error('Failed to read saved courses from localStorage:', err);
  }
  return [];
}

export function getSavedCourse(videoId: string): SavedCourse | null {
  const courses = getSavedCourses();
  return courses.find((c) => c.video.id === videoId) || null;
}

export function saveCourse(course: SavedCourse): void {
  if (typeof window === 'undefined') return;
  try {
    const courses = getSavedCourses();
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
    const courses = getSavedCourses();
    const course = courses.find((c) => c.video.id === videoId);
    if (course) {
      course.lastPlayedChapterIndex = lastPlayedChapterIndex;
      course.lastPlayedSeconds = Math.max(0, Math.floor(lastPlayedSeconds));
      course.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    }
  } catch (err) {
    console.error('Failed to update playback progress:', err);
  }
}

export function toggleChapterCompletion(videoId: string, chapterId: string): SavedCourse | null {
  if (typeof window === 'undefined') return null;
  try {
    const courses = getSavedCourses();
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

    return { success: true, count: addedOrUpdated };
  } catch (err) {
    return { success: false, count: 0, error: err instanceof Error ? err.message : 'Invalid JSON format' };
  }
}
