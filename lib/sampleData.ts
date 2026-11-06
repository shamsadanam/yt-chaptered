export interface SampleVideoData {
  url: string;
  videoId: string;
  title: string;
  author: string;
  courseName: string;
  chapterCount: number;
  description: string;
}

export const SAMPLE_DATA: SampleVideoData = {
  url: 'https://www.youtube.com/watch?v=gmuTjeQUbTM',
  videoId: 'gmuTjeQUbTM',
  title: 'Harvard CS50 (2026) – Full Computer Science University Course',
  author: 'freeCodeCamp.org',
  courseName: 'Harvard CS50',
  chapterCount: 12,
  description: `00:00:00 Lecture 0 - Scratch
01:57:40 Lecture 1 - C
04:27:58 Lecture 2 - Arrays
06:53:32 Lecture 3 - Algorithms
08:53:07 Lecture 4 - Memory
11:13:02 Lecture 5 - Data Structures
13:19:15 Lecture 6 - Python
15:48:46 Lecture 7 - SQL
18:04:19 Artificial Intelligence
18:52:07 Lecture 8 - HTML, CSS, JavaScript
21:14:19 Lecture 9 - Flask
23:40:54 Lecture 10 - The End`,
};
