import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Procedural banknote texture (stylized cash — reads as money without an asset).
function makeBillTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, '#4bb87a');
  g.addColorStop(1, '#1f7a4d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 512 - 32, 256 - 32);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(256, 128, 18 + i * 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(120, 128, 52, 68, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 130px Georgia';
  ctx.fillText('$', 384, 120);

  ctx.font = 'bold 34px Georgia';
  ctx.fillText('100', 64, 52);
  ctx.fillText('100', 448, 210);

  ctx.font = 'bold 22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText('FASTLEAD', 256, 234);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// A cloud of banknotes drifting/tumbling upward behind the scene.
// `opacityRef` (0..1) lets the parent fade the whole cloud in/out per section.
export default function Money({ count = 30, area = [16, 11, 9], intensity = 1, opacityRef }) {
  const tex = useMemo(makeBillTexture, []);
  const group = useRef();

  const bills = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * area[0],
        y: (Math.random() - 0.5) * area[1],
        z: -2.5 - Math.random() * area[2],
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        speed: 0.35 + Math.random() * 0.7,
        spin: (Math.random() - 0.5) * 1.1,
        sway: Math.random() * Math.PI * 2,
        scale: 0.75 + Math.random() * 0.6,
      })),
    [count, area[0], area[1], area[2]],
  );

  useFrame((state, dt) => {
    if (!group.current) return;
    const op = opacityRef ? opacityRef.current : 1;
    group.current.visible = op > 0.01;
    if (op <= 0.01) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    group.current.children.forEach((m, i) => {
      const b = bills[i];
      m.position.y += b.speed * intensity * d;
      if (m.position.y > area[1] / 2 + 1.5) m.position.y = -area[1] / 2 - 1.5;
      m.position.x = b.x + Math.sin(t * 0.5 + b.sway) * 0.7;
      m.rotation.x += b.spin * d;
      m.rotation.z += b.spin * 0.6 * d;
      m.material.opacity = op;
    });
  });

  return (
    <group ref={group}>
      {bills.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} rotation={[b.rx, b.ry, b.rz]} scale={b.scale}>
          <planeGeometry args={[0.95, 0.475]} />
          <meshStandardMaterial
            map={tex}
            side={THREE.DoubleSide}
            roughness={0.55}
            metalness={0.15}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
