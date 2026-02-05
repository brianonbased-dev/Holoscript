# Lesson 2.1: Advanced Traits

Now that you understand the basics of traits, let's explore advanced usage patterns - combining traits, configuring them dynamically, and understanding trait composition.

## Learning Objectives

By the end of this lesson, you will:
- Combine multiple traits effectively
- Configure traits with complex options
- Understand trait precedence and conflicts
- Create trait presets for reusability

## Trait Configuration Deep Dive

Traits aren't just flags - they can accept complex configurations:

```hsplus
orb advancedObject {
  // Simple trait (no config)
  @grabbable

  // Trait with single value
  @animated { duration: 2.0 }

  // Trait with object config
  @physics {
    mass: 2.5
    friction: 0.3
    restitution: 0.8
    angularDamping: 0.5
    constraints: {
      freezePosition: [false, false, false]
      freezeRotation: [false, true, false]  // Lock Y rotation
    }
  }

  // Trait with array config
  @audio_sources [
    { clip: "ambient.mp3", volume: 0.5, loop: true },
    { clip: "interaction.wav", volume: 1.0, spatial: true }
  ]
}
```

## Trait Combinations

### Physics + Networking

Creating networked physics objects requires careful configuration:

```hsplus
orb syncedPhysicsObject {
  @physics {
    mass: 1.0
    interpolation: "interpolate"  // Smooth movement
  }

  @networked {
    ownership: "last_interacted"  // Who controls physics
    syncRate: 20                  // Updates per second
    interpolation: true
  }

  @synced {
    properties: ["position", "rotation", "velocity"]
    threshold: 0.01  // Only sync if changed by this amount
  }

  @grabbable {
    twoHanded: false
    snapToHand: true
  }
}
```

### Interaction Traits Stack

Multiple interaction traits can coexist:

```hsplus
orb multiInteractionObject {
  @grabbable {
    grabPoints: [
      { position: [0, 0.1, 0], rotation: [0, 0, 0] },
      { position: [0, -0.1, 0], rotation: [180, 0, 0] }
    ]
  }

  @pointable {
    maxDistance: 5.0
    showReticle: true
  }

  @hoverable {
    hoverScale: 1.1
    hoverColor: "#FFFFFF"
  }

  @clickable {
    holdTime: 0.5  // Long press duration
  }

  // Different events for different interactions
  onGrab: { console.log("Grabbed!") }
  onPoint: { console.log("Pointed at!") }
  onHover: { console.log("Hovering!") }
  onClick: { console.log("Clicked!") }
}
```

## Trait Precedence

When traits conflict, precedence rules apply:

```hsplus
orb conflictExample {
  // Both try to control position
  @physics { kinematic: false }  // Physics controls position
  @animated { path: [...] }       // Animation controls position

  // Resolution: Last declared wins, OR use explicit mode
  @physics {
    kinematic: true              // Now animation can control
    animationDriven: true
  }
}
```

### Precedence Order

1. **Explicit overrides** in trait config
2. **Last declared** trait of conflicting type
3. **Default** trait behavior

## Creating Trait Presets

For reusable trait combinations, use templates:

```hsplus
// Define a preset
template "GrabbablePhysicsObject" {
  @grabbable {
    twoHanded: false
    snapToHand: true
  }

  @physics {
    mass: 1.0
    friction: 0.5
    restitution: 0.3
  }

  @collidable
  @hoverable
}

// Use the preset
orb myCube {
  using "GrabbablePhysicsObject"

  // Override specific properties
  @physics { mass: 2.0 }

  position: [0, 1, 0]
  color: "#3498DB"
}
```

## Conditional Traits

Apply traits based on conditions:

```hsplus
orb conditionalObject {
  // Base traits always applied
  @hoverable

  // Conditional traits (pseudo-code pattern)
  state: {
    isGrabbable: true
    hasPhysics: false
  }

  logic {
    on_scene_load: {
      if (this.state.isGrabbable) {
        this.addTrait("grabbable")
      }
      if (this.state.hasPhysics) {
        this.addTrait("physics", { mass: 1.0 })
      }
    }
  }
}
```

## Trait Events

Many traits emit events you can listen to:

```hsplus
orb eventfulObject {
  @physics {
    mass: 1.0
    reportCollisions: true
  }

  @networked

  // Physics events
  onCollisionEnter: (collision) => {
    console.log("Hit:", collision.other.name)
    console.log("Force:", collision.impulse)
  }

  onCollisionExit: (collision) => {
    console.log("Separated from:", collision.other.name)
  }

  // Network events
  onOwnershipChanged: (newOwner) => {
    console.log("New owner:", newOwner.id)
  }

  onNetworkSpawn: {
    console.log("Spawned on network")
  }
}
```

## Performance Considerations

### Trait Costs

| Trait | CPU Impact | Network Impact |
|-------|------------|----------------|
| @physics | High | Medium (if synced) |
| @networked | Low | High |
| @animated | Medium | Low |
| @grabbable | Low | Low |
| @collidable | Low-Medium | None |

### Optimization Tips

```hsplus
// Bad: Every small object has physics
orb debris1 { @physics { mass: 0.1 } }
orb debris2 { @physics { mass: 0.1 } }
// ... 100 more

// Good: Use static colliders for non-moving objects
orb debris1 {
  @collidable { static: true }
  // No @physics = no simulation cost
}

// Even better: Combine into one physics object
group debrisGroup {
  @physics { mass: 5.0 }  // One physics body
  // Children are part of compound collider
  orb debris1 { position: [...] }
  orb debris2 { position: [...] }
}
```

## Exercise: Build a Physics Puzzle

Create a puzzle where the user must:
1. Stack three physics cubes
2. Balance them for 3 seconds
3. Trigger a victory effect

### Starter Code

```hsplus
composition "Stacking Puzzle" {
  // Platform to stack on
  orb platform {
    @collidable { static: true }
    position: [0, 0.5, -2]
    scale: [0.5, 0.05, 0.5]
  }

  // Three stackable cubes
  orb cube1 {
    @grabbable
    @physics { mass: 1.0 }
    position: [1, 1, -2]
    scale: 0.2
    color: "#E74C3C"
    geometry: "cube"
  }

  // TODO: Add cube2 and cube3
  // TODO: Add victory detection logic
}
```

## Summary

In this lesson, you learned:
- How to configure traits with complex options
- Combining multiple traits effectively
- Trait precedence and conflict resolution
- Creating reusable trait presets
- Performance considerations for traits

## Next Lesson

In [Lesson 2.2: Physics Simulation](./02-physics.md), we'll dive deep into the physics system - joints, constraints, forces, and realistic simulations.

---

**Time to complete:** ~40 minutes
**Difficulty:** Intermediate
**Prerequisites:** Level 1 Complete
