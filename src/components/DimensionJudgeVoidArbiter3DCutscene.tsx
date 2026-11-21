import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FastForward } from 'lucide-react';

interface DimensionJudgeVoidArbiter3DCutsceneProps {
  remainingTime: number;
  totalDuration?: number;
  onSkip: () => void;
  onWebGLUnavailable?: () => void;
}

type CutscenePhase = 'singularity' | 'arbiter' | 'severance';

const PHASE_LABELS: Record<CutscenePhase, string> = {
  singularity: 'FASE I · RETAKAN DIMENSI & TARIKAN SINGULARITAS RUANG HAMPA',
  arbiter: 'FASE II · SAYAP PEDANG KEMBAR & PEDANG AGUNG VOID ARBITER TERHUNUS',
  severance: 'FASE III · DIMENSION X-SLASH — REALITAS TERBELAH DUA!'
};

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.6, 0);
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export const DimensionJudgeVoidArbiter3DCutscene: React.FC<DimensionJudgeVoidArbiter3DCutsceneProps> = ({
  remainingTime,
  totalDuration = 5.4,
  onSkip,
  onWebGLUnavailable
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remainingRef = useRef<number>(remainingTime);
  const lastSyncTimeRef = useRef<number>(performance.now());
  const onSkipRef = useRef(onSkip);
  const onFallbackRef = useRef(onWebGLUnavailable);

  const [phase, setPhase] = useState<CutscenePhase>('singularity');
  const [uiProgress, setUiProgress] = useState<number>(0);

  onSkipRef.current = onSkip;
  onFallbackRef.current = onWebGLUnavailable;

  useEffect(() => {
    remainingRef.current = remainingTime;
    lastSyncTimeRef.current = performance.now();
  }, [remainingTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onSkipRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const testGl =
        canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' }) ||
        canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' });
      if (!testGl) {
        onFallbackRef.current?.();
        return;
      }

      const debugExt = testGl.getExtension('WEBGL_debug_renderer_info');
      const gpuName = debugExt
        ? String(testGl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '')
        : '';
      const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuName);

      renderer = new THREE.WebGLRenderer({
        canvas,
        context: testGl as WebGLRenderingContext,
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const disposables: Array<{ dispose: () => void }> = [];
      const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
        disposables.push(g);
        return g;
      };
      const trackMat = <T extends THREE.Material>(m: T): T => {
        disposables.push(m);
        return m;
      };

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x03020d);
      scene.fog = new THREE.FogExp2(0x08041c, 0.03);

      const camera = new THREE.PerspectiveCamera(
        48,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        120
      );
      camera.position.set(2.2, 1.0, 5.6);
      _currentLook.set(0, 1.65, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      disposables.push(envRT, roomEnv, pmrem);

      // Cosmic Astral Judgment Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0x818cf8, 0x0f0724, 0.92);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfef3c7, 2.35);
      keyLight.position.set(4.5, 8.5, 5.5);
      scene.add(keyLight);

      const singularityBackLight = new THREE.PointLight(0xa855f7, 28, 38, 1.35);
      singularityBackLight.position.set(0, 3.6, -3.8);
      scene.add(singularityBackLight);

      const coreLight = new THREE.PointLight(0x818cf8, 12, 24, 1.4);
      coreLight.position.set(0, 1.7, 1.1);
      scene.add(coreLight);

      const goldSlashLight = new THREE.PointLight(0xfbbf24, 10, 24, 1.4);
      goldSlashLight.position.set(0, 1.4, 2.0);
      scene.add(goldSlashLight);

      // Procedural Texture 1: Dimensional Astrolabe & Spatial Fracture Seal Floor
      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = 768;
      floorCanvas.height = 768;
      const fctx = floorCanvas.getContext('2d');
      if (fctx) {
        fctx.fillStyle = '#040212';
        fctx.fillRect(0, 0, 768, 768);

        const rg = fctx.createRadialGradient(384, 384, 16, 384, 384, 370);
        rg.addColorStop(0, 'rgba(192, 132, 252, 0.85)');
        rg.addColorStop(0.22, 'rgba(99, 102, 241, 0.52)');
        rg.addColorStop(0.55, 'rgba(49, 46, 129, 0.24)');
        rg.addColorStop(1, 'rgba(4, 2, 18, 0)');
        fctx.fillStyle = rg;
        fctx.fillRect(0, 0, 768, 768);

        // Astrolabe Concentric Rings & Celestial Tick Marks
        const radii = [110, 195, 275, 345];
        for (let rIdx = 0; rIdx < radii.length; rIdx++) {
          const rad = radii[rIdx];
          fctx.strokeStyle = rIdx % 2 === 0 ? 'rgba(251, 191, 36, 0.82)' : 'rgba(129, 140, 248, 0.78)';
          fctx.lineWidth = rIdx === 2 ? 3.5 : 2.2;
          fctx.beginPath();
          fctx.arc(384, 384, rad, 0, Math.PI * 2);
          fctx.stroke();
        }

        // Geometric Star & Spatial Cross-Axes
        for (let s = 0; s < 12; s++) {
          const a = (s * Math.PI * 2) / 12;
          fctx.strokeStyle = s % 3 === 0 ? 'rgba(251, 191, 36, 0.65)' : 'rgba(192, 132, 252, 0.45)';
          fctx.lineWidth = s % 3 === 0 ? 2.6 : 1.4;
          fctx.beginPath();
          fctx.moveTo(384 + Math.cos(a) * 65, 384 + Math.sin(a) * 65);
          fctx.lineTo(384 + Math.cos(a) * 345, 384 + Math.sin(a) * 345);
          fctx.stroke();

          // Diamond glyph nodes along ring
          const gx = 384 + Math.cos(a) * 235;
          const gy = 384 + Math.sin(a) * 235;
          fctx.fillStyle = s % 2 === 0 ? '#fde047' : '#a5b4fc';
          fctx.beginPath();
          fctx.moveTo(gx, gy - 8);
          fctx.lineTo(gx + 6, gy);
          fctx.lineTo(gx, gy + 8);
          fctx.lineTo(gx - 6, gy);
          fctx.closePath();
          fctx.fill();
        }

        // Sharp Spatial Cracks
        for (let c = 0; c < 14; c++) {
          const ba = (c * Math.PI * 2) / 14 + 0.14;
          fctx.strokeStyle = c % 2 === 0 ? 'rgba(224, 231, 255, 0.7)' : 'rgba(192, 132, 252, 0.65)';
          fctx.lineWidth = 2.0;
          fctx.beginPath();
          let cx = 384;
          let cy = 384;
          fctx.moveTo(cx, cy);
          for (let seg = 1; seg <= 5; seg++) {
            const r = seg * 66;
            const jit = Math.sin(c * 5.2 + seg * 3.4) * 0.15;
            cx = 384 + Math.cos(ba + jit) * r;
            cy = 384 + Math.sin(ba + jit) * r;
            fctx.lineTo(cx, cy);
          }
          fctx.stroke();
        }
      }
      const floorTex = new THREE.CanvasTexture(floorCanvas);
      floorTex.colorSpace = THREE.SRGBColorSpace;
      floorTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(floorTex);

      // Procedural Texture 2: Event Horizon Singularity Corona
      const vortexCanvas = document.createElement('canvas');
      vortexCanvas.width = 512;
      vortexCanvas.height = 512;
      const vctx = vortexCanvas.getContext('2d');
      if (vctx) {
        vctx.clearRect(0, 0, 512, 512);
        const vg = vctx.createRadialGradient(256, 256, 62, 256, 256, 250);
        vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vg.addColorStop(0.28, 'rgba(251, 191, 36, 0.95)');
        vg.addColorStop(0.42, 'rgba(168, 85, 247, 0.85)');
        vg.addColorStop(0.68, 'rgba(79, 70, 229, 0.36)');
        vg.addColorStop(1, 'rgba(3, 2, 13, 0)');
        vctx.fillStyle = vg;
        vctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 32; i++) {
          const a = (i * Math.PI * 2) / 32;
          const len = 140 + ((i * 29) % 90);
          vctx.strokeStyle = i % 3 === 0 ? 'rgba(253, 224, 71, 0.78)' : 'rgba(165, 180, 252, 0.55)';
          vctx.lineWidth = i % 2 === 0 ? 3.8 : 2.0;
          vctx.beginPath();
          vctx.moveTo(256 + Math.cos(a) * 82, 256 + Math.sin(a) * 82);
          vctx.lineTo(256 + Math.cos(a + 0.18) * len, 256 + Math.sin(a + 0.18) * len);
          vctx.stroke();
        }
      }
      const vortexTex = new THREE.CanvasTexture(vortexCanvas);
      vortexTex.colorSpace = THREE.SRGBColorSpace;
      vortexTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(vortexTex);

      // Shared PBR Materials
      const obsidianMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0b081b,
          roughness: 0.72,
          metalness: 0.35
        })
      );
      const voidArmorMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e1b4b,
          emissive: 0x1e1b4b,
          emissiveIntensity: 0.42,
          roughness: 0.28,
          metalness: 0.82
        })
      );
      const imperialIndigoMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x4338ca,
          emissive: 0x312e81,
          emissiveIntensity: 0.48,
          roughness: 0.24,
          metalness: 0.76
        })
      );
      const astralGoldMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0x92400e,
          emissiveIntensity: 0.36,
          roughness: 0.16,
          metalness: 0.94
        })
      );
      const violetEnergyMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xa855f7,
          emissiveIntensity: 2.2,
          roughness: 0.14,
          metalness: 0.18
        })
      );
      const starlightMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: 0xfbbf24,
          emissiveIntensity: 2.4,
          roughness: 0.1,
          metalness: 0.12
        })
      );
      const voidBlackMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x020108,
          roughness: 0.95,
          metalness: 0.05
        })
      );
      const capeMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x312e81,
          emissive: 0x1e1b4b,
          emissiveIntensity: 0.4,
          roughness: 0.65,
          metalness: 0.18,
          side: THREE.DoubleSide
        })
      );

      // 1. Abyssal Floor & Astrolabe Seal
      const abyssPlane = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(30, 48)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x040210,
            roughness: 0.9,
            metalness: 0.15
          })
        )
      );
      abyssPlane.rotation.x = -Math.PI / 2;
      abyssPlane.position.y = -0.18;
      scene.add(abyssPlane);

      const sealMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: floorTex,
          transparent: true,
          opacity: 0.88,
          depthWrite: false
        })
      );
      const astrolabeSeal = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(5.6, 48)), sealMat);
      astrolabeSeal.rotation.x = -Math.PI / 2;
      astrolabeSeal.position.y = 0.01;
      scene.add(astrolabeSeal);

      // 6 Floating Shattered Obsidian Monoliths + Levitating Crystal Capstones
      const monolithPillarGeo = trackGeo(new THREE.BoxGeometry(0.68, 3.2, 0.68));
      const monolithCapGeo = trackGeo(new THREE.OctahedronGeometry(0.36, 0));
      const monolithStripGeo = trackGeo(new THREE.BoxGeometry(0.14, 2.5, 0.72));
      const monolithGroups: { group: THREE.Group; cap: THREE.Mesh; baseY: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6 + 0.35;
        const rad = 5.6 + (i % 2) * 0.85;
        const mg = new THREE.Group();
        const baseY = 1.2 + (i % 3) * 0.35;
        mg.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * rad);
        mg.lookAt(0, baseY + 0.5, 0);
        mg.rotateX((i % 2 === 0 ? 1 : -1) * 0.14);

        const body = new THREE.Mesh(monolithPillarGeo, obsidianMat);
        const strip = new THREE.Mesh(monolithStripGeo, i % 2 === 0 ? violetEnergyMat : astralGoldMat);
        const cap = new THREE.Mesh(monolithCapGeo, i % 2 === 0 ? starlightMat : violetEnergyMat);
        cap.position.y = 2.05;
        mg.add(body, strip, cap);
        scene.add(mg);
        monolithGroups.push({ group: mg, cap, baseY });
      }

      // 6 Floating Spatial Rift Portals + Tether Beams
      const portalFrameGeo = trackGeo(new THREE.TorusGeometry(0.55, 0.05, 8, 32));
      const portalInnerGeo = trackGeo(new THREE.CircleGeometry(0.5, 24));
      const portalInnerMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      const portals: THREE.Group[] = [];
      const portalTethers: THREE.Mesh[] = [];
      const tetherGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 1, 6));
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6;
        const pg = new THREE.Group();
        pg.position.set(Math.cos(ang) * 3.8, 2.25 + (i % 2) * 0.4, Math.sin(ang) * 3.8);
        pg.lookAt(0, 1.8, 0.15);
        const frame = new THREE.Mesh(portalFrameGeo, astralGoldMat);
        const inner = new THREE.Mesh(portalInnerGeo, portalInnerMat);
        pg.add(frame, inner);
        scene.add(pg);
        portals.push(pg);

        const tether = new THREE.Mesh(tetherGeo, i % 2 === 0 ? starlightMat : violetEnergyMat);
        tether.visible = false;
        scene.add(tether);
        portalTethers.push(tether);
      }

      // 2. Colossal Dimensional Singularity & Rotating Tesseract Hypercube in Sky
      const singularityGroup = new THREE.Group();
      singularityGroup.position.set(0, 3.35, -4.8);
      scene.add(singularityGroup);

      const blackHoleCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.55, 32, 32)), voidBlackMat);
      const eventHorizonRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.62, 0.08, 12, 72)),
        starlightMat
      );
      const vortexBillboardMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: vortexTex,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const vortexBillboard = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(6.8, 6.8)), vortexBillboardMat);
      vortexBillboard.position.z = -0.15;

      const armillaryA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.35, 0.055, 10, 72)), astralGoldMat);
      armillaryA.rotation.set(0.45, 0.3, 0);
      const armillaryB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.9, 0.048, 10, 72)), violetEnergyMat);
      armillaryB.rotation.set(-0.7, 0.45, 0.25);
      const armillaryC = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.45, 0.04, 10, 72)), voidArmorMat);
      armillaryC.rotation.set(1.1, -0.35, 0.45);

      // Wireframe Tesseract Hypercube Cage enclosing the Singularity
      const outerCubeGeo = trackGeo(new THREE.BoxGeometry(3.7, 3.7, 3.7));
      const outerEdges = trackGeo(new THREE.EdgesGeometry(outerCubeGeo));
      const tesseractOuter = new THREE.LineSegments(
        outerEdges,
        trackMat(new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.72 }))
      );
      const innerCubeGeo = trackGeo(new THREE.BoxGeometry(2.3, 2.3, 2.3));
      const innerEdges = trackGeo(new THREE.EdgesGeometry(innerCubeGeo));
      const tesseractInner = new THREE.LineSegments(
        innerEdges,
        trackMat(new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.85 }))
      );

      singularityGroup.add(
        blackHoleCore,
        eventHorizonRing,
        vortexBillboard,
        armillaryA,
        armillaryB,
        armillaryC,
        tesseractOuter,
        tesseractInner
      );

      // 3. Composite 3D Hero Model — DIMENSION JUDGE -> VOID ARBITER
      const judgeGroup = new THREE.Group();
      judgeGroup.position.set(0, 0, 0.15);
      scene.add(judgeGroup);

      // Greaves & Legs
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.125, 0.105, 0.84, 8));
      const kneeGeo = trackGeo(new THREE.OctahedronGeometry(0.13, 0));
      const legL = new THREE.Mesh(legGeo, voidArmorMat);
      legL.position.set(-0.22, 0.42, 0);
      const kneeL = new THREE.Mesh(kneeGeo, astralGoldMat);
      kneeL.position.set(-0.22, 0.56, 0.11);
      const legR = new THREE.Mesh(legGeo, voidArmorMat);
      legR.position.set(0.22, 0.42, 0);
      const kneeR = new THREE.Mesh(kneeGeo, astralGoldMat);
      kneeR.position.set(0.22, 0.56, 0.11);
      judgeGroup.add(legL, kneeL, legR, kneeR);

      // Pelvis & Astral Judgment Belt Crest
      const pelvis = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 8)), imperialIndigoMat);
      pelvis.position.y = 0.95;
      const beltJewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), starlightMat);
      beltJewel.position.set(0, 0.96, 0.28);
      judgeGroup.add(pelvis, beltJewel);

      // Armored Cosmic Breastplate + Dimensional Core Reactor
      const chest = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.41, 0.28, 0.84, 8)), imperialIndigoMat);
      chest.position.y = 1.48;
      const chestRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.032, 8, 24)), astralGoldMat);
      chestRing.position.set(0, 1.54, 0.35);
      const chestCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), violetEnergyMat);
      chestCore.position.set(0, 1.54, 0.37);
      judgeGroup.add(chest, chestRing, chestCore);

      // Imperial Twin-Split Dimensional Cape
      const capeShape = new THREE.Shape();
      capeShape.moveTo(-0.44, 0);
      capeShape.lineTo(0.44, 0);
      capeShape.lineTo(0.86, -1.65);
      capeShape.lineTo(0.26, -1.35);
      capeShape.lineTo(0, -1.78);
      capeShape.lineTo(-0.26, -1.35);
      capeShape.lineTo(-0.86, -1.65);
      capeShape.closePath();
      const capeMesh = new THREE.Mesh(
        trackGeo(new THREE.ExtrudeGeometry(capeShape, { depth: 0.04, bevelEnabled: false })),
        capeMat
      );
      capeMesh.position.set(0, 1.84, -0.3);
      capeMesh.rotation.x = 0.25;
      judgeGroup.add(capeMesh);

      // Spiked Cosmic Shoulder Pauldrons
      const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.23, 0));
      const spikeGeo = trackGeo(new THREE.ConeGeometry(0.075, 0.42, 6));
      const pauldronL = new THREE.Group();
      pauldronL.position.set(-0.5, 1.78, 0);
      const pMeshL = new THREE.Mesh(pauldronGeo, astralGoldMat);
      pMeshL.scale.set(1.2, 0.78, 1.05);
      const pSpikeL = new THREE.Mesh(spikeGeo, violetEnergyMat);
      pSpikeL.position.set(-0.18, 0.22, 0);
      pSpikeL.rotation.z = 0.55;
      pauldronL.add(pMeshL, pSpikeL);

      const pauldronR = new THREE.Group();
      pauldronR.position.set(0.5, 1.78, 0);
      const pMeshR = new THREE.Mesh(pauldronGeo, astralGoldMat);
      pMeshR.scale.set(1.2, 0.78, 1.05);
      const pSpikeR = new THREE.Mesh(spikeGeo, violetEnergyMat);
      pSpikeR.position.set(0.18, 0.22, 0);
      pSpikeR.rotation.z = -0.55;
      pauldronR.add(pMeshR, pSpikeR);
      judgeGroup.add(pauldronL, pauldronR);

      // Crowned Void Arbiter Helm & Glowing Starlight Visor
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 2.1, 0.04);
      const helmMesh = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.23, 0)), voidArmorMat);
      const visorMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.06, 0.16)), starlightMat);
      visorMesh.position.set(0, 0.02, 0.16);
      const crownGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.48, 5));
      const hornL = new THREE.Mesh(crownGeo, astralGoldMat);
      hornL.position.set(-0.19, 0.24, -0.02);
      hornL.rotation.set(-0.18, 0, 0.46);
      const hornR = new THREE.Mesh(crownGeo, astralGoldMat);
      hornR.position.set(0.19, 0.24, -0.02);
      hornR.rotation.set(-0.18, 0, -0.46);
      const crownCenter = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), violetEnergyMat);
      crownCenter.position.set(0, 0.29, 0.05);
      headGroup.add(helmMesh, visorMesh, hornL, hornR, crownCenter);
      judgeGroup.add(headGroup);

      // Twin Dimensional Blade-Wings (6 Articulated Crystal Greatsword-Wings) + Arbiter Halo
      const wingRoot = new THREE.Group();
      wingRoot.position.set(0, 1.64, -0.34);
      judgeGroup.add(wingRoot);

      const bladeWingShape = new THREE.Shape();
      bladeWingShape.moveTo(0, 0);
      bladeWingShape.lineTo(1.55, 0.34);
      bladeWingShape.lineTo(1.85, 0.14);
      bladeWingShape.lineTo(1.28, -0.18);
      bladeWingShape.lineTo(0, -0.12);
      bladeWingShape.closePath();
      const wingBladeGeo = trackGeo(
        new THREE.ExtrudeGeometry(bladeWingShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01 })
      );

      const leftBladeWings: THREE.Mesh[] = [];
      const rightBladeWings: THREE.Mesh[] = [];
      for (let wIdx = 0; wIdx < 3; wIdx++) {
        const wMat = wIdx === 0 ? starlightMat : violetEnergyMat;
        const rw = new THREE.Mesh(wingBladeGeo, wMat);
        rw.position.set(0.16, 0.18 - wIdx * 0.22, 0);
        rw.scale.setScalar(1.06 - wIdx * 0.16);
        rightBladeWings.push(rw);

        const lw = new THREE.Mesh(wingBladeGeo, wMat);
        lw.position.set(-0.16, 0.18 - wIdx * 0.22, 0);
        lw.scale.set(-(1.06 - wIdx * 0.16), 1.06 - wIdx * 0.16, 1);
        leftBladeWings.push(lw);

        wingRoot.add(rw, lw);
      }

      const arbiterHaloGroup = new THREE.Group();
      arbiterHaloGroup.position.set(0, 1.94, -0.44);
      arbiterHaloGroup.visible = false;
      const haloMainRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.02, 0.035, 8, 48)), astralGoldMat);
      const haloInnerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.76, 0.024, 8, 36)), violetEnergyMat);
      arbiterHaloGroup.add(haloMainRing, haloInnerRing);
      const haloPointGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.45, 4));
      for (let r = 0; r < 8; r++) {
        const a = (r * Math.PI * 2) / 8;
        const hp = new THREE.Mesh(haloPointGeo, r % 2 === 0 ? starlightMat : violetEnergyMat);
        hp.position.set(Math.cos(a) * 1.24, Math.sin(a) * 1.24, 0);
        hp.rotation.z = a - Math.PI / 2;
        arbiterHaloGroup.add(hp);
      }
      judgeGroup.add(arbiterHaloGroup);

      // Articulated Arms & Monumental Void Arbiter Cosmic Greatsword
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.075, 0.72, 8));
      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.46, 1.72, 0.06);
      const leftArmMesh = new THREE.Mesh(armGeo, imperialIndigoMat);
      leftArmMesh.position.y = -0.34;
      const leftGauntlet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 10)), astralGoldMat);
      leftGauntlet.position.y = -0.7;
      leftArmPivot.add(leftArmMesh, leftGauntlet);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.46, 1.72, 0.06);
      const rightArmMesh = new THREE.Mesh(armGeo, imperialIndigoMat);
      rightArmMesh.position.y = -0.34;
      const rightGauntlet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 10)), astralGoldMat);
      rightGauntlet.position.y = -0.7;
      rightArmPivot.add(rightArmMesh, rightGauntlet);
      judgeGroup.add(leftArmPivot, rightArmPivot);

      // Cosmic Greatsword ("Void Arbiter Judgement Edge")
      const greatswordGroup = new THREE.Group();
      greatswordGroup.position.set(0.55, 1.15, 0.35);
      greatswordGroup.visible = false;
      judgeGroup.add(greatswordGroup);

      const hilt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.04, 0.85, 8)), voidArmorMat);
      hilt.position.y = -0.35;
      const pommel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.13, 0)), astralGoldMat);
      pommel.position.y = -0.82;
      const crossGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.12, 0.14)), astralGoldMat);
      crossGuard.position.y = 0.08;
      const guardCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), violetEnergyMat);
      guardCore.position.set(0, 0.1, 0.08);

      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.16, 0);
      bladeShape.lineTo(0.16, 0);
      bladeShape.lineTo(0.21, 1.85);
      bladeShape.lineTo(0, 2.55);
      bladeShape.lineTo(-0.21, 1.85);
      bladeShape.closePath();
      const greatswordBlade = new THREE.Mesh(
        trackGeo(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015 })),
        starlightMat
      );
      greatswordBlade.position.set(0, 0.12, -0.025);
      const bladeRunicCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 1.75, 0.09)), violetEnergyMat);
      bladeRunicCore.position.y = 1.05;

      greatswordGroup.add(hilt, pommel, crossGuard, guardCore, greatswordBlade, bladeRunicCore);

      // 4. Phase III Climax: Colossal 3D Dimension X-Slash, Reality Pillar & Shockwaves
      const xSlashGroup = new THREE.Group();
      xSlashGroup.position.set(0, 1.65, 1.15);
      xSlashGroup.visible = false;
      scene.add(xSlashGroup);

      const slashCrescentGeo = trackGeo(new THREE.TorusGeometry(2.6, 0.085, 10, 48, Math.PI * 1.15));
      const slashBeamGeo = trackGeo(new THREE.BoxGeometry(0.14, 6.4, 0.18));
      const slashMatA = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      const slashMatB = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xc084fc,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );

      const xBladeA = new THREE.Mesh(slashBeamGeo, slashMatA);
      xBladeA.rotation.z = Math.PI / 4;
      const xBladeB = new THREE.Mesh(slashBeamGeo, slashMatB);
      xBladeB.rotation.z = -Math.PI / 4;
      const xArcA = new THREE.Mesh(slashCrescentGeo, slashMatA);
      xArcA.rotation.z = Math.PI / 4;
      const xArcB = new THREE.Mesh(slashCrescentGeo, slashMatB);
      xArcB.rotation.z = -Math.PI / 4;
      const xCenterOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.55, 20, 20)), starlightMat);
      xSlashGroup.add(xBladeA, xBladeB, xArcA, xArcB, xCenterOrb);

      const pillarMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const realityPillar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.95, 1.65, 17, 28, 1, true)),
        pillarMat
      );
      realityPillar.position.set(0, 8.5, 0.4);
      realityPillar.visible = false;
      scene.add(realityPillar);

      const shockwaveViolet = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.085, 10, 64)),
        violetEnergyMat
      );
      shockwaveViolet.rotation.x = Math.PI / 2;
      shockwaveViolet.position.set(0, 0.18, 0.4);
      shockwaveViolet.visible = false;
      scene.add(shockwaveViolet);

      const shockwaveGold = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.055, 10, 64)),
        starlightMat
      );
      shockwaveGold.rotation.x = Math.PI / 2;
      shockwaveGold.position.set(0, 0.28, 0.4);
      shockwaveGold.visible = false;
      scene.add(shockwaveGold);

      // 130 Instanced Dimensional Crystal Shards (Implosion -> Radial Reality Shatter)
      const shardCount = 130;
      const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
      const shardMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x818cf8,
          emissiveIntensity: 2.0,
          roughness: 0.14,
          metalness: 0.35
        })
      );
      const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
      shardInstanced.frustumCulled = false;
      scene.add(shardInstanced);

      const shardDirs: THREE.Vector3[] = [];
      const shardSpeeds: number[] = [];
      const shardAngles: number[] = [];
      for (let i = 0; i < shardCount; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / shardCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        shardDirs.push(
          new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.abs(Math.cos(phi)) * 0.72 + 0.08,
            Math.sin(phi) * Math.sin(theta)
          ).normalize()
        );
        shardSpeeds.push(5.6 + (i % 7) * 1.15);
        shardAngles.push((i * Math.PI * 2) / shardCount);
        _tmpColor.setHex(i % 4 === 0 ? 0xfbbf24 : i % 2 === 0 ? 0xc084fc : 0x818cf8);
        shardInstanced.setColorAt(i, _tmpColor);
      }
      if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;

      // Floating Cosmic Starlight Dust
      const dustCount = 200;
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 9.0;
        dustPos[i * 3] = Math.cos(a) * r;
        dustPos[i * 3 + 1] = 0.25 + Math.random() * 6.2;
        dustPos[i * 3 + 2] = Math.sin(a) * r;
      }
      const dustGeo = trackGeo(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = trackMat(
        new THREE.PointsMaterial({
          color: 0xa5b4fc,
          size: 0.08,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        })
      );
      const dustPoints = new THREE.Points(dustGeo, dustMat);
      scene.add(dustPoints);

      const handleResize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = Math.max(1, window.innerHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener('resize', handleResize);

      let raf = 0;
      let timerId: ReturnType<typeof setTimeout> | null = null;
      let disposed = false;
      let lastFrameTime = performance.now();
      let lastPhase: CutscenePhase = 'singularity';
      let lastUiPct = -1;

      const afterDraw = (nextTick: FrameRequestCallback) => {
        if (disposed) return;
        if (isSoftwareGl) {
          renderer?.getContext().finish();
          timerId = setTimeout(() => {
            if (!disposed) raf = requestAnimationFrame(nextTick);
          }, 34);
        } else {
          raf = requestAnimationFrame(nextTick);
        }
      };

      const tick = (now: number) => {
        if (disposed || !renderer) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
        lastFrameTime = now;

        const elapsedSinceSync = (now - lastSyncTimeRef.current) / 1000;
        const estRemaining = Math.max(0, remainingRef.current - elapsedSinceSync);
        const p = Math.max(0, Math.min(1, 1 - estRemaining / Math.max(0.1, totalDuration)));

        const pct = Math.round(p * 100);
        if (pct !== lastUiPct) {
          lastUiPct = pct;
          setUiProgress(pct);
        }

        const nextPhase: CutscenePhase =
          p < 0.33 ? 'singularity' : p < 0.66 ? 'arbiter' : 'severance';
        if (nextPhase !== lastPhase) {
          lastPhase = nextPhase;
          setPhase(nextPhase);
        }

        // Cosmic Singularity & Tesseract Orbital Spin
        const spinBoost = p < 0.33 ? 1.1 : p < 0.66 ? 2.4 : 4.0;
        armillaryA.rotation.x += dt * 0.9 * spinBoost;
        armillaryA.rotation.y += dt * 1.15 * spinBoost;
        armillaryB.rotation.y -= dt * 1.3 * spinBoost;
        armillaryB.rotation.z += dt * 0.75 * spinBoost;
        armillaryC.rotation.x -= dt * 0.7 * spinBoost;
        armillaryC.rotation.z -= dt * 0.9 * spinBoost;
        tesseractOuter.rotation.x += dt * 0.55 * spinBoost;
        tesseractOuter.rotation.y += dt * 0.85 * spinBoost;
        tesseractInner.rotation.y -= dt * 1.2 * spinBoost;
        tesseractInner.rotation.z += dt * 0.7 * spinBoost;
        vortexBillboard.rotation.z += dt * 0.45 * spinBoost;
        dustPoints.rotation.y += dt * 0.4 * spinBoost;

        for (let i = 0; i < monolithGroups.length; i++) {
          const mg = monolithGroups[i];
          mg.group.position.y = mg.baseY + Math.sin(now * 0.002 + i * 1.2) * 0.18;
          mg.cap.rotation.y += dt * 2.4;
          mg.cap.position.y = 2.05 + Math.sin(now * 0.004 + i) * 0.12;
        }
        for (let i = 0; i < portals.length; i++) {
          portals[i].rotation.z += dt * 1.8 * spinBoost;
        }

        if (p < 0.33) {
          // PHASE I: Spatial Singularity Pull & Resonance Compression
          const ep = p / 0.33;
          const ease = 1 - Math.pow(1 - ep, 3);

          singularityGroup.scale.setScalar(0.92 + ease * 0.14);
          vortexBillboardMat.opacity = 0.78 + Math.sin(ep * Math.PI * 4) * 0.14;
          sealMat.opacity = 0.72 + ease * 0.22;

          judgeGroup.position.set(0, ease * 0.25, 0.15);
          rightArmPivot.rotation.set(-0.55 - ease * 0.45, 0, -0.35);
          leftArmPivot.rotation.set(-0.55 - ease * 0.45, 0, 0.35);
          greatswordGroup.visible = false;
          arbiterHaloGroup.visible = false;
          xSlashGroup.visible = false;
          realityPillar.visible = false;
          shockwaveViolet.visible = false;
          shockwaveGold.visible = false;

          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const foldAngle = 1.0 - ease * 0.2 + wIdx * 0.18;
            rightBladeWings[wIdx].rotation.set(0.32, -0.68, -foldAngle);
            leftBladeWings[wIdx].rotation.set(0.32, 0.68, foldAngle);
          }

          for (let i = 0; i < portalTethers.length; i++) {
            portalTethers[i].visible = false;
          }

          // Dimensional Shards spiraling inward into Judge
          for (let i = 0; i < shardCount; i++) {
            const loopT = (ep * 1.9 + i / shardCount) % 1;
            const ang = shardAngles[i] + ep * Math.PI * 2.8;
            const rad = 6.4 * (1 - loopT) + 0.35;
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.35 + (1 - loopT) * (1.2 + (i % 5) * 0.55) + loopT * 1.65,
              0.15 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(loopT * 6, ang, i);
            _dummy.scale.setScalar(0.55 + loopT * 0.5);
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          coreLight.intensity = 12 + ease * 18;
          singularityBackLight.intensity = 24 + ease * 18;
          goldSlashLight.intensity = 8;
        } else if (p < 0.66) {
          // PHASE II: Twin Blade-Wings Unfurl + Cosmic Greatsword Drawn Overhead
          const ip = (p - 0.33) / 0.33;
          const ascendEase = 1 - Math.pow(1 - Math.min(1, ip * 1.25), 3);

          judgeGroup.position.set(0, 0.25 + ascendEase * 0.85, 0.15);
          capeMesh.rotation.x = 0.36 + Math.sin(ip * Math.PI * 6) * 0.1;

          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const spread = 0.28 - wIdx * 0.34 + Math.sin(ip * Math.PI * 5 + wIdx) * 0.06;
            const openY = 0.22 * (1 - ascendEase);
            rightBladeWings[wIdx].rotation.set(-0.08, -openY, spread);
            leftBladeWings[wIdx].rotation.set(-0.08, openY, -spread);
          }

          arbiterHaloGroup.visible = true;
          arbiterHaloGroup.scale.setScalar(0.45 + ascendEase * 0.72);
          arbiterHaloGroup.rotation.z = ip * Math.PI * 2.5;

          const hoist = Math.min(1, ip * 1.3);
          rightArmPivot.rotation.set(-2.3 * hoist, 0, -0.35);
          leftArmPivot.rotation.set(-2.2 * hoist, 0.25, 0.35);

          greatswordGroup.visible = true;
          greatswordGroup.position.set(0.08, 2.15 + hoist * 0.3, 0.42);
          greatswordGroup.rotation.set(0.22 - ip * 0.32, 0, 0.05);
          greatswordGroup.scale.setScalar(0.65 + ascendEase * 0.45);

          // 6 Spatial Portals channel energy beams into the raised Greatsword
          const targetPt = _lookTarget.set(0.08, 2.8 + ascendEase * 0.85, 0.55);
          for (let i = 0; i < portals.length; i++) {
            const tether = portalTethers[i];
            tether.visible = true;
            const pPos = portals[i].position;
            const dist = pPos.distanceTo(targetPt);
            tether.position.copy(pPos).lerp(targetPt, 0.5);
            tether.scale.set(1, dist, 1);
            tether.lookAt(targetPt);
            tether.rotateX(Math.PI / 2);
          }

          for (let i = 0; i < shardCount; i++) {
            const loopT = (ip * 2.6 + i / shardCount) % 1;
            const ang = shardAngles[i] - ip * Math.PI * 4.5;
            const rad = 4.6 * (1 - loopT);
            _dummy.position.set(
              Math.cos(ang) * rad,
              1.6 + ascendEase * 0.85 + Math.sin(loopT * Math.PI) * 1.0,
              0.3 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(ip * 8 + i, ang, i);
            _dummy.scale.setScalar(0.75 * (1 - loopT * 0.4));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          xSlashGroup.visible = false;
          realityPillar.visible = false;
          shockwaveViolet.visible = false;
          shockwaveGold.visible = false;

          coreLight.intensity = 24 + ip * 32;
          singularityBackLight.intensity = 38 + ip * 28;
          goldSlashLight.intensity = 14 + ip * 22;
        } else {
          // PHASE III: Dimension X-Slash Reality Severance
          const sp = (p - 0.66) / 0.34;
          const slamT = Math.min(1, sp / 0.16);
          const blastT = Math.min(1, sp / 0.58);
          const blastEase = 1 - Math.pow(1 - blastT, 3);

          judgeGroup.position.set(0, (1 - slamT) * 1.1, 0.15 + slamT * 0.35);
          rightArmPivot.rotation.set(-2.3 + slamT * 1.75, 0, -0.2);
          leftArmPivot.rotation.set(-2.2 + slamT * 1.35, 0.25, 0.2);
          greatswordGroup.visible = true;
          greatswordGroup.position.set(0.25, 2.4 - slamT * 1.25, 0.62);
          greatswordGroup.rotation.set(0.15 + slamT * 2.25, 0, -0.28);
          greatswordGroup.scale.setScalar(1.12);

          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const spread = 0.3 - wIdx * 0.32;
            rightBladeWings[wIdx].rotation.set(-0.14, 0, spread);
            leftBladeWings[wIdx].rotation.set(-0.14, 0, -spread);
          }
          arbiterHaloGroup.visible = true;
          arbiterHaloGroup.scale.setScalar(1.24);
          arbiterHaloGroup.rotation.z += dt * 4.8;

          for (let i = 0; i < portalTethers.length; i++) {
            portalTethers[i].visible = false;
          }

          // Colossal 3D Dimension X-Slash
          xSlashGroup.visible = true;
          const xScale = 0.65 + Math.min(1.4, sp * 2.6);
          xSlashGroup.scale.setScalar(xScale);
          const xOpacity = sp < 0.2 ? 0.96 : Math.max(0, 0.96 - (sp - 0.2) * 1.05);
          slashMatA.opacity = xOpacity;
          slashMatB.opacity = xOpacity * 0.9;
          xCenterOrb.scale.setScalar(sp < 0.25 ? 0.6 + sp * 4.5 : Math.max(0.05, 1.72 - (sp - 0.25) * 2.0));

          realityPillar.visible = true;
          const pillarScale = sp < 0.22 ? 0.5 + (sp / 0.22) * 1.45 : Math.max(0.2, 1.95 - (sp - 0.22) * 1.6);
          realityPillar.scale.set(pillarScale, 1, pillarScale);
          pillarMat.opacity = sp < 0.22 ? 0.78 : Math.max(0, 0.78 - (sp - 0.22) * 0.9);

          shockwaveViolet.visible = true;
          shockwaveGold.visible = true;
          shockwaveViolet.scale.setScalar(0.8 + blastEase * 12.8);
          shockwaveGold.scale.setScalar(0.5 + blastEase * 9.5);

          for (let i = 0; i < shardCount; i++) {
            const dist = blastEase * shardSpeeds[i] * 1.48;
            _dummy.position.set(
              shardDirs[i].x * dist,
              Math.max(0.18, 1.45 + shardDirs[i].y * dist * 0.95),
              0.4 + shardDirs[i].z * dist
            );
            _dummy.rotation.set(blastEase * 12 + i, blastEase * 9, i * 0.5);
            _dummy.scale.setScalar(Math.max(0.35, 1.25 - sp * 0.7));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          scene.background = _tmpColor.setHex(sp < 0.12 ? 0x2e1065 : 0x040210);
          singularityGroup.scale.setScalar(1.12 + Math.sin(sp * Math.PI) * 0.28);

          coreLight.intensity = Math.max(18, 64 * (1 - sp * 0.6));
          singularityBackLight.intensity = Math.max(24, 62 * (1 - sp * 0.45));
          goldSlashLight.intensity = Math.max(14, 58 * (1 - sp * 0.55));
        }

        // Dynamic 3D Camera Choreography
        if (p < 0.33) {
          const ep = p / 0.33;
          _camTarget.set(2.1 - ep * 0.9, 1.0 + ep * 0.45, 5.4 - ep * 0.7);
          _lookTarget.set(0, 1.75 + ep * 0.45, -0.35);
        } else if (p < 0.66) {
          const ip = (p - 0.33) / 0.33;
          const camAng = 0.24 - ip * 1.2;
          const camDist = 4.8 + ip * 1.5;
          _camTarget.set(Math.sin(camAng) * camDist, 1.95 + ip * 1.25, Math.cos(camAng) * camDist);
          _lookTarget.set(0, 1.95 + ip * 0.55, -0.2);
        } else {
          const sp = (p - 0.66) / 0.34;
          const shakeMag = sp < 0.34 ? (1 - sp / 0.34) * 0.46 : 0;
          const shakeX = Math.sin(now * 0.11) * shakeMag;
          const shakeY = Math.cos(now * 0.14) * shakeMag;
          const camAng = -0.96 + sp * 1.28;
          const camDist = 6.3 + Math.min(1, sp * 1.35) * 3.1;
          _camTarget.set(
            Math.sin(camAng) * camDist + shakeX,
            2.95 + sp * 1.05 + shakeY,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(0, 1.7, -0.3);
        }

        const dampFactor = 1 - Math.exp(-8.0 * dt);
        camera.position.lerp(_camTarget, dampFactor);
        _currentLook.lerp(_lookTarget, dampFactor);
        camera.lookAt(_currentLook);

        renderer.render(scene, camera);
        afterDraw(tick);
      };

      raf = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        if (timerId !== null) clearTimeout(timerId);
        window.removeEventListener('resize', handleResize);
        for (const item of disposables) {
          item.dispose();
        }
        renderer?.dispose();
      };
    } catch {
      onFallbackRef.current?.();
      return undefined;
    }
  }, [totalDuration]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#03020d] overflow-hidden select-none"
      role="dialog"
      aria-label="Cutscene 3D Void Arbiter Ascension"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Cinematic Letterbox Bar (solid dark fill, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#060418]/92 border-b border-indigo-400/45 px-5 py-3.5 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-game tracking-[0.24em] uppercase text-indigo-300 truncate">
            DIMENSION JUDG · SINGULARITAS &amp; DIMENSION X-SLASH 3D
          </p>
          <h2 className="font-title text-base sm:text-2xl font-black tracking-wider text-amber-300 truncate">
            VOID ARBITER ASCENSION
          </h2>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <span className="inline-block px-2.5 py-1 rounded border border-indigo-400/45 bg-indigo-950/80 text-[11px] font-game tracking-wider text-amber-200">
            {phase === 'singularity'
              ? 'FASE I · SINGULARITAS RUANG'
              : phase === 'arbiter'
                ? 'FASE II · VOID ARBITER'
                : 'FASE III · DIMENSION X-SLASH'}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-[#060418]/92 border-t border-indigo-400/45 px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <p className="pointer-events-none text-[11px] sm:text-xs font-game tracking-wider text-indigo-200/90 truncate">
          {PHASE_LABELS[phase]}
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-400/60 hover:border-amber-300 text-indigo-50 font-game font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>Lewati Cutscene</span>
          <FastForward className="w-4 h-4 text-amber-300" />
        </button>

        {/* Bottom Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-400 to-amber-300 transition-[width] duration-75"
            style={{ width: `${uiProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
