export interface RenderContext {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  aspectRatio: '9:16' | '16:9';
  duration: number;
}

export interface AnimationEngine {
  renderAt(progress: number, currentTimeSec: number): void;
  dispose(): void;
}
