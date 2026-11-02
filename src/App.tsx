import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StyleSelector } from './components/StyleSelector';
import { PromptSection } from './components/PromptSection';
import { PlayerPreview } from './components/PlayerPreview';
import { ExportModal } from './components/ExportModal';
import { HistoryPanel } from './components/HistoryPanel';
import { SpecEditor } from './components/SpecEditor';
import { DEFAULT_SPECS, STYLES_LIST } from './data/styles';
import {
  AnimationStyleId,
  AnyAnimationSpec,
  AspectRatio,
  DurationOption,
  ProjectHistoryItem,
  ResolutionOption,
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'spec'>('studio');
  const [selectedStyle, setSelectedStyle] = useState<AnimationStyleId>('minimalistic-graphics');
  const [prompt, setPrompt] = useState<string>(
    'Cada passo pequeno parece insignificante até você olhar para trás'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [duration, setDuration] = useState<DurationOption>(10);
  const [resolution, setResolution] = useState<ResolutionOption>('720p');
  const [currentSpec, setCurrentSpec] = useState<AnyAnimationSpec>(
    DEFAULT_SPECS['minimalistic-graphics']
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // System status
  const [hasFFmpeg, setHasFFmpeg] = useState<boolean>(true);
  const [hasGemini, setHasGemini] = useState<boolean>(false);

  // History stored in localStorage
  const [history, setHistory] = useState<ProjectHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('anim_studio_history');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Reference for offscreen frame rendering
  const renderFrameRef = useRef<((progress: number, timeSec: number) => HTMLCanvasElement) | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch health and engine status on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasFFmpeg(data.hasFFmpeg ?? true);
        setHasGemini(data.hasGeminiApiKey ?? false);
      })
      .catch((err) => {
        console.warn('Could not fetch health:', err);
      });
  }, []);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('anim_studio_history', JSON.stringify(history));
    } catch (e) {
      // ignore
    }
  }, [history]);

  // When user clicks a new style, update spec if it's default
  const handleSelectStyle = (styleId: AnimationStyleId) => {
    setSelectedStyle(styleId);
    const styleMeta = STYLES_LIST.find((s) => s.id === styleId);
    if (styleMeta) {
      setPrompt(styleMeta.defaultPrompt);
    }
    const defaultSpec = DEFAULT_SPECS[styleId];
    if (defaultSpec) {
      setCurrentSpec(defaultSpec);
    }
  };

  // Generate spec using Gemini AI on backend
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          duration,
          aspectRatio,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar especificação');
      }

      const json = await res.json();
      const newSpec: AnyAnimationSpec = {
        style: selectedStyle,
        data: json.data,
      } as AnyAnimationSpec;

      setCurrentSpec(newSpec);

      // Save to history
      const newHistoryItem: ProjectHistoryItem = {
        id: 'proj_' + Date.now(),
        title: prompt.slice(0, 40),
        prompt,
        style: selectedStyle,
        duration,
        aspectRatio,
        spec: newSpec,
        createdAt: Date.now(),
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 24)]);
    } catch (err: any) {
      console.error('Error generating spec:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyExample = (exampleText: string) => {
    setPrompt(exampleText);
    // Auto-detect style based on prompt keyword
    if (exampleText.includes('0 a 100K') || exampleText.includes('seguidores')) {
      handleSelectStyle('graph');
    } else if (exampleText.includes('passo') || exampleText.includes('olhar para trás')) {
      handleSelectStyle('minimalistic-graphics');
    } else if (exampleText.includes('Trajeto') || exampleText.includes('parque')) {
      handleSelectStyle('map-route');
    } else if (exampleText.includes('Smartphone') || exampleText.includes('desmontado')) {
      handleSelectStyle('breakdown');
    } else if (exampleText.includes('armadura') || exampleText.includes('flecha')) {
      handleSelectStyle('zach-d-films');
    } else if (exampleText.includes('piratas') || exampleText.includes('tapa-olho')) {
      handleSelectStyle('stick-figure');
    }
  };

  const handleLoadProject = (item: ProjectHistoryItem) => {
    setSelectedStyle(item.style);
    setPrompt(item.prompt);
    setDuration(item.duration);
    setAspectRatio(item.aspectRatio);
    setCurrentSpec(item.spec);
    setActiveTab('studio');
  };

  const handleDeleteProject = (id: string) => {
    setHistory((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setHistory([]);
    }
  };

  const handleFrameCaptureReady = useCallback(
    (renderFrame: (progress: number, timeSec: number) => HTMLCanvasElement) => {
      renderFrameRef.current = renderFrame;
    },
    []
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation & Status */}
      <Header
        hasFFmpeg={hasFFmpeg}
        hasGemini={hasGemini}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Style Selector */}
            <StyleSelector
              selectedStyle={selectedStyle}
              onSelectStyle={handleSelectStyle}
            />

            {/* Prompt Input & Output Settings */}
            <PromptSection
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              duration={duration}
              setDuration={setDuration}
              resolution={resolution}
              setResolution={setResolution}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onApplyExample={handleApplyExample}
            />

            {/* Interactive Player Preview with Scrubber */}
            <PlayerPreview
              spec={currentSpec}
              aspectRatio={aspectRatio}
              duration={duration}
              resolution={resolution}
              onOpenExport={() => setIsExportModalOpen(true)}
              getCanvasRef={(canvas) => {
                canvasRef.current = canvas;
              }}
              onFrameCaptureReady={handleFrameCaptureReady}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryPanel
            history={history}
            onLoadProject={handleLoadProject}
            onDeleteProject={handleDeleteProject}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'spec' && (
          <SpecEditor
            spec={currentSpec}
            onUpdateSpec={(newSpec) => setCurrentSpec(newSpec)}
            onResetToDefault={() => {
              if (DEFAULT_SPECS[selectedStyle]) {
                setCurrentSpec(DEFAULT_SPECS[selectedStyle]);
              }
            }}
          />
        )}
      </main>

      {/* Real MP4 Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        spec={currentSpec}
        duration={duration}
        aspectRatio={aspectRatio}
        resolution={resolution}
        onRenderFrame={(progress, timeSec) => {
          if (renderFrameRef.current) {
            return renderFrameRef.current(progress, timeSec);
          }
          if (canvasRef.current) return canvasRef.current;
          throw new Error('Canvas de renderização não disponível');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-center text-xs text-zinc-500">
        <p>
          ANIMATION STUDIO AI • Baseado na arquitetura claude-animation-skills • Three.js • GSAP • FFmpeg H.264
        </p>
      </footer>
    </div>
  );
}

export default App;
