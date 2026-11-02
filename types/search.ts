import { Chapter } from './playlist';

export interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  author: string;
  channelId?: string;
  thumbnailUrl: string;
  duration: string;
  durationSeconds?: number;
  views?: string;
  publishedTime?: string;
  hasChapters: boolean;
  chapterCount?: number;
  chapterTitles?: string[];
  descriptionSnippet?: string;
  chapters?: Chapter[];
}

export interface YouTubeSearchResponse {
  success: boolean;
  results?: YouTubeSearchResultItem[];
  error?: string;
  retryAfterSeconds?: number;
}
