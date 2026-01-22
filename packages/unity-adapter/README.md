# @holoscript/unity-adapter

**Unity/C# adapter for HoloScript** - Generate Unity-ready C# scripts and prefabs from HoloScript.

## Overview

This package compiles HoloScript (`.holo`/`.hsplus`) to Unity-compatible files:

- **C# MonoBehaviour scripts** - Ready to attach to GameObjects
- **Unity Prefabs** (`.prefab`) - Pre-configured GameObjects
- **Materials** (`.mat`) - Color and shader definitions
- **Scenes** (`.unity`) - Complete scene exports

```typescript
import { exportToUnity } from '@holoscript/unity-adapter';

const result = await exportToUnity(ast, {
  outputDir: './UnityProject/Assets/HoloScript',
  projectName: 'MyVRWorld',
  xrFramework: 'xr-interaction-toolkit',
});
```

## Installation

```bash
npm install @holoscript/unity-adapter
```

## Quick Start

### 1. Parse HoloScript

```typescript
import { HoloScriptPlusParser } from '@holoscript/core';
import { exportToUnity, writeExportToFilesystem } from '@holoscript/unity-adapter';

const parser = new HoloScriptPlusParser();
const { ast } = parser.parse(`
  orb#ball @grabbable @throwable {
    color: "#ff0000"
    position: [0, 1, 0]
  }
`);
```

### 2. Export to Unity

```typescript
const result = await exportToUnity(ast, {
  outputDir: './UnityProject/Assets/HoloScript',
  projectName: 'MyWorld',
  xrFramework: 'xr-interaction-toolkit',
});

// Write files to disk
await writeExportToFilesystem(result);

console.log(`✅ Generated ${result.stats.scriptCount} scripts`);
console.log(`✅ Created ${result.stats.prefabCount} prefabs`);
```

### 3. Import in Unity

1. Open your Unity project
2. The generated files appear in `Assets/HoloScript/`
3. Drag prefabs into your scene
4. XR components are pre-configured!

## Supported Traits

| HoloScript Trait | Unity Components |
|-----------------|------------------|
| `@grabbable` | XRGrabInteractable, Rigidbody |
| `@throwable` | XRGrabInteractable, Rigidbody, ThrowableObject |
| `@pointable` | XRSimpleInteractable |
| `@hoverable` | XRSimpleInteractable, HoverHighlight |
| `@climbable` | ClimbInteractable |
| `@physics` | Rigidbody, Collider |
| `@breakable` | BreakableObject, Rigidbody |
| `@portal` | PortalTeleporter |
| `@npc` | NPCController, NavMeshAgent |
| `@audio` | AudioSource |
| `@particle` | ParticleSystem |

## XR Framework Support

| Framework | Config Value | Notes |
|-----------|--------------|-------|
| Unity XR Interaction Toolkit | `'xr-interaction-toolkit'` | Recommended (cross-platform) |
| Oculus Integration | `'oculus'` | Quest-specific features |
| SteamVR | `'steamvr'` | PC VR via OpenVR |
| None | `'none'` | No XR, standard Unity |

## Generated Code Example

**Input (HoloScript):**
```hsplus
orb#ball @grabbable {
  color: "#ff0000"
  position: [0, 1, 0]
}
```

**Output (C#):**
```csharp
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

namespace MyWorld.HoloScript
{
    [RequireComponent(typeof(Collider))]
    [RequireComponent(typeof(XRGrabInteractable))]
    [RequireComponent(typeof(Rigidbody))]
    public class Ball : MonoBehaviour
    {
        [SerializeField] private Vector3 _initialPosition = new Vector3(0, 1, 0);
        [SerializeField] private Color _color = new Color(1.000f, 0.000f, 0.000f);

        private void Awake()
        {
            transform.localPosition = _initialPosition;
            GetComponent<Renderer>().material.color = _color;
        }

        public void OnSelectEntered(SelectEnterEventArgs args)
        {
            Debug.Log($"{gameObject.name} grabbed");
        }
    }
}
```

## API Reference

### `exportToUnity(ast, config)`

Main export function.

```typescript
interface UnityExportConfig {
  outputDir: string;           // Unity Assets folder
  projectName: string;         // Namespace prefix
  xrFramework?: string;        // XR framework to target
  generateMeta?: boolean;      // Generate .meta files
  namespace?: string;          // C# namespace
}

interface UnityExportResult {
  success: boolean;
  files: GeneratedFile[];
  stats: ExportStats;
  warnings: ExportWarning[];
  errors: ExportError[];
}
```

### `generateCSharp(ast, options)`

Generate C# code without writing files.

```typescript
const csharp = generateCSharp(ast, { namespace: 'MyGame' });
console.log(csharp);
```

### `generatePrefab(ast, className)`

Generate Unity prefab YAML.

```typescript
const prefab = generatePrefab(ast, 'Ball');
```

## Workflow: HoloScript → Unity

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  .hsplus file   │ ──▶ │  unity-adapter   │ ──▶ │  Unity Project  │
│  (HoloScript)   │     │  (this package)  │     │  (.cs, .prefab) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## See Also

- [@holoscript/vrchat-export](../vrchat-export) - Export to VRChat/Udon
- [@holoscript/three-adapter](../three-adapter) - Three.js renderer
- [@holoscript/core](../core) - Parser and runtime

## License

MIT
