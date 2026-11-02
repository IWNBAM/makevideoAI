import React from 'react';
import { STYLES_LIST } from '../data/styles';
import { AnimationStyleId, StyleMeta } from '../types';
import {
  Sparkles,
  TrendingUp,
  Navigation,
  Layers,
  Smile,
  Video,
  Check,
  Code2,
} from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: AnimationStyleId;
  onSelectStyle: (style: AnimationStyleId) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4" />;
      case 'Navigation':
        return <Navigation className="w-4 h-4" />;
      case 'Layers':
        return <Layers className="w-4 h-4" />;
      case 'Smile':
        return <Smile className="w-4 h-4" />;
      case 'Video':
        return <Video className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <span>1. Escolha o Estilo de Animação</span>
          <span className="text-[10px] text-zinc-500 font-normal">
            (6 motores especializados)
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {STYLES_LIST.map((style: StyleMeta) => {
          const isSelected = selectedStyle === style.id;

          return (
            <div
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 text-left ${
                isSelected
                  ? 'bg-zinc-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              {/* Header: Icon, Name and Checkmark */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {getIcon(style.iconName)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white leading-tight">
                      {style.name}
                    </h3>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      {style.category}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-indigo-500 text-zinc-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
                {style.shortDesc}
              </p>

              {/* Badges: Tech + Transparent Status */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px]">
                <span className="flex items-center gap-1 text-zinc-400 font-mono">
                  <Code2 className="w-3 h-3 text-zinc-500" />
                  {style.tech}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold tracking-tight ${style.badgeColor}`}
                >
                  {style.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
