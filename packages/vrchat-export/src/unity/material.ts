/**
 * Unity Material Generator
 *
 * Generates Unity material files from HoloScript color/appearance properties.
 */

import type { UnityMaterial } from '../types.js';
import { generateGUID, generateMetaFile } from './guid.js';

/**
 * Parse hex color to Unity color (0-1 range)
 */
function hexToColor(hex: string): [number, number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = cleanHex.length === 8
    ? parseInt(cleanHex.substring(6, 8), 16) / 255
    : 1;
  return [r, g, b, a];
}

/**
 * Color name to hex mapping
 */
const colorNames: Record<string, string> = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
  gray: '#808080',
  grey: '#808080',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
};

/**
 * Generate a Unity material
 */
export function generateMaterial(
  name: string,
  colorInput: string,
  glow?: boolean,
  glowIntensity?: number,
  projectName?: string
): UnityMaterial {
  const guid = generateGUID(`material_${name}_${projectName || 'default'}`);

  // Parse color
  let color: [number, number, number, number];
  if (colorInput.startsWith('#')) {
    color = hexToColor(colorInput);
  } else if (colorNames[colorInput.toLowerCase()]) {
    color = hexToColor(colorNames[colorInput.toLowerCase()]);
  } else {
    color = [1, 1, 1, 1]; // Default white
  }

  const [r, g, b, a] = color;

  // Calculate emission for glow
  const emissionR = glow ? r * (glowIntensity || 0.5) : 0;
  const emissionG = glow ? g * (glowIntensity || 0.5) : 0;
  const emissionB = glow ? b * (glowIntensity || 0.5) : 0;

  const yaml = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 8
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: ${name}
  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}
  m_ValidKeywords:${glow ? '\n  - _EMISSION' : ''}
  m_InvalidKeywords: []
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 0
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs:
    - _BumpMap:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    - _MainTex:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    - _MetallicGlossMap:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    - _OcclusionMap:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    - _ParallaxMap:
        m_Texture: {fileID: 0}
        m_Scale: {x: 1, y: 1}
        m_Offset: {x: 0, y: 0}
    m_Ints: []
    m_Floats:
    - _BumpScale: 1
    - _Cutoff: 0.5
    - _DstBlend: 0
    - _GlossMapScale: 1
    - _Glossiness: 0.5
    - _GlossyReflections: 1
    - _Metallic: 0
    - _Mode: 0
    - _OcclusionStrength: 1
    - _Parallax: 0.02
    - _SmoothnessTextureChannel: 0
    - _SpecularHighlights: 1
    - _SrcBlend: 1
    - _UVSec: 0
    - _ZWrite: 1
    m_Colors:
    - _Color: {r: ${r.toFixed(6)}, g: ${g.toFixed(6)}, b: ${b.toFixed(6)}, a: ${a.toFixed(6)}}
    - _EmissionColor: {r: ${emissionR.toFixed(6)}, g: ${emissionG.toFixed(6)}, b: ${emissionB.toFixed(6)}, a: 1}
  m_BuildTextureStacks: []
`;

  const meta = generateMetaFile(guid, 'material');

  return {
    name,
    shader: 'Standard',
    properties: {
      color: colorInput,
      glow,
      glowIntensity,
    },
    yaml,
    meta,
    guid,
  };
}

export default generateMaterial;
