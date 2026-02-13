import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptRuntime } from '../src/HoloScriptRuntime';
import { HoloScriptCodeParser } from '../src/HoloScriptCodeParser';

describe('Hot-Reload & State Migration', () => {
  let runtime: HoloScriptRuntime;
  let parser: HoloScriptCodeParser;

  beforeEach(() => {
    runtime = new HoloScriptRuntime();
    parser = new HoloScriptCodeParser();
  });

  it('should preserve object state across simple re-evaluation (ID consistency)', async () => {
    const codeV1 = `
      orb UserOrb {
        color: "#ff0000"
        @state {
          points: 10
        }
      }
    `;

    const resultV1 = parser.parse(codeV1);
    await runtime.execute(resultV1.ast);

    const orbV1 = runtime.getVariable('UserOrb') as any;
    expect(orbV1).toBeDefined();
    expect(orbV1.properties.points).toBe(10);
    const originalCreation = orbV1.created;

    // Simulate manual state update in runtime
    orbV1.properties.points = 25;

    // Re-evaluate with exact same code (simulating hot-reload)
    const resultV2 = parser.parse(codeV1);
    await runtime.execute(resultV2.ast);

    const orbV2 = runtime.getVariable('UserOrb') as any;
    expect(orbV2).toBeDefined();

    // CURRENT BEHAVIOR (Likely FAILS): It probably overwrites points back to 10
    // and creates a new object (new .created timestamp)
    expect(orbV2.properties.points).toBe(25);
    expect(orbV2.created).toBe(originalCreation);
  });

  it('should execute migration block when template version increases', async () => {
    const codeV1 = `
      template BaseOrb {
        @version(1)
        size: 0.5
      }

      orb TestingOrb using BaseOrb {
        @state {
          legacyScale: 2
        }
      }
    `;

    const resultV1 = parser.parse(codeV1);
    await runtime.execute(resultV1.ast);

    const orbV1 = runtime.getVariable('TestingOrb') as any;
    expect(orbV1.properties.legacyScale).toBe(2);

    const codeV2 = `
      template BaseOrb {
        @version(2)
        size: 1.0
        
        migrate from(1) {
          // Double the size based on legacy scale
          this.properties.size = this.properties.size * this.properties.legacyScale;
          delete this.properties.legacyScale;
        }
      }

      orb TestingOrb using BaseOrb {
        // Updated logic
      }
    `;

    const resultV2 = parser.parse(codeV2);
    await runtime.execute(resultV2.ast);

    const orbV2 = runtime.getVariable('TestingOrb') as any;
    expect(orbV2.properties.size).toBe(2.0); // 1.0 * 2 (from migration)
    expect(orbV2.properties.legacyScale).toBeUndefined();
  });
});
