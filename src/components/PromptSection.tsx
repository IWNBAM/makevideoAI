import React from 'react';
import {
  Sparkles,
  Smartphone,
  Monitor,
  Clock,
  Settings2,
  Wand2,
  Lightbulb,
} from 'lucide-react';
import { AspectRatio, DurationOption, ResolutionOption } from '../types';

interface PromptSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (value: AspectRatio) => void;
  duration: DurationOption;
  setDuration: (value: DurationOption) => void;
  resolution: ResolutionOption;
  setResolution: (value: ResolutionOption) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onApplyExample: (text: string) => void;
}

export const PromptSection: React.FC<PromptSectionProps> = ({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  duration,
  setDuration,
  resolution,
  setResolution,
  onGenerate,
  isGenerating,
  onApplyExample,
}) => {
  const examples = [
    '0 a 100K seguidores em 9 meses: 1.2K, 3K, 8K, 22K, 50K, 80K, 100K',
    'Cada passo pequeno parece insignificante até você olhar para trás',
    'Trajeto da minha casa até o parque 4.2 km 14 minutos',
    'Smartphone Pro desmontado em camadas com tela, bateria e chip neural',
    'Uma armadura medieval de aço consegue resistir a uma flecha veloz?',
    'Por que piratas usavam tapa-olho para enxergar no escuro da cabine?',
  ];

  return (
    <div className="space-y-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 lg:p-5">
      {/* Input prompt area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>2. Descreva a animação que deseja criar</span>
          </label>
          <span className="text-[11px] text-zinc-500">
            Linguagem natural em português
          </span>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Ex: Crescimento acelerado de 0 a 100K seguidores com linha verde fluida e contador numérico no topo..."
            className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none font-sans"
          />
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 mr-1">
            <Lightbulb className="w-3 h-3 text-amber-400" /> Exemplos rápidos:
          </span>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => onApplyExample(ex)}
              className="text-[10px] bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 text-zinc-300 hover:text-white px-2.5 py-1 rounded-full transition-all truncate max-w-[280px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Control settings: Format, Duration, Resolution, Generate CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/60">
        {/* Format: 9:16 or 16:9 */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">
            Formato / Proporção
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setAspectRatio('9:16')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16 Vertical</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('16:9')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9 Horizontal</span>
            </button>
          </div>
        </div>

        {/* Duration: 5s, 10s, 15s */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">
            Duração
          </label>
          <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {([5, 10, 15] as DurationOption[]).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDuration(dur)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  duration === dur
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>

        {/* Resolution: 720p or 1080p */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">
            Resolução de Saída
          </label>
          <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {(['720p', '1080p'] as ResolutionOption[]).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setResolution(res)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  resolution === res
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {res === '720p' ? '720p (Rápido)' : '1080p (Full HD)'}
              </button>
            ))}
          </div>
        </div>

        {/* Generate CTA Button */}
        <div className="flex items-end">
          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-[38px] rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gerando com IA...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Gerar Animação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
