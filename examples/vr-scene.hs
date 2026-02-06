// VR Scene
// Basic VR environment setup

environment {
  skybox: "sunset"
  ambient_light: 0.5
}

object "ground_plane" {
  geometry: "cube"
  color: "#3a5a3a"
  position: { x: 0, y: 0, z: 0 }
  scale: { x: 20, y: 0.1, z: 20 }
}

object "table" {
  geometry: "cube"
  color: "#8b4513"
  position: { x: 0, y: 0.75, z: 0 }
  scale: { x: 2, y: 0.1, z: 1 }
}

object "table_leg_1" {
  geometry: "cylinder"
  color: "#8b4513"
  position: { x: -0.8, y: 0.35, z: -0.4 }
  scale: { x: 0.1, y: 0.7, z: 0.1 }
}

object "table_leg_2" {
  geometry: "cylinder"
  color: "#8b4513"
  position: { x: 0.8, y: 0.35, z: -0.4 }
  scale: { x: 0.1, y: 0.7, z: 0.1 }
}

object "table_leg_3" {
  geometry: "cylinder"
  color: "#8b4513"
  position: { x: -0.8, y: 0.35, z: 0.4 }
  scale: { x: 0.1, y: 0.7, z: 0.1 }
}

object "table_leg_4" {
  geometry: "cylinder"
  color: "#8b4513"
  position: { x: 0.8, y: 0.35, z: 0.4 }
  scale: { x: 0.1, y: 0.7, z: 0.1 }
}

object "vase" {
  geometry: "cylinder"
  color: "#cd853f"
  position: { x: 0, y: 1, z: 0 }
  scale: { x: 0.2, y: 0.4, z: 0.2 }
}
