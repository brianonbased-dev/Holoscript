// HoloScript Quantum Radar
// Visualizes the agent mesh network in 3D holographic space.
// Agents are orbs, messages are pulses along curved connections.

// Council agents - primary command nodes
orb ceo {
  geometry: octahedron
  size: 4
  color: "#00ffff"
  position: { x: 0, y: 0, z: 0 }
  label: "CEO"
  @trait(animated, type="float", speed=1.5)
  @trait(animated, type="rotate", speed=0.5)
  @trait(material, preset="hologram", wireframe=true, emissive="#00ffff", emissiveIntensity=0.5)
  @trait(hoverable, highlight_intensity=2.0)
  @trait(neural_link, model="brittney-v4.gguf", temperature=0.7)
}

orb builder {
  geometry: octahedron
  size: 4
  color: "#00ffff"
  position: { x: 30, y: 10, z: 20 }
  label: "BUILDER"
  @trait(animated, type="float", speed=1.5)
  @trait(animated, type="rotate", speed=0.3)
  @trait(material, preset="hologram", wireframe=true, emissive="#00ffff", emissiveIntensity=0.5)
  @trait(hoverable, highlight_intensity=2.0)
}

orb futurist {
  geometry: octahedron
  size: 4
  color: "#00ffff"
  position: { x: -30, y: -10, z: 20 }
  label: "FUTURIST"
  @trait(animated, type="float", speed=1.5)
  @trait(animated, type="rotate", speed=0.3)
  @trait(material, preset="hologram", wireframe=true, emissive="#00ffff", emissiveIntensity=0.5)
  @trait(hoverable, highlight_intensity=2.0)
}

orb vision {
  geometry: octahedron
  size: 4
  color: "#00ffff"
  position: { x: 0, y: 20, z: -30 }
  label: "VISION"
  @trait(animated, type="float", speed=1.5)
  @trait(animated, type="rotate", speed=0.3)
  @trait(material, preset="hologram", wireframe=true, emissive="#00ffff", emissiveIntensity=0.5)
  @trait(hoverable, highlight_intensity=2.0)
}

// Shield spheres around council nodes
orb ceoShield {
  geometry: sphere
  size: 8
  color: "#00ffff"
  position: { x: 0, y: 0, z: 0 }
  @trait(material, wireframe=true, transparent=true, opacity=0.1)
}

// Mesh connections between council agents
connect ceo to builder as "command_channel"
connect ceo to futurist as "strategy_channel"
connect ceo to vision as "perception_channel"
connect builder to futurist as "sync_channel"
connect vision to builder as "insight_channel"

// Spatial event pulse stream
stream spatialEvents {
  source: "/api/mesh/spatial"
  interval: 1000
  through: [filterEvents, mapToPulse]
  to: renderPulse
}

function filterEvents(events: array): array {
  return events.slice(-20)
}

function mapToPulse(event: object): object {
  return {
    start: ceo.position,
    end: event.position,
    intensity: event.intensity
  }
}

function renderPulse(pulse: object) {
  animate pulse along curve from pulse.start to pulse.end
  duration: 0.5
  color: "#00ffff"
}
