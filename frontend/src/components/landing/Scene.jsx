import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import Tablet3D from './Tablet3D';
import Money from './Money';
import Avenue from './Avenue';

// Per-section keyframes for the tablet (6 narrative beats).
const KX = [2.4, 2.4, -2.4, 2.4, 2.0, 0];
const KY = [0, 0, 0, 0, 0, -1.4];
const KZ = [0, 0, 0, 0.7, 0.1, 0.9];
const KRY = [-0.4, -0.5, 0.5, -0.46, -0.3, 0];
const KRX = [0.04, 0.06, 0.06, 0, 0.04, 0];

// Per-section backdrops — bold alternation in the FastLead palette
// (white → navy → white → electric blue → white → navy).
const BG = ['#f4f5f7', '#0B1D3A', '#f4f5f7', '#2563FF', '#f4f5f7', '#0B1D3A'].map(
  (c) => new THREE.Color(c),
);
const scratch = new THREE.Color();

const lerp = (a, b, t) => a + (b - a) * t;
const kf = (arr, f) => {
  const i = Math.max(0, Math.min(4, Math.floor(f)));
  return lerp(arr[i], arr[i + 1], Math.min(1, Math.max(0, f - i)));
};

export default function Scene({ progress }) {
  const tablet = useRef();
  const avenue = useRef();
  const moneyOp = useRef(1);
  const [section, setSection] = useState(0);
  const secRef = useRef(0);

  useFrame((state) => {
    const f = (progress?.current ?? 0) * 5;

    const idx = Math.round(f);
    if (idx !== secRef.current) {
      secRef.current = idx;
      setSection(idx);
    }

    if (tablet.current) {
      const t = state.clock.elapsedTime;
      const bob = Math.sin(t * 0.8) * 0.09;
      const sway = Math.sin(t * 0.6) * 0.05;
      const g = tablet.current;
      g.position.x = lerp(g.position.x, kf(KX, f), 0.08);
      g.position.y = lerp(g.position.y, bob + kf(KY, f), 0.1);
      g.position.z = lerp(g.position.z, kf(KZ, f), 0.08);
      g.rotation.y = lerp(g.rotation.y, kf(KRY, f) + sway, 0.08);
      g.rotation.x = lerp(g.rotation.x, kf(KRX, f), 0.08);
    }

    if (avenue.current) {
      const op = Math.max(0, 1 - Math.abs(f - 4) / 0.9);
      avenue.current.visible = op > 0.01;
      avenue.current.traverse((c) => {
        if (c.material) c.material.opacity = op;
      });
    }

    // Money only where it belongs: the hero and the "renda extra" beat.
    const heroMoney = Math.max(0, 1 - Math.max(0, f - 0.4) / 0.5);
    const rendaMoney = Math.max(0, 1 - Math.abs(f - 4) / 0.7);
    moneyOp.current = Math.min(1, Math.max(heroMoney, rendaMoney));

    // Shift the backdrop tint per section (variety, not all-white).
    const bi = Math.max(0, Math.min(4, Math.floor(f)));
    scratch.copy(BG[bi]).lerp(BG[bi + 1], Math.min(1, Math.max(0, f - bi)));
    if (state.scene.background?.isColor) state.scene.background.lerp(scratch, 0.08);
    if (state.scene.fog) state.scene.fog.color.lerp(scratch, 0.08);
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      >
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 0.1, 30]} />
      </directionalLight>
      <pointLight position={[-4.5, 1.5, 4]} intensity={22} color="#2563FF" distance={13} />
      <pointLight position={[4.5, -1.5, 3]} intensity={18} color="#00C98A" distance={13} />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 3, -4]} scale={[12, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.3} position={[-5, 0, 2]} scale={[3, 8, 1]} color="#9bc0ff" />
        <Lightformer intensity={1.3} position={[5, 0, 2]} scale={[3, 8, 1]} color="#a7ffe0" />
      </Environment>

      <Money count={30} opacityRef={moneyOp} />
      <Avenue ref={avenue} />

      <group ref={tablet}>
        <Tablet3D section={section} />
      </group>

      <ContactShadows
        position={[0, -2.25, 0]}
        opacity={0.3}
        scale={13}
        blur={3}
        far={4.5}
        color="#1a2a4a"
      />
    </>
  );
}
