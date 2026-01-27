// HoloScript Advanced Features Example
// Demonstrates 60+ geometries, 15+ materials, 8 animation types, skybox, particles, and 3D text

// === ENVIRONMENT SETTINGS ===
environment {
  skybox: "nebula"
  ambient_light: 0.4
}

// === CREATIVE GEOMETRIES ===

// Floating heart with pulse animation
orb loveHeart {
  geometry: "heart"
  color: "rose"
  material: "shiny"
  glow: true
  position: { x: -4, y: 2, z: -3 }
  animate: "pulse"
  animSpeed: 1.5
}

// Glass crystal with light refraction
orb glassCrystal {
  geometry: "crystal"
  color: "ice"
  material: "glass"
  position: { x: -2, y: 1.5, z: -3 }
  animate: "spin"
  animSpeed: 0.5
}

// Holographic spinning gear
orb holoGear {
  geometry: "gear"
  color: "hologram"
  material: "hologram"
  position: { x: 0, y: 2, z: -3 }
  animate: "spin"
  animSpeed: 0.3
}

// Neon lightning bolt
orb neonBolt {
  geometry: "lightning"
  color: "energy"
  material: "neon"
  position: { x: 2, y: 2, z: -3 }
  animate: "flicker"
}

// Chrome torusknot sculpture
orb chromeSculpture {
  geometry: "torusknot"
  color: "white"
  material: "chrome"
  position: { x: 4, y: 1.5, z: -3 }
  animate: "spin"
  animSpeed: 0.2
}

// === ANIMATED OBJECTS ===

// Floating diamond
orb floatDiamond {
  geometry: "diamond"
  color: "plasma"
  material: "glass"
  glow: true
  position: { x: -3, y: 1.5, z: 0 }
  animate: "float"
  animSpeed: 0.8
  animAmplitude: 0.4
}

// Orbiting sphere
orb orbitingSphere {
  geometry: "sphere"
  color: "neon"
  material: "neon"
  position: { x: 0, y: 1.5, z: 0 }
  scale: { x: 0.3, y: 0.3, z: 0.3 }
  animate: "orbit"
  animRadius: 1.5
  animSpeed: 0.5
}

// Rainbow color-cycling orb
orb rainbowOrb {
  geometry: "sphere"
  color: "white"
  material: "standard"
  position: { x: 0, y: 1.5, z: 0 }
  animate: "rainbow"
  animSpeed: 0.2
}

// Swaying spring coil
orb springCoil {
  geometry: "spring"
  color: "copper"
  material: "metal"
  position: { x: 3, y: 1, z: 0 }
  animate: "sway"
  animAmplitude: 0.15
}

// === MATERIAL SHOWCASE ===

// Toon/cartoon style sphere
orb toonBall {
  geometry: "sphere"
  color: "orange"
  material: "toon"
  position: { x: -4, y: 1, z: 3 }
}

// Matte velvet cube
orb velvetCube {
  geometry: "cube"
  color: "purple"
  material: "velvet"
  position: { x: -2, y: 0.5, z: 3 }
}

// X-ray transparent sphere
orb xraySphere {
  geometry: "sphere"
  color: "cyan"
  material: "xray"
  position: { x: 0, y: 1, z: 3 }
}

// Gradient material
orb gradientCone {
  geometry: "cone"
  color: "magenta"
  material: "gradient"
  position: { x: 2, y: 0.75, z: 3 }
}

// Wireframe structure
orb wireframeDodeca {
  geometry: "dodecahedron"
  color: "lime"
  material: "wireframe"
  position: { x: 4, y: 1, z: 3 }
}

// === ORGANIC / NATURE ===

// Water droplet
orb waterDrop {
  geometry: "droplet"
  color: "aqua"
  material: "glass"
  position: { x: -3, y: 1.5, z: 6 }
  animate: "bob"
}

// Decorative vase
orb decorVase {
  geometry: "vase"
  color: "terracotta"
  material: "matte"
  position: { x: -1, y: 0.5, z: 6 }
}

// Snowflake
orb snowflake {
  geometry: "snowflake"
  color: "white"
  material: "shiny"
  glow: true
  position: { x: 1, y: 2, z: 6 }
  animate: "spin"
  animSpeed: 0.1
}

// Explosion burst
orb explosionBurst {
  geometry: "explosion"
  color: "lava"
  material: "neon"
  position: { x: 3, y: 1, z: 6 }
  animate: "pulse"
  animSpeed: 3
  animAmplitude: 0.15
}

// === ARCHITECTURAL ===

// Spiral staircase-like
orb spiralDeco {
  geometry: "spiral"
  color: "gold"
  material: "metal"
  position: { x: 0, y: 0.5, z: -6 }
  scale: { x: 2, y: 2, z: 2 }
}

// Crescent moon
orb crescentMoon {
  geometry: "moon"
  color: "silver"
  material: "shiny"
  glow: true
  emissiveIntensity: 0.3
  position: { x: -3, y: 3, z: -6 }
}

// Arrow pointer
orb arrowSign {
  geometry: "arrow"
  color: "warning"
  material: "matte"
  position: { x: 3, y: 2, z: -6 }
  rotation: { x: 0, y: 0, z: 90 }
}

// Bowl/cup
orb decorBowl {
  geometry: "bowl"
  color: "brass"
  material: "metal"
  position: { x: 5, y: 0.5, z: -6 }
}

// === CENTER PLATFORM ===

// Hexagonal platform base
orb hexPlatform {
  geometry: "hexagon"
  color: "slate"
  metallic: 0.6
  roughness: 0.3
  position: { x: 0, y: 0.1, z: 0 }
  scale: { x: 4, y: 1, z: 4 }
}

// === 3D TEXT ===

// Floating title text
orb titleText {
  text: "HOLOSCRIPT"
  color: "hologram"
  material: "hologram"
  position: { x: 0, y: 4, z: -5 }
  scale: { x: 0.5, y: 0.5, z: 0.5 }
}

// Subtitle text
orb subtitleText {
  text: "PREVIEW"
  color: "cyan"
  material: "neon"
  glow: true
  position: { x: 0, y: 3.2, z: -5 }
  scale: { x: 0.3, y: 0.3, z: 0.3 }
}

// === PARTICLE SYSTEMS ===

// Floating sparkles
orb sparkleParticles {
  type: "particles"
  count: 100
  color: "gold"
  position: { x: 0, y: 2, z: 0 }
  spread: 3
}

// Fire emitter
orb fireEmitter {
  type: "particles"
  count: 50
  color: "lava"
  position: { x: -5, y: 0.5, z: 5 }
  spread: 0.5
}

// Ice particles
orb iceParticles {
  type: "particles"
  count: 75
  color: "ice"
  position: { x: 5, y: 0.5, z: 5 }
  spread: 1
}

// === 3D MODELS (GLB) ===
// Note: These require actual .glb files in the models folder
// A placeholder shows while loading

// Example model reference (uncomment when you have a model)
// orb robotModel {
//   model: "models/robot.glb"
//   position: { x: 0, y: 0, z: -8 }
//   scale: { x: 1, y: 1, z: 1 }
// }
