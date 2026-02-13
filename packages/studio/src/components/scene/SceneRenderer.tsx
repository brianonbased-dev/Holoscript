'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, Environment } from '@react-three/drei';
import type { R3FNode } from '@holoscript/core';
import { R3FNodeRenderer } from './R3FNodeRenderer';
import { useEditorStore } from '@/lib/store';

interface SceneRendererProps {
  r3fTree: R3FNode | null;
}

function SceneContent({ r3fTree }: { r3fTree: R3FNode }) {
  const setSelectedId = useEditorStore((s) => s.setSelectedObjectId);

  // Check if the tree already contains lights
  const hasLights = r3fTree.children?.some(
    (c: any) =>
      c.type === 'ambientLight' ||
      c.type === 'directionalLight' ||
      c.type === 'pointLight' ||
      c.type === 'spotLight' ||
      c.type === 'hemisphereLight'
  );

  // Check if tree has environment
  const hasEnv = r3fTree.children?.some((c: any) => c.type === 'Environment');

  return (
    <group onClick={() => setSelectedId(null)}>
      {/* Default lighting if scene doesn't provide its own */}
      {!hasLights && (
        <>
          <ambientLight intensity={0.4} color="#e8e0ff" />
          <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        </>
      )}

      {/* Default environment if none provided */}
      {!hasEnv && <Environment preset="studio" background={false} />}

      {/* Render the compiled scene */}
      <R3FNodeRenderer node={r3fTree} />
    </group>
  );
}

function EmptyScene() {
  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <Environment preset="studio" background={false} />
    </group>
  );
}

export function SceneRenderer({ r3fTree }: SceneRendererProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [3, 3, 5], fov: 60 }}
        shadows
        style={{ background: '#0a0a12' }}
        gl={{ antialias: true, toneMapping: 3 }}
      >
        <Suspense fallback={null}>
          {r3fTree ? <SceneContent r3fTree={r3fTree} /> : <EmptyScene />}
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={1}
          maxDistance={50}
        />

        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#2d2d3d"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3d3d4d"
          fadeDistance={25}
          position={[0, -0.01, 0]}
        />

        <Stars radius={80} depth={50} count={2000} factor={3} saturation={0.1} fade speed={0.5} />
      </Canvas>

      {/* Scene info overlay */}
      {r3fTree && r3fTree.children && (
        <div className="absolute bottom-3 left-3 rounded-md bg-studio-panel/80 px-3 py-1.5 text-xs text-studio-muted backdrop-blur">
          {r3fTree.children.length} object{r3fTree.children.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
