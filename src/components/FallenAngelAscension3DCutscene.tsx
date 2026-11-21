import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FastForward } from 'lucide-react';

interface FallenAngelAscension3DCutsceneProps {
  remainingTime: number;
  totalDuration?: number;
  onSkip: () => void;
  onWebGLUnavailable?: () => void;
}

type CutsceneAct = 'eclipse' | 'awakening' | 'blink' | 'ascension';

const ACT_META: Record<
  CutsceneAct,
  { badge: string; title: string; subtitle: string }
> = {
  eclipse: {
    badge: 'BABAK I · GERHANA BULAN DARAH',
    title: 'SEGEL SERAPHIM TERBUKA',
    subtitle: '"Di bawah gerhana terlarang, segel enam sayap mulai retak..."'
  },
  awakening: {
    badge: 'BABAK II · ENAM SAYAP OBSIDIAN',
    title: 'KEBANGKITAN SAYAP GERHANA',
    subtitle: '"Rantai surga hancur — enam sayap obsidian terbentang kembali!"'
  },
  blink: {
    badge: 'BABAK III · ABYSSAL BLINK',
    title: 'EMPAT LOMPATAN RUANG',
    subtitle: '"Empat tebasan bayangan menembus dimensi tanpa jejak!"'
  },
  ascension: {
    badge: 'BABAK IV · TRUE FALLEN ANGEL',
    title: 'WUJUD SEJATI TERLEPAS',
    subtitle: '"Mode True Fallen Angel aktif — pertarungan kecepatan penuh dimulai!"'
  }
};

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.5, 0);
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();

export const FallenAngelAscension3DCutscene: React.FC<FallenAngelAscension3DCutsceneProps> = ({
  remainingTime,
  totalDuration = 12.0,
  onSkip,
  onWebGLUnavailable
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remainingRef = useRef<number>(remainingTime);
  const lastSyncTimeRef = useRef<number>(performance.now());
  const onSkipRef = useRef(onSkip);
  const onFallbackRef = useRef(onWebGLUnavailable);

  const [act, setAct] = useState<CutsceneAct>('eclipse');
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
      renderer.toneMappingExposure = 1.15;
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
      scene.background = new THREE.Color(0x05010c);
      scene.fog = new THREE.FogExp2(0x0b0218, 0.032);

      const camera = new THREE.PerspectiveCamera(
        48,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        120
      );
      camera.position.set(2.4, 0.78, 5.8);
      _currentLook.set(0, 1.45, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      disposables.push(envRT, roomEnv, pmrem);

      // Crimson-Amethyst Eclipse Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0xc084fc, 0x1a0418, 0.85);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfde68a, 2.0);
      keyLight.position.set(4.5, 8.2, 5.2);
      scene.add(keyLight);

      const bloodMoonRimLight = new THREE.PointLight(0xe11d48, 30, 40, 1.3);
      bloodMoonRimLight.position.set(0, 4.2, -5.5);
      scene.add(bloodMoonRimLight);

      const seraphCoreLight = new THREE.PointLight(0xd946ef, 14, 26, 1.35);
      seraphCoreLight.position.set(0, 1.8, 1.2);
      scene.add(seraphCoreLight);

      const groundGlowLight = new THREE.PointLight(0xfb7185, 8, 18, 1.5);
      groundGlowLight.position.set(0, 0.5, 0.5);
      scene.add(groundGlowLight);

      // Procedural Texture 1: Abyssal Six-Winged Seraph Cathedral Floor Seal
      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = 768;
      floorCanvas.height = 768;
      const fctx = floorCanvas.getContext('2d');
      if (fctx) {
        fctx.fillStyle = '#06010f';
        fctx.fillRect(0, 0, 768, 768);

        const rg = fctx.createRadialGradient(384, 384, 18, 384, 384, 372);
        rg.addColorStop(0, 'rgba(232, 121, 249, 0.82)');
        rg.addColorStop(0.24, 'rgba(190, 18, 60, 0.52)');
        rg.addColorStop(0.56, 'rgba(88, 28, 135, 0.25)');
        rg.addColorStop(1, 'rgba(6, 1, 15, 0)');
        fctx.fillStyle = rg;
        fctx.fillRect(0, 0, 768, 768);

        // Sacred-Fallen Concentric Seal Rings
        const radii = [98, 178, 258, 336];
        for (let i = 0; i < radii.length; i++) {
          fctx.strokeStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.85)' : 'rgba(251, 191, 36, 0.72)';
          fctx.lineWidth = i === 2 ? 3.5 : 2.2;
          fctx.beginPath();
          fctx.arc(384, 384, radii[i], 0, Math.PI * 2);
          fctx.stroke();
        }

        // 6-Winged Star & Feather Sigils
        for (let s = 0; s < 12; s++) {
          const a = (s * Math.PI * 2) / 12;
          fctx.strokeStyle = s % 2 === 0 ? 'rgba(232, 121, 249, 0.72)' : 'rgba(251, 113, 133, 0.55)';
          fctx.lineWidth = s % 2 === 0 ? 2.6 : 1.5;
          fctx.beginPath();
          fctx.moveTo(384 + Math.cos(a) * 65, 384 + Math.sin(a) * 65);
          fctx.lineTo(384 + Math.cos(a) * 336, 384 + Math.sin(a) * 336);
          fctx.stroke();

          // Diamond Feather Rune Nodes
          const gx = 384 + Math.cos(a) * 218;
          const gy = 384 + Math.sin(a) * 218;
          fctx.fillStyle = s % 3 === 0 ? '#fda4af' : '#f0abfc';
          fctx.beginPath();
          fctx.moveTo(gx, gy - 9);
          fctx.lineTo(gx + 6, gy);
          fctx.lineTo(gx, gy + 9);
          fctx.lineTo(gx - 6, gy);
          fctx.closePath();
          fctx.fill();
        }

        // Crescent Eclipse Arcs
        fctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
        fctx.lineWidth = 2.4;
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI * 2) / 6;
          fctx.beginPath();
          fctx.arc(
            384 + Math.cos(ang) * 145,
            384 + Math.sin(ang) * 145,
            34,
            ang - 1.1,
            ang + 1.1
          );
          fctx.stroke();
        }
      }
      const floorTex = new THREE.CanvasTexture(floorCanvas);
      floorTex.colorSpace = THREE.SRGBColorSpace;
      floorTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(floorTex);

      // Procedural Texture 2: Blood Moon Eclipse Corona
      const coronaCanvas = document.createElement('canvas');
      coronaCanvas.width = 512;
      coronaCanvas.height = 512;
      const cctx = coronaCanvas.getContext('2d');
      if (cctx) {
        cctx.clearRect(0, 0, 512, 512);
        const cg = cctx.createRadialGradient(256, 256, 68, 256, 256, 248);
        cg.addColorStop(0, 'rgba(0, 0, 0, 0)');
        cg.addColorStop(0.26, 'rgba(244, 63, 94, 0.96)');
        cg.addColorStop(0.42, 'rgba(192, 132, 252, 0.82)');
        cg.addColorStop(0.68, 'rgba(88, 28, 135, 0.34)');
        cg.addColorStop(1, 'rgba(5, 1, 12, 0)');
        cctx.fillStyle = cg;
        cctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 36; i++) {
          const a = (i * Math.PI * 2) / 36;
          const len = 148 + ((i * 31) % 86);
          cctx.strokeStyle = i % 3 === 0 ? 'rgba(253, 186, 116, 0.72)' : 'rgba(240, 171, 252, 0.56)';
          cctx.lineWidth = i % 2 === 0 ? 3.4 : 1.8;
          cctx.beginPath();
          cctx.moveTo(256 + Math.cos(a) * 86, 256 + Math.sin(a) * 86);
          cctx.lineTo(256 + Math.cos(a + 0.14) * len, 256 + Math.sin(a + 0.14) * len);
          cctx.stroke();
        }
      }
      const coronaTex = new THREE.CanvasTexture(coronaCanvas);
      coronaTex.colorSpace = THREE.SRGBColorSpace;
      coronaTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(coronaTex);

      // Shared PBR Materials (distinct roughness & metalness across materials)
      const obsidianMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0b0614,
          roughness: 0.76,
          metalness: 0.28
        })
      );
      const seraphArmorMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e1035,
          emissive: 0x2e1065,
          emissiveIntensity: 0.4,
          roughness: 0.24,
          metalness: 0.84
        })
      );
      const crimsonSilkMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x4c0519,
          emissive: 0x881337,
          emissiveIntensity: 0.35,
          roughness: 0.68,
          metalness: 0.15,
          side: THREE.DoubleSide
        })
      );
      const fallenGoldMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0x78350f,
          emissiveIntensity: 0.32,
          roughness: 0.18,
          metalness: 0.92
        })
      );
      const abyssMagentaMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc026d3,
          emissiveIntensity: 2.2,
          roughness: 0.14,
          metalness: 0.16
        })
      );
      const crimsonFlameMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfb7185,
          emissive: 0xe11d48,
          emissiveIntensity: 2.3,
          roughness: 0.14,
          metalness: 0.18
        })
      );
      const wingObsidianMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f071c,
          emissive: 0x3b0764,
          emissiveIntensity: 0.48,
          roughness: 0.56,
          metalness: 0.32
        })
      );
      const shadowMoonMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x07010c,
          roughness: 0.92,
          metalness: 0.06
        })
      );

      // 1. Cathedral Floor & Abyssal Seal
      const floorGround = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(30, 48)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x05010d,
            roughness: 0.88,
            metalness: 0.16
          })
        )
      );
      floorGround.rotation.x = -Math.PI / 2;
      floorGround.position.y = -0.18;
      scene.add(floorGround);

      const sealMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: floorTex,
          transparent: true,
          opacity: 0.88,
          depthWrite: false
        })
      );
      const sealMesh = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(5.6, 48)), sealMat);
      sealMesh.rotation.x = -Math.PI / 2;
      sealMesh.position.y = 0.01;
      scene.add(sealMesh);

      // Raised Obsidian Altar Dais (bottom-center grounded)
      const altarBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.55, 1.9, 0.22, 8)), obsidianMat);
      altarBase.position.y = 0.09;
      const altarTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.56, 0.038, 8, 48)), crimsonFlameMat);
      altarTrim.rotation.x = Math.PI / 2;
      altarTrim.position.y = 0.2;
      scene.add(altarBase, altarTrim);

      // 6 Shattered Gothic Cathedral Obsidian Pillars
      const pillarShaftGeo = trackGeo(new THREE.BoxGeometry(0.62, 4.2, 0.62));
      const pillarRuneGeo = trackGeo(new THREE.BoxGeometry(0.12, 3.3, 0.66));
      const pillarCapGeo = trackGeo(new THREE.ConeGeometry(0.46, 0.78, 4));
      const pillars: { group: THREE.Group; cap: THREE.Mesh; baseCapY: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6 + 0.32;
        const rad = 6.2 + (i % 2) * 0.7;
        const pg = new THREE.Group();
        pg.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
        pg.lookAt(0, 0, 0);

        const shaft = new THREE.Mesh(pillarShaftGeo, obsidianMat);
        shaft.position.y = 1.95;
        const rune = new THREE.Mesh(pillarRuneGeo, i % 2 === 0 ? abyssMagentaMat : crimsonFlameMat);
        rune.position.y = 2.05;
        const cap = new THREE.Mesh(pillarCapGeo, seraphArmorMat);
        const baseCapY = 4.65 + (i % 3) * 0.28;
        cap.position.y = baseCapY;
        pg.add(shaft, rune, cap);
        scene.add(pg);
        pillars.push({ group: pg, cap, baseCapY });
      }

      // 2. Blood Moon Eclipse Backdrop & Celestial Seals
      const eclipseGroup = new THREE.Group();
      eclipseGroup.position.set(0, 3.85, -6.4);
      scene.add(eclipseGroup);

      const moonCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.82, 32, 32)), shadowMoonMat);
      const eclipseRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.88, 0.085, 12, 72)), crimsonFlameMat);
      const coronaMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: coronaTex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const coronaBillboard = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.6, 7.6)), coronaMat);
      coronaBillboard.position.z = -0.15;

      const moonRingA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.65, 0.05, 10, 72)), fallenGoldMat);
      moonRingA.rotation.set(0.42, 0.35, 0);
      const moonRingB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.3, 0.045, 10, 72)), abyssMagentaMat);
      moonRingB.rotation.set(-0.62, -0.45, 0.2);
      eclipseGroup.add(moonCore, eclipseRim, coronaBillboard, moonRingA, moonRingB);

      // 3. Composite 3D Hero Model — FALLEN ANGEL -> TRUE FALLEN ANGEL
      const heroGroup = new THREE.Group();
      heroGroup.position.set(0, 0.2, 0);
      scene.add(heroGroup);

      // Greaves & Boots
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.092, 0.82, 8));
      const kneeGeo = trackGeo(new THREE.OctahedronGeometry(0.115, 0));
      const legL = new THREE.Mesh(legGeo, seraphArmorMat);
      legL.position.set(-0.19, 0.41, 0);
      const kneeL = new THREE.Mesh(kneeGeo, fallenGoldMat);
      kneeL.position.set(-0.19, 0.56, 0.1);
      const legR = new THREE.Mesh(legGeo, seraphArmorMat);
      legR.position.set(0.19, 0.41, 0);
      const kneeR = new THREE.Mesh(kneeGeo, fallenGoldMat);
      kneeR.position.set(0.19, 0.56, 0.1);
      heroGroup.add(legL, kneeL, legR, kneeR);

      // Sculpted Upper Body & Eclipse Crest
      const waist = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.2, 0.26, 8)), obsidianMat);
      waist.position.y = 0.92;
      const chest = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.24, 0.78, 8)), seraphArmorMat);
      chest.position.y = 1.42;
      const chestCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.135, 0)), crimsonFlameMat);
      chestCore.position.set(0, 1.48, 0.31);
      const chestRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.19, 0.025, 8, 24)), fallenGoldMat);
      chestRing.position.set(0, 1.48, 0.29);
      heroGroup.add(waist, chest, chestCore, chestRing);

      // Flowing Crimson-Obsidian Split Tattered Cloak
      const cloakShape = new THREE.Shape();
      cloakShape.moveTo(-0.38, 0);
      cloakShape.lineTo(0.38, 0);
      cloakShape.lineTo(0.84, -1.58);
      cloakShape.lineTo(0.26, -1.25);
      cloakShape.lineTo(0, -1.68);
      cloakShape.lineTo(-0.26, -1.25);
      cloakShape.lineTo(-0.84, -1.58);
      cloakShape.closePath();
      const cloakMesh = new THREE.Mesh(
        trackGeo(new THREE.ExtrudeGeometry(cloakShape, { depth: 0.035, bevelEnabled: false })),
        crimsonSilkMat
      );
      cloakMesh.position.set(0, 1.76, -0.24);
      cloakMesh.rotation.x = 0.24;
      heroGroup.add(cloakMesh);

      // Winged Shoulder Pauldrons
      const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.2, 0));
      const spikeGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.38, 6));
      const pauldronL = new THREE.Group();
      pauldronL.position.set(-0.44, 1.72, 0);
      const pMeshL = new THREE.Mesh(pauldronGeo, seraphArmorMat);
      pMeshL.scale.set(1.15, 0.76, 1.0);
      const pSpikeL = new THREE.Mesh(spikeGeo, fallenGoldMat);
      pSpikeL.position.set(-0.16, 0.2, 0);
      pSpikeL.rotation.z = 0.6;
      pauldronL.add(pMeshL, pSpikeL);

      const pauldronR = new THREE.Group();
      pauldronR.position.set(0.44, 1.72, 0);
      const pMeshR = new THREE.Mesh(pauldronGeo, seraphArmorMat);
      pMeshR.scale.set(1.15, 0.76, 1.0);
      const pSpikeR = new THREE.Mesh(spikeGeo, fallenGoldMat);
      pSpikeR.position.set(0.16, 0.2, 0);
      pSpikeR.rotation.z = -0.6;
      pauldronR.add(pMeshR, pSpikeR);
      heroGroup.add(pauldronL, pauldronR);

      // Seraphic Head, Blindfold/Visor & Fallen Crown
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 2.02, 0.04);
      const helmMesh = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.21, 0)), seraphArmorMat);
      const visorMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.25, 0.055, 0.14)), crimsonFlameMat);
      visorMesh.position.set(0, 0.02, 0.15);
      const crownGeo = trackGeo(new THREE.ConeGeometry(0.05, 0.42, 5));
      const crownL = new THREE.Mesh(crownGeo, fallenGoldMat);
      crownL.position.set(-0.16, 0.22, -0.02);
      crownL.rotation.set(-0.16, 0, 0.42);
      const crownR = new THREE.Mesh(crownGeo, fallenGoldMat);
      crownR.position.set(0.16, 0.22, -0.02);
      crownR.rotation.set(-0.16, 0, -0.42);
      headGroup.add(helmMesh, visorMesh, crownL, crownR);
      heroGroup.add(headGroup);

      // Fractured Fallen Halo (Broken Crescent Ring + Floating Shards)
      const fallenHaloGroup = new THREE.Group();
      fallenHaloGroup.position.set(0, 2.15, -0.34);
      const haloArcA = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.76, 0.032, 8, 42, Math.PI * 1.45)),
        fallenGoldMat
      );
      haloArcA.rotation.z = 0.42;
      const haloArcB = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.58, 0.024, 8, 32, Math.PI * 1.2)),
        abyssMagentaMat
      );
      haloArcB.rotation.z = -1.1;
      fallenHaloGroup.add(haloArcA, haloArcB);
      const haloShardGeo = trackGeo(new THREE.OctahedronGeometry(0.065, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const hs = new THREE.Mesh(haloShardGeo, i % 2 === 0 ? crimsonFlameMat : abyssMagentaMat);
        hs.position.set(Math.cos(a) * 0.94, Math.sin(a) * 0.94, 0);
        fallenHaloGroup.add(hs);
      }
      heroGroup.add(fallenHaloGroup);

      // Articulated Arms + Twin Abyssal Blink Daggers
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.065, 0.68, 8));
      const daggerShape = new THREE.Shape();
      daggerShape.moveTo(-0.045, 0);
      daggerShape.lineTo(0.045, 0);
      daggerShape.lineTo(0.07, 0.72);
      daggerShape.lineTo(0, 1.05);
      daggerShape.lineTo(-0.07, 0.72);
      daggerShape.closePath();
      const daggerBladeGeo = trackGeo(
        new THREE.ExtrudeGeometry(daggerShape, {
          depth: 0.025,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.008
        })
      );

      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.42, 1.66, 0.05);
      const leftArmMesh = new THREE.Mesh(armGeo, seraphArmorMat);
      leftArmMesh.position.y = -0.32;
      const leftDagger = new THREE.Mesh(daggerBladeGeo, abyssMagentaMat);
      leftDagger.position.set(0, -0.68, 0.05);
      leftDagger.rotation.x = Math.PI * 0.52;
      leftDagger.visible = false;
      leftArmPivot.add(leftArmMesh, leftDagger);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.42, 1.66, 0.05);
      const rightArmMesh = new THREE.Mesh(armGeo, seraphArmorMat);
      rightArmMesh.position.y = -0.32;
      const rightDagger = new THREE.Mesh(daggerBladeGeo, crimsonFlameMat);
      rightDagger.position.set(0, -0.68, 0.05);
      rightDagger.rotation.x = Math.PI * 0.52;
      rightDagger.visible = false;
      rightArmPivot.add(rightArmMesh, rightDagger);
      heroGroup.add(leftArmPivot, rightArmPivot);

      // SIX ARTICULATED OBSIDIAN SERAPH WINGS (3 Left + 3 Right Multi-Feather Groups)
      const wingRoot = new THREE.Group();
      wingRoot.position.set(0, 1.58, -0.28);
      heroGroup.add(wingRoot);

      const primaryPlumeShape = new THREE.Shape();
      primaryPlumeShape.moveTo(0, 0);
      primaryPlumeShape.lineTo(1.75, 0.44);
      primaryPlumeShape.lineTo(2.18, 0.16);
      primaryPlumeShape.lineTo(1.52, -0.18);
      primaryPlumeShape.lineTo(0, -0.14);
      primaryPlumeShape.closePath();
      const primaryPlumeGeo = trackGeo(
        new THREE.ExtrudeGeometry(primaryPlumeShape, {
          depth: 0.032,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.008
        })
      );

      const trimPlumeShape = new THREE.Shape();
      trimPlumeShape.moveTo(0.15, -0.02);
      trimPlumeShape.lineTo(1.58, 0.28);
      trimPlumeShape.lineTo(1.88, 0.11);
      trimPlumeShape.lineTo(1.32, -0.1);
      trimPlumeShape.closePath();
      const trimPlumeGeo = trackGeo(
        new THREE.ExtrudeGeometry(trimPlumeShape, { depth: 0.04, bevelEnabled: false })
      );

      const leftWings: THREE.Group[] = [];
      const rightWings: THREE.Group[] = [];
      for (let w = 0; w < 3; w++) {
        const wingScale = 1.08 - w * 0.17;
        const yOff = 0.24 - w * 0.24;

        const rGroup = new THREE.Group();
        rGroup.position.set(0.15, yOff, -w * 0.06);
        rGroup.scale.setScalar(wingScale);
        const rBase = new THREE.Mesh(primaryPlumeGeo, wingObsidianMat);
        const rTrim = new THREE.Mesh(trimPlumeGeo, w === 1 ? crimsonFlameMat : abyssMagentaMat);
        rTrim.position.z = 0.015;
        rGroup.add(rBase, rTrim);
        wingRoot.add(rGroup);
        rightWings.push(rGroup);

        const lGroup = new THREE.Group();
        lGroup.position.set(-0.15, yOff, -w * 0.06);
        lGroup.scale.set(-wingScale, wingScale, wingScale);
        const lBase = new THREE.Mesh(primaryPlumeGeo, wingObsidianMat);
        const lTrim = new THREE.Mesh(trimPlumeGeo, w === 1 ? crimsonFlameMat : abyssMagentaMat);
        lTrim.position.z = 0.015;
        lGroup.add(lBase, lTrim);
        wingRoot.add(lGroup);
        leftWings.push(lGroup);
      }

      // 4. Act I->II Breakable Binding Chains around Hero
      const chainsGroup = new THREE.Group();
      chainsGroup.position.set(0, 1.35, 0);
      scene.add(chainsGroup);
      const chainGeo = trackGeo(new THREE.TorusGeometry(1.05, 0.036, 8, 40));
      const chainRings: THREE.Mesh[] = [];
      const chainTilts = [
        [0.45, 0.2, 0.3],
        [-0.5, 0.65, -0.25],
        [0.82, -0.4, 0.55]
      ];
      for (let i = 0; i < 3; i++) {
        const cr = new THREE.Mesh(chainGeo, i === 1 ? crimsonFlameMat : abyssMagentaMat);
        cr.rotation.set(chainTilts[i][0], chainTilts[i][1], chainTilts[i][2]);
        chainsGroup.add(cr);
        chainRings.push(cr);
      }

      // 5. Act III Abyssal Blink Anchors, Zig-Zag Warp Beams & Phantom Afterimages
      const blinkAnchors: THREE.Vector3[] = [
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(-3.1, 0.35, 1.45),
        new THREE.Vector3(3.2, 0.45, 0.85),
        new THREE.Vector3(-2.35, 0.38, -2.05),
        new THREE.Vector3(0, 0.2, 0.15)
      ];

      const warpGateRings: THREE.Mesh[] = [];
      const warpGateGeo = trackGeo(new THREE.TorusGeometry(0.55, 0.045, 8, 32));
      for (let i = 1; i <= 4; i++) {
        const wg = new THREE.Mesh(warpGateGeo, i % 2 === 0 ? crimsonFlameMat : abyssMagentaMat);
        wg.position.copy(blinkAnchors[i]).add(new THREE.Vector3(0, 0.12, 0));
        wg.rotation.x = Math.PI / 2;
        wg.visible = false;
        scene.add(wg);
        warpGateRings.push(wg);
      }

      const beamGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 1, 8));
      const warpBeams: THREE.Mesh[] = [];
      const phantomAfterimages: THREE.Group[] = [];
      const phantomBodyGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.16, 1.35, 8));
      const phantomWingGeo = trackGeo(new THREE.BoxGeometry(1.65, 0.26, 0.04));
      const phantomMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xe879f9,
          transparent: true,
          opacity: 0.48,
          depthWrite: false
        })
      );

      for (let i = 0; i < 4; i++) {
        const beam = new THREE.Mesh(beamGeo, i % 2 === 0 ? abyssMagentaMat : crimsonFlameMat);
        const start = blinkAnchors[i];
        const end = blinkAnchors[i + 1];
        _vA.copy(start).add(new THREE.Vector3(0, 1.15, 0));
        _vB.copy(end).add(new THREE.Vector3(0, 1.15, 0));
        const dist = _vA.distanceTo(_vB);
        beam.position.copy(_vA).lerp(_vB, 0.5);
        beam.scale.set(1, dist, 1);
        beam.lookAt(_vB);
        beam.rotateX(Math.PI / 2);
        beam.visible = false;
        scene.add(beam);
        warpBeams.push(beam);

        const ghost = new THREE.Group();
        ghost.position.copy(blinkAnchors[i]);
        const gb = new THREE.Mesh(phantomBodyGeo, phantomMat);
        gb.position.y = 1.05;
        const gw = new THREE.Mesh(phantomWingGeo, phantomMat);
        gw.position.set(0, 1.45, -0.18);
        gw.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.24;
        ghost.add(gb, gw);
        ghost.visible = false;
        scene.add(ghost);
        phantomAfterimages.push(ghost);
      }

      // 6. Act IV Climax: Towering Abyssal Feather Pillar & Twin Shockwaves
      const pillarMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xc026d3,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const eclipsePillar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.05, 1.85, 18, 28, 1, true)),
        pillarMat
      );
      eclipsePillar.position.set(0, 9.0, 0.1);
      eclipsePillar.visible = false;
      scene.add(eclipsePillar);

      const shockwaveViolet = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.08, 10, 64)),
        abyssMagentaMat
      );
      shockwaveViolet.rotation.x = Math.PI / 2;
      shockwaveViolet.position.set(0, 0.22, 0.1);
      shockwaveViolet.visible = false;
      scene.add(shockwaveViolet);

      const shockwaveCrimson = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.055, 10, 64)),
        crimsonFlameMat
      );
      shockwaveCrimson.rotation.x = Math.PI / 2;
      shockwaveCrimson.position.set(0, 0.34, 0.1);
      shockwaveCrimson.visible = false;
      scene.add(shockwaveCrimson);

      // 7. 140 Instanced Obsidian & Amethyst Feathers
      const featherCount = 140;
      const featherGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.42, 4));
      const featherMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x9333ea,
          emissiveIntensity: 1.55,
          roughness: 0.25,
          metalness: 0.35
        })
      );
      const featherInstanced = new THREE.InstancedMesh(featherGeo, featherMat, featherCount);
      featherInstanced.frustumCulled = false;
      scene.add(featherInstanced);

      const fAngles: number[] = [];
      const fRadii: number[] = [];
      const fHeights: number[] = [];
      const fDirs: THREE.Vector3[] = [];
      for (let i = 0; i < featherCount; i++) {
        const a = (i * Math.PI * 2) / featherCount;
        const r = 1.4 + (i % 9) * 0.58;
        fAngles.push(a);
        fRadii.push(r);
        fHeights.push(0.4 + (i % 11) * 0.48);
        fDirs.push(
          new THREE.Vector3(
            Math.cos(a * 1.7),
            0.32 + (i % 7) * 0.14,
            Math.sin(a * 1.7)
          ).normalize()
        );
        _tmpColor.setHex(i % 4 === 0 ? 0xfb7185 : i % 3 === 0 ? 0xfbbf24 : 0xc084fc);
        featherInstanced.setColorAt(i, _tmpColor);
      }
      if (featherInstanced.instanceColor) featherInstanced.instanceColor.needsUpdate = true;

      // Floating Ember / Shadow Dust
      const dustCount = 200;
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 9.0;
        dustPos[i * 3] = Math.cos(a) * r;
        dustPos[i * 3 + 1] = 0.2 + Math.random() * 6.5;
        dustPos[i * 3 + 2] = Math.sin(a) * r;
      }
      const dustGeo = trackGeo(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = trackMat(
        new THREE.PointsMaterial({
          color: 0xf0abfc,
          size: 0.08,
          transparent: true,
          opacity: 0.8,
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
      let lastAct: CutsceneAct = 'eclipse';
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

        const nextAct: CutsceneAct =
          p < 0.25 ? 'eclipse' : p < 0.52 ? 'awakening' : p < 0.78 ? 'blink' : 'ascension';
        if (nextAct !== lastAct) {
          lastAct = nextAct;
          setAct(nextAct);
        }

        // Perpetual Cathedral & Eclipse Atmosphere
        const spinMult = p < 0.25 ? 0.65 : p < 0.52 ? 1.45 : p < 0.78 ? 2.6 : 3.2;
        moonRingA.rotation.x += dt * 0.55 * spinMult;
        moonRingA.rotation.y += dt * 0.72 * spinMult;
        moonRingB.rotation.y -= dt * 0.85 * spinMult;
        moonRingB.rotation.z += dt * 0.48 * spinMult;
        coronaBillboard.rotation.z += dt * 0.28 * spinMult;
        dustPoints.rotation.y += dt * 0.26 * spinMult;

        for (let i = 0; i < pillars.length; i++) {
          pillars[i].cap.position.y = pillars[i].baseCapY + Math.sin(now * 0.0022 + i * 1.3) * 0.14;
          pillars[i].cap.rotation.y += dt * 0.9;
        }

        if (p < 0.25) {
          // ACT I (0.0s - 3.0s): Blood Moon Seal & Bound Seraph
          const a1 = p / 0.25;
          const ease = 1 - Math.pow(1 - a1, 3);

          heroGroup.position.set(0, 0.2, 0);
          heroGroup.rotation.set(0.16 * (1 - ease * 0.4), 0, 0);
          headGroup.rotation.x = 0.28 - ease * 0.18;
          rightArmPivot.rotation.set(-0.25, 0, -0.22);
          leftArmPivot.rotation.set(-0.25, 0, 0.22);
          rightDagger.visible = false;
          leftDagger.visible = false;

          // Folded obsidian wings vibrating against chains
          for (let w = 0; w < 3; w++) {
            const tremor = Math.sin(now * 0.014 + w) * 0.04 * a1;
            rightWings[w].rotation.set(0.28, -0.92, -0.82 - w * 0.18 + tremor);
            leftWings[w].rotation.set(0.28, 0.92, 0.82 + w * 0.18 - tremor);
          }

          chainsGroup.visible = true;
          chainsGroup.scale.setScalar(1.0 + a1 * 0.08);
          for (let i = 0; i < chainRings.length; i++) {
            chainRings[i].rotation.y += dt * (0.45 + i * 0.25);
          }

          fallenHaloGroup.visible = true;
          fallenHaloGroup.scale.setScalar(0.55 + ease * 0.25);
          fallenHaloGroup.rotation.z = a1 * 0.8;

          for (let i = 0; i < 4; i++) {
            warpBeams[i].visible = false;
            warpGateRings[i].visible = false;
            phantomAfterimages[i].visible = false;
          }
          eclipsePillar.visible = false;
          shockwaveViolet.visible = false;
          shockwaveCrimson.visible = false;

          // Gentle swirling obsidian feathers rising from seal
          for (let i = 0; i < featherCount; i++) {
            const ang = fAngles[i] + a1 * 1.4;
            const r = fRadii[i] * (1.08 - ease * 0.14);
            _dummy.position.set(
              Math.cos(ang) * r,
              0.35 + ((fHeights[i] + a1 * 1.6) % 4.4),
              Math.sin(ang) * r
            );
            _dummy.rotation.set(a1 * 3 + i, ang, 0.4);
            _dummy.scale.setScalar(0.55 + (i % 3) * 0.15);
            _dummy.updateMatrix();
            featherInstanced.setMatrixAt(i, _dummy.matrix);
          }
          featherInstanced.instanceMatrix.needsUpdate = true;

          seraphCoreLight.intensity = 10 + ease * 10;
          bloodMoonRimLight.intensity = 22 + ease * 14;
          groundGlowLight.intensity = 7 + ease * 8;
        } else if (p < 0.52) {
          // ACT II (3.0s - 6.2s): Chains Shatter & 6 Obsidian Wings Unfurl
          const a2 = (p - 0.25) / 0.27;
          const riseEase = 1 - Math.pow(1 - Math.min(1, a2 * 1.15), 3);

          heroGroup.position.set(0, 0.2 + riseEase * 0.82, 0);
          heroGroup.rotation.set(0.08 * (1 - riseEase), 0, 0);
          headGroup.rotation.x = 0.1 - riseEase * 0.18;
          rightArmPivot.rotation.set(-0.35 - a2 * 0.55, 0, -0.52 - riseEase * 0.35);
          leftArmPivot.rotation.set(-0.35 - a2 * 0.55, 0, 0.52 + riseEase * 0.35);
          rightDagger.visible = a2 > 0.65;
          leftDagger.visible = a2 > 0.65;

          // Binding chains flare & burst outward before vanishing
          if (a2 < 0.32) {
            const shatterT = a2 / 0.32;
            chainsGroup.visible = true;
            chainsGroup.scale.setScalar(1.08 + shatterT * 2.2);
            chainsGroup.rotation.y += dt * 4.5;
          } else {
            chainsGroup.visible = false;
          }

          // Staggered 3-Pair Obsidian Seraph Wing Unfurl
          for (let w = 0; w < 3; w++) {
            const wingStart = 0.18 + w * 0.16;
            const wingProg = Math.max(0, Math.min(1, (a2 - wingStart) / 0.28));
            const wingEase = 1 - Math.pow(1 - wingProg, 3);
            const targetSpread = 0.42 - w * 0.38;
            const rotZ = THREE.MathUtils.lerp(-0.88 - w * 0.16, targetSpread, wingEase);
            const rotY = THREE.MathUtils.lerp(-0.92, -0.12, wingEase);
            const flap = Math.sin(now * 0.006 + w * 0.8) * 0.06 * wingEase;
            rightWings[w].rotation.set(-0.08, rotY, rotZ + flap);
            leftWings[w].rotation.set(-0.08, -rotY, -rotZ - flap);
          }

          fallenHaloGroup.visible = true;
          fallenHaloGroup.scale.setScalar(0.8 + riseEase * 0.42);
          fallenHaloGroup.rotation.z += dt * 1.9;

          for (let i = 0; i < 4; i++) {
            warpBeams[i].visible = false;
            warpGateRings[i].visible = false;
            phantomAfterimages[i].visible = false;
          }
          eclipsePillar.visible = false;
          shockwaveViolet.visible = false;
          shockwaveCrimson.visible = false;

          // Shattered chain/feather cyclone expanding around hero
          for (let i = 0; i < featherCount; i++) {
            const ang = fAngles[i] + a2 * 4.6;
            const r = 0.9 + (fRadii[i] + a2 * 2.1) % 5.2;
            _dummy.position.set(
              Math.cos(ang) * r,
              0.4 + riseEase * 0.6 + ((fHeights[i] + a2 * 2.4) % 4.8),
              Math.sin(ang) * r
            );
            _dummy.rotation.set(a2 * 7 + i, ang, 0.7);
            _dummy.scale.setScalar(0.7 + a2 * 0.35);
            _dummy.updateMatrix();
            featherInstanced.setMatrixAt(i, _dummy.matrix);
          }
          featherInstanced.instanceMatrix.needsUpdate = true;

          seraphCoreLight.intensity = 20 + a2 * 20;
          bloodMoonRimLight.intensity = 34 + a2 * 16;
          groundGlowLight.intensity = 12 + a2 * 10;
        } else if (p < 0.78) {
          // ACT III (6.2s - 9.4s): 4-Step Abyssal Blink Dimensional Cuts
          const a3 = (p - 0.52) / 0.26;
          const segFloat = a3 * 4;
          const segIdx = Math.min(3, Math.floor(segFloat));
          const segFrac = segFloat - segIdx;
          const dashEase = 1 - Math.pow(1 - Math.min(1, segFrac * 2.4), 3);

          const fromPt = blinkAnchors[segIdx];
          const toPt = blinkAnchors[segIdx + 1];
          _vA.copy(fromPt).lerp(toPt, dashEase);
          heroGroup.position.copy(_vA);
          heroGroup.position.y += 0.25 + Math.sin(segFrac * Math.PI) * 0.45;
          heroGroup.lookAt(toPt.x, heroGroup.position.y, toPt.z);

          rightDagger.visible = true;
          leftDagger.visible = true;
          rightArmPivot.rotation.set(-1.35, 0.2, -0.55);
          leftArmPivot.rotation.set(-0.95, -0.25, 0.55);

          // Wings swept into razor-sharp aero blades during Blinks
          for (let w = 0; w < 3; w++) {
            const spread = 0.22 - w * 0.34;
            rightWings[w].rotation.set(-0.22, -0.34, spread);
            leftWings[w].rotation.set(-0.22, 0.34, -spread);
          }

          fallenHaloGroup.visible = true;
          fallenHaloGroup.scale.setScalar(1.22);
          fallenHaloGroup.rotation.z += dt * 3.8;
          chainsGroup.visible = false;

          for (let i = 0; i < 4; i++) {
            const activeOrPassed = i <= segIdx;
            warpBeams[i].visible = activeOrPassed;
            warpGateRings[i].visible = activeOrPassed;
            warpGateRings[i].rotation.z += dt * 4.2;
            warpGateRings[i].scale.setScalar(i === segIdx ? 0.8 + segFrac * 0.9 : 1.15);
            phantomAfterimages[i].visible = activeOrPassed;
            if (activeOrPassed) {
              phantomAfterimages[i].lookAt(blinkAnchors[i + 1].x, 0.2, blinkAnchors[i + 1].z);
            }
          }

          eclipsePillar.visible = false;
          shockwaveViolet.visible = true;
          shockwaveViolet.position.set(toPt.x, 0.22, toPt.z);
          shockwaveViolet.scale.setScalar(0.6 + dashEase * 2.8);
          shockwaveCrimson.visible = false;

          // High-speed streaking feathers trailing the Abyssal Blinks
          for (let i = 0; i < featherCount; i++) {
            const anchorRef = blinkAnchors[(i % 4) + 1];
            const ang = fAngles[i] + a3 * 9.5;
            const r = 0.65 + (i % 7) * 0.38;
            _dummy.position.set(
              anchorRef.x + Math.cos(ang) * r,
              0.45 + ((fHeights[i] + a3 * 3.2) % 3.6),
              anchorRef.z + Math.sin(ang) * r
            );
            _dummy.rotation.set(a3 * 14 + i, ang, 1.1);
            _dummy.scale.setScalar(0.82);
            _dummy.updateMatrix();
            featherInstanced.setMatrixAt(i, _dummy.matrix);
          }
          featherInstanced.instanceMatrix.needsUpdate = true;

          seraphCoreLight.intensity = 34 + Math.sin(a3 * Math.PI * 8) * 14;
          bloodMoonRimLight.intensity = 42;
          groundGlowLight.intensity = 18;
        } else {
          // ACT IV (9.4s - 12.0s): True Fallen Angel Apotheosis & Feather Vortex Eruption
          const a4 = (p - 0.78) / 0.22;
          const slamT = Math.min(1, a4 / 0.22);
          const blastT = Math.min(1, a4 / 0.72);
          const blastEase = 1 - Math.pow(1 - blastT, 3);

          heroGroup.position.set(0, 0.2 + (1 - slamT) * 0.75 + Math.sin(a4 * Math.PI) * 0.18, 0.15);
          heroGroup.rotation.set(0, 0, 0);
          headGroup.rotation.x = -0.08;
          rightDagger.visible = true;
          leftDagger.visible = true;
          rightArmPivot.rotation.set(-0.65, 0, -0.95 - (1 - slamT) * 0.4);
          leftArmPivot.rotation.set(-0.65, 0, 0.95 + (1 - slamT) * 0.4);

          // All 6 Seraph Wings spread wide in supreme dominance
          for (let w = 0; w < 3; w++) {
            const spread = 0.48 - w * 0.36;
            rightWings[w].rotation.set(-0.1, 0, spread);
            leftWings[w].rotation.set(-0.1, 0, -spread);
          }

          fallenHaloGroup.visible = true;
          fallenHaloGroup.scale.setScalar(1.36);
          fallenHaloGroup.rotation.z += dt * 5.2;

          for (let i = 0; i < 4; i++) {
            warpBeams[i].visible = false;
            warpGateRings[i].visible = false;
            phantomAfterimages[i].visible = false;
          }

          eclipsePillar.visible = true;
          const pScale = a4 < 0.25 ? 0.55 + (a4 / 0.25) * 1.45 : Math.max(0.25, 2.0 - (a4 - 0.25) * 1.5);
          eclipsePillar.scale.set(pScale, 1, pScale);
          pillarMat.opacity = a4 < 0.25 ? 0.75 : Math.max(0, 0.75 - (a4 - 0.25) * 0.85);

          shockwaveViolet.visible = true;
          shockwaveViolet.position.set(0, 0.22, 0.15);
          shockwaveViolet.scale.setScalar(0.8 + blastEase * 12.2);

          shockwaveCrimson.visible = true;
          shockwaveCrimson.position.set(0, 0.34, 0.15);
          shockwaveCrimson.scale.setScalar(0.5 + blastEase * 9.0);

          // Radial Obsidian Feather Explosion
          for (let i = 0; i < featherCount; i++) {
            const dist = blastEase * (4.8 + (i % 7) * 1.1);
            _dummy.position.set(
              fDirs[i].x * dist,
              Math.max(0.22, 1.3 + fDirs[i].y * dist * 0.95),
              0.15 + fDirs[i].z * dist
            );
            _dummy.rotation.set(blastEase * 12 + i, fAngles[i], i * 0.4);
            _dummy.scale.setScalar(Math.max(0.4, 1.15 - a4 * 0.55));
            _dummy.updateMatrix();
            featherInstanced.setMatrixAt(i, _dummy.matrix);
          }
          featherInstanced.instanceMatrix.needsUpdate = true;

          scene.background = _tmpColor.setHex(a4 < 0.14 ? 0x3b0764 : 0x05010c);
          seraphCoreLight.intensity = Math.max(22, 62 * (1 - a4 * 0.55));
          bloodMoonRimLight.intensity = Math.max(26, 56 * (1 - a4 * 0.4));
          groundGlowLight.intensity = Math.max(12, 46 * (1 - a4 * 0.5));
        }

        // 4-Act Dynamic Camera Choreography
        if (p < 0.25) {
          const a1 = p / 0.25;
          _camTarget.set(2.3 - a1 * 1.1, 0.78 + a1 * 0.55, 5.8 - a1 * 1.25);
          _lookTarget.set(0, 1.45 + a1 * 0.3, -0.3);
        } else if (p < 0.52) {
          const a2 = (p - 0.25) / 0.27;
          const camAng = 0.28 - a2 * 2.15;
          const camDist = 4.65 + Math.sin(a2 * Math.PI) * 1.15;
          _camTarget.set(
            Math.sin(camAng) * camDist,
            1.45 + a2 * 1.25,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(0, 1.65 + a2 * 0.45, -0.15);
        } else if (p < 0.78) {
          const a3 = (p - 0.52) / 0.26;
          const camAng = -1.87 + a3 * 2.35;
          const camDist = 6.9;
          _camTarget.set(
            Math.sin(camAng) * camDist,
            4.1 + Math.sin(a3 * Math.PI * 2) * 0.55,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(heroGroup.position.x * 0.45, 1.35, heroGroup.position.z * 0.45);
        } else {
          const a4 = (p - 0.78) / 0.22;
          const shakeMag = a4 < 0.3 ? (1 - a4 / 0.3) * 0.38 : 0;
          const shakeX = Math.sin(now * 0.12) * shakeMag;
          const shakeY = Math.cos(now * 0.15) * shakeMag;
          const camAng = 0.48 - a4 * 0.48;
          const camDist = 5.4 + Math.min(1, a4 * 1.3) * 2.7;
          _camTarget.set(
            Math.sin(camAng) * camDist + shakeX,
            2.15 + a4 * 0.95 + shakeY,
            Math.cos(camAng) * camDist
          );
          _lookTarget.set(0, 1.65, -0.15);
        }

        const dampFactor = 1 - Math.exp(-7.5 * dt);
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

  const currentMeta = ACT_META[act];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05010c] overflow-hidden select-none"
      role="dialog"
      aria-label="Cutscene 3D True Fallen Angel Ascension"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Cinematic Letterbox Bar (solid dark fill, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#080212]/92 border-b border-fuchsia-400/45 px-5 py-3.5 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-game tracking-[0.24em] uppercase text-fuchsia-300 truncate">
            FALLEN ANGEL · ECLIPSE SERAPHIM &amp; ABYSSAL BLINK 3D
          </p>
          <h2 className="font-title text-base sm:text-2xl font-black tracking-wider text-rose-200 truncate">
            {currentMeta.title}
          </h2>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <span className="inline-block px-2.5 py-1 rounded border border-fuchsia-400/45 bg-fuchsia-950/80 text-[11px] font-game tracking-wider text-rose-200">
            {currentMeta.badge}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-[#080212]/92 border-t border-fuchsia-400/45 px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="pointer-events-none min-w-0">
          <p className="text-[10px] sm:text-[11px] font-game tracking-[0.18em] uppercase text-fuchsia-300/85 truncate">
            {currentMeta.badge}
          </p>
          <p className="text-xs sm:text-sm font-medium italic text-rose-100/95 truncate">
            {currentMeta.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-400/60 hover:border-rose-300 text-fuchsia-50 font-game font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>Lewati Cutscene</span>
          <FastForward className="w-4 h-4 text-rose-300" />
        </button>

        {/* Bottom Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-400 to-amber-300 transition-[width] duration-75"
            style={{ width: `${uiProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
