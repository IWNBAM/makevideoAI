export type AnimationStyleId =
  | 'minimalistic-graphics'
  | 'graph'
  | 'map-route'
  | 'breakdown'
  | 'stick-figure'
  | 'zach-d-films';

export type AspectRatio = '9:16' | '16:9';
export type DurationOption = 5 | 10 | 15;
export type ResolutionOption = '720p' | '1080p';

export interface StyleMeta {
  id: AnimationStyleId;
  name: string;
  shortDesc: string;
  category: '2D Minimalista' | '3D Three.js' | '2D Cartoon' | '3D Cinematic';
  tech: string;
  status: 'Pronto para Produção' | 'Otimizado & Ativo' | 'Modo Protótipo';
  badgeColor: string;
  iconName: string;
  defaultPrompt: string;
}

// Minimalistic Graphics Spec
export interface MinimalisticSpec {
  steps: number;
  lines: string[];
  light: boolean;
  accent?: string;
  shape?: 'sphere' | 'cube' | 'diamond';
}

// Graph Spec
export interface GraphSpec {
  label: string;
  values: number[];
  labels: string[];
  final: number;
  prefix: string;
  suffix: string;
  decimals: number;
  dark: boolean;
  accent?: string;
}

// Map Route Spec
export interface MapRouteSpec {
  destination: string;
  distance: number;
  minutes: number;
  unit: string;
  accent: string;
  seed: number;
  places: string[];
  transportMode?: 'car' | 'bike' | 'walking';
}

// Breakdown Spec
export interface BreakdownItem {
  num: string;
  title: string;
  desc: string;
  layerIndex: number;
}

export interface BreakdownSpec {
  title: string;
  subtitle: string;
  accent: string;
  items: BreakdownItem[];
}

// Stick Figure Spec
export interface StickShot {
  text: string;
  characterAction: 'walk' | 'jump' | 'point' | 'shrug' | 'wave';
  mood: 'curious' | 'surprised' | 'happy' | 'explaining';
  prop: string;
}

export interface StickFigureSpec {
  title: string;
  accent: string;
  shots: StickShot[];
}

// 3D Cartoon Explainer (Zack D style) Spec
export interface CartoonExplainerSpec {
  topic: string;
  question: string;
  twist: string;
  accent: string;
  subject: 'armor' | 'gadget' | 'human_heart' | 'bullet_vest';
  impactEffect: 'ripple' | 'sparks' | 'slow_motion';
}

export type AnyAnimationSpec =
  | { style: 'minimalistic-graphics'; data: MinimalisticSpec }
  | { style: 'graph'; data: GraphSpec }
  | { style: 'map-route'; data: MapRouteSpec }
  | { style: 'breakdown'; data: BreakdownSpec }
  | { style: 'stick-figure'; data: StickFigureSpec }
  | { style: 'zach-d-films'; data: CartoonExplainerSpec };

export interface ProjectHistoryItem {
  id: string;
  title: string;
  prompt: string;
  style: AnimationStyleId;
  duration: DurationOption;
  aspectRatio: AspectRatio;
  spec: AnyAnimationSpec;
  createdAt: number;
  thumbnailUrl?: string;
  lastExportMp4Url?: string;
}
