import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Download,
  Shield,
  Maximize2,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { AnyAnimationSpec, AspectRatio, DurationOption, ResolutionOption } from '../types';
import { createRenderer } from '../renderers/createRenderer';
import { AnimationEngine } from '../renderers/types';

interface PlayerPreviewProps {
  spec: AnyAnimationSpec;
  aspectRatio: AspectRatio;
  duration: DurationOption;
  resolution: ResolutionOption;
  onOpenExport: () => void;
  getCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  onFrameCaptureReady?: (renderFrame: (progress: number, timeSec: number) => HTMLCanvasElement) => void;
}

export const PlayerPreview: React.FC<PlayerPreviewProps> = ({
  spec,
  aspectRatio,
  duration,
  resolution,
  onOpenExport,
  getCanvasRef,
  onFrameCaptureReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);

  // Resolution in pixels
  const isPortrait = aspectRatio === '9:16';
  const width = resolution === '1080p' ? (isPortrait ? 1080 : 1920) : (isPortrait ? 720 : 1280);
  const height = resolution === '1080p' ? (isPortrait ? 1920 : 1080) : (isPortrait ? 1280 : 720);

  // Initialize or re-create renderer engine when spec, ratio or resolution changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Dispose old engine
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    try {
      const engine = createRenderer(
        {
          canvas,
          width,
          height,
          aspectRatio,
          duration,
        },
        spec
      );
      engineRef.current = engine;

      // Render initial frame at current progress
      const progress = duration > 0 ? currentTime / duration : 0;
      engine.renderAt(progress, currentTime);
    } catch (err) {
      console.error('Error creating animation engine:', err);
    }

    getCanvasRef(canvas);

    // Provide offscreen / deterministic frame step function for export
    if (onFrameCaptureReady) {
      onFrameCaptureReady((p: number, t: number) => {
        if (engineRef.current) {
          engineRef.current.renderAt(p, t);
        }
        return canvas;
      });
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [spec, aspectRatio, resolution, duration, width, height, getCanvasRef, onFrameCaptureReady]);

  // Render on exact time scrub
  const renderFrameAtTime = useCallback(
    (timeSec: number) => {
      if (!engineRef.current) return;
      const progress = duration > 0 ? Math.min(1, Math.max(0, timeSec / duration)) : 0;
      engineRef.current.renderAt(progress, timeSec);
    },
    [duration]
  );

  // Playback animation loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (isPlaying) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setCurrentTime((prev) => {
          let next = prev + delta;
          if (next >= duration) {
            next = 0; // loop
          }
          renderFrameAtTime(next);
          return next;
        });
      }
      lastTimestamp = timestamp;
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, duration, renderFrameAtTime]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    renderFrameAtTime(newTime);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    renderFrameAtTime(0);
    setIsPlaying(true);
  };

  const handleStepFrame = (forward: boolean) => {
    setIsPlaying(false);
    const frameStep = 1 / 30; // 30 fps
    setCurrentTime((prev) => {
      const next = forward ? Math.min(duration, prev + frameStep) : Math.max(0, prev - frameStep);
      renderFrameAtTime(next);
      return next;
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 lg:p-6 flex flex-col items-center gap-4">
      {/* Top Preview Bar */}
      <div className="w-full flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
            Prévia em Tempo Real
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-300">
            {width}x{height} • 30 FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Safe area toggle */}
          <button
            onClick={() => setShowSafeArea((prev) => !prev)}
            title="Exibir margens de segurança para Instagram Reels / TikTok"
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              showSafeArea
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Margens Reels</span>
          </button>

          {/* Export MP4 CTA */}
          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar MP4</span>
          </button>
        </div>
      </div>

      {/* Viewport Canvas Container */}
      <div
        className={`relative rounded-xl overflow-hidden shadow-2xl bg-black border border-zinc-800/90 flex items-center justify-center transition-all ${
          isPortrait ? 'w-full max-w-[320px] aspect-[9/16]' : 'w-full max-w-[620px] aspect-[16/9]'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block select-none"
        />

        {/* Safe Area Overlay Guide */}
        {showSafeArea && (
          <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-red-500/50 z-20 m-6 flex flex-col justify-between p-2">
            <span className="text-[9px] font-mono font-bold text-red-400/80 bg-black/60 px-1 py-0.5 rounded self-start">
              Zona Segura (Safe Area)
            </span>
            <div className="text-[9px] font-mono text-red-400/80 bg-black/60 px-1 py-0.5 rounded self-center">
              Sem interferência de botões do Reels
            </div>
          </div>
        )}
      </div>

      {/* Deterministic Timeline Scrubber & Controls */}
      <div className="w-full max-w-2xl space-y-2 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
        {/* Progress bar scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-12 text-left">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={handleScrub}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
          />

          <span className="text-[11px] font-mono text-zinc-500 w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback action buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {/* Step back 1 frame */}
            <button
              onClick={() => handleStepFrame(false)}
              title="Voltar 1 quadro"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Step forward 1 frame */}
            <button
              onClick={() => handleStepFrame(true)}
              title="Avançar 1 quadro"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Restart */}
            <button
              onClick={handleRestart}
              title="Reiniciar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            Quadro: <span className="font-mono text-zinc-300">{Math.floor(currentTime * 30)}</span> / {duration * 30}
          </div>
        </div>
      </div>
    </div>
  );
};
