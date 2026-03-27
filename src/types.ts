export type VideoCandidate = {
  id: string;
  url: string;
  title: string;
  poster?: string;
  width?: number;
  height?: number;
  paused?: boolean;
};

export type PlayerSnapshot = {
  id: string;
  url: string;
  title: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  playbackRate: number;
};

export type DownloadItem = {
  id: string;
  title: string;
  remoteUrl: string;
  sourcePage: string;
  fileUri: string;
  downloadedAt: string;
  status?: 'downloading' | 'completed' | 'failed';
  progress?: number;
  bytesWritten?: number;
  bytesExpected?: number;
  errorMessage?: string;
};
