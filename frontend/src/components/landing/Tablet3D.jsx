import { useMemo, useEffect } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const W = 540;
const H = 760;

const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};
const txt = (ctx, s, x, y, font, color, align = 'center') => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
};

// FastLead mark centered at (cx,cy), unit s.
function drawMark(ctx, cx, cy, s) {
  const g = ctx.createLinearGradient(cx - 2 * s, cy - s, cx + 2 * s, cy + s);
  g.addColorStop(0, '#2563FF');
  g.addColorStop(0.55, '#00B4D8');
  g.addColorStop(1, '#00C98A');

  ctx.fillStyle = '#2563FF';
  ctx.beginPath();
  ctx.arc(cx - 1.75 * s, cy - 0.85 * s, 0.16 * s, 0, 7);
  ctx.fill();

  ctx.fillStyle = g;
  rr(ctx, cx - 1.45 * s, cy - 0.98 * s, 1.25 * s, 0.26 * s, 0.13 * s); ctx.fill();
  rr(ctx, cx - 1.95 * s, cy - 0.35 * s, 1.9 * s, 0.26 * s, 0.13 * s); ctx.fill();
  rr(ctx, cx - 1.45 * s, cy + 0.28 * s, 1.25 * s, 0.26 * s, 0.13 * s); ctx.fill();

  ctx.fillStyle = '#00C98A';
  ctx.beginPath();
  ctx.arc(cx - 1.75 * s, cy + 0.58 * s, 0.16 * s, 0, 7);
  ctx.fill();

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx + 0.15 * s, cy - 1.05 * s);
  ctx.lineTo(cx + 1.4 * s, cy);
  ctx.lineTo(cx + 0.15 * s, cy + 1.05 * s);
  ctx.lineTo(cx + 0.15 * s, cy + 0.5 * s);
  ctx.lineTo(cx + 0.68 * s, cy);
  ctx.lineTo(cx + 0.15 * s, cy - 0.5 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0B1D3A';
  rr(ctx, cx - 0.28 * s, cy - 0.38 * s, 0.74 * s, 0.76 * s, 0.2 * s); ctx.fill();
  ctx.fillStyle = '#00C98A';
  ctx.beginPath();
  ctx.moveTo(cx - 0.05 * s, cy - 0.22 * s);
  ctx.lineTo(cx + 0.3 * s, cy);
  ctx.lineTo(cx - 0.05 * s, cy + 0.22 * s);
  ctx.closePath();
  ctx.fill();
}

function wordmark(ctx, cx, y, size) {
  ctx.font = `bold ${size}px Poppins, Arial`;
  const w1 = ctx.measureText('FAST').width;
  const w2 = ctx.measureText('LEAD').width;
  const start = cx - (w1 + w2) / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F2F4F7';
  ctx.fillText('FAST', start, y);
  ctx.fillStyle = '#2563FF';
  ctx.fillText('LEAD', start + w1, y);
}

const QR = [
  '11101010111', '11100110111', '11110101111', '01011011010',
  '10101110101', '01110101100', '10001010011', '01011101010',
  '11101011010', '11110110101', '11101001110',
];

function drawScreen(ctx, section) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0B1D3A';
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(270, 130, 20, 270, 130, 460);
  rg.addColorStop(0, 'rgba(0,201,138,0.28)');
  rg.addColorStop(1, 'rgba(0,201,138,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  if (section === 0 || section === 5) {
    drawMark(ctx, 270, 300, 74);
    wordmark(ctx, 270, 470, 54);
    txt(ctx, section === 5 ? 'BORA COMEÇAR?' : 'ANUNCIE EM MOVIMENTO', 270, 520, '600 20px Arial', 'rgba(242,244,247,0.5)');
  } else if (section === 1) {
    rr(ctx, 90, 200, 360, 380, 26); ctx.fillStyle = '#12294D'; ctx.fill();
    const og = ctx.createLinearGradient(90, 200, 450, 360);
    og.addColorStop(0, '#ff7a1f'); og.addColorStop(1, '#ff5d5d');
    ctx.save(); rr(ctx, 90, 200, 360, 150, 26); ctx.clip(); ctx.fillStyle = og; ctx.fillRect(90, 200, 360, 150); ctx.restore();
    txt(ctx, '☕', 270, 275, '70px Arial', '#fff');
    rr(ctx, 118, 378, 96, 30, 15); ctx.fillStyle = 'rgba(255,93,93,0.25)'; ctx.fill();
    txt(ctx, 'OFERTA', 166, 393, '700 15px Arial', '#ff9d84');
    txt(ctx, '30% OFF no seu café', 118, 440, 'bold 30px Poppins, Arial', '#F2F4F7', 'left');
    txt(ctx, 'Só hoje, perto de você', 118, 475, '18px Arial', 'rgba(242,244,247,0.55)', 'left');
    rr(ctx, 118, 502, 304, 52, 14); ctx.fillStyle = '#2563FF'; ctx.fill();
    txt(ctx, 'Pedir agora', 270, 528, 'bold 22px Arial', '#fff');
  } else if (section === 2) {
    ctx.fillStyle = '#00C98A';
    ctx.beginPath(); ctx.arc(228, 232, 7, 0, 7); ctx.fill();
    txt(ctx, 'AO VIVO', 315, 233, '700 20px Arial', '#00C98A');
    txt(ctx, '1.248', 270, 340, 'bold 120px Poppins, Arial', '#F2F4F7');
    txt(ctx, 'passageiros agora', 270, 420, '22px Arial', 'rgba(242,244,247,0.55)');
    const cities = ['SP', 'RJ', 'BH', 'POA', 'REC', 'CWB'];
    cities.forEach((c, i) => {
      const x = 100 + (i % 3) * 120, y = 470 + Math.floor(i / 3) * 70;
      rr(ctx, x, y, 105, 56, 12); ctx.fillStyle = '#12294D'; ctx.fill();
      txt(ctx, c, x + 52, y + 28, '700 20px Arial', '#00B4D8');
    });
  } else if (section === 3) {
    rr(ctx, 130, 190, 280, 280, 24); ctx.fillStyle = '#fff'; ctx.fill();
    const n = 11, cell = 20, gap = 3, gridW = n * cell + (n - 1) * gap;
    const ox = 270 - gridW / 2, oy = 330 - gridW / 2;
    ctx.fillStyle = '#0B1D3A';
    QR.forEach((row, y) => row.split('').forEach((c, x) => {
      if (c === '1') ctx.fillRect(ox + x * (cell + gap), oy + y * (cell + gap), cell, cell);
    }));
    txt(ctx, 'Aponte a câmera', 270, 540, 'bold 30px Poppins, Arial', '#F2F4F7');
    txt(ctx, 'e entre pra promoção', 270, 578, '20px Arial', 'rgba(242,244,247,0.55)');
  } else if (section === 4) {
    txt(ctx, 'SUA RENDA EXTRA', 270, 235, '700 20px Arial', '#00C98A');
    txt(ctx, 'R$ 1.240', 270, 330, 'bold 96px Poppins, Arial', '#F2F4F7');
    txt(ctx, 'ganhos este mês', 270, 405, '22px Arial', 'rgba(242,244,247,0.55)');
    rr(ctx, 100, 455, 340, 90, 18); ctx.fillStyle = '#12294D'; ctx.fill();
    txt(ctx, '🚕', 150, 500, '46px Arial', '#fff');
    txt(ctx, 'Só dirigindo', 420, 488, 'bold 20px Arial', '#F2F4F7', 'right');
    txt(ctx, '+18% vs. mês passado', 420, 516, '17px Arial', '#00C98A', 'right');
  }
}

// A photoreal-ish floating tablet whose screen is a self-lit texture that morphs
// with the narrative section.
export default function Tablet3D({ section, ...props }) {
  const { tex, canvas } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, canvas: c };
  }, []);

  useEffect(() => {
    drawScreen(canvas.getContext('2d'), section);
    tex.needsUpdate = true;
  }, [section, tex, canvas]);

  return (
    <group {...props}>
      <RoundedBox args={[2.36, 3.16, 0.17]} radius={0.17} smoothness={8} castShadow receiveShadow>
        <meshStandardMaterial color="#0c0c13" roughness={0.32} metalness={0.75} />
      </RoundedBox>

      {/* self-lit screen */}
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[2.06, 2.9]} />
        <meshStandardMaterial
          map={tex}
          emissive="#ffffff"
          emissiveMap={tex}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* glass sheen */}
      <mesh position={[0, 0, 0.093]}>
        <planeGeometry args={[2.06, 2.9]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.05} roughness={0.05} metalness={0.9} />
      </mesh>

      {/* camera dot */}
      <mesh position={[0, 1.5, 0.092]}>
        <circleGeometry args={[0.022, 20]} />
        <meshBasicMaterial color="#2a2a33" />
      </mesh>
    </group>
  );
}
