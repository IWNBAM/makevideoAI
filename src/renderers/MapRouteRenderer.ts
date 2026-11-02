import * as THREE from 'three';
import { MapRouteSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

export class MapRouteRenderer implements AnimationEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private spec: MapRouteSpec;
  private width: number;
  private height: number;
  private routePoints: THREE.Vector3[] = [];
  private routeLine: THREE.Line;
  private routeGlowLine: THREE.Line;
  private pinGroup: THREE.Group;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private hudScene: THREE.Scene;
  private hudCamera: THREE.OrthographicCamera;
  private hudTexture: THREE.CanvasTexture;

  constructor(context: RenderContext, spec: MapRouteSpec) {
    this.canvas = context.canvas;
    this.width = context.width;
    this.height = context.height;
    this.spec = spec;

    // Overlay canvas for crisp 2D HUD cards (ETA & Destination)
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

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const BG_COLOR = 0xeef0f1;
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.Fog(BG_COLOR, 80, 180);

    const aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(32, aspect, 0.5, 300);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcfd3d6, 1.8);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.scene.add(sun.target);

    // Build procedural city layout
    this.buildCity();

    // Build route and pin
    const { line, glow, pin, points } = this.buildRoute();
    this.routeLine = line;
    this.routeGlowLine = glow;
    this.pinGroup = pin;
    this.routePoints = points;
  }

  private buildCity(): void {
    const scene = this.scene;
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // River
    const riverGeo = new THREE.PlaneGeometry(300, 6);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({ color: 0x9fcbf2, roughness: 0.3 });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(0, 0.02, -18);
    scene.add(river);

    // Bridge over river
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0xfafaf8, roughness: 1 })
    );
    bridge.position.set(0, 0.08, -18);
    bridge.receiveShadow = true;
    bridge.castShadow = true;
    scene.add(bridge);

    // Procedural City Blocks & Buildings
    const padMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 1 });
    const parkMat = new THREE.MeshStandardMaterial({ color: 0xd3e9c6, roughness: 1 });
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xd9e3eb, metalness: 0.2, roughness: 0.2 });
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.8 });

    const CELL = 5;
    for (let i = -6; i <= 6; i++) {
      for (let j = -7; j <= 5; j++) {
        const cx = i * CELL;
        const cz = j * CELL;
        if (Math.abs(cz - (-18)) < 4.5 && Math.abs(cx) < 2) continue; // river gap

        const isPark = (i === 1 && j === -1) || (i === -2 && j === 2) || (i === 3 && j === -4);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(CELL - 1.2, 0.04, CELL - 1.2), isPark ? parkMat : padMat);
        pad.position.set(cx, 0.02, cz);
        pad.receiveShadow = true;
        scene.add(pad);

        if (isPark) {
          // Trees in park
          for (let t = 0; t < 3; t++) {
            const tx = cx + (Math.sin(t * 2) * 1.0);
            const tz = cz + (Math.cos(t * 2) * 1.0);
            const tree = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), treeMat);
            tree.position.set(tx, 0.5, tz);
            tree.castShadow = true;
            scene.add(tree);
          }
        } else {
          // 1 or 2 buildings per block
          const h1 = 0.8 + ((Math.abs(i * 13 + j * 7) % 10) / 10) * 2.8;
          const b1 = new THREE.Mesh(new THREE.BoxGeometry(CELL - 2.0, h1, CELL - 2.0), h1 > 2.2 ? glassMat : buildingMat);
          b1.position.set(cx, h1 / 2 + 0.04, cz);
          b1.castShadow = true;
          b1.receiveShadow = true;
          scene.add(b1);
        }
      }
    }
  }

  private buildRoute(): { line: THREE.Line; glow: THREE.Line; pin: THREE.Group; points: THREE.Vector3[] } {
    const rawPoints: [number, number, number][] = [
      [0, 0.08, 12],
      [0, 0.08, 5],
      [5, 0.08, 5],
      [5, 0.08, -8],
      [0, 0.08, -8],
      [0, 0.08, -18], // crosses bridge
      [-5, 0.08, -18],
      [-5, 0.08, -26],
    ];

    const curve = new THREE.CatmullRomCurve3(
      rawPoints.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      false,
      'catmullrom',
      0.15
    );
    const points = curve.getPoints(120);

    // Initial empty route geometry
    const geo = new THREE.BufferGeometry().setFromPoints([points[0], points[0]]);
    const acc = this.spec.accent || '#3b82f6';
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(acc), linewidth: 6 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    // Glow line (slightly wider/transparent)
    const glowMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(acc),
      transparent: true,
      opacity: 0.5,
      linewidth: 12,
    });
    const glow = new THREE.Line(geo.clone(), glowMat);
    this.scene.add(glow);

    // 3D Pin Drop at destination
    const pin = new THREE.Group();
    const dest = points[points.length - 1];
    pin.position.set(dest.x, 3.5, dest.z);

    const pinHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 16),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(acc), roughness: 0.2, metalness: 0.3 })
    );
    pinHead.position.y = 1.0;
    pinHead.castShadow = true;
    pin.add(pinHead);

    const pinCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(acc), roughness: 0.2 })
    );
    pinCone.rotation.x = Math.PI;
    pinCone.position.y = 0.5;
    pinCone.castShadow = true;
    pin.add(pinCone);

    // White dot inside pin
    const pinDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pinDot.position.set(0, 1.0, 0.45);
    pin.add(pinDot);

    pin.scale.set(0, 0, 0); // hidden initially
    this.scene.add(pin);

    return { line, glow, pin, points };
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    const totalPts = this.routePoints.length;
    // Route draws from 0.05 to 0.75
    const routeProg = Math.min(1, Math.max(0, (progress - 0.05) / 0.70));
    const activeCount = Math.max(2, Math.floor(routeProg * totalPts));
    const currentRoute = this.routePoints.slice(0, activeCount);

    this.routeLine.geometry.dispose();
    this.routeLine.geometry = new THREE.BufferGeometry().setFromPoints(currentRoute);

    this.routeGlowLine.geometry.dispose();
    this.routeGlowLine.geometry = new THREE.BufferGeometry().setFromPoints(currentRoute);

    // Camera follows route head with smooth offset
    const headPt = currentRoute[currentRoute.length - 1];
    const cameraLook = headPt.clone().add(new THREE.Vector3(0, 0.5, 0));
    const cameraPos = headPt.clone().add(new THREE.Vector3(0, 16, 18));
    this.camera.position.lerp(cameraPos, 0.4);
    this.camera.lookAt(cameraLook);

    // Destination Pin drops in between 0.70 and 0.90
    if (progress >= 0.70) {
      const pinProg = Math.min(1, (progress - 0.70) / 0.15);
      // Bounce drop
      const easeBounce = (x: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (x < 1 / d1) return n1 * x * x;
        if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
        if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
      };
      const scale = easeBounce(pinProg);
      this.pinGroup.scale.set(scale, scale, scale);
    } else {
      this.pinGroup.scale.set(0, 0, 0);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Draw 2D UI Overlays directly onto WebGL Canvas context (composite)
    this.render2DHUD(progress);
  }

  private render2DHUD(progress: number): void {
    const octx = this.overlayCtx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h >= w;
    const spec = this.spec;

    octx.clearRect(0, 0, w, h);

    const kmTotal = spec.distance || 4.2;
    const minTotal = spec.minutes || 14;
    const currentKm = Math.max(0, kmTotal * (1 - progress));
    const currentMin = Math.max(0, Math.round(minTotal * (1 - progress)));

    // 1. Top ETA HUD Card
    const cardX = isPortrait ? w * 0.08 : w * 0.06;
    const cardY = isPortrait ? h * 0.12 : h * 0.10;
    const cardW = isPortrait ? w * 0.84 : w * 0.45;
    const cardH = isPortrait ? h * 0.09 : h * 0.14;

    octx.save();
    octx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    octx.shadowColor = 'rgba(30, 40, 60, 0.16)';
    octx.shadowBlur = 24;
    octx.shadowOffsetY = 8;
    this.roundRect(octx, cardX, cardY, cardW, cardH, 20);
    octx.fill();
    octx.shadowColor = 'transparent';

    // Accent icon pill
    const iconSize = isPortrait ? cardH * 0.6 : cardH * 0.55;
    const iconX = cardX + 16;
    const iconY = cardY + (cardH - iconSize) / 2;
    octx.fillStyle = spec.accent || '#3b82f6';
    this.roundRect(octx, iconX, iconY, iconSize, iconSize, 14);
    octx.fill();

    // Arrow icon inside pill
    octx.fillStyle = '#ffffff';
    octx.beginPath();
    octx.moveTo(iconX + iconSize / 2, iconY + iconSize * 0.25);
    octx.lineTo(iconX + iconSize * 0.75, iconY + iconSize * 0.75);
    octx.lineTo(iconX + iconSize * 0.5, iconY + iconSize * 0.62);
    octx.lineTo(iconX + iconSize * 0.25, iconY + iconSize * 0.75);
    octx.closePath();
    octx.fill();

    // ETA Text
    const textStartX = iconX + iconSize + 16;
    octx.fillStyle = '#111827';
    octx.font = `700 ${Math.round(cardH * 0.34)}px 'Inter', sans-serif`;
    octx.fillText(`${currentMin} min até o destino`, textStartX, cardY + cardH * 0.44);

    octx.fillStyle = '#6b7280';
    octx.font = `500 ${Math.round(cardH * 0.24)}px 'Inter', sans-serif`;
    octx.fillText(`${currentKm.toFixed(1)} ${spec.unit || 'km'} restantes · Modo ${spec.transportMode || 'Rota'}`, textStartX, cardY + cardH * 0.76);
    octx.restore();

    // 2. Climax Destination Card (slides up between 0.72 and 1.0)
    if (progress >= 0.72) {
      const destProg = Math.min(1, (progress - 0.72) / 0.18);
      const easedSlide = 1 - Math.pow(1 - destProg, 3);

      const dCardW = isPortrait ? w * 0.84 : w * 0.50;
      const dCardH = isPortrait ? h * 0.11 : h * 0.16;
      const dCardX = (w - dCardW) / 2;
      const finalY = isPortrait ? h * 0.78 : h * 0.76;
      const currentY = finalY + (1 - easedSlide) * 60;

      octx.save();
      octx.globalAlpha = easedSlide;
      octx.fillStyle = '#ffffff';
      octx.shadowColor = 'rgba(0, 0, 0, 0.20)';
      octx.shadowBlur = 32;
      octx.shadowOffsetY = 12;
      this.roundRect(octx, dCardX, currentY, dCardW, dCardH, 22);
      octx.fill();
      octx.shadowColor = 'transparent';

      // Destination Name
      octx.fillStyle = '#0f172a';
      octx.font = `700 ${Math.round(dCardH * 0.32)}px 'Inter', sans-serif`;
      octx.fillText(spec.destination || 'Destino Final', dCardX + 22, currentY + dCardH * 0.42);

      // Meta info with accent dot
      octx.beginPath();
      octx.arc(dCardX + 28, currentY + dCardH * 0.72, 5, 0, Math.PI * 2);
      octx.fillStyle = spec.accent || '#3b82f6';
      octx.fill();

      octx.fillStyle = '#64748b';
      octx.font = `500 ${Math.round(dCardH * 0.23)}px 'Inter', sans-serif`;
      octx.fillText(`Chegada concluída · ${kmTotal} ${spec.unit || 'km'} percorridos`, dCardX + 42, currentY + dCardH * 0.77);
      octx.restore();
    }

    // Update dynamic HUD texture and render ortho pass
    this.hudTexture.needsUpdate = true;
    this.renderer.autoClear = false;
    this.renderer.render(this.hudScene, this.hudCamera);
    this.renderer.autoClear = true;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
