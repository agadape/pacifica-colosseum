"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, Environment } from "@react-three/drei";
import type { Group } from "three";

function Trophy() {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF("/models/Trophy_0328071607_texture.glb");

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.6}>
      <group ref={ref} scale={2} position={[0, -0.3, 0]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

export default function TrophyModel() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 3]} intensity={1.2} color="#f59e0b" />
        <pointLight position={[-3, 2, -3]} intensity={0.6} color="#818cf8" />
        <pointLight position={[0, -1, 2]} intensity={0.3} color="#fbbf24" />
        <Suspense fallback={null}>
          <Trophy />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/Trophy_0328071607_texture.glb");
