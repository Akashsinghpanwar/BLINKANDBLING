import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

// ── Single pine tree made of stacked cones + cylinder trunk ──────────────────
function PineTree({ side }: { side: 'left' | 'right' }) {
  const groupRef = useRef<THREE.Group>(null)

  // Gentle sway
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const offset = side === 'left' ? 0 : Math.PI
    groupRef.current.rotation.z = Math.sin(t * 0.6 + offset) * 0.028
    groupRef.current.rotation.x = Math.sin(t * 0.4 + offset + 1) * 0.012
  })

  // Pink-rose tinted foliage shades
  const tiers = [
    { y: 0.0,  r: 0.72, h: 1.10, color: '#d4607a' },  // bottom — deeper rose
    { y: 0.72, r: 0.56, h: 1.00, color: '#cf5f91' },  // mid — brand rose
    { y: 1.38, r: 0.40, h: 0.90, color: '#e87fa8' },  // upper — lighter
    { y: 1.96, r: 0.26, h: 0.76, color: '#f0a0c0' },  // tip  — soft pink
  ]

  return (
    <group ref={groupRef}>
      {/* Trunk */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.15, 0.9, 7]} />
        <meshStandardMaterial color="#7a4a20" roughness={0.9} />
      </mesh>

      {/* Foliage tiers */}
      {tiers.map((tier, i) => (
        <mesh key={i} position={[0, tier.y, 0]} castShadow>
          <coneGeometry args={[tier.r, tier.h, 8]} />
          <meshStandardMaterial
            color={tier.color}
            roughness={0.65}
            metalness={0.04}
            emissive={tier.color}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}

      {/* Tiny star tip */}
      <mesh position={[0, 2.44, 0]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color="#f7d96a" emissive="#f7d96a" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
    </group>
  )
}

// ── Canvas wrapper for one tree ──────────────────────────────────────────────
export default function LandingTree({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      style={{
        width: 'clamp(80px, 10vw, 140px)',
        height: 'clamp(180px, 24vw, 320px)',
        flexShrink: 0,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 12px 24px rgba(207,95,145,0.22))',
      }}
    >
      <Canvas
        camera={{ position: [0, 1.2, 5.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight
          position={side === 'left' ? [3, 5, 3] : [-3, 5, 3]}
          intensity={2.2}
          color="#fff5ee"
        />
        <pointLight position={[0, 3, 2]} intensity={0.6} color="#f093b8" />

        <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.18}>
          <PineTree side={side} />
        </Float>
      </Canvas>
    </div>
  )
}
