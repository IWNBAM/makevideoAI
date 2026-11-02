import { StickFigureSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

export class StickFigureRenderer implements AnimationEngine {
  private ctx: CanvasRenderingContext2D;
  private spec: StickFigureSpec;
  private width: number;
  private height: number;

  constructor(context: RenderContext, spec: StickFigureSpec) {
    const ctx = context.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.spec = spec;
    this.width = context.width;
    this.height = context.height;
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h >= w;
    const spec = this.spec;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Dynamic hand-drawn cartoon background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Sun with rays
    const sunX = w * 0.85;
    const sunY = h * 0.15;
    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.max(20, w * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Floating cartoon clouds
    this.drawCloud(ctx, (w * 0.2 + progress * 80) % (w + 100) - 50, h * 0.18, isPortrait ? w * 0.14 : h * 0.14);
    this.drawCloud(ctx, (w * 0.7 - progress * 40) % (w + 100) - 50, h * 0.24, isPortrait ? w * 0.11 : h * 0.11);

    // Wooden ship deck / floor
    const groundY = isPortrait ? h * 0.72 : h * 0.78;
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, groundY, w, h - groundY);

    // Wooden planks line detail
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    for (let py = groundY + 30; py < h; py += 35) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Determine current shot based on progress
    const shots = spec.shots && spec.shots.length > 0 ? spec.shots : [
      { text: 'Você sabia por que piratas usavam tapa-olho?', characterAction: 'shrug', mood: 'curious', prop: 'ship_deck' },
      { text: 'Não era por causa de olhos cegos ou perdidos!', characterAction: 'point', mood: 'explaining', prop: 'clouds' },
      { text: 'Um olho ficava sempre adaptado à escuridão da cabine.', characterAction: 'jump', mood: 'surprised', prop: 'lantern' },
      { text: 'Ao entrar no escuro, eles viam tudo instantaneamente!', characterAction: 'wave', mood: 'happy', prop: 'treasure' },
    ];

    const shotIndex = Math.min(shots.length - 1, Math.floor(progress * shots.length));
    const currentShot = shots[shotIndex];
    const shotLocalProgress = (progress * shots.length) - shotIndex;

    // Whip transition blur between shots
    if (shotLocalProgress < 0.12 && shotIndex > 0) {
      const blurAmount = (1 - shotLocalProgress / 0.12) * 20;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * (1 - shotLocalProgress / 0.12)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Props (e.g. Barrel, Treasure or Lantern)
    this.drawProps(ctx, currentShot.prop, w * 0.72, groundY, isPortrait ? w * 0.12 : h * 0.12);

    // Draw Animated Stick Character with Kinematics
    const stickX = w * 0.42 + Math.sin(progress * 12) * 12;
    const stickY = groundY;
    const stickScale = isPortrait ? w * 0.0022 : h * 0.0028;
    this.drawStickFigure(ctx, stickX, stickY, stickScale, currentShot, shotLocalProgress, progress);

    // Subtitle Captions: Lower third bold typography with dark outline
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(isPortrait ? w * 0.048 : h * 0.055)}px 'Poppins', -apple-system, sans-serif`;
    const captionY = isPortrait ? h * 0.88 : h * 0.90;

    // Dark outline for readability
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(currentShot.text, w / 2, captionY);

    // White fill with accent keyword highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillText(currentShot.text, w / 2, captionY);
    ctx.restore();

    ctx.restore();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.35, cy - size * 0.15, size * 0.35, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.7, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawProps(ctx: CanvasRenderingContext2D, propType: string | undefined, x: number, y: number, size: number): void {
    ctx.save();
    ctx.translate(x, y);

    // Wooden Barrel
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-size * 0.4, -size * 0.9, size * 0.8, size * 0.9);
    // Metal barrel hoops
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.7);
    ctx.lineTo(size * 0.4, -size * 0.7);
    ctx.moveTo(-size * 0.4, -size * 0.25);
    ctx.lineTo(size * 0.4, -size * 0.25);
    ctx.stroke();

    // Lantern or Treasure
    if (propType === 'lantern') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -size * 1.1, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawStickFigure(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    shot: { text: string; characterAction: string; mood: string },
    localProg: number,
    globalProg: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const inkColor = '#1e1b18';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Body dimensions in virtual units
    const legLen = 80;
    const bodyLen = 95;
    const headRadius = 45;

    // Kinematics based on action
    let jumpOffset = 0;
    let lLegAngle = 0.2;
    let rLegAngle = -0.2;
    let lArmAngle = 0.6;
    let rArmAngle = -0.6;

    if (shot.characterAction === 'jump') {
      jumpOffset = -Math.sin(localProg * Math.PI) * 50;
      lLegAngle = -0.4;
      rLegAngle = 0.4;
      lArmAngle = 2.4;
      rArmAngle = 2.4;
    } else if (shot.characterAction === 'walk') {
      const walkCycle = Math.sin(globalProg * 35);
      lLegAngle = walkCycle * 0.45;
      rLegAngle = -walkCycle * 0.45;
      lArmAngle = -walkCycle * 0.5;
      rArmAngle = walkCycle * 0.5;
    } else if (shot.characterAction === 'point') {
      rArmAngle = 1.8;
      lArmAngle = 0.2;
    } else if (shot.characterAction === 'shrug') {
      lArmAngle = 1.4;
      rArmAngle = 1.4;
    }

    // 1. Legs
    ctx.beginPath();
    // Left Leg
    ctx.moveTo(0, -legLen + jumpOffset);
    ctx.lineTo(-Math.sin(lLegAngle) * legLen, jumpOffset);
    // Right Leg
    ctx.moveTo(0, -legLen + jumpOffset);
    ctx.lineTo(Math.sin(rLegAngle) * legLen, jumpOffset);
    ctx.stroke();

    // 2. Spine / Torso
    const pelvisY = -legLen + jumpOffset;
    const neckY = pelvisY - bodyLen;
    ctx.beginPath();
    ctx.moveTo(0, pelvisY);
    ctx.lineTo(0, neckY);
    ctx.stroke();

    // 3. Arms
    const shoulderY = neckY + 15;
    ctx.beginPath();
    // Left arm
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(-Math.cos(lArmAngle) * 65, shoulderY - Math.sin(lArmAngle) * 65);
    // Right arm
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(Math.cos(rArmAngle) * 65, shoulderY - Math.sin(rArmAngle) * 65);
    ctx.stroke();

    // 4. Large expressive white head with ink border
    const headY = neckY - headRadius;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // 5. Eye Patch on right eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(16, headY - 4, 14, 0, Math.PI * 2);
    ctx.fill();
    // Strap
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-headRadius * 0.7, headY - 20);
    ctx.lineTo(headRadius * 0.9, headY + 10);
    ctx.stroke();

    // Left expressive cartoon eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    const eyeSize = shot.mood === 'surprised' ? 9 : 7;
    ctx.arc(-16, headY - 6, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Expressive cartoon mouth
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (shot.mood === 'surprised') {
      ctx.arc(0, headY + 18, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    } else if (shot.mood === 'happy') {
      ctx.arc(0, headY + 12, 16, 0.2, Math.PI - 0.2);
    } else {
      // Talking or curious
      ctx.moveTo(-10, headY + 18);
      ctx.lineTo(10, headY + 16);
    }
    ctx.stroke();

    // Pirate Hat
    ctx.fillStyle = '#1e1b18';
    ctx.beginPath();
    ctx.ellipse(0, headY - headRadius + 6, headRadius * 1.4, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, headY - headRadius, headRadius * 0.8, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  public dispose(): void {
    // 2D Canvas
  }
}
