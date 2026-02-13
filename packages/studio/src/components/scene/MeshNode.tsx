'use client';

import type { R3FNode } from '@holoscript/core';
import { MATERIAL_PRESETS } from '@holoscript/core';
import { useEditorStore } from '@/lib/store';

interface MeshNodeProps {
  node: R3FNode;
}

function getGeometry(hsType: string, size: number) {
  const s = size || 1;
  switch (hsType) {
    case 'sphere':
    case 'orb':
      return <sphereGeometry args={[s * 0.5, 32, 32]} />;
    case 'cube':
    case 'box':
      return <boxGeometry args={[s, s, s]} />;
    case 'cylinder':
      return <cylinderGeometry args={[s * 0.5, s * 0.5, s, 32]} />;
    case 'pyramid':
    case 'cone':
      return <coneGeometry args={[s * 0.5, s, 4]} />;
    case 'plane':
      return <planeGeometry args={[s, s]} />;
    case 'torus':
      return <torusGeometry args={[s * 0.5, s * 0.15, 16, 32]} />;
    case 'ring':
      return <ringGeometry args={[s * 0.3, s * 0.5, 32]} />;
    case 'capsule':
      return <capsuleGeometry args={[s * 0.3, s * 0.5, 4, 16]} />;
    default:
      return <boxGeometry args={[s, s, s]} />;
  }
}

function getMaterialProps(node: R3FNode) {
  const props = node.props;
  const materialName = props.material || props.materialPreset;
  const preset = materialName
    ? (MATERIAL_PRESETS as Record<string, Record<string, any>>)[materialName]
    : undefined;

  const matProps: Record<string, any> = {
    ...(preset || {}),
  };

  // Override with explicit props
  if (props.color) matProps.color = props.color;
  if (props.emissive) matProps.emissive = props.emissive;
  if (props.emissiveIntensity !== undefined) matProps.emissiveIntensity = props.emissiveIntensity;
  if (props.opacity !== undefined) matProps.opacity = props.opacity;
  if (props.transparent !== undefined) matProps.transparent = props.transparent;
  if (props.metalness !== undefined) matProps.metalness = props.metalness;
  if (props.roughness !== undefined) matProps.roughness = props.roughness;
  if (props.wireframe !== undefined) matProps.wireframe = props.wireframe;

  // Copy any materialProps from compilation
  if (props.materialProps) {
    Object.assign(matProps, props.materialProps);
  }

  // Default color if none set
  if (!matProps.color) matProps.color = '#8888cc';

  return matProps;
}

export function MeshNode({ node }: MeshNodeProps) {
  const selectedId = useEditorStore((s) => s.selectedObjectId);
  const setSelectedId = useEditorStore((s) => s.setSelectedObjectId);

  const { props } = node;
  const hsType = props.hsType || 'box';
  const size = props.size || 1;
  const position = props.position || [0, 0, 0];
  const rotation = props.rotation || [0, 0, 0];
  const scale = props.scale || [1, 1, 1];
  const isSelected = node.id === selectedId;

  const matProps = getMaterialProps(node);

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      onClick={(e: any) => {
        e.stopPropagation();
        setSelectedId(node.id || null);
      }}
    >
      {getGeometry(hsType, size)}
      {/* Use string colors directly — R3F auto-converts them */}
      <meshPhysicalMaterial
        {...matProps}
        emissive={matProps.emissive || undefined}
        color={matProps.color}
      />
      {isSelected && (
        <mesh>
          {getGeometry(hsType, size * 1.05)}
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.4} />
        </mesh>
      )}
    </mesh>
  );
}
