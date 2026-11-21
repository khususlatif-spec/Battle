import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FastForward } from 'lucide-react';

interface TravelerTimeStop3DCutsceneProps {
  remainingTime: number;
  totalDuration?: number;
  onSkip: () => void;
  onWebGLUnavailable?: () => void;
}

type CutscenePhase = 'rapalan' | 'hourglass' | 'timestop';

const PHASE_LABELS: Record<CutscenePhase, string> = {
  rapalan: 'FASE I · TRAVELER MERAPALKAN MANTRA CHRONOS',
  hourglass: 'FASE II · JAM PASIR MUNCUL DARI LINGKARAN RAPALAN',
  timestop: 'FASE III · LEDAKAN AREA MENGHENTIKAN WAKTU (TIME STOP)'
};

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.35, 0);
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export const TravelerTimeStop3DCutscene: React.FC<TravelerTimeStop3DCutsceneProps> = ({
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

  const [phase, setPhase] = useState<CutscenePhase>('rapalan');
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
      scene.background = new THREE.Color(0x020a14);
      scene.fog = new THREE.FogExp2(0x03111f, 0.036);

      const camera = new THREE.PerspectiveCamera(
        46,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        90
      );
      camera.position.set(2.4, 2.2, 6.2);
      _currentLook.set(0, 1.35, 0.4);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      disposables.push(envRT, roomEnv, pmrem);

      // 3-Point Warm/Cool Lighting Rig + Incantation & Hourglass Point Lights
      const hemiLight = new THREE.HemisphereLight(0x67e8f9, 0x09131d, 0.95);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfef08a, 2.3);
      keyLight.position.set(4.5, 8.5, 5.5);
      scene.add(keyLight);

      const cyanRim = new THREE.PointLight(0x06b6d4, 18, 26, 1.4);
      cyanRim.position.set(-4.0, 3.2, -3.5);
      scene.add(cyanRim);

      const mantraLight = new THREE.PointLight(0x22d3ee, 14, 18, 1.4);
      mantraLight.position.set(0, 0.8, 1.65);
      scene.add(mantraLight);

      const hourglassLight = new THREE.PointLight(0xfbbf24, 6, 22, 1.4);
      hourglassLight.position.set(0, 2.1, 1.65);
      scene.add(hourglassLight);

      // Procedural CanvasTexture for Lingkaran Rapalan (Incantation Seal)
      const sealCanvas = document.createElement('canvas');
      sealCanvas.width = 512;
      sealCanvas.height = 512;
      const sctx = sealCanvas.getContext('2d');
      if (sctx) {
        sctx.clearRect(0, 0, 512, 512);
        const radGrad = sctx.createRadialGradient(256, 256, 16, 256, 256, 248);
        radGrad.addColorStop(0, 'rgba(34, 211, 238, 0.72)');
        radGrad.addColorStop(0.45, 'rgba(6, 182, 212, 0.28)');
        radGrad.addColorStop(0.8, 'rgba(251, 191, 36, 0.16)');
        radGrad.addColorStop(1, 'rgba(2, 10, 20, 0)');
        sctx.fillStyle = radGrad;
        sctx.fillRect(0, 0, 512, 512);

        // Outer Double Magic Circle
        sctx.strokeStyle = '#67e8f9';
        sctx.lineWidth = 4;
        sctx.beginPath();
        sctx.arc(256, 256, 236, 0, Math.PI * 2);
        sctx.stroke();

        sctx.strokeStyle = '#fbbf24';
        sctx.lineWidth = 2.5;
        sctx.beginPath();
        sctx.arc(256, 256, 204, 0, Math.PI * 2);
        sctx.stroke();

        // 8-Point Arcane Chant Star
        sctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
        sctx.lineWidth = 2.2;
        for (let sq = 0; sq < 2; sq++) {
          const offset = sq * (Math.PI / 4);
          sctx.beginPath();
          for (let i = 0; i <= 4; i++) {
            const a = offset + (i * Math.PI) / 2;
            const px = 256 + Math.cos(a) * 198;
            const py = 256 + Math.sin(a) * 198;
            if (i === 0) sctx.moveTo(px, py);
            else sctx.lineTo(px, py);
          }
          sctx.stroke();
        }

        // Inner Rune Band & Glyph Bars
        sctx.strokeStyle = '#22d3ee';
        sctx.lineWidth = 2;
        sctx.beginPath();
        sctx.arc(256, 256, 134, 0, Math.PI * 2);
        sctx.stroke();

        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI * 2) / 24;
          sctx.strokeStyle = i % 2 === 0 ? '#fbbf24' : '#67e8f9';
          sctx.lineWidth = i % 3 === 0 ? 3 : 1.6;
          sctx.beginPath();
          sctx.moveTo(256 + Math.cos(a) * 208, 256 + Math.sin(a) * 208);
          sctx.lineTo(256 + Math.cos(a) * 230, 256 + Math.sin(a) * 230);
          sctx.stroke();
        }

        // Inner Hourglass Seal Motif
        sctx.strokeStyle = '#fef08a';
        sctx.lineWidth = 2.4;
        sctx.beginPath();
        sctx.moveTo(212, 206);
        sctx.lineTo(300, 206);
        sctx.lineTo(212, 306);
        sctx.lineTo(300, 306);
        sctx.closePath();
        sctx.stroke();
      }
      const sealTex = new THREE.CanvasTexture(sealCanvas);
      sealTex.colorSpace = THREE.SRGBColorSpace;
      sealTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      disposables.push(sealTex);

      // Shared PBR Materials
      const obsidianMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0a1320,
          roughness: 0.48,
          metalness: 0.58
        })
      );
      const cloakMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0f2942,
          emissive: 0x082f49,
          emissiveIntensity: 0.35,
          roughness: 0.65,
          metalness: 0.18,
          side: THREE.DoubleSide
        })
      );
      const armorCyanMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0e7490,
          emissive: 0x083344,
          emissiveIntensity: 0.45,
          roughness: 0.24,
          metalness: 0.82
        })
      );
      const goldTrimMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xb45309,
          emissiveIntensity: 0.4,
          roughness: 0.18,
          metalness: 0.92
        })
      );
      const cyanGlowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x67e8f9,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.1,
          roughness: 0.14,
          metalness: 0.1
        })
      );
      const goldGlowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.0,
          roughness: 0.15,
          metalness: 0.2
        })
      );
      const glassBulbMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0xa5f3fc,
          emissive: 0x0891b2,
          emissiveIntensity: 0.45,
          roughness: 0.08,
          metalness: 0.08,
          transparent: true,
          opacity: isSoftwareGl ? 0.5 : 0.72,
          clearcoat: 1.0,
          depthWrite: false
        })
      );

      // 1. Grounded Arena Floor & Stone Pedestal
      const floorPlane = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(24, 48)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x030b15,
            roughness: 0.88,
            metalness: 0.2
          })
        )
      );
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.y = -0.22;
      scene.add(floorPlane);

      const daisBase = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(4.4, 4.9, 0.22, 16)),
        obsidianMat
      );
      daisBase.position.y = -0.11;
      scene.add(daisBase);

      const daisTrim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(4.42, 0.055, 10, 64)),
        goldTrimMat
      );
      daisTrim.rotation.x = Math.PI / 2;
      daisTrim.position.y = 0.01;
      scene.add(daisTrim);

      // Arena perimeter pylons
      const pylonGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.22, 1.85, 6));
      const pylonCapGeo = trackGeo(new THREE.OctahedronGeometry(0.2, 0));
      const pylonCaps: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6 + Math.PI / 6;
        const pGroup = new THREE.Group();
        pGroup.position.set(Math.cos(ang) * 5.2, 0.7, Math.sin(ang) * 5.2);
        pGroup.lookAt(0, 0.7, 0);
        pGroup.add(new THREE.Mesh(pylonGeo, obsidianMat));
        const cap = new THREE.Mesh(pylonCapGeo, i % 2 === 0 ? cyanGlowMat : goldGlowMat);
        cap.position.y = 1.2;
        pGroup.add(cap);
        pylonCaps.push(cap);
        scene.add(pGroup);
      }

      // 2. Composite 3D Traveler Character (Grounded at z = -0.75, facing +Z toward the Rapalan Circle)
      const travelerGroup = new THREE.Group();
      travelerGroup.position.set(0, 0, -0.75);
      scene.add(travelerGroup);

      // Boots & Legs (grounded at y = 0)
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 0.78, 8));
      const legL = new THREE.Mesh(legGeo, obsidianMat);
      legL.position.set(-0.18, 0.39, 0);
      const legR = new THREE.Mesh(legGeo, obsidianMat);
      legR.position.set(0.18, 0.39, 0);
      travelerGroup.add(legL, legR);

      // Pelvis & Belt Buckle
      const pelvis = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.27, 0.24, 0.28, 8)),
        obsidianMat
      );
      pelvis.position.y = 0.88;
      const beltBuckle = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.1, 0)), goldGlowMat);
      beltBuckle.position.set(0, 0.9, 0.26);
      travelerGroup.add(pelvis, beltBuckle);

      // Armored Torso & Chest Chrono Core
      const torso = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.36, 0.26, 0.78, 8)),
        armorCyanMat
      );
      torso.position.y = 1.38;
      const chestSigil = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.13, 0)), cyanGlowMat);
      chestSigil.position.set(0, 1.44, 0.32);
      travelerGroup.add(torso, chestSigil);

      // Flowing Temporal Mantle / Cloak behind Traveler
      const cloakShape = new THREE.Shape();
      cloakShape.moveTo(-0.42, 0);
      cloakShape.lineTo(0.42, 0);
      cloakShape.lineTo(0.72, -1.45);
      cloakShape.lineTo(0, -1.62);
      cloakShape.lineTo(-0.72, -1.45);
      cloakShape.closePath();
      const cloakGeo = trackGeo(
        new THREE.ExtrudeGeometry(cloakShape, { depth: 0.04, bevelEnabled: false })
      );
      const cloakMesh = new THREE.Mesh(cloakGeo, cloakMat);
      cloakMesh.position.set(0, 1.7, -0.26);
      cloakMesh.rotation.x = 0.22;
      travelerGroup.add(cloakMesh);

      // Shoulder Pauldrons
      const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.21, 0));
      const pauldronL = new THREE.Mesh(pauldronGeo, goldTrimMat);
      pauldronL.position.set(-0.44, 1.66, 0);
      pauldronL.scale.set(1.15, 0.75, 1.0);
      const pauldronR = pauldronL.clone();
      pauldronR.position.x = 0.44;
      travelerGroup.add(pauldronL, pauldronR);

      // Hooded Head & Luminous Cyan Visor
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.98, 0.03);
      const hoodMesh = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.28, 0.48, 7)), cloakMat);
      hoodMesh.position.set(0, 0.1, -0.04);
      hoodMesh.rotation.x = -0.24;
      const faceHelm = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.2, 0)), obsidianMat);
      const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.06, 0.14)), cyanGlowMat);
      visor.position.set(0, 0.01, 0.15);
      headGroup.add(hoodMesh, faceHelm, visor);
      travelerGroup.add(headGroup);

      // Articulated Chanting Arms + Glowing Spell Orbs in Hands
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.07, 0.68, 8));
      const handOrbGeo = trackGeo(new THREE.SphereGeometry(0.11, 14, 14));

      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.42, 1.62, 0.04);
      const leftArmMesh = new THREE.Mesh(armGeo, armorCyanMat);
      leftArmMesh.position.set(0, -0.32, 0);
      const leftHandOrb = new THREE.Mesh(handOrbGeo, cyanGlowMat);
      leftHandOrb.position.set(0, -0.68, 0);
      leftArmPivot.add(leftArmMesh, leftHandOrb);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.42, 1.62, 0.04);
      const rightArmMesh = new THREE.Mesh(armGeo, armorCyanMat);
      rightArmMesh.position.set(0, -0.32, 0);
      const rightHandOrb = new THREE.Mesh(handOrbGeo, goldGlowMat);
      rightHandOrb.position.set(0, -0.68, 0);
      rightArmPivot.add(rightArmMesh, rightHandOrb);
      travelerGroup.add(leftArmPivot, rightArmPivot);

      // Floating Chrono Halo behind Traveler (lights up during Time Stop)
      const travelerHalo = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.72, 0.032, 8, 48)),
        goldTrimMat
      );
      travelerHalo.position.set(0, 1.72, -0.38);
      travelerHalo.visible = false;
      travelerGroup.add(travelerHalo);

      // 3. Lingkaran Rapalan Mantra (Incantation Circle in front of Traveler at z = 1.65)
      const rapalanGroup = new THREE.Group();
      rapalanGroup.position.set(0, 0.03, 1.65);
      scene.add(rapalanGroup);

      const rapalanMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: sealTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const rapalanDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(2.15, 48)), rapalanMat);
      rapalanDisc.rotation.x = -Math.PI / 2;
      rapalanGroup.add(rapalanDisc);

      const rapalanRingOuter = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(2.18, 0.045, 10, 64)),
        cyanGlowMat
      );
      rapalanRingOuter.rotation.x = Math.PI / 2;
      rapalanRingOuter.position.y = 0.03;

      const rapalanRingInner = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.42, 0.032, 8, 48)),
        goldGlowMat
      );
      rapalanRingInner.rotation.x = Math.PI / 2;
      rapalanRingInner.position.y = 0.06;
      rapalanGroup.add(rapalanRingOuter, rapalanRingInner);

      // Vertical Energy Pillar / Beam rising from Rapalan Circle during Summon
      const summonBeamMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const summonBeam = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.15, 1.45, 5.2, 24, 1, true)),
        summonBeamMat
      );
      summonBeam.position.y = 2.6;
      rapalanGroup.add(summonBeam);

      // 4. Composite 3D Jam Pasir Chronos (Rises from the Rapalan Circle at z = 1.65)
      const hourglassGroup = new THREE.Group();
      hourglassGroup.position.set(0, -1.6, 1.65);
      hourglassGroup.visible = false;
      scene.add(hourglassGroup);

      // Ornate End Caps & Crown Rings
      const capMainGeo = trackGeo(new THREE.CylinderGeometry(0.92, 0.96, 0.16, 12));
      const capRimGeo = trackGeo(new THREE.TorusGeometry(0.95, 0.055, 10, 48));
      const hgTopCap = new THREE.Mesh(capMainGeo, obsidianMat);
      hgTopCap.position.y = 1.42;
      const hgTopRim = new THREE.Mesh(capRimGeo, goldTrimMat);
      hgTopRim.rotation.x = Math.PI / 2;
      hgTopRim.position.y = 1.42;

      const hgBotCap = new THREE.Mesh(capMainGeo, obsidianMat);
      hgBotCap.position.y = -1.42;
      const hgBotRim = new THREE.Mesh(capRimGeo, goldTrimMat);
      hgBotRim.rotation.x = Math.PI / 2;
      hgBotRim.position.y = -1.42;

      const hgCrownSpike = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), cyanGlowMat);
      hgCrownSpike.position.y = 1.68;
      const hgBaseSpike = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), goldGlowMat);
      hgBaseSpike.position.y = -1.68;

      // 4 Ornate Gilded Support Pillars
      const hgPillarGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 2.84, 8));
      const hgPillarRingGeo = trackGeo(new THREE.TorusGeometry(0.085, 0.025, 8, 16));
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const px = Math.cos(a) * 0.82;
        const pz = Math.sin(a) * 0.82;
        const pillar = new THREE.Mesh(hgPillarGeo, goldTrimMat);
        pillar.position.set(px, 0, pz);
        const midBand = new THREE.Mesh(hgPillarRingGeo, cyanGlowMat);
        midBand.rotation.x = Math.PI / 2;
        midBand.position.set(px, 0, pz);
        hourglassGroup.add(pillar, midBand);
      }

      // Twin Glass Bulbs + Waist Collar + Sand Cones + Stream
      const bulbGeo = trackGeo(new THREE.ConeGeometry(0.72, 1.32, 20, 1, true));
      const hgTopBulb = new THREE.Mesh(bulbGeo, glassBulbMat);
      hgTopBulb.rotation.x = Math.PI;
      hgTopBulb.position.y = 0.68;
      const hgBotBulb = new THREE.Mesh(bulbGeo, glassBulbMat);
      hgBotBulb.position.y = -0.68;

      const waistCollar = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.18, 0.05, 10, 32)),
        goldTrimMat
      );
      waistCollar.rotation.x = Math.PI / 2;

      const topSandMesh = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.56, 0.85, 16)),
        goldGlowMat
      );
      topSandMesh.rotation.x = Math.PI;
      topSandMesh.position.y = 0.56;

      const botSandMesh = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.58, 0.9, 16)),
        cyanGlowMat
      );
      botSandMesh.position.y = -0.92;

      const sandStream = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.05, 8)),
        goldGlowMat
      );
      sandStream.position.y = -0.22;

      // Orbiting Astrolabe Rings around the Hourglass
      const hgOrbitRingA = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.38, 0.04, 10, 56)),
        cyanGlowMat
      );
      const hgOrbitRingB = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.62, 0.035, 10, 56)),
        goldTrimMat
      );
      hgOrbitRingB.rotation.x = Math.PI / 3;

      hourglassGroup.add(
        hgTopCap,
        hgTopRim,
        hgBotCap,
        hgBotRim,
        hgCrownSpike,
        hgBaseSpike,
        hgTopBulb,
        hgBotBulb,
        waistCollar,
        topSandMesh,
        botSandMesh,
        sandStream,
        hgOrbitRingA,
        hgOrbitRingB
      );

      // 5. Area Explosion & Time Stop Freeze Elements (Phase III)
      const areaDomeMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0,
          wireframe: true,
          depthWrite: false
        })
      );
      const areaDome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
        areaDomeMat
      );
      areaDome.position.set(0, 0.02, 1.65);
      areaDome.visible = false;
      scene.add(areaDome);

      const shockwaveCyan = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.08, 10, 64)),
        cyanGlowMat
      );
      shockwaveCyan.rotation.x = Math.PI / 2;
      shockwaveCyan.position.set(0, 0.14, 1.65);
      shockwaveCyan.visible = false;
      scene.add(shockwaveCyan);

      const shockwaveGold = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.055, 10, 64)),
        goldGlowMat
      );
      shockwaveGold.rotation.x = Math.PI / 2;
      shockwaveGold.position.set(0, 0.22, 1.65);
      shockwaveGold.visible = false;
      scene.add(shockwaveGold);

      // Instanced Rising Mantra Sparks (Phase I & II) + Radial Area Shards (Phase III)
      const shardCount = 64;
      const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
      const shardMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x22d3ee,
          emissiveIntensity: 1.8,
          roughness: 0.14,
          metalness: 0.42
        })
      );
      const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
      shardInstanced.frustumCulled = false;
      scene.add(shardInstanced);

      const shardDirs: THREE.Vector3[] = [];
      const shardSpeeds: number[] = [];
      const mantraAngles: number[] = [];
      for (let i = 0; i < shardCount; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / shardCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        shardDirs.push(
          new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.abs(Math.cos(phi)) * 0.62 + 0.16,
            Math.sin(phi) * Math.sin(theta)
          ).normalize()
        );
        shardSpeeds.push(4.6 + (i % 6) * 0.95);
        mantraAngles.push((i * Math.PI * 2) / shardCount);
        _tmpColor.setHex(i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0xfbbf24 : 0xa5f3fc);
        shardInstanced.setColorAt(i, _tmpColor);
      }
      if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;

      // Ambient Chronos Dust
      const dustCount = 150;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 1.6 + Math.random() * 6.4;
        dustPositions[i * 3] = Math.cos(ang) * rad;
        dustPositions[i * 3 + 1] = 0.2 + Math.random() * 4.5;
        dustPositions[i * 3 + 2] = Math.sin(ang) * rad;
      }
      const dustGeo = trackGeo(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = trackMat(
        new THREE.PointsMaterial({
          color: 0x67e8f9,
          size: 0.08,
          transparent: true,
          opacity: 0.78,
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
      let lastPhase: CutscenePhase = 'rapalan';
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
          p < 0.34 ? 'rapalan' : p < 0.64 ? 'hourglass' : 'timestop';
        if (nextPhase !== lastPhase) {
          lastPhase = nextPhase;
          setPhase(nextPhase);
        }

        // Freeze background rotation once Time Stop triggers (p >= 0.74)
        const timeStopFreezeFactor = p < 0.64 ? 1.0 : p < 0.74 ? 1 - (p - 0.64) / 0.1 : 0.04;
        dustPoints.rotation.y += dt * 0.35 * timeStopFreezeFactor;
        for (let i = 0; i < pylonCaps.length; i++) {
          pylonCaps[i].rotation.y += dt * 2.2 * timeStopFreezeFactor;
          pylonCaps[i].position.y = 1.2 + Math.sin(now * 0.003 + i) * 0.08 * timeStopFreezeFactor;
        }

        if (p < 0.34) {
          // PHASE I: Traveler Mengeluarkan Rapalan Mantra
          const rp = p / 0.34;
          const easeOut = 1 - Math.pow(1 - rp, 3);

          // Traveler leaning slightly forward, arms raising in casting chant
          travelerGroup.position.y = Math.sin(rp * Math.PI * 3) * 0.02;
          leftArmPivot.rotation.set(-0.45 - easeOut * 1.15, 0.25, -0.22);
          rightArmPivot.rotation.set(-0.45 - easeOut * 1.15, -0.25, 0.22);
          headGroup.rotation.x = -0.06 + Math.sin(rp * Math.PI * 4) * 0.05;
          cloakMesh.rotation.x = 0.22 + Math.sin(rp * Math.PI * 5) * 0.08;
          travelerHalo.visible = false;

          // Lingkaran Rapalan unfolds on the floor in front of Traveler
          rapalanGroup.scale.setScalar(0.15 + easeOut * 0.9);
          rapalanMat.opacity = Math.min(0.95, rp * 1.6);
          rapalanDisc.rotation.z = rp * Math.PI * 1.8;
          rapalanRingOuter.rotation.z = -rp * Math.PI * 2.4;
          rapalanRingInner.rotation.z = rp * Math.PI * 3.0;
          summonBeamMat.opacity = rp * 0.18;

          // Hide Hourglass until Phase II
          hourglassGroup.visible = false;
          areaDome.visible = false;
          shockwaveCyan.visible = false;
          shockwaveGold.visible = false;

          // Rising mantra sparks spiraling up from the Rapalan circle
          shardInstanced.visible = true;
          for (let i = 0; i < shardCount; i++) {
            const loopT = (rp * 1.6 + i / shardCount) % 1;
            const ang = mantraAngles[i] + rp * Math.PI * 3;
            const rad = 0.6 + (1 - loopT) * 1.45;
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.15 + loopT * 2.5,
              1.65 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(loopT * 5, ang, i);
            _dummy.scale.setScalar(0.45 + Math.sin(loopT * Math.PI) * 0.45);
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          mantraLight.intensity = 10 + easeOut * 18;
          hourglassLight.intensity = 2;
        } else if (p < 0.64) {
          // PHASE II: Dari Rapalan Muncul Jam Pasir Chronos
          const hp = (p - 0.34) / 0.3;
          const riseEase = 1 - Math.pow(1 - Math.min(1, hp * 1.25), 3);

          // Traveler holds both arms high channeling energy into the emerging Hourglass
          leftArmPivot.rotation.set(-1.65 - Math.sin(hp * Math.PI * 4) * 0.08, 0.32, -0.35);
          rightArmPivot.rotation.set(-1.65 - Math.sin(hp * Math.PI * 4) * 0.08, -0.32, 0.35);
          cloakMesh.rotation.x = 0.32 + Math.sin(hp * Math.PI * 6) * 0.1;

          // Rapalan circle pulses brightly as portal opens
          rapalanGroup.scale.setScalar(1.05 + Math.sin(hp * Math.PI * 4) * 0.06);
          rapalanMat.opacity = 0.96;
          rapalanDisc.rotation.z += dt * 2.6;
          rapalanRingOuter.rotation.z -= dt * 3.4;
          rapalanRingInner.rotation.z += dt * 4.2;
          summonBeamMat.opacity = Math.sin(hp * Math.PI) * 0.42;

          // Jam Pasir emerges upward from the rapalan circle and locks into charge
          hourglassGroup.visible = true;
          hourglassGroup.position.set(0, -1.2 + riseEase * 3.15, 1.65);
          const hgScale = 0.25 + riseEase * 0.78 + (hp > 0.75 ? ((hp - 0.75) / 0.25) * 0.16 : 0);
          hourglassGroup.scale.setScalar(hgScale);
          hourglassGroup.rotation.y = hp * Math.PI * 1.6;
          hourglassGroup.rotation.z = hp > 0.7 ? Math.sin(hp * 45) * 0.06 : 0;

          hgOrbitRingA.rotation.x = hp * Math.PI * 4;
          hgOrbitRingA.rotation.y = hp * Math.PI * 3;
          hgOrbitRingB.rotation.z = -hp * Math.PI * 4.5;

          const sandTransfer = Math.min(1, hp * 1.15);
          topSandMesh.scale.setScalar(Math.max(0.18, 1 - sandTransfer * 0.7));
          botSandMesh.scale.setScalar(0.35 + sandTransfer * 0.7);
          sandStream.scale.set(1 + Math.sin(hp * 20) * 0.25, 1, 1 + Math.sin(hp * 20) * 0.25);

          // Converge mantra sparks into the Hourglass waist
          for (let i = 0; i < shardCount; i++) {
            const loopT = (hp * 2.2 + i / shardCount) % 1;
            const ang = mantraAngles[i] - hp * Math.PI * 4;
            const rad = 1.9 * (1 - loopT);
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.2 + loopT * 1.75,
              1.65 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(hp * 6 + i, ang, i);
            _dummy.scale.setScalar(0.55 * (1 - loopT * 0.5));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          areaDome.visible = false;
          shockwaveCyan.visible = false;
          shockwaveGold.visible = false;

          mantraLight.intensity = 26;
          hourglassLight.intensity = 8 + hp * 30;
        } else {
          // PHASE III: Ledakan Area & Time Stop
          const ep = (p - 0.64) / 0.36;
          const blastT = Math.min(1, ep / 0.38);
          const blastEase = 1 - Math.pow(1 - blastT, 3);

          // Traveler lowers sword-cast stance with glowing golden halo behind
          leftArmPivot.rotation.set(-1.1, 0.45, -0.45);
          rightArmPivot.rotation.set(-1.1, -0.45, 0.45);
          travelerHalo.visible = true;
          travelerHalo.rotation.z = ep * Math.PI * 0.8;

          // Rapalan circle fades gently into frozen temporal runes
          rapalanMat.opacity = Math.max(0.35, 0.96 - ep * 0.55);
          summonBeamMat.opacity = Math.max(0, (1 - blastT) * 0.35);

          // Hourglass hovers sovereignly above the Time Stop blast, freezing mid-spin
          hourglassGroup.visible = true;
          hourglassGroup.position.set(0, 2.05 + Math.sin(ep * Math.PI) * 0.12, 1.65);
          hourglassGroup.scale.setScalar(1.08 + (ep < 0.2 ? Math.sin((ep / 0.2) * Math.PI) * 0.24 : 0));
          hourglassGroup.rotation.z = 0;
          hourglassGroup.rotation.y += dt * 1.4 * timeStopFreezeFactor;
          hgOrbitRingA.rotation.x += dt * 3.0 * timeStopFreezeFactor;
          hgOrbitRingB.rotation.z -= dt * 3.0 * timeStopFreezeFactor;
          sandStream.scale.setScalar(ep < 0.25 ? 1 : Math.max(0.05, 1 - (ep - 0.25) * 4));

          // Expanding Area Explosion Dome + Dual Ground Shockwaves -> Locked in Time Stop!
          areaDome.visible = true;
          const domeRadius = 0.8 + blastEase * 9.5;
          areaDome.scale.setScalar(domeRadius);
          areaDomeMat.opacity = ep < 0.35 ? 0.42 : Math.max(0.08, 0.42 - (ep - 0.35) * 0.5);

          shockwaveCyan.visible = true;
          shockwaveGold.visible = true;
          shockwaveCyan.scale.setScalar(0.8 + blastEase * 10.5);
          shockwaveGold.scale.setScalar(0.5 + blastEase * 7.8);

          // Radial Shards burst outward from the Hourglass then FREEZE mid-air!
          shardInstanced.visible = true;
          const frozenDist = blastT < 1 ? blastEase : 1 + (ep - 0.38) * 0.02;
          for (let i = 0; i < shardCount; i++) {
            const dist = frozenDist * shardSpeeds[i];
            _dummy.position.set(
              shardDirs[i].x * dist,
              Math.max(0.15, 1.95 + shardDirs[i].y * dist * 0.85),
              1.65 + shardDirs[i].z * dist
            );
            _dummy.rotation.set(frozenDist * 5 + i, frozenDist * 4, i * 0.6);
            _dummy.scale.setScalar(0.95);
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          // Subtle Time-Stop color inversion/chill on background
          scene.background = _tmpColor.setHex(ep < 0.14 ? 0x0b2538 : 0x020912);

          mantraLight.intensity = 14;
          hourglassLight.intensity = Math.max(12, 48 * (1 - blastT * 0.65));
          cyanRim.intensity = Math.max(18, 42 * (1 - blastT * 0.4));
        }

        // Dynamic 3D Camera Choreography
        if (p < 0.34) {
          // Close heroic 3/4 view on Traveler casting Rapalan Mantra
          const rp = p / 0.34;
          _camTarget.set(2.35 - rp * 0.55, 2.05 - rp * 0.25, 5.4 - rp * 0.4);
          _lookTarget.set(0, 1.25, 0.45);
        } else if (p < 0.64) {
          // Orbit wider & tilt up as the Jam Pasir rises out of the Rapalan circle
          const hp = (p - 0.34) / 0.3;
          const camAng = 0.36 - hp * 0.92;
          const camDist = 5.4 + hp * 1.4;
          _camTarget.set(
            Math.sin(camAng) * camDist,
            1.75 + hp * 0.95,
            Math.cos(camAng) * camDist + 0.6
          );
          _lookTarget.set(0, 1.4 + hp * 0.45, 1.25);
        } else {
          // Pull back for dramatic wide Area Explosion & Time Stop freeze reveal
          const ep = (p - 0.64) / 0.36;
          const shakeMag = ep < 0.26 ? (1 - ep / 0.26) * 0.32 : 0;
          const shakeX = Math.sin(now * 0.09) * shakeMag;
          const shakeY = Math.cos(now * 0.12) * shakeMag;
          const camAng = -0.56 + ep * 0.95;
          const camDist = 6.9 + Math.min(1, ep * 1.4) * 2.2;
          _camTarget.set(
            Math.sin(camAng) * camDist + shakeX,
            2.65 + ep * 0.85 + shakeY,
            Math.cos(camAng) * camDist + 0.6
          );
          _lookTarget.set(0, 1.55, 1.1);
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

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020a14] overflow-hidden select-none"
      role="dialog"
      aria-label="Cutscene 3D Time Stop Berserk"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Cinematic Letterbox Bar (solid dark fill, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#020913]/92 border-b border-cyan-500/40 px-5 py-3.5 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-game tracking-[0.24em] uppercase text-cyan-300 truncate">
            TRAVELER · RAPALAN JAM PASIR 3D
          </p>
          <h2 className="font-title text-base sm:text-2xl font-black tracking-wider text-amber-300 truncate">
            TIME STOP BERSERK
          </h2>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <span className="inline-block px-2.5 py-1 rounded border border-cyan-400/40 bg-cyan-950/75 text-[11px] font-game tracking-wider text-cyan-200">
            {phase === 'rapalan'
              ? 'FASE I · RAPALAN MANTRA'
              : phase === 'hourglass'
                ? 'FASE II · JAM PASIR MUNCUL'
                : 'FASE III · LEDAKAN TIME STOP'}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-[#020913]/92 border-t border-cyan-500/40 px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <p className="pointer-events-none text-[11px] sm:text-xs font-game tracking-wider text-cyan-200/90 truncate">
          {PHASE_LABELS[phase]}
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/60 hover:border-amber-300 text-cyan-50 font-game font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>Lewati Cutscene</span>
          <FastForward className="w-4 h-4 text-amber-300" />
        </button>

        {/* Bottom Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 transition-[width] duration-75"
            style={{ width: `${uiProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
