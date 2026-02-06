// Hello World
// The simplest HoloScript example

environment {
  skybox: "clear"
  ambient_light: 0.6
}

object "hello_cube" {
  geometry: "cube"
  color: "#00ffff"
  position: { x: 0, y: 1, z: 0 }
  scale: { x: 1, y: 1, z: 1 }
}
