import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FastForward } from 'lucide-react';

interface SolarisSupernova3DCutsceneProps {
  remainingTime: number;
  totalDuration?: number;
  onSkip: () => void;
  onWebGLUnavailable?: () => void;
}

type CutscenePhase = 'eclipse' | 'incarnation' | 'supernova';

const PHASE_LABELS: Record<CutscenePhase, string> = {
  eclipse: 'FASE I · GERHANA MATAHARI & TARIKAN GRAVITASI INTI BINTANG',
  incarnation: 'FASE II · SAYAP NAGA SURYA TERKIBAR — INKARNASI AVATAR MATAHARI',
  supernova: 'FASE III · HANTAMAN TOMBAK MATAHARI — LEDAKAN SUPERNOVA!'
};

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.5, 0);
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export const SolarisSupernova3DCutscene: React.FC<SolarisSupernova3DCutsceneProps> = ({
  remainingTime,
  totalDuration = 3.2,
  onSkip,
  onWebGLUnavailable
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remainingRef = useRef<number>(remainingTime);
  const lastSyncTimeRef = useRef<number>(performance.now());
  const onSkipRef = useRef(onSkip);
  const onFallbackRef = useRef(onWebGLUnavailable);

  const [phase, setPhase] = useState<CutscenePhase>('eclipse');
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
      scene.background = new THREE.Color(0x090202);
      scene.fog = new THREE.FogExp2(0x160402, 0.032);

      const camera = new THREE.PerspectiveCamera(
        48,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        110
      );
      camera.position.set(1.8, 0.9, 5.4);
      _currentLook.set(0, 1.55, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      disposables.push(envRT, roomEnv, pmrem);

      // Dramatic Solar Eclipse Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0xfb923c, 0x1a0504, 0.88);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfef08a, 2.35);
      keyLight.position.set(4.5, 8.2, 5.5);
      scene.add(keyLight);

      const backEclipseRim = new THREE.PointLight(0xf97316, 26, 36, 1.35);
      backEclipseRim.position.set(0, 3.2, -3.5);
      scene.add(backEclipseRim);

      const coreLight = new THREE.PointLight(0xfacc15, 10, 22, 1.4);
      coreLight.position.set(0, 1.6, 1.0);
      scene.add(coreLight);

      const magmaUnderLight = new THREE.PointLight(0xea580c, 12, 16, 1.5);
      magmaUnderLight.position.set(0, 0.3, 0.6);
      scene.add(magmaUnderLight);

      // Procedural Texture 1: Volcanic Magma Fissure Floor (cracked lava veins, distinct from rune circles)
      const magmaCanvas = document.createElement('canvas');
      magmaCanvas.width = 512;
      magmaCanvas.height = 512;
      const mctx = magmaCanvas.getContext('2d');
      if (mctx) {
        mctx.fillStyle = '#0c0504';
        mctx.fillRect(0, 0, 512, 512);

        const pitGrad = mctx.createRadialGradient(256, 256, 10, 256, 256, 245);
        pitGrad.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
        pitGrad.addColorStop(0.18, 'rgba(249, 115, 22, 0.72)');
        pitGrad.addColorStop(0.5, 'rgba(154, 52, 18, 0.35)');
        pitGrad.addColorStop(1, 'rgba(12, 5, 4, 0)');
        mctx.fillStyle = pitGrad;
        mctx.fillRect(0, 0, 512, 512);

        // Jagged Radial Lava Cracks
        for (let i = 0; i < 18; i++) {
          const baseAng = (i * Math.PI * 2) / 18 + (i % 3) * 0.08;
          mctx.strokeStyle = i % 2 === 0 ? '#fb923c' : '#fde047';
          mctx.lineWidth = i % 3 === 0 ? 4.2 : 2.4;
          mctx.beginPath();
          let cx = 256;
          let cy = 256;
          mctx.moveTo(cx, cy);
          for (let seg = 1; seg <= 6; seg++) {
            const r = seg * 38;
            const jitter = Math.sin(i * 7.3 + seg * 2.9) * 0.16;
            cx = 256 + Math.cos(baseAng + jitter) * r;
            cy = 256 + Math.sin(baseAng + jitter) * r;
            mctx.lineTo(cx, cy);
          }
          mctx.stroke();
        }
      }
      const magmaTex = new THREE.CanvasTexture(magmaCanvas);
      magmaTex.colorSpace = THREE.SRGBColorSpace;
      magmaTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(magmaTex);

      // Procedural Texture 2: Solar Eclipse Corona & Prominence Flare Billboard
      const coronaCanvas = document.createElement('canvas');
      coronaCanvas.width = 512;
      coronaCanvas.height = 512;
      const cctx = coronaCanvas.getContext('2d');
      if (cctx) {
        cctx.clearRect(0, 0, 512, 512);
        const cg = cctx.createRadialGradient(256, 256, 70, 256, 256, 252);
        cg.addColorStop(0, 'rgba(0, 0, 0, 0)');
        cg.addColorStop(0.32, 'rgba(254, 240, 138, 0.96)');
        cg.addColorStop(0.46, 'rgba(249, 115, 22, 0.78)');
        cg.addColorStop(0.72, 'rgba(220, 38, 38, 0.28)');
        cg.addColorStop(1, 'rgba(9, 2, 2, 0)');
        cctx.fillStyle = cg;
        cctx.fillRect(0, 0, 512, 512);

        // Solar flare streamer spikes
        for (let i = 0; i < 36; i++) {
          const a = (i * Math.PI * 2) / 36;
          const len = 135 + ((i * 37) % 95);
          cctx.strokeStyle = i % 3 === 0 ? 'rgba(254, 249, 195, 0.8)' : 'rgba(251, 146, 60, 0.55)';
          cctx.lineWidth = i % 2 === 0 ? 4.5 : 2.2;
          cctx.beginPath();
          cctx.moveTo(256 + Math.cos(a) * 84, 256 + Math.sin(a) * 84);
          cctx.lineTo(256 + Math.cos(a + 0.04) * len, 256 + Math.sin(a + 0.04) * len);
          cctx.stroke();
        }
      }
      const coronaTex = new THREE.CanvasTexture(coronaCanvas);
      coronaTex.colorSpace = THREE.SRGBColorSpace;
      coronaTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(coronaTex);

      // Shared PBR Materials
      const basaltMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x160c0a,
          roughness: 0.78,
          metalness: 0.28
        })
      );
      const obsidianMetalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e0b09,
          roughness: 0.34,
          metalness: 0.74
        })
      );
      const crimsonArmorMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          emissive: 0x450a0a,
          emissiveIntensity: 0.45,
          roughness: 0.26,
          metalness: 0.78
        })
      );
      const solarGoldMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0x9a3412,
          emissiveIntensity: 0.36,
          roughness: 0.18,
          metalness: 0.92
        })
      );
      const capeMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x7c1d10,
          emissive: 0x431407,
          emissiveIntensity: 0.38,
          roughness: 0.68,
          metalness: 0.15,
          side: THREE.DoubleSide
        })
      );
      const plasmaOrangeMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfb923c,
          emissive: 0xf97316,
          emissiveIntensity: 2.2,
          roughness: 0.15,
          metalness: 0.12
        })
      );
      const whiteSunMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: 0xfacc15,
          emissiveIntensity: 2.6,
          roughness: 0.1,
          metalness: 0.08
        })
      );
      const eclipseVoidMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x030102,
          roughness: 0.95,
          metalness: 0.05
        })
      );

      // 1. Fractured Volcanic Crater Ground + Basalt Spires
      const craterFloor = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(28, 48)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x090303,
            roughness: 0.92,
            metalness: 0.15
          })
        )
      );
      craterFloor.rotation.x = -Math.PI / 2;
      craterFloor.position.y = -0.18;
      scene.add(craterFloor);

      const magmaPitMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: magmaTex,
          transparent: true,
          opacity: 0.72,
          depthWrite: false
        })
      );
      const magmaPit = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(4.6, 48)), magmaPitMat);
      magmaPit.rotation.x = -Math.PI / 2;
      magmaPit.position.y = 0.01;
      scene.add(magmaPit);

      // Jagged Basalt Rock Spires leaning around outer rim
      const spireGeo = trackGeo(new THREE.ConeGeometry(0.48, 2.4, 5));
      const spireVeinGeo = trackGeo(new THREE.OctahedronGeometry(0.18, 0));
      const spireGlows: THREE.Mesh[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8 + 0.24;
        const rad = 5.4 + (i % 2) * 0.7;
        const sGroup = new THREE.Group();
        sGroup.position.set(Math.cos(a) * rad, 0.75, Math.sin(a) * rad);
        sGroup.lookAt(0, 1.4, 0);
        sGroup.rotateX(0.32);
        const rock = new THREE.Mesh(spireGeo, basaltMat);
        rock.scale.set(1, 0.8 + (i % 3) * 0.25, 0.85);
        const ember = new THREE.Mesh(spireVeinGeo, i % 2 === 0 ? plasmaOrangeMat : whiteSunMat);
        ember.position.y = 1.25;
        spireGlows.push(ember);
        sGroup.add(rock, ember);
        scene.add(sGroup);
      }

      // 2. Colossal Eclipsing Star + 3 Armillary Gyroscope Rings towering in the cosmic sky
      const eclipseStarGroup = new THREE.Group();
      eclipseStarGroup.position.set(0, 3.25, -4.8);
      scene.add(eclipseStarGroup);

      const eclipseMoon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.75, 32, 32)), eclipseVoidMat);
      const eclipseCoronaRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.82, 0.09, 14, 72)),
        whiteSunMat
      );
      const coronaBillboardMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: coronaTex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const coronaBillboard = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(6.8, 6.8)), coronaBillboardMat);
      coronaBillboard.position.z = -0.15;

      const gyroRingA = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(2.55, 0.06, 10, 72)),
        solarGoldMat
      );
      gyroRingA.rotation.set(0.45, 0.3, 0);

      const gyroRingB = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(3.05, 0.052, 10, 72)),
        plasmaOrangeMat
      );
      gyroRingB.rotation.set(-0.65, 0.5, 0.2);

      const gyroRingC = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(3.58, 0.042, 10, 72)),
        obsidianMetalMat
      );
      gyroRingC.rotation.set(1.15, -0.35, 0.4);

      eclipseStarGroup.add(
        eclipseMoon,
        eclipseCoronaRing,
        coronaBillboard,
        gyroRingA,
        gyroRingB,
        gyroRingC
      );

      // 3. Composite 3D Solaris Ignis — Pyre Dragoon
      const solarisGroup = new THREE.Group();
      solarisGroup.position.set(0, 0, 0.15);
      scene.add(solarisGroup);

      // Armored Greaves & Legs
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.11, 0.82, 8));
      const kneeGeo = trackGeo(new THREE.OctahedronGeometry(0.14, 0));
      const legL = new THREE.Mesh(legGeo, obsidianMetalMat);
      legL.position.set(-0.22, 0.41, 0);
      const kneeL = new THREE.Mesh(kneeGeo, solarGoldMat);
      kneeL.position.set(-0.22, 0.56, 0.11);
      const legR = new THREE.Mesh(legGeo, obsidianMetalMat);
      legR.position.set(0.22, 0.41, 0);
      const kneeR = new THREE.Mesh(kneeGeo, solarGoldMat);
      kneeR.position.set(0.22, 0.56, 0.11);
      solarisGroup.add(legL, kneeL, legR, kneeR);

      // Pelvis & Gold Belt Crest
      const pelvis = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 8)),
        crimsonArmorMat
      );
      pelvis.position.y = 0.94;
      const beltCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), whiteSunMat);
      beltCore.position.set(0, 0.95, 0.28);
      solarisGroup.add(pelvis, beltCore);

      // Draconic Breastplate + Blazing Solar Core Sternum
      const chest = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.4, 0.28, 0.82, 8)),
        crimsonArmorMat
      );
      chest.position.y = 1.46;
      const chestTrim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.22, 0.035, 8, 24)),
        solarGoldMat
      );
      chestTrim.position.set(0, 1.52, 0.34);
      const chestReactor = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 16, 16)), whiteSunMat);
      chestReactor.position.set(0, 1.52, 0.35);
      solarisGroup.add(chest, chestTrim, chestReactor);

      // Tattered Dragon War Cape
      const capeShape = new THREE.Shape();
      capeShape.moveTo(-0.46, 0);
      capeShape.lineTo(0.46, 0);
      capeShape.lineTo(0.84, -1.58);
      capeShape.lineTo(0.34, -1.32);
      capeShape.lineTo(0, -1.72);
      capeShape.lineTo(-0.34, -1.32);
      capeShape.lineTo(-0.84, -1.58);
      capeShape.closePath();
      const capeMesh = new THREE.Mesh(
        trackGeo(new THREE.ExtrudeGeometry(capeShape, { depth: 0.04, bevelEnabled: false })),
        capeMat
      );
      capeMesh.position.set(0, 1.82, -0.3);
      capeMesh.rotation.x = 0.26;
      solarisGroup.add(capeMesh);

      // Dragon-Scale Spiked Shoulder Pauldrons
      const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.24, 0));
      const spikeGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.42, 6));
      const pauldronL = new THREE.Group();
      pauldronL.position.set(-0.5, 1.76, 0);
      const pMeshL = new THREE.Mesh(pauldronGeo, solarGoldMat);
      pMeshL.scale.set(1.2, 0.8, 1.05);
      const pSpikeL = new THREE.Mesh(spikeGeo, plasmaOrangeMat);
      pSpikeL.position.set(-0.18, 0.22, 0);
      pSpikeL.rotation.z = 0.55;
      pauldronL.add(pMeshL, pSpikeL);

      const pauldronR = new THREE.Group();
      pauldronR.position.set(0.5, 1.76, 0);
      const pMeshR = new THREE.Mesh(pauldronGeo, solarGoldMat);
      pMeshR.scale.set(1.2, 0.8, 1.05);
      const pSpikeR = new THREE.Mesh(spikeGeo, plasmaOrangeMat);
      pSpikeR.position.set(0.18, 0.22, 0);
      pSpikeR.rotation.z = -0.55;
      pauldronR.add(pMeshR, pSpikeR);
      solarisGroup.add(pauldronL, pauldronR);

      // Dragon-Horned Solar Helm & Glowing Visor
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 2.08, 0.04);
      const helmMesh = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.23, 0)),
        obsidianMetalMat
      );
      const visorMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 0.065, 0.16)),
        whiteSunMat
      );
      visorMesh.position.set(0, 0.02, 0.16);
      const hornGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.48, 6));
      const hornL = new THREE.Mesh(hornGeo, solarGoldMat);
      hornL.position.set(-0.2, 0.22, -0.02);
      hornL.rotation.set(-0.2, 0, 0.52);
      const hornR = new THREE.Mesh(hornGeo, solarGoldMat);
      hornR.position.set(0.2, 0.22, -0.02);
      hornR.rotation.set(-0.2, 0, -0.52);
      const crestPlume = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.08, 0.42, 6)),
        plasmaOrangeMat
      );
      crestPlume.position.set(0, 0.28, -0.08);
      crestPlume.rotation.x = -0.4;
      headGroup.add(helmMesh, visorMesh, hornL, hornR, crestPlume);
      solarisGroup.add(headGroup);

      // 6 Unfurling Solar Dragon Flame Wings + 8-Point Solar Halo mounted on Solaris's Back
      const wingRoot = new THREE.Group();
      wingRoot.position.set(0, 1.62, -0.34);
      solarisGroup.add(wingRoot);

      const flameShape = new THREE.Shape();
      flameShape.moveTo(0, 0);
      flameShape.quadraticCurveTo(0.75, 0.48, 1.55, 0.24);
      flameShape.quadraticCurveTo(0.95, -0.08, 1.25, -0.32);
      flameShape.quadraticCurveTo(0.55, -0.22, 0, -0.14);
      flameShape.closePath();
      const wingBladeGeo = trackGeo(
        new THREE.ExtrudeGeometry(flameShape, { depth: 0.03, bevelEnabled: false })
      );

      const leftWings: THREE.Mesh[] = [];
      const rightWings: THREE.Mesh[] = [];
      for (let wIdx = 0; wIdx < 3; wIdx++) {
        const wMat = wIdx === 0 ? whiteSunMat : plasmaOrangeMat;
        const rWing = new THREE.Mesh(wingBladeGeo, wMat);
        rWing.position.set(0.14, 0.14 - wIdx * 0.2, 0);
        rWing.scale.setScalar(1.08 - wIdx * 0.16);
        rightWings.push(rWing);

        const lWing = new THREE.Mesh(wingBladeGeo, wMat);
        lWing.position.set(-0.14, 0.14 - wIdx * 0.2, 0);
        lWing.scale.set(-(1.08 - wIdx * 0.16), 1.08 - wIdx * 0.16, 1);
        leftWings.push(lWing);

        wingRoot.add(rWing, lWing);
      }

      // 8-Point Solar Avatar Halo
      const solarHaloGroup = new THREE.Group();
      solarHaloGroup.position.set(0, 1.88, -0.42);
      solarHaloGroup.visible = false;
      const haloRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.95, 0.036, 8, 48)),
        solarGoldMat
      );
      solarHaloGroup.add(haloRing);
      const haloRayGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.48, 5));
      for (let r = 0; r < 8; r++) {
        const a = (r * Math.PI * 2) / 8;
        const ray = new THREE.Mesh(haloRayGeo, r % 2 === 0 ? whiteSunMat : plasmaOrangeMat);
        ray.position.set(Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0);
        ray.rotation.z = a - Math.PI / 2;
        solarHaloGroup.add(ray);
      }
      solarisGroup.add(solarHaloGroup);

      // Articulated Arms & Monumental Sunfire Lance (Tombak Matahari)
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.075, 0.72, 8));
      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.46, 1.7, 0.06);
      const leftArmMesh = new THREE.Mesh(armGeo, crimsonArmorMat);
      leftArmMesh.position.y = -0.34;
      const leftGauntlet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 10)), solarGoldMat);
      leftGauntlet.position.y = -0.7;
      leftArmPivot.add(leftArmMesh, leftGauntlet);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.46, 1.7, 0.06);
      const rightArmMesh = new THREE.Mesh(armGeo, crimsonArmorMat);
      rightArmMesh.position.y = -0.34;
      const rightGauntlet = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 10)), solarGoldMat);
      rightGauntlet.position.y = -0.7;
      rightArmPivot.add(rightArmMesh, rightGauntlet);
      solarisGroup.add(leftArmPivot, rightArmPivot);

      // Sunfire Lance Group (pivoted at Solaris's grip)
      const lanceGroup = new THREE.Group();
      lanceGroup.position.set(0.55, 1.12, 0.32);
      solarisGroup.add(lanceGroup);

      const shaft = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.045, 0.04, 3.35, 10)),
        obsidianMetalMat
      );
      const pommel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), solarGoldMat);
      pommel.position.y = -1.72;
      const crossGuard = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.24, 0.045, 8, 24, Math.PI)),
        solarGoldMat
      );
      crossGuard.position.y = 1.05;
      crossGuard.rotation.z = Math.PI;
      const lanceBlade = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.21, 1.15, 6)),
        whiteSunMat
      );
      lanceBlade.position.y = 1.75;
      const lanceFlameGuard = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.19, 0)),
        plasmaOrangeMat
      );
      lanceFlameGuard.position.y = 1.18;

      // Condensing Miniature Star at the Lance Tip (grows in Phase II before slam)
      const miniSunOrb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.32, 20, 20)),
        whiteSunMat
      );
      miniSunOrb.position.y = 2.38;
      miniSunOrb.visible = false;

      lanceGroup.add(shaft, pommel, crossGuard, lanceBlade, lanceFlameGuard, miniSunOrb);

      // 4. Supernova Cataclysm Elements (Phase III)
      const pillarMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const solarPillar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.9, 1.55, 16, 28, 1, true)),
        pillarMat
      );
      solarPillar.position.set(0, 8, 0.4);
      solarPillar.visible = false;
      scene.add(solarPillar);

      // Tilted Supernova Equatorial Accretion Ring (like a collapsing star remnant)
      const accretionMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const accretionDisk = new THREE.Mesh(
        trackGeo(new THREE.RingGeometry(0.6, 2.2, 56)),
        accretionMat
      );
      accretionDisk.position.set(0, 1.4, 0.4);
      accretionDisk.rotation.set(Math.PI / 2 - 0.24, 0.15, 0);
      accretionDisk.visible = false;
      scene.add(accretionDisk);

      const shockwaveMagma = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.085, 10, 64)),
        plasmaOrangeMat
      );
      shockwaveMagma.rotation.x = Math.PI / 2;
      shockwaveMagma.position.set(0, 0.16, 0.4);
      shockwaveMagma.visible = false;
      scene.add(shockwaveMagma);

      const shockwaveGold = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.055, 10, 64)),
        whiteSunMat
      );
      shockwaveGold.rotation.x = Math.PI / 2;
      shockwaveGold.position.set(0, 0.26, 0.4);
      shockwaveGold.visible = false;
      scene.add(shockwaveGold);

      // 110 Instanced Plasma Shards: Reverse-Gravity Implosion (Phase I/II) -> Supernova Blast (Phase III)
      const shardCount = 110;
      const shardGeo = trackGeo(new THREE.TetrahedronGeometry(0.11, 0));
      const shardMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xf97316,
          emissiveIntensity: 2.0,
          roughness: 0.14,
          metalness: 0.25
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
        shardSpeeds.push(5.4 + (i % 7) * 1.15);
        shardAngles.push((i * Math.PI * 2) / shardCount);
        _tmpColor.setHex(i % 4 === 0 ? 0xfef08a : i % 2 === 0 ? 0xf97316 : 0xef4444);
        shardInstanced.setColorAt(i, _tmpColor);
      }
      if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;

      // Floating Ember Dust in Cosmic Arena
      const emberCount = 180;
      const emberPos = new Float32Array(emberCount * 3);
      for (let i = 0; i < emberCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.4 + Math.random() * 8.5;
        emberPos[i * 3] = Math.cos(a) * r;
        emberPos[i * 3 + 1] = 0.2 + Math.random() * 5.8;
        emberPos[i * 3 + 2] = Math.sin(a) * r;
      }
      const emberGeo = trackGeo(new THREE.BufferGeometry());
      emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
      const emberMat = trackMat(
        new THREE.PointsMaterial({
          color: 0xfb923c,
          size: 0.085,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        })
      );
      const emberPoints = new THREE.Points(emberGeo, emberMat);
      scene.add(emberPoints);

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
      let lastPhase: CutscenePhase = 'eclipse';
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
          p < 0.32 ? 'eclipse' : p < 0.65 ? 'incarnation' : 'supernova';
        if (nextPhase !== lastPhase) {
          lastPhase = nextPhase;
          setPhase(nextPhase);
        }

        // Cosmic background & gyroscope orbital acceleration
        const spinBoost = p < 0.32 ? 1 : p < 0.65 ? 2.4 : 3.8;
        gyroRingA.rotation.x += dt * 0.9 * spinBoost;
        gyroRingA.rotation.y += dt * 1.1 * spinBoost;
        gyroRingB.rotation.y -= dt * 1.25 * spinBoost;
        gyroRingB.rotation.z += dt * 0.7 * spinBoost;
        gyroRingC.rotation.x -= dt * 0.65 * spinBoost;
        gyroRingC.rotation.z -= dt * 0.85 * spinBoost;
        coronaBillboard.rotation.z += dt * 0.42 * spinBoost;
        emberPoints.rotation.y += dt * 0.45 * spinBoost;

        for (let i = 0; i < spireGlows.length; i++) {
          spireGlows[i].rotation.y += dt * 2.5;
        }

        if (p < 0.32) {
          // PHASE I: Solar Eclipse + Reverse-Gravity Implosion into Core & Star
          const ep = p / 0.32;
          const ease = 1 - Math.pow(1 - ep, 3);

          // Eclipsing star looms slightly larger & darker as plasma drains inward
          const starScale = 1.0 - ease * 0.14;
          eclipseStarGroup.scale.setScalar(starScale);
          coronaBillboardMat.opacity = 0.78 + Math.sin(ep * Math.PI * 4) * 0.15;

          // Solaris plants lance firmly, crouching slightly while pulling stellar fire inward
          solarisGroup.position.set(0, -0.06 * ease, 0.15);
          rightArmPivot.rotation.set(-0.75 - ease * 0.45, 0, -0.25);
          leftArmPivot.rotation.set(-0.55 - ease * 0.3, 0.35, 0.25);
          lanceGroup.position.set(0.58, 1.38, 0.35);
          lanceGroup.rotation.set(0.18, 0, -0.14);
          miniSunOrb.visible = false;

          // Wings folded behind back, ready to erupt
          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const foldAngle = 0.95 - ease * 0.25 + wIdx * 0.18;
            rightWings[wIdx].rotation.set(0.35, -0.65, -foldAngle);
            leftWings[wIdx].rotation.set(0.35, 0.65, foldAngle);
          }
          solarHaloGroup.visible = false;
          solarPillar.visible = false;
          accretionDisk.visible = false;
          shockwaveMagma.visible = false;
          shockwaveGold.visible = false;

          // Reverse Gravity Implosion: shards pulled inward from perimeter into Solaris chest
          for (let i = 0; i < shardCount; i++) {
            const loopT = (ep * 1.9 + i / shardCount) % 1;
            const ang = shardAngles[i] + ep * Math.PI * 2.6;
            const rad = 6.2 * (1 - loopT) + 0.35;
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.3 + (1 - loopT) * (1.2 + (i % 5) * 0.55) + loopT * 1.45,
              0.15 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(loopT * 6, ang, i);
            _dummy.scale.setScalar(0.55 + loopT * 0.55);
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          magmaPitMat.opacity = 0.65 + ease * 0.25;
          coreLight.intensity = 10 + ease * 16;
          backEclipseRim.intensity = 24 + ease * 16;
        } else if (p < 0.65) {
          // PHASE II: Solar Dragon Wings Unfurl & Solaris Levitates to Charge Mini-Sun Plunge
          const ip = (p - 0.32) / 0.33;
          const ascendEase = 1 - Math.pow(1 - Math.min(1, ip * 1.25), 3);

          // Solaris rises heroically off the magma floor
          solarisGroup.position.set(0, ascendEase * 0.95, 0.15);
          capeMesh.rotation.x = 0.38 + Math.sin(ip * Math.PI * 6) * 0.12;

          // 6 Blazing Solar Wings snap wide open + 8-point Halo spins
          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const spread = 0.25 - wIdx * 0.34 + Math.sin(ip * Math.PI * 5 + wIdx) * 0.08;
            const openY = 0.22 * (1 - ascendEase);
            rightWings[wIdx].rotation.set(-0.08, -openY, spread);
            leftWings[wIdx].rotation.set(-0.08, openY, -spread);
          }
          solarHaloGroup.visible = true;
          solarHaloGroup.scale.setScalar(0.4 + ascendEase * 0.72);
          solarHaloGroup.rotation.z = ip * Math.PI * 2.4;

          // Two-handed overhead plunge windup with Sunfire Lance + growing Miniature Star
          const hoist = Math.min(1, ip * 1.3);
          rightArmPivot.rotation.set(-2.35 * hoist, 0, -0.35);
          leftArmPivot.rotation.set(-2.25 * hoist, 0.25, 0.35);
          lanceGroup.position.set(0.12, 2.15 + hoist * 0.35, 0.42);
          lanceGroup.rotation.set(0.28 - ip * 0.35, 0, 0.08);
          miniSunOrb.visible = true;
          const sunCharge = 0.35 + ip * 1.45 + Math.sin(ip * 32) * 0.08;
          miniSunOrb.scale.setScalar(sunCharge);

          // Eclipse Corona pulses violently before explosion
          eclipseStarGroup.scale.setScalar(0.86 + ip * 0.32);
          coronaBillboardMat.opacity = 0.95;

          // Spiral vortex of plasma converging directly onto the Lance Mini-Sun
          for (let i = 0; i < shardCount; i++) {
            const loopT = (ip * 2.5 + i / shardCount) % 1;
            const ang = shardAngles[i] - ip * Math.PI * 4.2;
            const rad = 4.4 * (1 - loopT);
            _dummy.position.set(
              Math.cos(ang) * rad,
              1.4 + ascendEase * 0.95 + Math.sin(loopT * Math.PI) * 1.1,
              0.35 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(ip * 8 + i, ang, i);
            _dummy.scale.setScalar(0.72 * (1 - loopT * 0.45));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          solarPillar.visible = false;
          accretionDisk.visible = false;
          shockwaveMagma.visible = false;
          shockwaveGold.visible = false;

          coreLight.intensity = 22 + ip * 32;
          backEclipseRim.intensity = 38 + ip * 26;
        } else {
          // PHASE III: Sunfire Lance Slam -> Cataclysmic Supernova Explosion
          const sp = (p - 0.65) / 0.35;
          const slamT = Math.min(1, sp / 0.18);
          const blastT = Math.min(1, sp / 0.55);
          const blastEase = 1 - Math.pow(1 - blastT, 3);

          // Solaris slams downward from sky back onto magma crater
          solarisGroup.position.set(0, (1 - slamT) * 0.95, 0.15 + slamT * 0.25);
          rightArmPivot.rotation.set(-2.35 + slamT * 1.65, 0, -0.2);
          leftArmPivot.rotation.set(-2.25 + slamT * 1.3, 0.25, 0.2);
          lanceGroup.position.set(0.22, 2.45 - slamT * 1.25, 0.58);
          lanceGroup.rotation.set(0.15 + slamT * 2.85, 0, 0);
          miniSunOrb.visible = sp < 0.18;
          miniSunOrb.scale.setScalar(1.8 + sp * 4);

          // Wings flare at full heroic span
          for (let wIdx = 0; wIdx < 3; wIdx++) {
            const spread = 0.28 - wIdx * 0.32;
            rightWings[wIdx].rotation.set(-0.14, 0, spread);
            leftWings[wIdx].rotation.set(-0.14, 0, -spread);
          }
          solarHaloGroup.visible = true;
          solarHaloGroup.scale.setScalar(1.22);
          solarHaloGroup.rotation.z += dt * 4.5;

          // Sky-piercing Solar Beam Pillar + Tilted Accretion Disk + Ground Magma Shockwaves
          solarPillar.visible = true;
          const pillarScale = sp < 0.22 ? 0.5 + (sp / 0.22) * 1.4 : Math.max(0.2, 1.9 - (sp - 0.22) * 1.6);
          solarPillar.scale.set(pillarScale, 1, pillarScale);
          pillarMat.opacity = sp < 0.22 ? 0.82 : Math.max(0, 0.82 - (sp - 0.22) * 0.95);

          accretionDisk.visible = true;
          const accScale = 0.6 + blastEase * 6.8;
          accretionDisk.scale.setScalar(accScale);
          accretionDisk.rotation.z += dt * 2.2;
          accretionMat.opacity = sp < 0.3 ? 0.85 : Math.max(0.08, 0.85 - (sp - 0.3) * 0.95);

          shockwaveMagma.visible = true;
          shockwaveGold.visible = true;
          shockwaveMagma.scale.setScalar(0.8 + blastEase * 12.5);
          shockwaveGold.scale.setScalar(0.5 + blastEase * 9.2);

          // Supernova Ejected Solar Meteorites blasting radially outward
          for (let i = 0; i < shardCount; i++) {
            const dist = blastEase * shardSpeeds[i] * 1.45;
            _dummy.position.set(
              shardDirs[i].x * dist,
              Math.max(0.18, 1.35 + shardDirs[i].y * dist * 0.95),
              0.4 + shardDirs[i].z * dist
            );
            _dummy.rotation.set(blastEase * 12 + i, blastEase * 9, i * 0.5);
            _dummy.scale.setScalar(Math.max(0.35, 1.25 - sp * 0.7));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          // Blinding Solar Nova Flash fading back to burning crimson-gold cosmos
          scene.background = _tmpColor.setHex(sp < 0.12 ? 0x431407 : 0x0b0202);
          eclipseStarGroup.scale.setScalar(1.18 + Math.sin(sp * Math.PI) * 0.25);

          coreLight.intensity = Math.max(18, 68 * (1 - sp * 0.62));
          backEclipseRim.intensity = Math.max(24, 62 * (1 - sp * 0.5));
          magmaPitMat.opacity = 0.95;
        }

        // Dynamic 3D Camera Choreography
        if (p < 0.32) {
          // Low heroic upward-tilting shot framing Solaris + Eclipsed Sun overhead
          const ep = p / 0.32;
          _camTarget.set(1.9 - ep * 0.8, 0.95 + ep * 0.45, 5.2 - ep * 0.6);
          _lookTarget.set(0, 1.7 + ep * 0.45, -0.4);
        } else if (p < 0.65) {
          // Sweeping high orbital arc during Solar Dragon Wings & Mini-Sun windup
          const ip = (p - 0.32) / 0.33;
          const camAng = 0.22 - ip * 1.15;
          const camDist = 4.7 + ip * 1.5;
          _camTarget.set(
            Math.sin(camAng) * camDist,
            1.9 + ip * 1.3,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(0, 1.85 + ip * 0.55, -0.25);
        } else {
          // Rapid wide pull-back with heavy supernova shockwave camera shake
          const sp = (p - 0.65) / 0.35;
          const shakeMag = sp < 0.32 ? (1 - sp / 0.32) * 0.44 : 0;
          const shakeX = Math.sin(now * 0.11) * shakeMag;
          const shakeY = Math.cos(now * 0.14) * shakeMag;
          const camAng = -0.93 + sp * 1.25;
          const camDist = 6.2 + Math.min(1, sp * 1.35) * 3.1;
          _camTarget.set(
            Math.sin(camAng) * camDist + shakeX,
            2.9 + sp * 1.1 + shakeY,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(0, 1.65, -0.35);
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
      className="fixed inset-0 z-50 bg-[#090202] overflow-hidden select-none"
      role="dialog"
      aria-label="Cutscene 3D Supernova Incarnation"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Cinematic Letterbox Bar (solid dark fill, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#120403]/92 border-b border-orange-500/45 px-5 py-3.5 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-game tracking-[0.24em] uppercase text-orange-300 truncate">
            SOLARIS IGNIS · GERHANA &amp; LEDAKAN BINTANG 3D
          </p>
          <h2 className="font-title text-base sm:text-2xl font-black tracking-wider text-amber-300 truncate">
            SUPERNOVA INCARNATION
          </h2>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <span className="inline-block px-2.5 py-1 rounded border border-orange-400/45 bg-orange-950/75 text-[11px] font-game tracking-wider text-amber-200">
            {phase === 'eclipse'
              ? 'FASE I · GERHANA INTI SURYA'
              : phase === 'incarnation'
                ? 'FASE II · AVATAR MATAHARI'
                : 'FASE III · LEDAKAN SUPERNOVA'}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-[#120403]/92 border-t border-orange-500/45 px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <p className="pointer-events-none text-[11px] sm:text-xs font-game tracking-wider text-orange-200/90 truncate">
          {PHASE_LABELS[phase]}
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-orange-950 hover:bg-orange-900 border border-orange-400/60 hover:border-amber-300 text-orange-50 font-game font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>Lewati Cutscene</span>
          <FastForward className="w-4 h-4 text-amber-300" />
        </button>

        {/* Bottom Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-stone-900">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-200 transition-[width] duration-75"
            style={{ width: `${uiProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
