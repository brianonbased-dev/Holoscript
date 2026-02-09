import type { TraitVisualConfig } from '../types';

/**
 * Visual configs for material-properties traits (33 traits).
 * Maps natural material names to PBR properties.
 */
export const MATERIAL_PROPERTIES_VISUALS: Record<string, TraitVisualConfig> = {
  wooden: {
    material: { roughness: 0.8, metalness: 0.0, color: '#8B5E3C' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  stone_material: {
    material: { roughness: 0.85, metalness: 0.0, color: '#808080' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  brick: {
    material: { roughness: 0.9, metalness: 0.0, color: '#9B3A2E' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  concrete: {
    material: { roughness: 0.95, metalness: 0.0, color: '#A0A0A0' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  marble_material: {
    material: { roughness: 0.15, metalness: 0.0, color: '#F0EDE6', envMapIntensity: 0.8 },
    tags: ['mineral', 'polished'],
    layer: 'base_material',
  },
  granite: {
    material: { roughness: 0.6, metalness: 0.0, color: '#6B6B6B' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  sandstone: {
    material: { roughness: 0.9, metalness: 0.0, color: '#D4A76A' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  slate: {
    material: { roughness: 0.5, metalness: 0.0, color: '#4A5568' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  clay: {
    material: { roughness: 0.95, metalness: 0.0, color: '#B86B4A' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  terracotta: {
    material: { roughness: 0.85, metalness: 0.0, color: '#CC6644' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  glass_material: {
    material: { roughness: 0.0, metalness: 0.0, transmission: 0.95, ior: 1.5, transparent: true },
    tags: ['transparent', 'reflective'],
    layer: 'base_material',
  },
  stained_glass: {
    material: { roughness: 0.0, metalness: 0.0, transmission: 0.7, ior: 1.5, transparent: true },
    tags: ['transparent', 'colorful'],
    layer: 'base_material',
  },
  crystal_material: {
    material: { roughness: 0.0, metalness: 0.1, transmission: 0.9, ior: 2.0, iridescence: 1.0 },
    tags: ['transparent', 'reflective', 'gem'],
    layer: 'base_material',
  },
  ice_material: {
    material: { roughness: 0.1, metalness: 0.0, transmission: 0.8, ior: 1.31, color: '#D6EAF8', transparent: true },
    tags: ['transparent', 'cold'],
    layer: 'base_material',
  },
  bone: {
    material: { roughness: 0.7, metalness: 0.0, color: '#E8DCC8' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  ivory: {
    material: { roughness: 0.3, metalness: 0.0, color: '#FFFFF0' },
    tags: ['organic', 'polished'],
    layer: 'base_material',
  },
  shell: {
    material: { roughness: 0.2, metalness: 0.1, color: '#FFF5EE', iridescence: 0.5 },
    tags: ['organic', 'iridescent'],
    layer: 'base_material',
  },
  coral: {
    material: { roughness: 0.8, metalness: 0.0, color: '#FF6F61' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  bamboo: {
    material: { roughness: 0.7, metalness: 0.0, color: '#A8C97F' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  paper: {
    material: { roughness: 1.0, metalness: 0.0, color: '#FAF0E6' },
    tags: ['organic', 'lightweight'],
    layer: 'base_material',
  },
  cardboard: {
    material: { roughness: 1.0, metalness: 0.0, color: '#C4A35A' },
    tags: ['organic', 'lightweight'],
    layer: 'base_material',
  },
  plastic: {
    material: { roughness: 0.5, metalness: 0.0, clearcoat: 0.1 },
    tags: ['synthetic', 'opaque'],
    layer: 'base_material',
  },
  resin: {
    material: { roughness: 0.1, metalness: 0.0, clearcoat: 0.5, color: '#FFD700', transparent: true, opacity: 0.85 },
    tags: ['synthetic', 'translucent'],
    layer: 'base_material',
  },
  wax: {
    material: { roughness: 0.6, metalness: 0.0, color: '#FFF8DC', transmission: 0.2 },
    tags: ['organic', 'translucent'],
    layer: 'base_material',
  },
  foam: {
    material: { roughness: 1.0, metalness: 0.0, color: '#F5F5F5' },
    tags: ['synthetic', 'lightweight'],
    layer: 'base_material',
  },
  composite: {
    material: { roughness: 0.4, metalness: 0.2, color: '#3C3C3C' },
    tags: ['synthetic', 'opaque'],
    layer: 'base_material',
  },
  carbon_fiber: {
    material: { roughness: 0.3, metalness: 0.4, color: '#1A1A1A', clearcoat: 0.8 },
    tags: ['synthetic', 'reflective'],
    layer: 'base_material',
  },
  kevlar: {
    material: { roughness: 0.7, metalness: 0.0, color: '#C8B400' },
    tags: ['synthetic', 'opaque'],
    layer: 'base_material',
  },
  fiberglass: {
    material: { roughness: 0.5, metalness: 0.0, color: '#E8E8D0' },
    tags: ['synthetic', 'opaque'],
    layer: 'base_material',
  },
  plaster: {
    material: { roughness: 0.95, metalness: 0.0, color: '#F5F5F0' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  concrete_reinforced: {
    material: { roughness: 0.9, metalness: 0.05, color: '#909090' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
  thatch: {
    material: { roughness: 1.0, metalness: 0.0, color: '#C8A96E' },
    tags: ['organic', 'opaque'],
    layer: 'base_material',
  },
  adobe: {
    material: { roughness: 0.95, metalness: 0.0, color: '#C4956A' },
    tags: ['mineral', 'opaque'],
    layer: 'base_material',
  },
};
