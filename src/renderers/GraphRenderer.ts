import { GraphSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

interface Point {
  x: number;
  y: number;
}

export class GraphRenderer implements AnimationEngine {
  private ctx: CanvasRenderingContext2D;
  private spec: GraphSpec;
  private width: number;
  private height: number;
  private isDark: boolean;

  constructor(context: RenderContext, spec: GraphSpec) {
    const ctx = context.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.spec = spec;
    this.width = context.width;
    this.height = context.height;
    this.isDark = spec.dark ?? true;
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const spec = this.spec;
    const isPortrait = h >= w;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = this.isDark ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Color palette
    const fgColor = this.isDark ? '#ffffff' : '#000000';
    const muteColor = this.isDark ? '#8a8a8a' : '#8c8c8c';
    const axisColor = this.isDark ? '#707070' : '#a3a3a3';
    const gridColor = this.isDark ? '#262626' : '#e6e6e6';
    const accent = spec.accent || (this.isDark ? '#10b981' : '#059669');

    // Chart boundary box
    const X0 = isPortrait ? w * 0.11 : w * 0.10;
    const X1 = isPortrait ? w * 0.89 : w * 0.90;
    const Y0 = isPortrait ? h * 0.70 : h * 0.78; // baseline
    const Y1 = isPortrait ? h * 0.40 : h * 0.35; // top value line

    const V = spec.values && spec.values.length >= 2 ? spec.values.map(Number) : [10, 25, 45, 80, 100];
    const M = spec.labels || [];
    const vmax = Math.max(...V) || 1;
    const last = V[V.length - 1] || 1;
    const FINAL = spec.final != null ? Number(spec.final) : last;
    const scale = FINAL / last;
    const dec = spec.decimals || 0;

    const fmt = (x: number) => {
      const formattedNumber = x.toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
      return (spec.prefix || '') + formattedNumber + (spec.suffix || '');
    };

    // Calculate dynamic typography size based on final string width
    const finalFormatted = fmt(FINAL);
    let em = 0;
    for (const ch of finalFormatted) {
      em += /[0-9]/.test(ch) ? 0.56 : /[,.]/.test(ch) ? 0.24 : ch === ' ' ? 0.25 : /[A-Z$€£%+]/.test(ch) ? 0.62 : 0.54;
    }
    const maxNumSize = isPortrait ? Math.min(w * 0.16, (w * 0.8) / Math.max(1, em)) : Math.min(h * 0.20, (w * 0.7) / Math.max(1, em));

    // Positions of points
    const px = (i: number) => X0 + (i * (X1 - X0)) / (V.length - 1);
    const py = (v: number) => Y0 - (v / vmax) * (Y0 - Y1);
    const P: Point[] = V.map((v, i) => ({ x: px(i), y: py(v) }));

    // Generate Catmull-Rom spline sampled points for smooth drawing and exact tip query
    const splinePoints: Point[] = [];
    const samplesPerSegment = 40;

    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[Math.min(P.length - 1, i + 2)];

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        const t2 = t * t;
        const t3 = t2 * t;

        // Catmull-Rom matrix
        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        splinePoints.push({ x, y });
      }
    }
    splinePoints.push(P[P.length - 1]);

    // Calculate total spline length and partial segment lengths
    let totalLength = 0;
    const lengths: number[] = [0];
    for (let i = 1; i < splinePoints.length; i++) {
      const dx = splinePoints[i].x - splinePoints[i - 1].x;
      const dy = splinePoints[i].y - splinePoints[i - 1].y;
      totalLength += Math.hypot(dx, dy);
      lengths.push(totalLength);
    }

    // Phase timings:
    // 0.00 - 0.15: Grid lines draw in, labels fade in
    // 0.15 - 0.85: Line draws itself, tip moves, number counts up
    // 0.85 - 1.00: Soft landing halo expands, dotted drop-line falls to baseline
    const gridProgress = Math.min(1, progress / 0.15);
    const lineStartTime = 0.15;
    const lineEndTime = 0.85;
    const lineProgress = Math.min(1, Math.max(0, (progress - lineStartTime) / (lineEndTime - lineStartTime)));
    const endProgress = Math.min(1, Math.max(0, (progress - lineEndTime) / (1 - lineEndTime)));

    // 1. Grid Lines
    ctx.lineWidth = 2;
    const easedGrid = 1 - Math.pow(1 - gridProgress, 3);
    const currentX1 = X0 + (X1 - X0) * easedGrid;

    // Baseline
    ctx.strokeStyle = fgColor;
    ctx.beginPath();
    ctx.moveTo(X0, Y0);
    ctx.lineTo(currentX1, Y0);
    ctx.stroke();

    // Intermediate horizontal gridlines
    ctx.strokeStyle = gridColor;
    const midY1 = Y0 - (Y0 - Y1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(X0, midY1);
    ctx.lineTo(currentX1, midY1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X0, Y1);
    ctx.lineTo(currentX1, Y1);
    ctx.stroke();

    // 2. Month/Category Labels under axis
    if (gridProgress > 0.4 && M.length > 0) {
      const labelAlpha = Math.min(1, (gridProgress - 0.4) / 0.6);
      ctx.save();
      ctx.fillStyle = axisColor;
      ctx.globalAlpha = labelAlpha;
      ctx.textAlign = 'center';
      ctx.font = `500 ${Math.round(isPortrait ? w * 0.026 : h * 0.035)}px 'Inter', sans-serif`;

      const every = Math.ceil(M.length / 12);
      M.forEach((lbl, i) => {
        if (i < V.length && i % every === 0) {
          ctx.fillText(lbl, px(i), Y0 + (isPortrait ? h * 0.032 : h * 0.05));
        }
      });
      ctx.restore();
    }

    // 3. Find current tip point along spline
    const currentDrawLength = lineProgress * totalLength;
    let tipPoint: Point = splinePoints[0];
    let tipIndex = 0;

    for (let i = 1; i < lengths.length; i++) {
      if (lengths[i] >= currentDrawLength) {
        const segLen = lengths[i] - lengths[i - 1];
        const segFrac = segLen > 0 ? (currentDrawLength - lengths[i - 1]) / segLen : 0;
        tipPoint = {
          x: splinePoints[i - 1].x + (splinePoints[i].x - splinePoints[i - 1].x) * segFrac,
          y: splinePoints[i - 1].y + (splinePoints[i].y - splinePoints[i - 1].y) * segFrac,
        };
        tipIndex = i;
        break;
      }
      if (i === lengths.length - 1) {
        tipPoint = splinePoints[splinePoints.length - 1];
        tipIndex = splinePoints.length - 1;
      }
    }

    // 4. Draw the smooth curve up to tip
    if (lineProgress > 0) {
      ctx.save();
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = Math.max(3, w * 0.0055);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
      for (let i = 1; i < tipIndex; i++) {
        ctx.lineTo(splinePoints[i].x, splinePoints[i].y);
      }
      ctx.lineTo(tipPoint.x, tipPoint.y);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Landing effects (Dotted drop line and pulse halo)
    if (endProgress > 0) {
      const endPoint = P[P.length - 1];

      // Dotted drop line to baseline
      ctx.save();
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(endPoint.x, endPoint.y + 15);
      const dropY = endPoint.y + 15 + (Y0 - endPoint.y - 15) * Math.min(1, endProgress * 1.5);
      ctx.lineTo(endPoint.x, dropY);
      ctx.stroke();
      ctx.restore();

      // Soft expanding halo
      const haloR = Math.max(16, w * 0.015) + endProgress * (w * 0.05);
      const haloAlpha = Math.max(0, (1 - endProgress) * 0.4);
      ctx.save();
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = haloAlpha;
      ctx.fill();
      ctx.restore();
    }

    // 6. Draw moving tip circle
    if (lineProgress > 0) {
      ctx.save();
      const tipRadius = Math.max(6, w * 0.011);

      // Outer accent glow
      ctx.beginPath();
      ctx.arc(tipPoint.x, tipPoint.y, tipRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.25;
      ctx.fill();

      // Main tip circle
      ctx.beginPath();
      ctx.arc(tipPoint.x, tipPoint.y, tipRadius, 0, Math.PI * 2);
      ctx.fillStyle = fgColor;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.isDark ? '#000000' : '#ffffff';
      ctx.stroke();
      ctx.restore();
    }

    // 7. Value Count & Big Typography
    const currentValue = lineProgress <= 0 ? 0 : lineProgress >= 1 ? FINAL : Math.max(0, (Y0 - tipPoint.y) / (Y0 - Y1) * vmax * scale);
    const displayNum = fmt(lineProgress >= 1 ? FINAL : Math.round(currentValue * Math.pow(10, dec)) / Math.pow(10, dec));

    // Top Header: Label
    ctx.save();
    ctx.fillStyle = muteColor;
    ctx.textAlign = 'left';
    ctx.font = `500 ${Math.round(isPortrait ? w * 0.034 : h * 0.045)}px 'Inter', sans-serif`;
    const labelY = isPortrait ? h * 0.17 : h * 0.14;
    ctx.fillText(spec.label || 'Métrica Principal', X0, labelY);

    // Big Typography Number
    ctx.fillStyle = fgColor;
    ctx.font = `700 ${Math.round(maxNumSize)}px 'Inter', 'Inter Tight', sans-serif`;
    const numY = labelY + maxNumSize * 1.05;
    ctx.fillText(displayNum, X0, numY);
    ctx.restore();

    ctx.restore();
  }

  public dispose(): void {
    // Canvas 2D
  }
}
