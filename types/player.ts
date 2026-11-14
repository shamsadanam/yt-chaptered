export interface PlayerPlaybackState {
  isPlaying: boolean;
  isPlayLoading: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

export interface PlayerPlaybackActions {
  play: () => void;
  pause: () => void;
  seekToChapter: (index: number) => void;
  seekToTime: (seconds: number) => void;
  seekBy: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

