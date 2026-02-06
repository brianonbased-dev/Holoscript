// AI Agent Example
// Demonstrates agent behavior patterns

environment {
  skybox: "digital"
  ambient_light: 0.5
}

object "agent_core" {
  geometry: "sphere"
  color: "#00ff88"
  position: { x: 0, y: 1.5, z: 0 }
  scale: { x: 0.8, y: 0.8, z: 0.8 }
  material: "hologram"
}

object "sensor_ring" {
  geometry: "torus"
  color: "#0088ff"
  position: { x: 0, y: 1.5, z: 0 }
  scale: { x: 1.5, y: 1.5, z: 0.1 }
}

object "data_stream_1" {
  geometry: "cylinder"
  color: "#00ffff"
  position: { x: -2, y: 1, z: 0 }
  scale: { x: 0.1, y: 2, z: 0.1 }
}

object "data_stream_2" {
  geometry: "cylinder"
  color: "#ff00ff"
  position: { x: 2, y: 1, z: 0 }
  scale: { x: 0.1, y: 2, z: 0.1 }
}
