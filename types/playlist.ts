export interface Chapter {
  id: string;
  index: number;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds; Infinity if until end of video
  formattedTime: string;
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  author?: string;
  channelId?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
}

export interface ParsedPlaylist {
  video: VideoMetadata;
  chapters: Chapter[];
  rawTimestampsText?: string;
  initialStartTime?: number;
  initialChapterIndex?: number;
}

export interface SavedCourse {
  video: VideoMetadata;
  chapters: Chapter[];
  rawTimestampsText?: string;
  completedChapterIds: string[];
  lastPlayedChapterIndex: number;
  lastPlayedSeconds: number;
  updatedAt: number;
}
