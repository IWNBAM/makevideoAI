import React, { useState, useEffect } from 'react';
import { AnyAnimationSpec } from '../types';
import { Code2, Check, AlertCircle, RotateCcw, Copy } from 'lucide-react';

interface SpecEditorProps {
  spec: AnyAnimationSpec;
  onUpdateSpec: (newSpec: AnyAnimationSpec) => void;
  onResetToDefault: () => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({
  spec,
  onUpdateSpec,
  onResetToDefault,
}) => {
  const [jsonString, setJsonString] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);

  useEffect(() => {
    setJsonString(JSON.stringify(spec.data, null, 2));
    setParseError(null);
  }, [spec]);

  const handleApply = () => {
    try {
      const parsedData = JSON.parse(jsonString);
      onUpdateSpec({
        style: spec.style,
        data: parsedData,
      } as AnyAnimationSpec);
      setParseError(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    } catch (err: any) {
      setParseError(err.message || 'JSON inválido');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Editor da Especificação JSON (Spec)</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Estilo ativo: <strong className="text-indigo-400 uppercase font-mono">{spec.style}</strong>. Modifique valores, textos e cores diretamente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetToDefault}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleApply}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            {applied ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{applied ? 'Aplicado com Sucesso!' : 'Aplicar Alterações'}</span>
          </button>
        </div>
      </div>

      {parseError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Erro no formato JSON: {parseError}</span>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 font-mono text-xs">
        <textarea
          value={jsonString}
          onChange={(e) => setJsonString(e.target.value)}
          rows={18}
          className="w-full bg-zinc-950 text-emerald-400 p-4 font-mono text-xs focus:outline-none resize-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
