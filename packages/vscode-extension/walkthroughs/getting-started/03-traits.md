# VR Traits - Add Interactivity

Traits are the magic of HoloScript. Add `@trait` to any object to give it VR superpowers!

## Essential Traits

### Interaction
```holo
@grabbable    // User can grab the object in VR
@pointable    // User can point/click at it
@hoverable    // Reacts to gaze/pointer hover
```

### Physics
```holo
@physics      // Full physics simulation
@collidable   // Can collide with other objects
@gravity      // Affected by gravity
```

### Visual
```holo
@glowing      // Emits light
@transparent  // See-through material
@animated     // Has animations
```

### Multiplayer
```holo
@networked    // Synced across all players
@persistent   // Saved when scene exits
```

## Example: Interactive Button

```holo
object "BigRedButton" {
  @pointable
  @clickable
  @glowing
  
  position: [0, 1, -1]
  color: "red"
  
  on_click: {
    audio.play("button-click")
    this.color = "green"
  }
}
```

---

📹 *Video Tutorial: [Coming Soon - VR Traits Deep Dive]*

Click **Next** to preview your scene!
