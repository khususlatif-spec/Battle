import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FastForward } from 'lucide-react';
import { ArcanaSuit } from '../types/game';

interface ArcanaTarot3DCutsceneProps {
  remainingTime: number;
  totalDuration?: number;
  cards?: ArcanaSuit[];
  onSkip: () => void;
  onWebGLUnavailable?: () => void;
}

type CutscenePhase = 'draw' | 'verdict' | 'roulette';

const PHASE_LABELS: Record<CutscenePhase, string> = {
  draw: 'FASE I · ARCANA MENARIK 3 KARTU TAROT TAKDIR',
  verdict: 'FASE II · PEMBUKAAN KARTU & VONIS HUKUMAN TAROT',
  roulette: 'FASE III · LEDAKAN DESTINY ROULETTE & PERTARUNGAN AKTIF'
};

const SUIT_META: Record<
  ArcanaSuit,
  { icon: string; hex: number; cssColor: string; title: string; punish: string }
> = {
  spade: {
    icon: '♠',
    hex: 0x38bdf8,
    cssColor: '#38bdf8',
    title: 'THE EXECUTIONER',
    punish: 'EKSEKUSI'
  },
  heart: {
    icon: '♥',
    hex: 0xfb7185,
    cssColor: '#fb7185',
    title: 'CRIMSON CHALICE',
    punish: 'SIPHON HP'
  },
  diamond: {
    icon: '♦',
    hex: 0xfbbf24,
    cssColor: '#fbbf24',
    title: 'GILDED PRISM',
    punish: 'PECAH DEF'
  },
  club: {
    icon: '♣',
    hex: 0xa855f7,
    cssColor: '#a855f7',
    title: 'ARCANE THUNDER',
    punish: 'PETIR STUN'
  }
};

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.4, 0.5);
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export const ArcanaTarot3DCutscene: React.FC<ArcanaTarot3DCutsceneProps> = ({
  remainingTime,
  totalDuration = 2.7,
  cards,
  onSkip,
  onWebGLUnavailable
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remainingRef = useRef<number>(remainingTime);
  const lastSyncTimeRef = useRef<number>(performance.now());
  const onSkipRef = useRef(onSkip);
  const onFallbackRef = useRef(onWebGLUnavailable);

  const normalizedCards: [ArcanaSuit, ArcanaSuit, ArcanaSuit] = [
    cards?.[0] ?? 'spade',
    cards?.[1] ?? 'heart',
    cards?.[2] ?? 'diamond'
  ];
  const cardsKey = normalizedCards.join(',');

  const [phase, setPhase] = useState<CutscenePhase>('draw');
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

    const activeCards: [ArcanaSuit, ArcanaSuit, ArcanaSuit] = normalizedCards;
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
      renderer.toneMappingExposure = 1.16;
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
      const trackTex = <T extends THREE.Texture>(t: T): T => {
        disposables.push(t);
        return t;
      };

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090212);
      scene.fog = new THREE.FogExp2(0x110421, 0.036);

      const camera = new THREE.PerspectiveCamera(
        46,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        90
      );
      camera.position.set(2.4, 2.2, 6.2);
      _currentLook.set(0, 1.4, 0.5);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      disposables.push(envRT, roomEnv, pmrem);

      // 3-Point Warm/Cool Lighting Rig + Roulette & Tarot Lights
      const hemiLight = new THREE.HemisphereLight(0xf472b6, 0x0b0316, 0.95);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfef08a, 2.35);
      keyLight.position.set(4.5, 8.5, 5.5);
      scene.add(keyLight);

      const magentaRim = new THREE.PointLight(0xec4899, 20, 26, 1.4);
      magentaRim.position.set(-4.2, 3.4, -3.2);
      scene.add(magentaRim);

      const rouletteLight = new THREE.PointLight(0xfbbf24, 16, 20, 1.4);
      rouletteLight.position.set(0, 1.0, 1.5);
      scene.add(rouletteLight);

      const cardStageLight = new THREE.PointLight(0xf472b6, 12, 22, 1.4);
      cardStageLight.position.set(0, 2.5, 2.4);
      scene.add(cardStageLight);

      const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

      // Procedural Texture 1: Destiny Roulette Floor Wheel
      const wheelCanvas = document.createElement('canvas');
      wheelCanvas.width = 512;
      wheelCanvas.height = 512;
      const wctx = wheelCanvas.getContext('2d');
      if (wctx) {
        wctx.clearRect(0, 0, 512, 512);
        const bgGrad = wctx.createRadialGradient(256, 256, 24, 256, 256, 248);
        bgGrad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
        bgGrad.addColorStop(0.45, 'rgba(190, 24, 93, 0.34)');
        bgGrad.addColorStop(0.82, 'rgba(88, 28, 135, 0.25)');
        bgGrad.addColorStop(1, 'rgba(9, 2, 18, 0)');
        wctx.fillStyle = bgGrad;
        wctx.fillRect(0, 0, 512, 512);

        // 12 Roulette Sectors
        for (let i = 0; i < 12; i++) {
          const a0 = (i * Math.PI * 2) / 12;
          const a1 = ((i + 1) * Math.PI * 2) / 12;
          wctx.beginPath();
          wctx.moveTo(256, 256);
          wctx.arc(256, 256, 232, a0, a1);
          wctx.closePath();
          wctx.fillStyle = i % 2 === 0 ? 'rgba(131, 24, 67, 0.38)' : 'rgba(15, 23, 42, 0.42)';
          wctx.fill();
          wctx.strokeStyle = i % 3 === 0 ? '#fbbf24' : 'rgba(244, 114, 182, 0.65)';
          wctx.lineWidth = i % 3 === 0 ? 3 : 1.6;
          wctx.stroke();
        }

        // Concentric Gold & Magenta Rings
        wctx.strokeStyle = '#fde047';
        wctx.lineWidth = 5;
        wctx.beginPath();
        wctx.arc(256, 256, 234, 0, Math.PI * 2);
        wctx.stroke();

        wctx.strokeStyle = '#ec4899';
        wctx.lineWidth = 3;
        wctx.beginPath();
        wctx.arc(256, 256, 168, 0, Math.PI * 2);
        wctx.stroke();

        wctx.strokeStyle = '#fbbf24';
        wctx.lineWidth = 2.5;
        wctx.beginPath();
        wctx.arc(256, 256, 98, 0, Math.PI * 2);
        wctx.stroke();

        // Suit symbols around outer band
        const pipIcons = ['♠', '♥', '♦', '♣'];
        const pipColors = ['#38bdf8', '#fb7185', '#fbbf24', '#c084fc'];
        wctx.textAlign = 'center';
        wctx.textBaseline = 'middle';
        wctx.font = 'bold 28px sans-serif';
        for (let i = 0; i < 12; i++) {
          const ang = ((i + 0.5) * Math.PI * 2) / 12;
          const rx = 256 + Math.cos(ang) * 200;
          const ry = 256 + Math.sin(ang) * 200;
          wctx.save();
          wctx.translate(rx, ry);
          wctx.rotate(ang + Math.PI / 2);
          wctx.fillStyle = pipColors[i % 4];
          wctx.fillText(pipIcons[i % 4], 0, 0);
          wctx.restore();
        }
      }
      const wheelTex = trackTex(new THREE.CanvasTexture(wheelCanvas));
      wheelTex.colorSpace = THREE.SRGBColorSpace;
      wheelTex.anisotropy = maxAniso;

      // Procedural Texture 2: Ornate Tarot Card Back
      const backCanvas = document.createElement('canvas');
      backCanvas.width = 256;
      backCanvas.height = 384;
      const bctx = backCanvas.getContext('2d');
      if (bctx) {
        bctx.fillStyle = '#140726';
        bctx.fillRect(0, 0, 256, 384);
        bctx.strokeStyle = '#fbbf24';
        bctx.lineWidth = 8;
        bctx.strokeRect(12, 12, 232, 360);
        bctx.strokeStyle = '#ec4899';
        bctx.lineWidth = 3;
        bctx.strokeRect(24, 24, 208, 336);

        // Diamond filigree center motif
        bctx.strokeStyle = '#fde047';
        bctx.lineWidth = 3;
        bctx.beginPath();
        bctx.moveTo(128, 72);
        bctx.lineTo(204, 192);
        bctx.lineTo(128, 312);
        bctx.lineTo(52, 192);
        bctx.closePath();
        bctx.stroke();

        bctx.beginPath();
        bctx.arc(128, 192, 42, 0, Math.PI * 2);
        bctx.strokeStyle = '#f472b6';
        bctx.stroke();

        bctx.fillStyle = '#fbbf24';
        bctx.font = 'bold 34px serif';
        bctx.textAlign = 'center';
        bctx.textBaseline = 'middle';
        bctx.fillText('✦', 128, 194);
      }
      const cardBackTex = trackTex(new THREE.CanvasTexture(backCanvas));
      cardBackTex.colorSpace = THREE.SRGBColorSpace;
      cardBackTex.anisotropy = maxAniso;

      // Procedural Texture 3: Tarot Card Front per Suit
      const createCardFaceTexture = (suit: ArcanaSuit) => {
        const meta = SUIT_META[suit];
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 384;
        const fctx = c.getContext('2d');
        if (fctx) {
          const grad = fctx.createLinearGradient(0, 0, 0, 384);
          grad.addColorStop(0, '#090314');
          grad.addColorStop(0.5, '#190831');
          grad.addColorStop(1, '#090314');
          fctx.fillStyle = grad;
          fctx.fillRect(0, 0, 256, 384);

          fctx.strokeStyle = meta.cssColor;
          fctx.lineWidth = 8;
          fctx.strokeRect(10, 10, 236, 364);

          fctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
          fctx.lineWidth = 2.5;
          fctx.strokeRect(22, 22, 212, 340);

          // Corner pips
          fctx.fillStyle = meta.cssColor;
          fctx.font = 'bold 26px sans-serif';
          fctx.textAlign = 'center';
          fctx.textBaseline = 'middle';
          fctx.fillText(meta.icon, 44, 48);
          fctx.fillText(meta.icon, 212, 336);

          // Center Halo & Giant Suit Icon
          fctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
          fctx.lineWidth = 2;
          fctx.beginPath();
          fctx.arc(128, 152, 68, 0, Math.PI * 2);
          fctx.stroke();

          fctx.fillStyle = meta.cssColor;
          fctx.font = '900 108px sans-serif';
          fctx.fillText(meta.icon, 128, 156);

          // Title & Punishment Text
          fctx.fillStyle = '#f8fafc';
          fctx.font = 'bold 16px sans-serif';
          fctx.fillText(meta.title, 128, 262);

          fctx.fillStyle = '#fbbf24';
          fctx.font = '900 20px sans-serif';
          fctx.fillText(meta.punish, 128, 302);
        }
        const tex = trackTex(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        return tex;
      };

      // Shared PBR Materials
      const obsidianMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x10071f,
          roughness: 0.46,
          metalness: 0.56
        })
      );
      const royalCoatMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x831843,
          emissive: 0x4c0519,
          emissiveIntensity: 0.4,
          roughness: 0.52,
          metalness: 0.25,
          side: THREE.DoubleSide
        })
      );
      const plumClothMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x3b0764,
          emissive: 0x1e0538,
          emissiveIntensity: 0.3,
          roughness: 0.68,
          metalness: 0.16,
          side: THREE.DoubleSide
        })
      );
      const goldTrimMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xb45309,
          emissiveIntensity: 0.45,
          roughness: 0.16,
          metalness: 0.92
        })
      );
      const magentaGlowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xec4899,
          emissiveIntensity: 2.0,
          roughness: 0.15,
          metalness: 0.15
        })
      );
      const goldGlowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.1,
          roughness: 0.15,
          metalness: 0.2
        })
      );

      // 1. Grounded Astral Casino Dais & Perimeter Tarot Pillars
      const floorPlane = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(24, 48)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0x070210,
            roughness: 0.88,
            metalness: 0.22
          })
        )
      );
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.y = -0.22;
      scene.add(floorPlane);

      const daisBase = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(4.6, 5.1, 0.22, 16)),
        obsidianMat
      );
      daisBase.position.y = -0.11;
      scene.add(daisBase);

      const daisTrim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(4.62, 0.06, 10, 64)),
        goldTrimMat
      );
      daisTrim.rotation.x = Math.PI / 2;
      daisTrim.position.y = 0.01;
      scene.add(daisTrim);

      const pylonGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.2, 1.9, 6));
      const pylonCapGeo = trackGeo(new THREE.OctahedronGeometry(0.21, 0));
      const pylonCaps: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6 + Math.PI / 6;
        const pGroup = new THREE.Group();
        pGroup.position.set(Math.cos(ang) * 5.4, 0.72, Math.sin(ang) * 5.4);
        pGroup.lookAt(0, 0.72, 0);
        pGroup.add(new THREE.Mesh(pylonGeo, obsidianMat));
        const cap = new THREE.Mesh(pylonCapGeo, i % 2 === 0 ? magentaGlowMat : goldGlowMat);
        cap.position.y = 1.24;
        pGroup.add(cap);
        pylonCaps.push(cap);
        scene.add(pGroup);
      }

      // 2. Composite 3D Arcana Sovereign Character (Grounded at z = -0.95, facing +Z)
      const arcanaGroup = new THREE.Group();
      arcanaGroup.position.set(0, 0, -0.95);
      scene.add(arcanaGroup);

      // Boots & Legs (grounded at y = 0)
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8));
      const legL = new THREE.Mesh(legGeo, obsidianMat);
      legL.position.set(-0.17, 0.4, 0);
      const legR = new THREE.Mesh(legGeo, obsidianMat);
      legR.position.set(0.17, 0.4, 0);
      arcanaGroup.add(legL, legR);

      // Waist Sash & Gilded Belt Emblem
      const pelvis = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.25, 0.23, 0.28, 8)),
        plumClothMat
      );
      pelvis.position.y = 0.9;
      const beltBuckle = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), goldGlowMat);
      beltBuckle.position.set(0, 0.92, 0.25);
      arcanaGroup.add(pelvis, beltBuckle);

      // Royal Tailored Coat Torso + Gold Lapel Sigil
      const torso = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.35, 0.25, 0.8, 8)),
        royalCoatMat
      );
      torso.position.y = 1.4;
      const chestCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.13, 0)), magentaGlowMat);
      chestCore.position.set(0, 1.46, 0.31);
      arcanaGroup.add(torso, chestCore);

      // Swallowtail Royal Coat Tails
      const coatShape = new THREE.Shape();
      coatShape.moveTo(-0.4, 0);
      coatShape.lineTo(0.4, 0);
      coatShape.lineTo(0.66, -1.42);
      coatShape.lineTo(0.18, -1.24);
      coatShape.lineTo(0, -1.55);
      coatShape.lineTo(-0.18, -1.24);
      coatShape.lineTo(-0.66, -1.42);
      coatShape.closePath();
      const coatGeo = trackGeo(
        new THREE.ExtrudeGeometry(coatShape, { depth: 0.04, bevelEnabled: false })
      );
      const coatTails = new THREE.Mesh(coatGeo, plumClothMat);
      coatTails.position.set(0, 1.66, -0.25);
      coatTails.rotation.x = 0.22;
      arcanaGroup.add(coatTails);

      // Gilded Shoulder Epaulettes
      const pauldronGeo = trackGeo(new THREE.DodecahedronGeometry(0.2, 0));
      const pauldronL = new THREE.Mesh(pauldronGeo, goldTrimMat);
      pauldronL.position.set(-0.44, 1.68, 0);
      pauldronL.scale.set(1.15, 0.72, 1.0);
      const pauldronR = pauldronL.clone();
      pauldronR.position.x = 0.44;
      arcanaGroup.add(pauldronL, pauldronR);

      // Masquerade Head + Signature Sovereign Top-Hat with Golden Card Emblem
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 2.0, 0.03);
      const faceHelm = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.19, 0)), obsidianMat);
      const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.25, 0.06, 0.14)), magentaGlowMat);
      visor.position.set(0, 0.01, 0.15);

      const hatBrim = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 18)),
        obsidianMat
      );
      hatBrim.position.set(0, 0.16, -0.02);
      hatBrim.rotation.x = -0.14;
      const hatCrown = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.36, 16)),
        royalCoatMat
      );
      hatCrown.position.set(0, 0.35, -0.05);
      hatCrown.rotation.x = -0.14;
      const hatRibbon = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.225, 0.025, 8, 24)),
        goldTrimMat
      );
      hatRibbon.rotation.x = Math.PI / 2 - 0.14;
      hatRibbon.position.set(0, 0.22, -0.03);
      const hatCard = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.18, 0.02)),
        goldGlowMat
      );
      hatCard.position.set(0.18, 0.32, 0.1);
      hatCard.rotation.z = -0.28;

      headGroup.add(faceHelm, visor, hatBrim, hatCrown, hatRibbon, hatCard);
      arcanaGroup.add(headGroup);

      // Articulated Arms + Glowing Fate Orbs
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.065, 0.68, 8));
      const handOrbGeo = trackGeo(new THREE.OctahedronGeometry(0.12, 0));

      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.42, 1.64, 0.04);
      const leftArmMesh = new THREE.Mesh(armGeo, royalCoatMat);
      leftArmMesh.position.set(0, -0.32, 0);
      const leftHandOrb = new THREE.Mesh(handOrbGeo, magentaGlowMat);
      leftHandOrb.position.set(0, -0.68, 0);
      leftArmPivot.add(leftArmMesh, leftHandOrb);

      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.42, 1.64, 0.04);
      const rightArmMesh = new THREE.Mesh(armGeo, royalCoatMat);
      rightArmMesh.position.set(0, -0.32, 0);
      const rightHandOrb = new THREE.Mesh(handOrbGeo, goldGlowMat);
      rightHandOrb.position.set(0, -0.68, 0);
      rightArmPivot.add(rightArmMesh, rightHandOrb);
      arcanaGroup.add(leftArmPivot, rightArmPivot);

      // Floating Golden Destiny Halo behind Arcana
      const sovereignHalo = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.76, 0.034, 8, 48)),
        goldTrimMat
      );
      sovereignHalo.position.set(0, 1.76, -0.36);
      sovereignHalo.visible = false;
      arcanaGroup.add(sovereignHalo);

      // 3. Giant Rotating Destiny Roulette Floor Wheel (centered at z = 1.35)
      const rouletteGroup = new THREE.Group();
      rouletteGroup.position.set(0, 0.03, 1.35);
      scene.add(rouletteGroup);

      const rouletteMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: wheelTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      const rouletteDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(2.75, 48)), rouletteMat);
      rouletteDisc.rotation.x = -Math.PI / 2;
      rouletteGroup.add(rouletteDisc);

      const rouletteOuterRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(2.78, 0.055, 10, 64)),
        goldGlowMat
      );
      rouletteOuterRing.rotation.x = Math.PI / 2;
      rouletteOuterRing.position.y = 0.03;

      const rouletteInnerRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.65, 0.036, 8, 48)),
        magentaGlowMat
      );
      rouletteInnerRing.rotation.x = Math.PI / 2;
      rouletteInnerRing.position.y = 0.06;
      rouletteGroup.add(rouletteOuterRing, rouletteInnerRing);

      // 4. 3 Monumental Floating 3D Tarot Cards
      const cardBodyGeo = trackGeo(new THREE.BoxGeometry(1.18, 1.78, 0.055));
      const cardFaceGeo = trackGeo(new THREE.PlaneGeometry(1.1, 1.7));
      const cardBackMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: cardBackTex,
          roughness: 0.3,
          metalness: 0.45
        })
      );

      interface CardRig {
        group: THREE.Group;
        beam: THREE.Mesh;
        beamMat: THREE.MeshBasicMaterial;
        suit: ArcanaSuit;
      }
      const cardRigs: CardRig[] = [];

      for (let i = 0; i < 3; i++) {
        const suit = activeCards[i];
        const meta = SUIT_META[suit];
        const cardGroup = new THREE.Group();
        cardGroup.visible = false;

        const bodyMesh = new THREE.Mesh(cardBodyGeo, goldTrimMat);
        const faceTex = createCardFaceTexture(suit);
        const faceMat = trackMat(
          new THREE.MeshStandardMaterial({
            map: faceTex,
            emissive: meta.hex,
            emissiveIntensity: 0.35,
            roughness: 0.24,
            metalness: 0.25
          })
        );
        const frontPlane = new THREE.Mesh(cardFaceGeo, faceMat);
        frontPlane.position.z = 0.032;

        const backPlane = new THREE.Mesh(cardFaceGeo, cardBackMat);
        backPlane.position.z = -0.032;
        backPlane.rotation.y = Math.PI;

        cardGroup.add(bodyMesh, frontPlane, backPlane);
        scene.add(cardGroup);

        const beamMat = trackMat(
          new THREE.MeshBasicMaterial({
            color: meta.hex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        const beam = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.14, 0.48, 4.6, 16, 1, true)),
          beamMat
        );
        beam.visible = false;
        scene.add(beam);

        cardRigs.push({ group: cardGroup, beam, beamMat, suit });
      }

      // 5. Royal Flush Verdict Explosion Dome & Shockwaves (Phase III)
      const areaDomeMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
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
      areaDome.position.set(0, 0.02, 1.35);
      areaDome.visible = false;
      scene.add(areaDome);

      const shockwaveGold = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.08, 10, 64)),
        goldGlowMat
      );
      shockwaveGold.rotation.x = Math.PI / 2;
      shockwaveGold.position.set(0, 0.16, 1.35);
      shockwaveGold.visible = false;
      scene.add(shockwaveGold);

      const shockwaveMagenta = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1, 0.06, 10, 64)),
        magentaGlowMat
      );
      shockwaveMagenta.rotation.x = Math.PI / 2;
      shockwaveMagenta.position.set(0, 0.24, 1.35);
      shockwaveMagenta.visible = false;
      scene.add(shockwaveMagenta);

      // Instanced Tarot Crystal Shards bursting in Phase III
      const shardCount = 64;
      const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.12, 0));
      const shardMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xec4899,
          emissiveIntensity: 1.6,
          roughness: 0.16,
          metalness: 0.48
        })
      );
      const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
      shardInstanced.frustumCulled = false;
      scene.add(shardInstanced);

      const shardDirs: THREE.Vector3[] = [];
      const shardSpeeds: number[] = [];
      const orbitAngles: number[] = [];
      for (let i = 0; i < shardCount; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / shardCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        shardDirs.push(
          new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.abs(Math.cos(phi)) * 0.65 + 0.15,
            Math.sin(phi) * Math.sin(theta)
          ).normalize()
        );
        shardSpeeds.push(4.5 + (i % 6) * 0.95);
        orbitAngles.push((i * Math.PI * 2) / shardCount);
        const suitForShard = activeCards[i % 3];
        _tmpColor.setHex(i % 4 === 0 ? 0xfbbf24 : SUIT_META[suitForShard].hex);
        shardInstanced.setColorAt(i, _tmpColor);
      }
      if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;

      // Ambient Gold & Rose Arcane Dust
      const dustCount = 150;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 1.6 + Math.random() * 6.5;
        dustPositions[i * 3] = Math.cos(ang) * rad;
        dustPositions[i * 3 + 1] = 0.2 + Math.random() * 4.5;
        dustPositions[i * 3 + 2] = Math.sin(ang) * rad;
      }
      const dustGeo = trackGeo(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = trackMat(
        new THREE.PointsMaterial({
          color: 0xfbbf24,
          size: 0.085,
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
      let lastPhase: CutscenePhase = 'draw';
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
          p < 0.32 ? 'draw' : p < 0.64 ? 'verdict' : 'roulette';
        if (nextPhase !== lastPhase) {
          lastPhase = nextPhase;
          setPhase(nextPhase);
        }

        dustPoints.rotation.y += dt * 0.4;
        for (let i = 0; i < pylonCaps.length; i++) {
          pylonCaps[i].rotation.y += dt * 2.4;
          pylonCaps[i].position.y = 1.24 + Math.sin(now * 0.004 + i) * 0.09;
        }

        if (p < 0.32) {
          // PHASE I: Arcana draws 3 floating Tarot cards & activates Roulette Wheel
          const dp = p / 0.32;
          const easeOut = 1 - Math.pow(1 - dp, 3);

          arcanaGroup.position.y = Math.sin(dp * Math.PI * 2) * 0.03;
          leftArmPivot.rotation.set(-0.5 - easeOut * 1.1, 0.38, -0.35);
          rightArmPivot.rotation.set(-0.5 - easeOut * 1.1, -0.38, 0.35);
          headGroup.rotation.x = -0.05;
          sovereignHalo.visible = false;

          rouletteGroup.scale.setScalar(0.2 + easeOut * 0.85);
          rouletteMat.opacity = Math.min(0.95, dp * 1.6);
          rouletteDisc.rotation.z = dp * Math.PI * 1.6;
          rouletteOuterRing.rotation.z = -dp * Math.PI * 2.2;
          rouletteInnerRing.rotation.z = dp * Math.PI * 2.8;

          for (let i = 0; i < 3; i++) {
            const rig = cardRigs[i];
            rig.group.visible = true;
            rig.beam.visible = false;
            const spreadX = (i - 1) * 1.65 * easeOut;
            const arcZ = 1.55 - Math.abs(i - 1) * 0.35;
            rig.group.position.set(
              spreadX,
              -0.4 + easeOut * 2.55 + Math.sin(now * 0.004 + i * 1.2) * 0.06,
              arcZ
            );
            // Cards start face-down (Math.PI)
            rig.group.rotation.set(0, Math.PI + (1 - easeOut) * 0.8, (i - 1) * -0.08);
            rig.group.scale.setScalar(0.35 + easeOut * 0.65);
          }

          areaDome.visible = false;
          shockwaveGold.visible = false;
          shockwaveMagenta.visible = false;

          shardInstanced.visible = true;
          for (let i = 0; i < shardCount; i++) {
            const loopT = (dp * 1.7 + i / shardCount) % 1;
            const ang = orbitAngles[i] + dp * Math.PI * 3.2;
            const rad = 0.8 + (1 - loopT) * 1.85;
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.18 + loopT * 2.4,
              1.35 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(loopT * 5, ang, i);
            _dummy.scale.setScalar(0.45 + Math.sin(loopT * Math.PI) * 0.45);
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          rouletteLight.intensity = 12 + easeOut * 16;
          cardStageLight.intensity = 10 + easeOut * 12;
        } else if (p < 0.64) {
          // PHASE II: 3 Tarot Cards flip open sequentially revealing their Verdict suits!
          const vp = (p - 0.32) / 0.32;

          leftArmPivot.rotation.set(-1.6 - Math.sin(vp * Math.PI * 4) * 0.08, 0.45, -0.42);
          rightArmPivot.rotation.set(-1.6 - Math.sin(vp * Math.PI * 4) * 0.08, -0.45, 0.42);
          sovereignHalo.visible = true;
          sovereignHalo.rotation.z = vp * Math.PI * 1.2;

          rouletteGroup.scale.setScalar(1.05 + Math.sin(vp * Math.PI * 4) * 0.05);
          rouletteMat.opacity = 0.96;
          rouletteDisc.rotation.z += dt * 3.0;
          rouletteOuterRing.rotation.z -= dt * 3.8;
          rouletteInnerRing.rotation.z += dt * 4.5;

          for (let i = 0; i < 3; i++) {
            const rig = cardRigs[i];
            rig.group.visible = true;
            const flipStart = i * 0.24;
            const flipLocal = Math.max(0, Math.min(1, (vp - flipStart) / 0.32));
            const flipEase = 1 - Math.pow(1 - flipLocal, 3);

            const spreadX = (i - 1) * 1.72;
            const cardY = 2.15 + Math.sin(now * 0.005 + i * 1.4) * 0.08 + flipEase * 0.14;
            const cardZ = 1.55 - Math.abs(i - 1) * 0.32;
            rig.group.position.set(spreadX, cardY, cardZ);
            rig.group.rotation.set(0, Math.PI * (1 - flipEase), (i - 1) * -0.07);
            rig.group.scale.setScalar(1.0 + Math.sin(flipEase * Math.PI) * 0.18);

            if (flipEase > 0.55) {
              rig.beam.visible = true;
              rig.beam.position.set(spreadX, 2.3, cardZ);
              rig.beamMat.opacity = Math.min(0.42, (flipEase - 0.55) * 0.95);
            } else {
              rig.beam.visible = false;
            }
          }

          for (let i = 0; i < shardCount; i++) {
            const loopT = (vp * 2.4 + i / shardCount) % 1;
            const ang = orbitAngles[i] - vp * Math.PI * 4.2;
            const rad = 2.2 * (1 - loopT);
            _dummy.position.set(
              Math.cos(ang) * rad,
              0.25 + loopT * 2.0,
              1.35 + Math.sin(ang) * rad
            );
            _dummy.rotation.set(vp * 6 + i, ang, i);
            _dummy.scale.setScalar(0.6 * (1 - loopT * 0.4));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          areaDome.visible = false;
          shockwaveGold.visible = false;
          shockwaveMagenta.visible = false;

          rouletteLight.intensity = 24 + vp * 16;
          cardStageLight.intensity = 22 + vp * 18;
        } else {
          // PHASE III: Grand Destiny Roulette Verdict Explosion!
          const rp = (p - 0.64) / 0.36;
          const blastT = Math.min(1, rp / 0.42);
          const blastEase = 1 - Math.pow(1 - blastT, 3);

          leftArmPivot.rotation.set(-1.15, 0.52, -0.5);
          rightArmPivot.rotation.set(-1.15, -0.52, 0.5);
          sovereignHalo.visible = true;
          sovereignHalo.rotation.z += dt * 3.5;

          rouletteDisc.rotation.z += dt * 5.2;
          rouletteOuterRing.rotation.z -= dt * 5.5;
          rouletteMat.opacity = Math.max(0.45, 0.96 - rp * 0.4);

          for (let i = 0; i < 3; i++) {
            const rig = cardRigs[i];
            rig.group.visible = true;
            const orbitAng = (i * Math.PI * 2) / 3 + rp * Math.PI * 1.4;
            const orbitR = 1.85 + blastEase * 0.55;
            rig.group.position.set(
              Math.cos(orbitAng) * orbitR,
              2.35 + Math.sin(rp * Math.PI * 2 + i) * 0.14,
              1.35 + Math.sin(orbitAng) * orbitR * 0.65
            );
            rig.group.rotation.set(0, -orbitAng + Math.PI / 2, 0);
            rig.group.scale.setScalar(1.04);
            rig.beam.visible = true;
            rig.beam.position.set(rig.group.position.x, 2.3, rig.group.position.z);
            rig.beamMat.opacity = Math.max(0.1, (1 - rp * 0.7) * 0.36);
          }

          areaDome.visible = true;
          areaDome.scale.setScalar(1.0 + blastEase * 9.5);
          areaDomeMat.opacity = rp < 0.35 ? 0.44 : Math.max(0.08, 0.44 - (rp - 0.35) * 0.55);

          shockwaveGold.visible = true;
          shockwaveMagenta.visible = true;
          shockwaveGold.scale.setScalar(0.9 + blastEase * 10.6);
          shockwaveMagenta.scale.setScalar(0.6 + blastEase * 8.0);

          shardInstanced.visible = true;
          for (let i = 0; i < shardCount; i++) {
            const dist = blastEase * shardSpeeds[i];
            _dummy.position.set(
              shardDirs[i].x * dist,
              Math.max(0.18, 2.0 + shardDirs[i].y * dist * 0.9),
              1.35 + shardDirs[i].z * dist
            );
            _dummy.rotation.set(blastEase * 6 + i, blastEase * 4.5, i * 0.5);
            _dummy.scale.setScalar(0.95 * (1 - rp * 0.35));
            _dummy.updateMatrix();
            shardInstanced.setMatrixAt(i, _dummy.matrix);
          }
          shardInstanced.instanceMatrix.needsUpdate = true;

          rouletteLight.intensity = Math.max(16, 48 * (1 - blastT * 0.55));
          cardStageLight.intensity = Math.max(14, 36 * (1 - blastT * 0.45));
        }

        // Dynamic 3D Camera Choreography
        if (p < 0.32) {
          const dp = p / 0.32;
          _camTarget.set(2.4 - dp * 0.8, 2.15 - dp * 0.2, 5.7 - dp * 0.5);
          _lookTarget.set(0, 1.45, 0.65);
        } else if (p < 0.64) {
          const vp = (p - 0.32) / 0.32;
          const camAng = 0.3 - vp * 0.72;
          const camDist = 5.4 + vp * 0.95;
          _camTarget.set(
            Math.sin(camAng) * camDist,
            1.95 + vp * 0.55,
            Math.cos(camAng) * camDist + 0.7
          );
          _lookTarget.set(0, 1.75, 1.15);
        } else {
          const rp = (p - 0.64) / 0.36;
          const shakeMag = rp < 0.28 ? (1 - rp / 0.28) * 0.3 : 0;
          const shakeX = Math.sin(now * 0.09) * shakeMag;
          const shakeY = Math.cos(now * 0.12) * shakeMag;
          const camAng = -0.42 + rp * 0.82;
          const camDist = 6.45 + Math.min(1, rp * 1.35) * 2.1;
          _camTarget.set(
            Math.sin(camAng) * camDist + shakeX,
            2.65 + rp * 0.75 + shakeY,
            Math.cos(camAng) * camDist + 0.7
          );
          _lookTarget.set(0, 1.65, 1.05);
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
  }, [totalDuration, cardsKey]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#090212] overflow-hidden select-none"
      role="dialog"
      aria-label="Cutscene 3D Royal Flush Destiny Roulette"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Top Cinematic Letterbox Bar (solid dark fill, no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#07020f]/94 border-b border-amber-400/50 px-5 py-3.5 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-game tracking-[0.24em] uppercase text-pink-300 truncate">
            ARCANA · TAROT VERDICT 3D
          </p>
          <h2 className="font-title text-base sm:text-2xl font-black tracking-wider text-amber-300 truncate">
            ROYAL FLUSH: DESTINY ROULETTE
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-400/40 bg-fuchsia-950/75 text-xs font-game">
            {normalizedCards.map((suit, idx) => (
              <span key={`${suit}-${idx}`} style={{ color: SUIT_META[suit].cssColor }}>
                {SUIT_META[suit].icon}
              </span>
            ))}
          </div>
          <span className="hidden md:inline-block px-2.5 py-1 rounded border border-pink-400/40 bg-fuchsia-950/75 text-[11px] font-game tracking-wider text-amber-200">
            {phase === 'draw'
              ? 'FASE I · TARIK KARTU'
              : phase === 'verdict'
                ? 'FASE II · VONIS TAROT'
                : 'FASE III · DESTINY ROULETTE'}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-[#07020f]/94 border-t border-amber-400/50 px-5 py-3 sm:px-8 sm:py-4 flex items-center justify-between gap-4">
        <p className="pointer-events-none text-[11px] sm:text-xs font-game tracking-wider text-pink-200/90 truncate">
          {PHASE_LABELS[phase]}
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-fuchsia-950 hover:bg-fuchsia-900 border border-amber-400/60 hover:border-pink-300 text-amber-50 font-game font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>Lewati Cutscene</span>
          <FastForward className="w-4 h-4 text-amber-300" />
        </button>

        {/* Bottom Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 transition-[width] duration-75"
            style={{ width: `${uiProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
