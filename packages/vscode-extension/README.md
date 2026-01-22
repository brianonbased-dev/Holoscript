# HoloScript Enhanced

Language support for HoloScript+ - a declarative language for spatial computing and XR development.

## Features

- **Syntax Highlighting** for `.holo`, `.hs`, and `.hsplus` files
- **VR Traits** - 49 built-in traits for XR interactions
- **Lifecycle Hooks** - 78 event handlers for runtime behavior
- **Control Flow** - `@if`, `@else`, `@for`, `@forEach`, `@while`
- **Scale Modifiers** - atomic, nano, micro, macro, galactic, cosmic

## Supported Syntax

### Primitives
`orb`, `sphere`, `cube`, `box`, `cylinder`, `cone`, `plane`, `mesh`, `avatar`, `light`, `camera`, `scene`, `group`, `text`, `panel`, `button`, `slider`, `zone`

### VR Traits
`@grabbable`, `@throwable`, `@hoverable`, `@scalable`, `@rotatable`, `@snappable`, `@breakable`, `@stretchable`, `@moldable`, `@skeleton`, `@body`, `@face`, `@expressive`, `@hands`, `@networked`, `@recordable`, `@streamable`, `@trackable`, `@shareable`, `@particle`, `@timeline`, and more...

### Lifecycle Hooks
`@on_mount`, `@on_grab`, `@on_release`, `@on_hover_enter`, `@on_collision`, `@on_click`, `@on_stretch`, `@on_pose_change`, `@on_record_start`, `@on_share`, `@on_particle_spawn`, `@on_voice_command`, and more...

## Example

```holoscript
// VR Interactive Cube
cube#interactive_box @grabbable @throwable @hoverable {
  position: [0, 1, 0]
  size: 0.5
  color: "#3498db"

  @on_grab(hand) => highlight(true)
  @on_release(velocity) => applyForce(velocity)
  @on_hover_enter => showTooltip("Grab me!")
}

// Humanoid Avatar with IK
avatar#npc @skeleton(type: "humanoid", ik_enabled: true) @expressive {
  position: [2, 0, 0]

  @on_pose_change(pose) => updateAnimation(pose)
  @on_gesture(gesture) => respondToGesture(gesture)
}
```

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "HoloScript Enhanced"
4. Click Install

Or install manually:
```bash
code --install-extension holoscript-vscode-1.0.0.vsix
```

## Links

- [HoloScript Documentation](https://github.com/brianonbased-dev/holoscript)
- [Report Issues](https://github.com/brianonbased-dev/holoscript/issues)

## License

MIT
