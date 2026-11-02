import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  CheckCircle2,
  AlertCircle,
  Video,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AnyAnimationSpec, AspectRatio, DurationOption, ResolutionOption } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: AnyAnimationSpec;
  duration: DurationOption;
  aspectRatio: AspectRatio;
  resolution: ResolutionOption;
  onRenderFrame: (progress: number, timeSec: number) => HTMLCanvasElement;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  spec,
  duration,
  aspectRatio,
  resolution,
  onRenderFrame,
}) => {
  const [status, setStatus] = useState<
    'idle' | 'rendering_frames' | 'encoding_ffmpeg' | 'completed' | 'error'
  >('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const totalFrames = duration * 30; // 30 fps
  const isPortrait = aspectRatio === '9:16';
  const width = resolution === '1080p' ? (isPortrait ? 1080 : 1920) : (isPortrait ? 720 : 1280);
  const height = resolution === '1080p' ? (isPortrait ? 1920 : 1080) : (isPortrait ? 1280 : 720);

  const startExport = async () => {
    setStatus('rendering_frames');
    setProgressPercent(0);
    setErrorMessage('');
    setStatusMessage('Inicializando sessão de renderização no servidor...');

    try {
      // 1. Initialize session on backend
      const initRes = await fetch('/api/export-mp4/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalFrames, fps: 30 }),
      });

      if (!initRes.ok) {
        throw new Error('Falha ao comunicar com o servidor de exportação.');
      }

      const { sessionId } = await initRes.json();

      // 2. Render and upload frames in deterministic batches of 15 frames
      const BATCH_SIZE = 15;
      let batchFrames: string[] = [];
      let batchStartIndex = 0;

      for (let f = 0; f < totalFrames; f++) {
        const timeSec = f / 30;
        const progress = totalFrames > 1 ? f / (totalFrames - 1) : 0;

        // Render exact frame deterministically
        const canvas = onRenderFrame(progress, timeSec);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        batchFrames.push(dataUrl);

        if (batchFrames.length === BATCH_SIZE || f === totalFrames - 1) {
          setStatusMessage(
            `Renderizando e enviando quadros: ${f + 1} de ${totalFrames} (${Math.round(
              ((f + 1) / totalFrames) * 80
            )}%)`
          );
          setProgressPercent(Math.round(((f + 1) / totalFrames) * 80));

          const chunkRes = await fetch('/api/export-mp4/chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              startFrame: batchStartIndex,
              frames: batchFrames,
            }),
          });

          if (!chunkRes.ok) {
            throw new Error('Erro ao enviar lote de quadros.');
          }

          batchStartIndex += batchFrames.length;
          batchFrames = [];
        }
      }

      // 3. Trigger FFmpeg encoding on the server
      setStatus('encoding_ffmpeg');
      setProgressPercent(88);
      setStatusMessage('Codificando vídeo MP4 H.264 de alta definição com FFmpeg...');

      const finishRes = await fetch('/api/export-mp4/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, totalFrames, fps: 30 }),
      });

      if (!finishRes.ok) {
        const errJson = await finishRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha na codificação FFmpeg.');
      }

      const finishData = await finishRes.json();
      setProgressPercent(100);
      setDownloadUrl(finishData.downloadUrl);
      setFileSize(finishData.fileSize);
      setStatus('completed');
      setStatusMessage('Vídeo MP4 gerado com sucesso!');

      // Automatically trigger file download
      const a = document.createElement('a');
      a.href = finishData.downloadUrl;
      a.download = `animation-studio-${spec.style}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Ocorreu um erro durante a exportação.');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Exportar Vídeo MP4 Real
              </h2>
              <p className="text-[11px] text-zinc-400">
                Renderização determinística frame a frame • H.264 30 FPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Specs summary card */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/60 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Resolução
            </span>
            <span className="font-semibold text-zinc-200">
              {width}x{height}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Duração
            </span>
            <span className="font-semibold text-zinc-200">
              {duration}s ({totalFrames} quadros)
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Codec
            </span>
            <span className="font-semibold text-emerald-400">
              H.264 MP4
            </span>
          </div>
        </div>

        {/* Status display & Progress bar */}
        {status === 'idle' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-300 leading-relaxed">
              O motor irá renderizar cada um dos <strong className="text-white">{totalFrames} quadros</strong> a exatamente 30 quadros por segundo e compilar um arquivo <strong className="text-white">.mp4 real</strong> compatível com Instagram Reels, TikTok, YouTube e reprodutores de vídeo.
            </p>

            <button
              onClick={startExport}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Iniciar Renderização e Baixar MP4</span>
            </button>
          </div>
        )}

        {(status === 'rendering_frames' || status === 'encoding_ffmpeg') && (
          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                {statusMessage}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {progressPercent}%
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              Por favor, mantenha esta janela aberta enquanto o FFmpeg processa os quadros.
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                Vídeo MP4 Renderizado com Sucesso!
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Tamanho do arquivo: <strong className="text-zinc-200">{formatFileSize(fileSize)}</strong>
              </p>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`animation-studio-${spec.style}.mp4`}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all inline-flex"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Novamente o Arquivo MP4</span>
              </a>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Falha na Exportação:</strong>
                <p className="text-[11px] text-red-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>

            <button
              onClick={startExport}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
