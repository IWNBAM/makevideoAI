import React from 'react';
import { ProjectHistoryItem } from '../types';
import {
  Clock,
  Play,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface HistoryPanelProps {
  history: ProjectHistoryItem[];
  onLoadProject: (item: ProjectHistoryItem) => void;
  onDeleteProject: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onLoadProject,
  onDeleteProject,
  onClearHistory,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Histórico de Projetos & Animações</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Todas as animações geradas ficam salvas localmente para reuso e exportação.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Nenhum projeto salvo ainda
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Descreva sua primeira animação no estúdio e clique em &quot;Gerar Animação&quot; para salvá-la aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all space-y-3 text-left group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-medium text-[10px] uppercase">
                  {item.style}
                </span>

                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(item.createdAt)}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-100 group-hover:text-white line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  &quot;{item.prompt}&quot;
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                <span className="text-[11px] text-zinc-500 font-mono">
                  {item.aspectRatio} • {item.duration}s
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeleteProject(item.id)}
                    title="Excluir"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onLoadProject(item)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Abrir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
