import React from 'react';
import { Play, Pause, Volume2, VolumeX, Share2 } from 'lucide-react';
import { PlayerState } from '../types';

interface ControlsProps {
  playerState: PlayerState;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onShare: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  playerState,
  onTogglePlay,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onShare,
}) => {
  const isPlaying = playerState === PlayerState.PLAYING;
  const isBuffering = playerState === PlayerState.BUFFERING;

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Main Play Button */}
      <div className="relative group">
        {/* Glow Ring Effect when playing */}
        {isPlaying && (
          <div className="absolute top-0 left-0 w-full h-full -inset-1 bg-amber-400/30 rounded-full blur-xl animate-pulse-ring" />
        )}
        
        <button
          onClick={onTogglePlay}
          disabled={isBuffering}
          className={`
            relative z-10 flex items-center justify-center w-24 h-24 rounded-full 
            transition-all duration-300 transform hover:scale-105 active:scale-95
            shadow-[0_0_40px_rgba(0,0,0,0.3)] border-4 border-emerald-900/50
            ${isPlaying 
              ? 'bg-amber-500 text-emerald-950 hover:bg-amber-400' 
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }
          `}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isBuffering ? (
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={40} fill="currentColor" />
          ) : (
            <Play size={40} fill="currentColor" className="mr-1" /> // offset for visual centering
          )}
        </button>
      </div>

      {/* Secondary Controls Row */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        {/* Volume Control */}
        <div className="flex-1 flex items-center gap-4 px-4 py-3 bg-emerald-900/40 rounded-2xl backdrop-blur-sm border border-emerald-800/50">
          <button 
            onClick={onToggleMute}
            className="text-emerald-200 hover:text-white transition-colors p-1"
          >
            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
          />
        </div>

        {/* Share Button */}
        <button 
          onClick={onShare}
          className="p-3 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 hover:text-amber-400 rounded-2xl backdrop-blur-sm border border-emerald-800/50 transition-all duration-300 active:scale-95"
          aria-label="Share"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
};