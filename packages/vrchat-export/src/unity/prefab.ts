/**
 * Unity Prefab Generator
 *
 * Generates Unity prefab YAML files from HoloScript nodes.
 */

import type { HSPlusNode } from '@holoscript/core';
import type { UnityPrefab, UnityComponent, ExportContext, TraitMapping } from '../types.js';
import { generateGUID, generateFileId, generateMetaFile } from './guid.js';
import { getRequiredComponents, mergePrefabModifications } from '../generators/index.js';

/**
 * Generate a Unity prefab from a HoloScript node
 */
export function generatePrefab(
  node: HSPlusNode,
  traitMappings: TraitMapping[],
  context: ExportContext
): UnityPrefab {
  const name = node.id || 'Object';
  const guid = generateGUID(`prefab_${name}_${context.config.projectName}`);

  // Get all required components
  const requiredComponents = getRequiredComponents(traitMappings);
  const prefabModifications = mergePrefabModifications(traitMappings);

  // Build component list
  const components: UnityComponent[] = [];

  // Transform is always first
  const position = (node.properties.position as [number, number, number]) || [0, 0, 0];
  const rotation = (node.properties.rotation as [number, number, number]) || [0, 0, 0];
  const scale = node.properties.scale;
  const scaleVec: [number, number, number] = typeof scale === 'number'
    ? [scale, scale, scale]
    : (scale as [number, number, number]) || [1, 1, 1];

  // Determine mesh type based on node type
  const meshType = getMeshType(node.type);

  // Add MeshFilter and MeshRenderer for visible objects
  if (meshType) {
    components.push({
      type: 'MeshFilter',
      properties: { mesh: meshType },
    });

    const color = node.properties.color as string || '#ffffff';
    components.push({
      type: 'MeshRenderer',
      properties: { material: `Materials/${name}_Material` },
    });
  }

  // Add Rigidbody if required
  if (requiredComponents.has('Rigidbody')) {
    const rbProps = prefabModifications['Rigidbody'] || {};
    components.push({
      type: 'Rigidbody',
      properties: {
        mass: rbProps.mass ?? 1,
        drag: rbProps.drag ?? 0,
        angularDrag: rbProps.angularDrag ?? 0.05,
        useGravity: rbProps.useGravity ?? true,
        isKinematic: rbProps.isKinematic ?? false,
        collisionDetectionMode: rbProps.collisionDetectionMode ?? 'Discrete',
      },
    });
  }

  // Add Collider if required
  if (requiredComponents.has('BoxCollider') || requiredComponents.has('Collider')) {
    const colliderProps = prefabModifications['BoxCollider'] || {};
    components.push({
      type: 'BoxCollider',
      properties: {
        isTrigger: colliderProps.isTrigger ?? false,
        center: [0, 0, 0],
        size: colliderProps.size ?? [1, 1, 1],
      },
    });
  }

  // Add VRC_Pickup if required
  if (requiredComponents.has('VRC_Pickup')) {
    const pickupProps = prefabModifications['VRC_Pickup'] || {};
    components.push({
      type: 'VRC_Pickup',
      properties: {
        allowTheft: pickupProps.allowTheft ?? true,
        pickupable: pickupProps.pickupable ?? true,
        orientation: pickupProps.orientation ?? 'Any',
        useText: pickupProps.useText ?? 'Use',
        proximity: pickupProps.proximity ?? 0.3,
      },
    });
  }

  // Add VRC_ObjectSync if required
  if (requiredComponents.has('VRC_ObjectSync')) {
    const syncProps = prefabModifications['VRC_ObjectSync'] || {};
    components.push({
      type: 'VRC_ObjectSync',
      properties: {
        allowCollisionOwnershipTransfer: syncProps.allowCollisionOwnershipTransfer ?? false,
      },
    });
  }

  // Add UdonBehaviour for each trait script
  for (const mapping of traitMappings) {
    if (mapping.udonScript) {
      components.push({
        type: 'UdonBehaviour',
        properties: {
          programSource: `Scripts/${mapping.udonScript.name}.asset`,
          syncMethod: 'Continuous',
        },
      });
    }
  }

  // Generate YAML
  const yaml = generatePrefabYAML(name, position, rotation, scaleVec, components, context);
  const meta = generateMetaFile(guid, 'prefab');

  return {
    name,
    yaml,
    guid,
    meta,
    components,
  };
}

/**
 * Map HoloScript node type to Unity mesh
 */
function getMeshType(nodeType: string): string | null {
  const meshMap: Record<string, string> = {
    'cube': 'Cube',
    'sphere': 'Sphere',
    'orb': 'Sphere',
    'cylinder': 'Cylinder',
    'plane': 'Plane',
    'capsule': 'Capsule',
    'quad': 'Quad',
  };

  return meshMap[nodeType.toLowerCase()] || 'Cube';
}

/**
 * Generate Unity prefab YAML
 */
function generatePrefabYAML(
  name: string,
  position: [number, number, number],
  rotation: [number, number, number],
  scale: [number, number, number],
  components: UnityComponent[],
  context: ExportContext
): string {
  const gameObjectId = generateFileId();
  const transformId = generateFileId();

  // Convert Euler to Unity's quaternion representation
  const quatRotation = eulerToQuaternion(rotation);

  let yaml = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &${gameObjectId}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
  - component: {fileID: ${transformId}}
`;

  // Add component references
  const componentIds: number[] = [];
  for (let i = 0; i < components.length; i++) {
    const compId = generateFileId();
    componentIds.push(compId);
    yaml += `  - component: {fileID: ${compId}}\n`;
  }

  yaml += `  m_Layer: 0
  m_Name: ${name}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
--- !u!4 &${transformId}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_LocalRotation: {x: ${quatRotation[0]}, y: ${quatRotation[1]}, z: ${quatRotation[2]}, w: ${quatRotation[3]}}
  m_LocalPosition: {x: ${position[0]}, y: ${position[1]}, z: ${position[2]}}
  m_LocalScale: {x: ${scale[0]}, y: ${scale[1]}, z: ${scale[2]}}
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: ${rotation[0]}, y: ${rotation[1]}, z: ${rotation[2]}}
`;

  // Add component definitions
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const compId = componentIds[i];
    yaml += generateComponentYAML(comp, compId, gameObjectId);
  }

  return yaml;
}

/**
 * Generate YAML for a single component
 */
function generateComponentYAML(
  component: UnityComponent,
  fileId: number,
  gameObjectId: number
): string {
  switch (component.type) {
    case 'MeshFilter':
      return `--- !u!33 &${fileId}
MeshFilter:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_Mesh: {fileID: 10202, guid: 0000000000000000e000000000000000, type: 0}
`;

    case 'MeshRenderer':
      return `--- !u!23 &${fileId}
MeshRenderer:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_Enabled: 1
  m_CastShadows: 1
  m_ReceiveShadows: 1
  m_DynamicOccludee: 1
  m_Materials:
  - {fileID: 2100000, guid: 0000000000000000e000000000000000, type: 0}
`;

    case 'Rigidbody':
      const rb = component.properties;
      return `--- !u!54 &${fileId}
Rigidbody:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  serializedVersion: 2
  m_Mass: ${rb.mass}
  m_Drag: ${rb.drag}
  m_AngularDrag: ${rb.angularDrag}
  m_UseGravity: ${rb.useGravity ? 1 : 0}
  m_IsKinematic: ${rb.isKinematic ? 1 : 0}
  m_Interpolate: 0
  m_Constraints: 0
  m_CollisionDetection: 0
`;

    case 'BoxCollider':
      const bc = component.properties;
      const center = bc.center as number[] || [0, 0, 0];
      const size = bc.size as number[] || [1, 1, 1];
      return `--- !u!65 &${fileId}
BoxCollider:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_Material: {fileID: 0}
  m_IsTrigger: ${bc.isTrigger ? 1 : 0}
  m_Enabled: 1
  serializedVersion: 2
  m_Size: {x: ${size[0]}, y: ${size[1]}, z: ${size[2]}}
  m_Center: {x: ${center[0]}, y: ${center[1]}, z: ${center[2]}}
`;

    case 'VRC_Pickup':
    case 'VRC_ObjectSync':
    case 'UdonBehaviour':
      // These require VRChat SDK - generate placeholder comment
      return `--- !u!114 &${fileId}
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_Enabled: 1
  m_EditorHideFlags: 0
  m_Script: {fileID: 0}
  m_Name: ${component.type}
  m_EditorClassIdentifier:
`;

    default:
      return `--- !u!114 &${fileId}
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObjectId}}
  m_Enabled: 1
  m_EditorHideFlags: 0
  m_Script: {fileID: 0}
  m_Name: ${component.type}
  m_EditorClassIdentifier:
`;
  }
}

/**
 * Convert Euler angles (degrees) to Unity quaternion
 */
function eulerToQuaternion(euler: [number, number, number]): [number, number, number, number] {
  const deg2rad = Math.PI / 180;
  const x = euler[0] * deg2rad / 2;
  const y = euler[1] * deg2rad / 2;
  const z = euler[2] * deg2rad / 2;

  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);

  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
}

export default generatePrefab;
