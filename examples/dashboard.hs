// Dashboard Example
// Data visualization layout

environment {
  skybox: "night"
  ambient_light: 0.4
}

object "main_panel" {
  geometry: "cube"
  color: "#1a1a2e"
  position: { x: 0, y: 1.5, z: -2 }
  scale: { x: 4, y: 2, z: 0.1 }
}

object "chart_area" {
  geometry: "cube"
  color: "#00aaff"
  position: { x: -1, y: 1.5, z: -1.9 }
  scale: { x: 1.5, y: 1, z: 0.05 }
}

object "stats_panel" {
  geometry: "cube"
  color: "#00ff88"
  position: { x: 1, y: 1.5, z: -1.9 }
  scale: { x: 1, y: 1, z: 0.05 }
}

object "floor" {
  geometry: "cube"
  color: "#0d0d1a"
  position: { x: 0, y: 0, z: 0 }
  scale: { x: 8, y: 0.1, z: 8 }
}
