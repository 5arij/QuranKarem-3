export enum PlayerState {
  IDLE = 'IDLE',
  BUFFERING = 'BUFFERING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}