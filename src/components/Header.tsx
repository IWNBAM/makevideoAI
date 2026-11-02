import React from 'react';
import { Film, Sparkles, Cpu, CheckCircle2, Video } from 'lucide-react';

interface HeaderProps {
  hasFFmpeg: boolean;
  hasGemini: boolean;
  activeTab: 'studio' | 'history' | 'spec';
  setActiveTab: (tab: 'studio' | 'history' | 'spec') => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  hasFFmpeg,
  hasGemini,
  activeTab,
  setActiveTab,
  historyCount,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base lg:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ANIMATION STUDIO <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-extrabold">AI</span>
            </h1>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              v2.0 PRO
            </span>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            Prompt para Vídeo MP4 Real • Three.js • GSAP • FFmpeg H.264
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'studio'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Estúdio de Criação
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Histórico</span>
          {historyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
              {historyCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('spec')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'spec'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          JSON Spec
        </button>
      </div>

      {/* Engine Status Indicators */}
      <div className="flex items-center gap-2 text-xs">
        {/* FFmpeg status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Video className={`w-3.5 h-3.5 ${hasFFmpeg ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="font-medium text-[11px]">
            {hasFFmpeg ? 'FFmpeg H.264 Pronto' : 'Exportação WebM'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${hasFFmpeg ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </div>

        {/* Gemini status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Sparkles className={`w-3.5 h-3.5 ${hasGemini ? 'text-indigo-400' : 'text-zinc-400'}`} />
          <span className="font-medium text-[11px]">
            {hasGemini ? 'Gemini 3.8 Flash' : 'Motor Local'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${hasGemini ? 'bg-indigo-400' : 'bg-zinc-500'}`} />
        </div>
      </div>
    </header>
  );
};
