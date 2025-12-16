import React, { useState, useRef, useEffect, useCallback } from 'react';
import { STREAM_URL, APP_STRINGS, ALBUM_ART_URL } from './constants';
import { PlayerState } from './types';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { Visualizer } from './components/Visualizer';

const App: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE);
  const playerStateRef = useRef<PlayerState>(PlayerState.IDLE); // Ref to access state in listeners without effect re-run
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    playerStateRef.current = playerState;
    
    // Update Media Session Playback State
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 
            playerState === PlayerState.PLAYING || playerState === PlayerState.BUFFERING 
            ? 'playing' 
            : 'paused';
    }
  }, [playerState]);

  // Setup Web Audio API
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current) return;

    // Create context if it doesn't exist
    if (!audioContextRef.current) {
        try {
            const AudioContextVal = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextVal();
            
            const analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 64; // Low bin count for cleaner visualizer bars
            analyserNode.smoothingTimeConstant = 0.8;

            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyserNode);
            analyserNode.connect(ctx.destination);

            audioContextRef.current = ctx;
            sourceRef.current = source;
            setAnalyser(analyserNode);
        } catch (e) {
            console.warn("Web Audio API setup failed (likely CORS or support issue):", e);
        }
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.warn("Audio Context resume failed:", e));
    }
  }, []);

  useEffect(() => {
    // Initialize Audio
    const audio = new Audio();
    // CRITICAL: Set crossOrigin to anonymous BEFORE setting src to allow Web Audio API analysis
    // This requires the streaming server to support CORS headers (Access-Control-Allow-Origin)
    audio.crossOrigin = "anonymous";
    audio.src = STREAM_URL;
    audioRef.current = audio;
    audio.preload = 'auto';

    // --- Media Session API Implementation for Background Audio ---
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: APP_STRINGS.title,
            artist: APP_STRINGS.subtitle,
            artwork: [
                { src: ALBUM_ART_URL, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        // Handle System/Lock Screen Controls
        navigator.mediaSession.setActionHandler('play', () => {
             if (audio.paused) {
                 setupAudioContext();
                 audio.play().catch(console.error);
             }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
             if (!audio.paused) {
                 audio.pause();
             }
        });
        
        try {
             navigator.mediaSession.setActionHandler('stop', () => {
                 audio.pause();
                 audio.currentTime = 0;
             });
        } catch (e) {
            // Stop action might not be supported in all browsers
        }
    }

    const onPlay = () => setPlayerState(PlayerState.PLAYING);
    const onPause = () => {
        if (playerStateRef.current !== PlayerState.ERROR) {
            setPlayerState(PlayerState.PAUSED);
        }
    };
    const onWaiting = () => setPlayerState(PlayerState.BUFFERING);
    const onPlaying = () => setPlayerState(PlayerState.PLAYING);
    
    const onError = (e: Event) => {
        console.error("Audio Error Event:", e);
        setPlayerState(PlayerState.ERROR);
        
        if (audio.error) {
            switch (audio.error.code) {
                case MediaError.MEDIA_ERR_NETWORK:
                    setError(APP_STRINGS.errors.network);
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    setError(APP_STRINGS.errors.decode);
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    setError(APP_STRINGS.errors.srcNotSupported);
                    break;
                default:
                    setError(APP_STRINGS.errors.general);
                    break;
            }
        } else {
            setError(APP_STRINGS.errors.general);
        }
    };

    const handleOffline = () => {
        if (playerStateRef.current === PlayerState.PLAYING) {
            setPlayerState(PlayerState.ERROR);
            setError(APP_STRINGS.errors.offline);
        }
    };
    
    const handleOnline = () => {
        if (playerStateRef.current === PlayerState.ERROR && error === APP_STRINGS.errors.offline) {
            setError(null);
            setPlayerState(PlayerState.IDLE);
        }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Attempt Autoplay
    const attemptAutoplay = async () => {
        try {
            // Note: We do NOT setup audio context here immediately because browser autoplay 
            // policies often block AudioContext until a user gesture. 
            // We rely on the user clicking play OR the system allowing it.
            // If the system allows audio.play(), we can try to setup context, but it might stay suspended.
            
            if (audio.src.indexOf('?') === -1) {
                audio.src = `${STREAM_URL}?t=${Date.now()}`;
            }
            setPlayerState(PlayerState.BUFFERING);
            await audio.play();
            // If autoplay succeeds, we can try to init the context, though it might need a click to resume
            setupAudioContext();
        } catch (err) {
            console.log("Autoplay prevented (user interaction required):", err);
            setPlayerState(PlayerState.IDLE);
        }
    };

    attemptAutoplay();

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
      
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    // Ensure Audio Context is active on user gesture
    setupAudioContext();

    if (playerState === PlayerState.PLAYING || playerState === PlayerState.BUFFERING) {
      audioRef.current.pause();
      setPlayerState(PlayerState.PAUSED);
    } else {
      setError(null);
      setPlayerState(PlayerState.BUFFERING);
      
      if (audioRef.current.src.indexOf('?') === -1) {
          audioRef.current.src = `${STREAM_URL}?t=${Date.now()}`;
      }
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.error("Playback failed:", e);
          setPlayerState(PlayerState.ERROR);
          
          if (e.name === 'NotAllowedError') {
             setError(APP_STRINGS.errors.autoplay);
          } else if (e.name === 'NotSupportedError') {
             setError(APP_STRINGS.errors.srcNotSupported);
          } else if (!navigator.onLine) {
             setError(APP_STRINGS.errors.offline);
          } else {
             setError(APP_STRINGS.errors.general);
          }
        });
      }
    }
  }, [playerState, setupAudioContext]);

  const handleShare = async () => {
    const shareData = {
      title: APP_STRINGS.title,
      text: APP_STRINGS.subtitle,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.debug('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background with Islamic Pattern & Gradient Overlay */}
      <div className="absolute inset-0 bg-emerald-950">
        {/* Abstract Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Radial Gradient for focus */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-800/50 via-emerald-950/80 to-emerald-950"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Content Container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden relative">
          
          {/* Decorative Top Arch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-b-full blur-xl pointer-events-none"></div>

          {/* Toast Notification */}
          <div 
            className={`absolute top-6 left-0 right-0 flex justify-center z-50 transition-all duration-300 pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
          >
            <div className="bg-amber-500 text-emerald-950 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
              {APP_STRINGS.linkCopied}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <Header />

            {/* Album Art / Icon Representation */}
            <div className="relative mx-auto w-48 h-48 md:w-56 md:h-56">
                <div className={`absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 transition-opacity duration-1000 ${playerState === PlayerState.PLAYING ? 'opacity-40 animate-pulse' : ''}`}></div>
                <div className="relative w-full h-full rounded-full border-4 border-emerald-500/30 bg-emerald-900/50 flex items-center justify-center overflow-hidden shadow-2xl">
                    <img 
                        src={ALBUM_ART_URL}
                        alt="Makkah" 
                        className="w-full h-full object-cover opacity-80 mix-blend-overlay hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent"></div>
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                        <span className="font-amiri text-2xl text-amber-400 drop-shadow-md">مكة المكرمة</span>
                    </div>
                </div>
            </div>

            <Visualizer isPlaying={playerState === PlayerState.PLAYING} analyser={analyser} />

            {error && (
              <div className="animate-fade-in flex flex-col gap-2">
                <div className="text-red-300 text-sm text-center bg-red-900/20 py-2 px-3 rounded-lg border border-red-500/20">
                  <p className="font-semibold">{error}</p>
                </div>
                {error !== APP_STRINGS.errors.autoplay && (
                    <p className="text-emerald-400/60 text-xs text-center">
                        {APP_STRINGS.troubleshoot}
                    </p>
                )}
              </div>
            )}

            <Controls 
              playerState={playerState}
              onTogglePlay={togglePlay}
              volume={volume}
              onVolumeChange={setVolume}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onShare={handleShare}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-emerald-500/60 text-sm font-light">
           {APP_STRINGS.footer}
        </div>

      </div>
    </div>
  );
};

export default App;