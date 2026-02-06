// Neural Network Visualization
// Visual representation of AI layers

environment {
  skybox: "digital"
  ambient_light: 0.4
}

object "input_layer" {
  geometry: "cube"
  color: "#00aaff"
  position: { x: -3, y: 1.5, z: 0 }
  scale: { x: 0.5, y: 2, z: 0.5 }
}

object "hidden_layer_1" {
  geometry: "cube"
  color: "#00ff88"
  position: { x: -1, y: 1.5, z: 0 }
  scale: { x: 0.5, y: 2.5, z: 0.5 }
}

object "hidden_layer_2" {
  geometry: "cube"
  color: "#ffaa00"
  position: { x: 1, y: 1.5, z: 0 }
  scale: { x: 0.5, y: 2.5, z: 0.5 }
}

object "output_layer" {
  geometry: "cube"
  color: "#ff0088"
  position: { x: 3, y: 1.5, z: 0 }
  scale: { x: 0.5, y: 1.5, z: 0.5 }
}

object "connection_1" {
  geometry: "cylinder"
  color: "#444444"
  position: { x: -2, y: 1.5, z: 0 }
  scale: { x: 0.02, y: 2, z: 0.02 }
}

object "connection_2" {
  geometry: "cylinder"
  color: "#444444"
  position: { x: 0, y: 1.5, z: 0 }
  scale: { x: 0.02, y: 2, z: 0.02 }
}

object "connection_3" {
  geometry: "cylinder"
  color: "#444444"
  position: { x: 2, y: 1.5, z: 0 }
  scale: { x: 0.02, y: 2, z: 0.02 }
}
