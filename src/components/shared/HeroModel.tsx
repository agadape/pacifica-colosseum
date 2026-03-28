"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, Environment } from "@react-three/drei";
import type { Group } from "three";

function SwordModel() {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF("/models/Neon_Excalibur_0328065127_texture.glb");

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={ref} scale={1.8} position={[0, -0.5, 0]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

export default function HeroModel() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#818cf8" />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#a78bfa" />
        <pointLight position={[0, -2, 3]} intensity={0.3} color="#e879f9" />
        <Suspense fallback={null}>
          <SwordModel />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload("/models/Neon_Excalibur_0328065127_texture.glb");
