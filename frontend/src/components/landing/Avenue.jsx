import { forwardRef } from 'react';

// A bright, receding avenue that fades in behind the tablet for the driver beat.
// Opacity of every material is driven from the parent (Scene) each frame.
const Avenue = forwardRef(function Avenue(props, ref) {
  const buildings = [];
  for (let i = 0; i < 7; i++) {
    const z = -4 - i * 2.6;
    const h = 2.2 + ((i * 37) % 5) * 0.7;
    const shadeL = i % 2 ? '#d5dae4' : '#c3cad8';
    const shadeR = i % 2 ? '#c9d0dc' : '#dbe0e9';
    buildings.push(
      <mesh key={`l${i}`} position={[-4.2 - (i % 2) * 0.6, -1.7 + h / 2, z]}>
        <boxGeometry args={[2.4, h, 2]} />
        <meshStandardMaterial color={shadeL} roughness={0.9} transparent opacity={0} />
      </mesh>,
      <mesh key={`r${i}`} position={[4.2 + (i % 2) * 0.6, -1.7 + h / 2, z]}>
        <boxGeometry args={[2.4, h, 2]} />
        <meshStandardMaterial color={shadeR} roughness={0.9} transparent opacity={0} />
      </mesh>,
    );
  }

  // Dashed center line.
  const dashes = [];
  for (let i = 0; i < 12; i++) {
    dashes.push(
      <mesh key={`d${i}`} position={[0, -1.68, -3 - i * 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 0.7]} />
        <meshStandardMaterial color="#f2b705" transparent opacity={0} />
      </mesh>,
    );
  }

  return (
    <group ref={ref} {...props}>
      {/* ground */}
      <mesh position={[0, -1.7, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#e9edf3" roughness={1} transparent opacity={0} />
      </mesh>
      {/* asphalt */}
      <mesh position={[0, -1.69, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 60]} />
        <meshStandardMaterial color="#cfd5df" roughness={1} transparent opacity={0} />
      </mesh>
      {dashes}
      {buildings}
    </group>
  );
});

export default Avenue;
