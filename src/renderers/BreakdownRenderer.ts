import * as THREE from 'three';
import { BreakdownSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

export class BreakdownRenderer implements AnimationEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private spec: BreakdownSpec;
  private width: number;
  private height: number;
  private layers: THREE.Group[] = [];
  private hudScene: THREE.Scene;
  private hudCamera: THREE.OrthographicCamera;
  private hudTexture: THREE.CanvasTexture;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  constructor(context: RenderContext, spec: BreakdownSpec) {
    this.canvas = context.canvas;
    this.width = context.width;
    this.height = context.height;
    this.spec = spec;

    // Overlay Canvas for HUD technical leader lines and callouts
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = this.width;
    this.overlayCanvas.height = this.height;
    const ctx = this.overlayCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get overlay context');
    this.overlayCtx = ctx;

    this.hudScene = new THREE.Scene();
    this.hudCamera = new THREE.OrthographicCamera(-this.width / 2, this.width / 2, this.height / 2, -this.height / 2, 0, 10);
    this.hudTexture = new THREE.CanvasTexture(this.overlayCanvas);
    this.hudTexture.colorSpace = THREE.SRGBColorSpace;
    const hudMaterial = new THREE.SpriteMaterial({ map: this.hudTexture, transparent: true });
    const hudSprite = new THREE.Sprite(hudMaterial);
    hudSprite.scale.set(this.width, this.height, 1);
    this.hudScene.add(hudSprite);

    // Three.js WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    const aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(28, aspect, 0.5, 200);

    // Studio Lighting
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-6, 14, 10);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xffe8d6, 1.4);
    rim.position.set(8, 6, -6);
    this.scene.add(rim);

    this.scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x14161a, 0.6));

    // Build the 4 phone hardware layers
    this.buildPhoneLayers();
  }

  private buildPhoneLayers(): void {
    const PW = 3.6;
    const PL = 7.4;
    const PR = 0.6;

    // Helper: rounded rectangle shape
    const rrShape = (w: number, l: number, r: number) => {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -l / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
      s.lineTo(x + w, y + l - r);
      s.absarc(x + w - r, y + l - r, r, 0, Math.PI / 2, false);
      s.lineTo(x + r, y + l);
      s.absarc(x + r, y + l - r, r, Math.PI / 2, Math.PI, false);
      s.lineTo(x, y + r);
      s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
      return s;
    };

    const slab = (w: number, l: number, r: number, t: number, mat: THREE.Material) => {
      const g = new THREE.ExtrudeGeometry(rrShape(w, l, r), {
        depth: t,
        bevelEnabled: true,
        bevelSize: 0.03,
        bevelThickness: 0.03,
        bevelSegments: 4,
        curveSegments: 20,
      });
      g.rotateX(-Math.PI / 2);
      return new THREE.Mesh(g, mat);
    };

    // Layer 0: Back Glass + MagSafe Coil
    const layer0 = new THREE.Group();
    layer0.userData = { targetY: -2.8, index: 0 };
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.35,
      metalness: 0.2,
    });
    const backGlass = slab(PW, PL, PR, 0.1, glassMat);
    layer0.add(backGlass);

    // MagSafe ring & copper coil
    const magMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.3 });
    const mag = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 16, 64), magMat);
    mag.rotation.x = Math.PI / 2;
    mag.position.set(0, 0.12, 0.2);
    layer0.add(mag);

    const coilMat = new THREE.MeshStandardMaterial({ color: 0xb87f4e, metalness: 0.85, roughness: 0.35 });
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.04, 48), coilMat);
    coil.position.set(0, 0.11, 0.2);
    layer0.add(coil);

    this.scene.add(layer0);
    this.layers.push(layer0);

    // Layer 1: Li-ion Battery pack
    const layer1 = new THREE.Group();
    layer1.userData = { targetY: -0.9, index: 1 };

    // Procedural battery texture
    const batCanvas = document.createElement('canvas');
    batCanvas.width = 512;
    batCanvas.height = 700;
    const bctx = batCanvas.getContext('2d')!;
    bctx.fillStyle = '#1e293b';
    bctx.fillRect(0, 0, 512, 700);
    bctx.strokeStyle = 'rgba(255,255,255,0.15)';
    bctx.lineWidth = 4;
    bctx.strokeRect(20, 20, 472, 660);
    bctx.fillStyle = '#f8fafc';
    bctx.font = '700 48px Inter, sans-serif';
    bctx.fillText('Li-ion BATTERY', 50, 100);
    bctx.fillStyle = '#94a3b8';
    bctx.font = '500 32px JetBrains Mono, monospace';
    bctx.fillText('4,850 mAh  3.89 V', 50, 160);
    bctx.fillText('18.8 Wh  High-Density', 50, 210);
    bctx.fillStyle = this.spec.accent || '#06b6d4';
    bctx.fillRect(50, 600, 120, 10);

    const batTex = new THREE.CanvasTexture(batCanvas);
    const batMat = new THREE.MeshStandardMaterial({ map: batTex, roughness: 0.5, metalness: 0.2 });
    const bat = slab(2.6, 4.0, 0.25, 0.16, batMat);
    bat.position.set(0.1, 0, 1.1);
    layer1.add(bat);

    this.scene.add(layer1);
    this.layers.push(layer1);

    // Layer 2: Motherboard PCB + Triple Camera Modules + Processor
    const layer2 = new THREE.Group();
    layer2.userData = { targetY: 0.9, index: 2 };

    const pcbCanvas = document.createElement('canvas');
    pcbCanvas.width = 512;
    pcbCanvas.height = 512;
    const pctx = pcbCanvas.getContext('2d')!;
    pctx.fillStyle = '#064e3b';
    pctx.fillRect(0, 0, 512, 512);
    pctx.strokeStyle = '#eab308';
    pctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      const y = 30 + i * 24;
      pctx.beginPath();
      pctx.moveTo(20, y);
      pctx.lineTo(160 + (i * 30) % 180, y);
      pctx.lineTo(200 + (i * 30) % 180, y + 20);
      pctx.lineTo(490, y + 20);
      pctx.stroke();
    }
    const pcbTex = new THREE.CanvasTexture(pcbCanvas);
    const pcbMat = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.4, metalness: 0.3 });
    const pcb = slab(3.0, 2.6, 0.3, 0.08, pcbMat);
    pcb.position.set(0, 0, -2.1);
    layer2.add(pcb);

    // Bionic CPU Chip
    const cpuMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.2 });
    const cpu = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), cpuMat);
    cpu.position.set(0.5, 0.1, -2.1);
    layer2.add(cpu);

    // Triple Camera lenses
    const camMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x05070a, roughness: 0.05, clearcoat: 1 });
    const camCoords: [number, number][] = [[-0.8, -2.8], [-0.8, -2.1], [-1.2, -2.4]];
    camCoords.forEach(([cx, cz]) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 32), camMat);
      ring.position.set(cx, 0.12, cz);
      layer2.add(ring);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), lensMat);
      glass.position.set(cx, 0.22, cz);
      layer2.add(glass);
    });

    this.scene.add(layer2);
    this.layers.push(layer2);

    // Layer 3: Display OLED Glass & Front Chassis
    const layer3 = new THREE.Group();
    layer3.userData = { targetY: 2.8, index: 3 };

    const dispMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const frontGlass = slab(PW, PL, PR, 0.08, dispMat);
    layer3.add(frontGlass);

    // Titanium frame border
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95, roughness: 0.25 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.06, 0.1, PL + 0.06), frameMat);
    frame.position.set(0, -0.06, 0);
    layer3.add(frame);

    this.scene.add(layer3);
    this.layers.push(layer3);
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    // 0.00 - 0.15: Assemble state
    // 0.15 - 0.70: Exploding layers apart with smooth in-out easing
    // 0.70 - 1.00: Full exploded state with gentle camera rotation
    const explodeProg = Math.min(1, Math.max(0, (progress - 0.15) / 0.55));
    const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easedFactor = easeInOut(explodeProg);

    this.layers.forEach(layer => {
      const targetY = layer.userData.targetY || 0;
      layer.position.y = targetY * easedFactor;
    });

    // Dynamic camera orbit
    const camAngle = 0.35 + progress * 0.45;
    const camDist = 16.5;
    const camHeight = 7.5;
    this.camera.position.x = Math.sin(camAngle) * camDist;
    this.camera.position.z = Math.cos(camAngle) * camDist;
    this.camera.position.y = camHeight;
    this.camera.lookAt(0, 0, 0);

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Render 2D Technical HUD Overlay with Leader Lines
    this.renderTechnicalHUD(progress, easedFactor);
  }

  private renderTechnicalHUD(progress: number, easedFactor: number): void {
    const octx = this.overlayCtx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h >= w;
    const spec = this.spec;

    octx.clearRect(0, 0, w, h);

    // Gradient background vignette on overlay
    const bgGrad = octx.createRadialGradient(w * 0.45, h * 0.5, w * 0.1, w * 0.5, h * 0.5, w * 0.85);
    bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.15)');
    bgGrad.addColorStop(1, 'rgba(11, 15, 25, 0.65)');
    octx.fillStyle = bgGrad;
    octx.fillRect(0, 0, w, h);

    // Header Title & Subtitle at top
    octx.save();
    octx.fillStyle = '#64748b';
    octx.font = `600 ${Math.round(isPortrait ? w * 0.03 : h * 0.035)}px 'JetBrains Mono', monospace`;
    octx.letterSpacing = '2px';
    const topMargin = isPortrait ? h * 0.10 : h * 0.12;
    const leftMargin = isPortrait ? w * 0.08 : w * 0.06;
    octx.fillText((spec.subtitle || 'ANATOMIA INTERNA').toUpperCase(), leftMargin, topMargin);

    octx.fillStyle = '#f8fafc';
    octx.font = `700 ${Math.round(isPortrait ? w * 0.046 : h * 0.055)}px 'Inter', sans-serif`;
    octx.fillText((spec.title || 'SMARTPHONE PRO MÁXIMO').toUpperCase(), leftMargin, topMargin + (isPortrait ? h * 0.038 : h * 0.05));
    octx.restore();

    // Callout Leader Lines connecting layers to labels
    if (easedFactor > 0.4) {
      const items = spec.items && spec.items.length > 0 ? spec.items : [
        { num: '01', title: 'CHASSIS TITÂNIO', desc: 'Vidro fosco texturizado com MagSafe', layerIndex: 0 },
        { num: '02', title: 'CÉLULA LI-ION', desc: 'Bateria de 4.850 mAh de alta densidade', layerIndex: 1 },
        { num: '03', title: 'PLACA NEURAL BIONIC', desc: 'PCB 10 camadas com processador 3nm', layerIndex: 2 },
        { num: '04', title: 'DISPLAY OLED 120HZ', desc: 'Super Retina XDR com Ceramic Shield', layerIndex: 3 },
      ];

      const calloutAlpha = Math.min(1, (easedFactor - 0.4) / 0.5);

      items.forEach((item, idx) => {
        const layer = this.layers[item.layerIndex] || this.layers[idx % this.layers.length];
        if (!layer) return;

        // Project layer 3D position to 2D screen coordinates
        const layerWorldPos = new THREE.Vector3(0, layer.position.y, 0);
        layerWorldPos.project(this.camera);

        const screenX = (layerWorldPos.x * 0.5 + 0.5) * w;
        const screenY = (-(layerWorldPos.y * 0.5) + 0.5) * h;

        // Position callout badge to the right or left
        const isRightSide = idx % 2 === 1 || !isPortrait;
        const badgeX = isRightSide ? w * 0.65 : w * 0.08;
        const badgeY = isPortrait ? h * 0.28 + idx * (h * 0.12) : h * 0.25 + idx * (h * 0.15);

        octx.save();
        octx.globalAlpha = calloutAlpha;

        // Draw leader line from 3D layer anchor to callout
        octx.strokeStyle = spec.accent || '#06b6d4';
        octx.lineWidth = 1.5;
        octx.beginPath();
        octx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        octx.fillStyle = spec.accent || '#06b6d4';
        octx.fill();

        octx.moveTo(screenX, screenY);
        const elbowX = isRightSide ? badgeX - 20 : badgeX + 180;
        octx.lineTo(elbowX, badgeY);
        octx.lineTo(isRightSide ? badgeX : badgeX + 160, badgeY);
        octx.stroke();

        // Technical Callout Card
        octx.fillStyle = spec.accent || '#06b6d4';
        octx.font = `700 ${Math.round(isPortrait ? w * 0.026 : h * 0.03)}px 'JetBrains Mono', monospace`;
        octx.fillText(item.num || `0${idx + 1}`, badgeX, badgeY - 14);

        octx.fillStyle = '#f8fafc';
        octx.font = `700 ${Math.round(isPortrait ? w * 0.032 : h * 0.038)}px 'Inter', sans-serif`;
        octx.fillText(item.title, badgeX, badgeY + 8);

        octx.fillStyle = '#94a3b8';
        octx.font = `500 ${Math.round(isPortrait ? w * 0.024 : h * 0.028)}px 'Inter', sans-serif`;
        octx.fillText(item.desc, badgeX, badgeY + 28);

        octx.restore();
      });
    }

    // Render HUD ortho pass on top of WebGL scene
    this.hudTexture.needsUpdate = true;
    this.renderer.autoClear = false;
    this.renderer.render(this.hudScene, this.hudCamera);
    this.renderer.autoClear = true;
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
