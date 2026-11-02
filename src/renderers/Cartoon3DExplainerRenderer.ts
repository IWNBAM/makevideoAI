import * as THREE from 'three';
import { CartoonExplainerSpec } from '../types';
import { RenderContext, AnimationEngine } from './types';

export class Cartoon3DExplainerRenderer implements AnimationEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private spec: CartoonExplainerSpec;
  private width: number;
  private height: number;
  private targetGroup: THREE.Group;
  private projectileGroup: THREE.Group;
  private rippleMesh: THREE.Mesh;
  private sparksGroup: THREE.Group;
  private hudScene: THREE.Scene;
  private hudCamera: THREE.OrthographicCamera;
  private hudTexture: THREE.CanvasTexture;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;

  constructor(context: RenderContext, spec: CartoonExplainerSpec) {
    this.canvas = context.canvas;
    this.width = context.width;
    this.height = context.height;
    this.spec = spec;

    // Overlay Canvas for cinematic captions & lower-third title
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
    // Sky blue background
    const SKY_COLOR = 0x38bdf8;
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, 30, 90);

    const aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.5, 150);

    // Studio Lighting
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-10, 20, 15);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.HemisphereLight(0xffffff, 0x0284c7, 1.2);
    this.scene.add(fill);

    // Ground platform pedestal
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 1, 48),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 })
    );
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Build Character with Armor / Vest
    this.targetGroup = new THREE.Group();
    this.buildCharacterWithArmor();
    this.scene.add(this.targetGroup);

    // Build Projectile (Arrow or Bullet)
    this.projectileGroup = new THREE.Group();
    this.buildProjectile();
    this.scene.add(this.projectileGroup);

    // Build Red Force Ripple Shockwave
    const rippleGeo = new THREE.RingGeometry(0.1, 0.35, 32);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    this.rippleMesh.position.set(0, 3.2, 0.6);
    this.scene.add(this.rippleMesh);

    // Build Sparks
    this.sparksGroup = new THREE.Group();
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 24; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), sparkMat);
      spark.userData = {
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 4 + 1,
        vz: Math.random() * 4 + 1,
      };
      this.sparksGroup.add(spark);
    }
    this.sparksGroup.position.set(0, 3.2, 0.6);
    this.sparksGroup.visible = false;
    this.scene.add(this.sparksGroup);
  }

  private buildCharacterWithArmor(): void {
    // Stylized mannequin head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), skinMat);
    head.position.y = 4.6;
    head.castShadow = true;
    this.targetGroup.add(head);

    // Torso with Breastplate Armor
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 1.8, 24), armorMat);
    chest.position.y = 3.2;
    chest.castShadow = true;
    this.targetGroup.add(chest);

    // Gold armor trim
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 12, 36), goldMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 3.8;
    this.targetGroup.add(trim);

    // Arms
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16), clothMat);
    lArm.position.set(-1.1, 3.0, 0);
    lArm.rotation.z = 0.2;
    this.targetGroup.add(lArm);

    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16), clothMat);
    rArm.position.set(1.1, 3.0, 0);
    rArm.rotation.z = -0.2;
    this.targetGroup.add(rArm);

    // Stand base
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 16), clothMat);
    legs.position.y = 1.1;
    this.targetGroup.add(legs);
  }

  private buildProjectile(): void {
    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    arrowShaft.rotation.x = Math.PI / 2;
    this.projectileGroup.add(arrowShaft);

    // Steel arrowhead tip
    const arrowTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.9, roughness: 0.2 })
    );
    arrowTip.rotation.x = -Math.PI / 2;
    arrowTip.position.z = -1.2;
    this.projectileGroup.add(arrowTip);

    // Feathers at tail
    const featherMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.5), featherMat);
    f1.position.z = 1.0;
    this.projectileGroup.add(f1);

    this.projectileGroup.position.set(0, 3.2, 16); // Starts in front of camera
  }

  public renderAt(progress: number, currentTimeSec: number): void {
    // Phase 1: 0.00 to 0.40 -> Fast projectile flight toward target
    // Phase 2: 0.40 to 0.65 -> Slow motion impact, red force ripple expands, sparks burst
    // Phase 3: 0.65 to 1.00 -> Deflection angle, projectile bounces off armor, explanatory reveal
    const impactProg = Math.min(1, Math.max(0, (progress - 0.40) / 0.25));

    if (progress < 0.40) {
      // Approaching in high speed
      const t = progress / 0.40;
      this.projectileGroup.position.z = 16 - t * 14.8;
      (this.rippleMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      this.sparksGroup.visible = false;

      // Camera rides beside the arrow
      this.camera.position.set(2.5, 3.6, this.projectileGroup.position.z + 5.5);
      this.camera.lookAt(0, 3.2, 0);
    } else if (progress >= 0.40 && progress < 0.65) {
      // Slow-motion impact moment!
      const t = (progress - 0.40) / 0.25;
      this.projectileGroup.position.z = 1.2 - t * 0.4;
      this.projectileGroup.rotation.z = t * 0.3; // Begins deflecting angle

      // Expanding Red Force Ripple
      const rippleScale = 1 + t * 9;
      this.rippleMesh.scale.set(rippleScale, rippleScale, 1);
      (this.rippleMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.2);

      // Sparks flying
      this.sparksGroup.visible = true;
      this.sparksGroup.children.forEach(spark => {
        const u = spark.userData;
        spark.position.set(u.vx * t, u.vy * t - 0.5 * 9.8 * t * t * 0.2, u.vz * t);
      });

      // Dramatic cinematic close-up camera angle
      this.camera.position.set(3.2, 3.4, 3.8);
      this.camera.lookAt(0, 3.2, 0.6);
    } else {
      // Deflected and bounced off
      const t = (progress - 0.65) / 0.35;
      this.projectileGroup.position.x = t * 4;
      this.projectileGroup.position.y = 3.2 + t * 2 - t * t * 3;
      this.projectileGroup.position.z = 0.8 + t * 3;
      this.projectileGroup.rotation.z = 0.3 + t * 2;

      (this.rippleMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      this.sparksGroup.visible = false;

      // Orbiting overview camera
      this.camera.position.set(Math.sin(progress * 2) * 8, 4.5, Math.cos(progress * 2) * 8);
      this.camera.lookAt(0, 3.2, 0);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Render 2D Cinematic Captions HUD
    this.renderCinematicHUD(progress);
  }

  private renderCinematicHUD(progress: number): void {
    const octx = this.overlayCtx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h >= w;
    const spec = this.spec;

    octx.clearRect(0, 0, w, h);

    // Top topic badge
    octx.save();
    octx.fillStyle = '#ef4444';
    octx.font = `700 ${Math.round(isPortrait ? w * 0.032 : h * 0.038)}px 'JetBrains Mono', monospace`;
    const topY = isPortrait ? h * 0.10 : h * 0.12;
    octx.fillText('3D EXPLICAÇÃO CIENTÍFICA', isPortrait ? w * 0.08 : w * 0.06, topY);

    // Current phrase based on progress
    let mainCaption = spec.question || 'Uma armadura medieval aguenta uma flecha?';
    if (progress >= 0.40 && progress < 0.65) {
      mainCaption = 'O MOMENTO DO IMPACTO CRÍTICO!';
    } else if (progress >= 0.65) {
      mainCaption = spec.twist || 'O ângulo curvo do aço ricocheteia o projétil!';
    }

    // Big punchy lower-third caption card
    const cardW = isPortrait ? w * 0.88 : w * 0.60;
    const cardH = isPortrait ? h * 0.12 : h * 0.16;
    const cardX = (w - cardW) / 2;
    const cardY = isPortrait ? h * 0.82 : h * 0.78;

    octx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    octx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    octx.shadowBlur = 28;
    this.roundRect(octx, cardX, cardY, cardW, cardH, 20);
    octx.fill();
    octx.shadowColor = 'transparent';

    // Left accent bar
    octx.fillStyle = '#ef4444';
    this.roundRect(octx, cardX + 8, cardY + 12, 6, cardH - 24, 3);
    octx.fill();

    // Text inside card
    octx.fillStyle = '#ffffff';
    octx.font = `700 ${Math.round(isPortrait ? w * 0.042 : h * 0.048)}px 'Inter', sans-serif`;
    octx.fillText(mainCaption, cardX + 26, cardY + cardH * 0.58);

    octx.restore();

    // Render HUD ortho pass
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
