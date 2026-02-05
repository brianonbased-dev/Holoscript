# Understanding Orbs

Welcome to Lesson 1.4! In this lesson, you'll master the fundamental building block of HoloScript: the **orb**. You'll learn how orbs work, their properties, and best practices for defining 3D objects.

## What is an Orb?

An **orb** is HoloScript's term for a 3D object in your scene. Think of it as a container that holds:
- **Geometry** - The shape (cube, sphere, model, etc.)
- **Properties** - Position, color, scale, material
- **Traits** - Behaviors like @grabbable or @physics
- **Events** - Handlers like onGrab or onClick

### Basic Orb Syntax

```hs
orb myCube {
  geometry: "cube"
  position: [0, 1, 0]
  color: "#ff0000"
}
```

## Geometry Types

HoloScript supports many built-in geometry types:

### Primitives

```hs
orb box {
  geometry: "cube"
  scale: [1, 1, 1]
}

orb ball {
  geometry: "sphere"
  radius: 0.5
}

orb tube {
  geometry: "cylinder"
  radiusTop: 0.3
  radiusBottom: 0.3
  height: 1.0
}

orb ring {
  geometry: "torus"
  radius: 0.5
  tubeRadius: 0.1
}

orb pill {
  geometry: "capsule"
  radius: 0.3
  height: 1.0
}

orb floor {
  geometry: "plane"
  width: 10
  height: 10
}
```

### 3D Models

Load external 3D models:

```hs
orb character {
  geometry: "model/characters/player.glb"
  scale: [1, 1, 1]
}

orb furniture {
  geometry: "model/props/chair.gltf"
  position: [2, 0, 0]
}
```

Supported formats: `.glb`, `.gltf`, `.obj`

## Essential Properties

### Position

Position uses a 3D vector `[x, y, z]`:

```hs
orb myOrb {
  position: [0, 0, 0]    // Origin (center of scene)
  position: [1, 0, 0]    // 1 meter to the right
  position: [0, 2, 0]    // 2 meters up
  position: [0, 0, -3]   // 3 meters in front
}
```

### Rotation

Rotation uses Euler angles in degrees:

```hs
orb rotated {
  rotation: [0, 0, 0]      // No rotation
  rotation: [45, 0, 0]     // Tilted forward 45°
  rotation: [0, 90, 0]     // Turned right 90°
  rotation: [0, 0, 30]     // Rolled 30°
}
```

### Scale

Scale can be uniform or per-axis:

```hs
orb scaled {
  scale: 2                 // Uniform scale (2x bigger)
  scale: [1, 2, 1]         // Stretched vertically
  scale: [0.5, 0.5, 0.5]   // Half size
}
```

### Color

Colors use hex codes or named colors:

```hs
orb colored {
  color: "#ff0000"     // Red
  color: "#00ff00"     // Green
  color: "#0000ff"     // Blue
  color: "red"         // Named color
  color: "steelblue"   // CSS color name
}
```

### Opacity

Control transparency (0-1):

```hs
orb transparent {
  color: "#ffffff"
  opacity: 0.5         // 50% transparent
}
```

## Materials

For more control, use the material property:

```hs
orb metallic {
  geometry: "sphere"
  material: {
    color: "#c0c0c0"
    metalness: 1.0
    roughness: 0.2
  }
}

orb glowing {
  geometry: "cube"
  material: {
    color: "#00ffff"
    emissive: "#00ffff"
    emissiveIntensity: 0.5
  }
}

orb textured {
  geometry: "plane"
  material: {
    map: "textures/wood.jpg"
    normalMap: "textures/wood_normal.jpg"
  }
}
```

## Naming Conventions

Good orb names are:
- **Descriptive** - Tell what the object represents
- **Unique** - No duplicate names in the same scope
- **CamelCase** - For multi-word names

```hs
// ✓ Good names
orb playerCharacter { }
orb redButton { }
orb mainDoor { }
orb enemySpawner { }

// ✗ Avoid
orb x { }           // Not descriptive
orb my_cube { }     // Use camelCase
orb Orb1 { }        // Not meaningful
```

## Nested Orbs

Orbs can contain other orbs, creating parent-child relationships:

```hs
orb table {
  geometry: "cube"
  scale: [1, 0.1, 0.6]
  position: [0, 0.75, 0]
  
  orb leg1 {
    geometry: "cylinder"
    scale: [0.05, 0.75, 0.05]
    position: [-0.4, -0.4, -0.25]
  }
  
  orb leg2 {
    geometry: "cylinder"
    scale: [0.05, 0.75, 0.05]
    position: [0.4, -0.4, -0.25]
  }
  
  orb leg3 {
    geometry: "cylinder"
    scale: [0.05, 0.75, 0.05]
    position: [-0.4, -0.4, 0.25]
  }
  
  orb leg4 {
    geometry: "cylinder"
    scale: [0.05, 0.75, 0.05]
    position: [0.4, -0.4, 0.25]
  }
}
```

Child orb positions are **relative** to the parent.

## Using object Keyword

The `object` keyword is an alias for `orb`:

```hs
// These are equivalent
orb cube1 { geometry: "cube" }
object cube2 { geometry: "cube" }
```

Use `object` when building non-VR web content, `orb` for VR-first development.

## Complete Example

Here's a complete example combining all concepts:

```hs
orb scene {
  
  // Floor
  orb ground {
    geometry: "plane"
    width: 20
    height: 20
    rotation: [-90, 0, 0]
    material: {
      color: "#3a3a3a"
      roughness: 0.9
    }
  }
  
  // Interactive cube
  orb interactiveCube {
    @grabbable
    @physics { mass: 1.0 }
    
    geometry: "cube"
    position: [0, 1.5, -2]
    scale: 0.3
    
    material: {
      color: "#ff6600"
      metalness: 0.3
      roughness: 0.5
    }
    
    onGrab: {
      this.material.emissive = "#ff6600"
    }
    
    onRelease: {
      this.material.emissive = "#000000"
    }
  }
  
  // Light source
  orb sun {
    geometry: "sphere"
    scale: 0.1
    position: [5, 10, 5]
    material: {
      color: "#ffffcc"
      emissive: "#ffffcc"
      emissiveIntensity: 1.0
    }
  }
}
```

## Quiz

Test your understanding:

1. What's the difference between `geometry: "cube"` and `geometry: "model/box.glb"`?
2. If a child orb has position `[1, 0, 0]` and parent has `[5, 0, 0]`, where is the child in world space?
3. How would you make an object 50% transparent?
4. What property makes an object glow?
5. Can orbs contain other orbs?

<details>
<summary>Answers</summary>

1. `"cube"` is a built-in primitive, `"model/box.glb"` loads an external 3D model file
2. The child is at `[6, 0, 0]` - positions are relative to parent
3. `opacity: 0.5`
4. `emissive` and `emissiveIntensity` in the material
5. Yes, through nesting

</details>

## Hands-on Exercise

Create a simple table with a vase on top:

```hs
// Create your solution here
orb table {
  // Table top and legs
  
  orb vase {
    // Vase on the table
  }
}
```

---

**Estimated time:** 25 minutes  
**Difficulty:** ⭐ Beginner  
**Next:** [Lesson 1.5 - Properties Deep Dive](./05-properties.md)
