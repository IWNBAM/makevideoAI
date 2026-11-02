import { AnyAnimationSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';
import { MinimalisticRenderer } from './MinimalisticRenderer';
import { GraphRenderer } from './GraphRenderer';
import { MapRouteRenderer } from './MapRouteRenderer';
import { BreakdownRenderer } from './BreakdownRenderer';
import { StickFigureRenderer } from './StickFigureRenderer';
import { Cartoon3DExplainerRenderer } from './Cartoon3DExplainerRenderer';

export function createRenderer(context: RenderContext, spec: AnyAnimationSpec): AnimationEngine {
  switch (spec.style) {
    case 'minimalistic-graphics':
      return new MinimalisticRenderer(context, spec.data);
    case 'graph':
      return new GraphRenderer(context, spec.data);
    case 'map-route':
      return new MapRouteRenderer(context, spec.data);
    case 'breakdown':
      return new BreakdownRenderer(context, spec.data);
    case 'stick-figure':
      return new StickFigureRenderer(context, spec.data);
    case 'zach-d-films':
      return new Cartoon3DExplainerRenderer(context, spec.data);
    default:
      return new MinimalisticRenderer(context, (spec as any).data);
  }
}
