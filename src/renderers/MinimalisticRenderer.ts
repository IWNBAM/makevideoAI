import { MinimalisticSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

export class MinimalisticRenderer implements AnimationEngine {
  private ctx: CanvasRenderingContext2D;
  private spec: MinimalisticSpec;
  private width: number;
  private height: number;
  private isLight: boolean;

  constructor(context: RenderContext, spec: MinimalisticSpec) {
    const ctx = context.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.spec = spec;
    this.width = context.width;
    this.height = context.height;
    this.isLight = spec.light ?? false;
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const spec = this.spec;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = this.isLight ? '#f9fafb' : '#090a0f';
    ctx.fillRect(0, 0, w, h);

    const fgColor = this.isLight ? '#111827' : '#f8fafc';
    const softColor = this.isLight ? '#6b7280' : '#94a3b8';
    const accentColor = spec.accent || '#6366f1';

    // Step calculations based on aspect ratio
    const N = Math.max(4, Math.min(12, spec.steps || 7));
    const isPortrait = h >= w;

    const marginX = isPortrait ? w * 0.12 : w * 0.2;
    const LX = marginX;
    const RX = w - marginX;
    const BW = Math.min(isPortrait ? w * 0.12 : w * 0.08, (RX - LX) / N * 0.78);
    const pitch = (RX - LX - BW) / (N - 1);

    const baseY = isPortrait ? h * 0.65 : h * 0.75;
    const topY = isPortrait ? h * 0.32 : h * 0.38;

    const BX: number[] = [];
    const TOP: number[] = [];
    for (let k = 0; k < N; k++) {
      BX.push(LX + BW / 2 + k * pitch);
      TOP.push(baseY - k * ((baseY - topY) / (N - 1)));
    }

    const R = Math.max(14, isPortrait ? w * 0.03 : h * 0.035);
    const OX = BX[N - 1];
    const OY = TOP[N - 1] - R;

    // Timeline phases
    // 0.0 to 0.15: Intro & First step rises
    // 0.15 to 0.70: Ball hopping through steps
    // 0.70 to 1.00: Top payoff (orbit, sparks burst, text switch)
    const hopStartTime = 0.12;
    const hopEndTime = 0.70;
    const hopDurationTotal = hopEndTime - hopStartTime;
    const stepHopTime = hopDurationTotal / (N - 1);

    // Draw caption text
    const lines = spec.lines && spec.lines.length > 0 ? spec.lines : ['Cada passo conta.', 'Olhe onde você chegou.'];
    const showSecondLine = progress >= 0.72 && lines.length > 1;
    const currentText = showSecondLine ? lines[1] : lines[0];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(isPortrait ? w * 0.046 : h * 0.055)}px 'Poppins', -apple-system, sans-serif`;
    ctx.fillStyle = fgColor;

    // Subtle fade transition between line 1 and 2
    let textAlpha = 1.0;
    if (lines.length > 1 && progress >= 0.68 && progress <= 0.75) {
      const t = (progress - 0.68) / 0.07;
      textAlpha = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
    }
    ctx.globalAlpha = Math.max(0.05, textAlpha);
    const textY = isPortrait ? h * 0.16 : h * 0.18;
    ctx.fillText(currentText, w / 2, textY);
    ctx.restore();

    // Determine heights of steps at current progress
    ctx.save();
    ctx.lineWidth = Math.max(2, w * 0.003);

    for (let k = 0; k < N; k++) {
      const stepAppearProgress = Math.min(1, Math.max(0, (progress - (k === 0 ? 0.05 : hopStartTime + (k - 1) * stepHopTime - 0.05)) / 0.08));
      const easedStep = 1 - Math.pow(1 - stepAppearProgress, 3);
      const currentStepTop = baseY + (TOP[k] - baseY) * easedStep;

      // Draw step rectangle outline
      ctx.strokeStyle = progress >= 0.75 ? (this.isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)') : fgColor;
      const rx = BX[k] - BW / 2;
      const ry = currentStepTop;
      const rw = BW;
      const rh = baseY + 100 - ry;

      ctx.strokeRect(rx, ry, rw, rh);
    }
    ctx.restore();

    // Calculate ball position and squash & stretch
    let ballX = BX[0];
    let ballY = TOP[0] - R;
    let scaleX = 1;
    let scaleY = 1;
    let introPulse = 0;

    if (progress < hopStartTime) {
      // Intro drop and settle
      const introProg = Math.min(1, progress / hopStartTime);
      if (introProg < 0.4) {
        const t = introProg / 0.4;
        scaleX = 1 + (1 - t) * 0.8;
        scaleY = 1 + (1 - t) * 0.8;
      } else {
        const t = (introProg - 0.4) / 0.6;
        scaleX = 1;
        scaleY = 1;
        introPulse = t;
      }
    } else if (progress >= hopStartTime && progress < hopEndTime) {
      const hopRel = (progress - hopStartTime) / hopDurationTotal;
      const currentHopIndex = Math.min(N - 2, Math.floor(hopRel * (N - 1)));
      const hopFraction = (hopRel * (N - 1)) - currentHopIndex;

      const fromX = BX[currentHopIndex];
      const toX = BX[currentHopIndex + 1];
      const fromY = TOP[currentHopIndex] - R;
      const toY = TOP[currentHopIndex + 1] - R;

      ballX = fromX + (toX - fromX) * hopFraction;
      const arc = 4 * hopFraction * (1 - hopFraction); // 0 at ends, 1 at peak
      const jumpHeight = Math.max(40, isPortrait ? h * 0.08 : h * 0.12);
      ballY = (fromY + (toY - fromY) * hopFraction) - arc * jumpHeight;

      // Squash and stretch
      if (hopFraction < 0.15) {
        scaleX = 1.25;
        scaleY = 0.8;
      } else if (hopFraction > 0.85) {
        scaleX = 1.25;
        scaleY = 0.8;
      } else {
        scaleX = 0.88;
        scaleY = 1.15;
      }
    } else {
      // Arrived at final top step
      ballX = OX;
      ballY = OY;
      const settleT = Math.min(1, (progress - hopEndTime) / 0.1);
      scaleX = 1 + Math.sin(settleT * Math.PI) * 0.15;
      scaleY = 1 - Math.sin(settleT * Math.PI) * 0.15;
    }

    // Intro pulse wave
    if (introPulse > 0 && introPulse < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(BX[0], TOP[0] - R, R * (1 + introPulse * 2.5), 0, Math.PI * 2);
      ctx.strokeStyle = fgColor;
      ctx.globalAlpha = (1 - introPulse) * 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Top payoff: Orbit, Ring and Sparks Burst
    if (progress >= hopEndTime) {
      const payoffProg = (progress - hopEndTime) / (1 - hopEndTime);

      // Rotating dashed orbit
      ctx.save();
      ctx.translate(OX, OY);
      ctx.rotate(payoffProg * 0.8);
      ctx.beginPath();
      const orbitR = R * 3.8;
      ctx.arc(0, 0, orbitR, 0, Math.PI * 2);
      ctx.setLineDash([8, 12]);
      ctx.lineWidth = Math.max(2, w * 0.0025);
      ctx.strokeStyle = fgColor;
      ctx.globalAlpha = Math.min(1, payoffProg * 2.5);
      ctx.stroke();
      ctx.restore();

      // Elliptical ring
      ctx.save();
      ctx.translate(OX, OY);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 5.2, R * 1.5, -0.15, 0, Math.PI * 2);
      ctx.strokeStyle = softColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.min(0.85, payoffProg * 2);
      ctx.stroke();
      ctx.restore();

      // Expanding pulse wave at top
      ctx.save();
      ctx.beginPath();
      ctx.arc(OX, OY, R * (1 + payoffProg * 4.5), 0, Math.PI * 2);
      ctx.strokeStyle = accentColor;
      ctx.globalAlpha = Math.max(0, (1 - payoffProg) * 0.8);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Radial particle sparks burst
      const numSparks = 24;
      ctx.save();
      for (let i = 0; i < numSparks; i++) {
        const angle = (i / numSparks) * Math.PI * 2 + (i % 2) * 0.1;
        const sparkDist = R * 2 + Math.pow(payoffProg, 0.7) * (R * 5 + (i % 4) * 20);
        const sx = OX + Math.cos(angle) * sparkDist;
        const sy = OY + Math.sin(angle) * sparkDist;
        const sparkAlpha = Math.max(0, 1 - payoffProg * 1.2);
        const sparkR = i % 3 === 0 ? 4 : 2.5;

        ctx.beginPath();
        ctx.arc(sx, sy, sparkR, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? accentColor : fgColor;
        ctx.globalAlpha = sparkAlpha;
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw the ball/shape
    ctx.save();
    ctx.translate(ballX, ballY);
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = fgColor;

    if (spec.shape === 'cube') {
      ctx.fillRect(-R, -R, R * 2, R * 2);
    } else if (spec.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -R * 1.2);
      ctx.lineTo(R * 1.2, 0);
      ctx.lineTo(0, R * 1.2);
      ctx.lineTo(-R * 1.2, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Default sphere
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  public dispose(): void {
    // Nothing to dispose for 2D canvas
  }
}
