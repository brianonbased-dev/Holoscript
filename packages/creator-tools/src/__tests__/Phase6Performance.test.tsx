/**
 * Phase 6: Performance Benchmark Tests
 * 
 * Performance benchmarks for all Phase 6 components:
 * - Initial render time
 * - Property update latency
 * - Metrics calculation performance
 * - Memory efficiency
 * - Cross-device comparison speed
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { TraitAnnotationEditor } from '../TraitAnnotationEditor'
import { RealtimePreviewEngine } from '../RealtimePreviewEngine'
import { TraitEditor } from '../TraitEditor'
import { PreviewDashboard } from '../PreviewDashboard'
import { Phase6CompleteDemo } from '../Phase6CompleteDemo'
import {
  mockMaterialConfig,
  mockDevices,
  mockMetrics,
  PerformanceMeasure,
  MemoryMeasure,
} from './setup'

describe('Phase 6 Performance Benchmarks', () => {
  let performanceMeasure: PerformanceMeasure
  let memoryMeasure: MemoryMeasure

  beforeEach(() => {
    performanceMeasure = new PerformanceMeasure()
    memoryMeasure = new MemoryMeasure()
  })

  afterEach(() => {
    performanceMeasure.clear()
    memoryMeasure.reset()
  })

  describe('TraitAnnotationEditor Performance', () => {
    it('should initialize in <10ms', () => {
      performanceMeasure.start('init')
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      const duration = performanceMeasure.end('init')

      expect(duration).toBeLessThan(10)
    })

    it('should generate code in <5ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      performanceMeasure.start('codeGen')
      editor.generateCode()
      const duration = performanceMeasure.end('codeGen')

      expect(duration).toBeLessThan(5)
    })

    it('should update property in <1ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      performanceMeasure.start('propUpdate')
      editor.updateProperty('metallic', 0.5)
      const duration = performanceMeasure.end('propUpdate')

      expect(duration).toBeLessThan(1)
    })

    it('should apply preset in <5ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      performanceMeasure.start('preset')
      editor.applyPreset('gold')
      const duration = performanceMeasure.end('preset')

      expect(duration).toBeLessThan(5)
    })

    it('should undo operation in <2ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      editor.updateProperty('metallic', 0.5)

      performanceMeasure.start('undo')
      editor.undo()
      const duration = performanceMeasure.end('undo')

      expect(duration).toBeLessThan(2)
    })

    it('should export config in <3ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      performanceMeasure.start('export')
      editor.exportConfig()
      const duration = performanceMeasure.end('export')

      expect(duration).toBeLessThan(3)
    })

    it('should handle 100 property updates in <100ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      performanceMeasure.start('bulk')
      for (let i = 0; i < 100; i++) {
        editor.updateProperty('metallic', Math.random())
      }
      const duration = performanceMeasure.end('bulk')

      expect(duration).toBeLessThan(100)
      expect(duration / 100).toBeLessThan(2) // Average <2ms per update
    })

    it('should maintain consistent performance on code generation', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      const durations: number[] = []

      for (let i = 0; i < 100; i++) {
        performanceMeasure.start('gen')
        editor.generateCode()
        durations.push(performanceMeasure.end('gen'))
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const variance = Math.sqrt(
        durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
      )

      expect(avgDuration).toBeLessThan(5)
      expect(maxDuration).toBeLessThan(10)
      expect(variance).toBeLessThan(2) // Low variance = consistent performance
    })

    it('should use <5MB memory for operations', () => {
      memoryMeasure.start()
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      for (let i = 0; i < 1000; i++) {
        editor.updateProperty('metallic', Math.random())
        editor.generateCode()
      }
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(5)
    })
  })

  describe('RealtimePreviewEngine Performance', () => {
    it('should register device in <1ms', () => {
      const engine = new RealtimePreviewEngine()
      performanceMeasure.start('register')
      engine.registerDevice(mockDevices[0])
      const duration = performanceMeasure.end('register')

      expect(duration).toBeLessThan(1)
    })

    it('should update preview in <5ms', () => {
      const engine = new RealtimePreviewEngine()
      engine.registerDevice(mockDevices[0])

      performanceMeasure.start('update')
      engine.updatePreview(mockDevices[0].id, mockMetrics)
      const duration = performanceMeasure.end('update')

      expect(duration).toBeLessThan(5)
    })

    it('should register 6 devices in <10ms', () => {
      const engine = new RealtimePreviewEngine()
      performanceMeasure.start('registerAll')
      mockDevices.forEach(device => {
        engine.registerDevice(device)
      })
      const duration = performanceMeasure.end('registerAll')

      expect(duration).toBeLessThan(10)
    })

    it('should handle 1000 metrics updates in <1 second', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
      })

      performanceMeasure.start('bulk')
      for (let i = 0; i < 1000; i++) {
        const device = mockDevices[i % mockDevices.length]
        engine.updatePreview(device.id, {
          ...mockMetrics,
          fps: 60 - (i % 30),
        })
      }
      const duration = performanceMeasure.end('bulk')

      expect(duration).toBeLessThan(1000)
      expect(duration / 1000).toBeLessThan(1) // Average <1ms per update
    })

    it('should calculate recommendations in <10ms', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
        for (let i = 0; i < 20; i++) {
          engine.updatePreview(device.id, mockMetrics)
        }
      })

      performanceMeasure.start('rec')
      engine.getRecommendations(mockDevices[0].id)
      const duration = performanceMeasure.end('rec')

      expect(duration).toBeLessThan(10)
    })

    it('should compare metrics in <5ms', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
        for (let i = 0; i < 20; i++) {
          engine.updatePreview(device.id, mockMetrics)
        }
      })

      performanceMeasure.start('compare')
      engine.compareMetrics(mockDevices[0].id, mockDevices[5].id)
      const duration = performanceMeasure.end('compare')

      expect(duration).toBeLessThan(5)
    })

    it('should export results in <20ms', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
        for (let i = 0; i < 50; i++) {
          engine.updatePreview(device.id, mockMetrics)
        }
      })

      performanceMeasure.start('export')
      engine.exportResults()
      const duration = performanceMeasure.end('export')

      expect(duration).toBeLessThan(20)
    })

    it('should maintain <20MB memory with 300 samples per device', () => {
      memoryMeasure.start()
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
        for (let i = 0; i < 300; i++) {
          engine.updatePreview(device.id, mockMetrics)
        }
      })
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(20)
    })
  })

  describe('React Component Performance', () => {
    it('should render TraitEditor in <500ms', () => {
      performanceMeasure.start('render')
      render(
        <TraitEditor
          config={mockMaterialConfig}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )
      const duration = performanceMeasure.end('render')

      expect(duration).toBeLessThan(500)
    })

    it('should render PreviewDashboard in <500ms', () => {
      const metrics = mockDevices.reduce(
        (acc, device) => ({
          ...acc,
          [device.id]: mockMetrics,
        }),
        {}
      )

      performanceMeasure.start('render')
      render(
        <PreviewDashboard
          devices={mockDevices}
          metrics={metrics}
          onMetricsUpdate={() => {}}
          onRecommendation={() => {}}
        />
      )
      const duration = performanceMeasure.end('render')

      expect(duration).toBeLessThan(500)
    })

    it('should render Phase6CompleteDemo in <750ms', () => {
      performanceMeasure.start('render')
      render(<Phase6CompleteDemo config={mockMaterialConfig} />)
      const duration = performanceMeasure.end('render')

      expect(duration).toBeLessThan(750)
    })

    it('should rerender TraitEditor on props change in <100ms', () => {
      const { rerender } = render(
        <TraitEditor
          config={mockMaterialConfig}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )

      performanceMeasure.start('rerender')
      rerender(
        <TraitEditor
          config={{
            ...mockMaterialConfig,
            isDirty: true,
          }}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )
      const duration = performanceMeasure.end('rerender')

      expect(duration).toBeLessThan(100)
    })

    it('should handle 100 property updates with rerenders in <2 seconds', () => {
      const { rerender } = render(
        <TraitEditor
          config={mockMaterialConfig}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )

      performanceMeasure.start('updates')
      for (let i = 0; i < 100; i++) {
        rerender(
          <TraitEditor
            config={{
              ...mockMaterialConfig,
              isDirty: i % 2 === 0,
            }}
            onCodeChange={() => {}}
            onMetricsUpdate={() => {}}
          />
        )
      }
      const duration = performanceMeasure.end('updates')

      expect(duration).toBeLessThan(2000)
    })

    it('should render all 6 device cards in <200ms', () => {
      const metrics = mockDevices.reduce(
        (acc, device) => ({
          ...acc,
          [device.id]: mockMetrics,
        }),
        {}
      )

      performanceMeasure.start('cards')
      render(
        <PreviewDashboard
          devices={mockDevices}
          metrics={metrics}
          onMetricsUpdate={() => {}}
          onRecommendation={() => {}}
        />
      )
      const duration = performanceMeasure.end('cards')

      expect(duration).toBeLessThan(200)
    })
  })

  describe('Memory Performance', () => {
    it('should keep TraitEditor memory <10MB', () => {
      memoryMeasure.start()
      render(
        <TraitEditor
          config={mockMaterialConfig}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(10)
    })

    it('should keep PreviewDashboard memory <15MB', () => {
      const metrics = mockDevices.reduce(
        (acc, device) => ({
          ...acc,
          [device.id]: mockMetrics,
        }),
        {}
      )

      memoryMeasure.start()
      render(
        <PreviewDashboard
          devices={mockDevices}
          metrics={metrics}
          onMetricsUpdate={() => {}}
          onRecommendation={() => {}}
        />
      )
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(15)
    })

    it('should keep complete demo memory <25MB', () => {
      memoryMeasure.start()
      render(<Phase6CompleteDemo config={mockMaterialConfig} />)
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(25)
    })

    it('should not leak memory on 100 rerenders', () => {
      const { rerender } = render(
        <TraitEditor
          config={mockMaterialConfig}
          onCodeChange={() => {}}
          onMetricsUpdate={() => {}}
        />
      )

      memoryMeasure.start()
      for (let i = 0; i < 100; i++) {
        rerender(
          <TraitEditor
            config={{
              ...mockMaterialConfig,
              isDirty: i % 2 === 0,
            }}
            onCodeChange={() => {}}
            onMetricsUpdate={() => {}}
          />
        )
      }
      const memDelta = memoryMeasure.getDelta()

      expect(memDelta).toBeLessThan(5) // Should not accumulate memory
    })
  })

  describe('Latency Targets', () => {
    it('should update FPS display in <100ms', () => {
      const engine = new RealtimePreviewEngine()
      engine.registerDevice(mockDevices[0])

      performanceMeasure.start('latency')
      engine.updatePreview(mockDevices[0].id, {
        ...mockMetrics,
        fps: 45,
      })
      const duration = performanceMeasure.end('latency')

      expect(duration).toBeLessThan(100)
    })

    it('should show recommendation in <100ms', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
        for (let i = 0; i < 20; i++) {
          engine.updatePreview(device.id, mockMetrics)
        }
      })

      performanceMeasure.start('rec')
      engine.getRecommendations(mockDevices[0].id)
      const duration = performanceMeasure.end('rec')

      expect(duration).toBeLessThan(100)
    })

    it('should apply preset in <100ms', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)

      performanceMeasure.start('preset')
      editor.applyPreset('gold')
      editor.generateCode()
      const duration = performanceMeasure.end('preset')

      expect(duration).toBeLessThan(100)
    })

    it('should switch views in <200ms', () => {
      const { rerender } = render(
        <Phase6CompleteDemo config={mockMaterialConfig} />
      )

      performanceMeasure.start('viewSwitch')
      // Simulate view mode change (typically prop change)
      rerender(<Phase6CompleteDemo config={mockMaterialConfig} />)
      const duration = performanceMeasure.end('viewSwitch')

      expect(duration).toBeLessThan(200)
    })
  })

  describe('Throughput Benchmarks', () => {
    it('should process 1000 property updates per second', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)

      performanceMeasure.start('throughput')
      for (let i = 0; i < 1000; i++) {
        editor.updateProperty('metallic', Math.random())
      }
      const duration = performanceMeasure.end('throughput')

      const updatesPerSecond = (1000 / duration) * 1000
      expect(updatesPerSecond).toBeGreaterThan(1000)
    })

    it('should process 200+ metrics updates per second', () => {
      const engine = new RealtimePreviewEngine()
      mockDevices.forEach(device => {
        engine.registerDevice(device)
      })

      performanceMeasure.start('throughput')
      for (let i = 0; i < 500; i++) {
        const device = mockDevices[i % mockDevices.length]
        engine.updatePreview(device.id, mockMetrics)
      }
      const duration = performanceMeasure.end('throughput')

      const updatesPerSecond = (500 / duration) * 1000
      expect(updatesPerSecond).toBeGreaterThan(200)
    })

    it('should generate 500+ code outputs per second', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)

      performanceMeasure.start('throughput')
      for (let i = 0; i < 1000; i++) {
        editor.generateCode()
      }
      const duration = performanceMeasure.end('throughput')

      const codesPerSecond = (1000 / duration) * 1000
      expect(codesPerSecond).toBeGreaterThan(500)
    })
  })

  describe('Scalability Benchmarks', () => {
    it('should scale to 1000 property updates without significant slowdown', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      const durations: number[] = []

      for (let batch = 0; batch < 10; batch++) {
        performanceMeasure.start('batch')
        for (let i = 0; i < 100; i++) {
          editor.updateProperty('metallic', Math.random())
        }
        durations.push(performanceMeasure.end('batch'))
      }

      // Last batch should not be significantly slower than first batch
      const firstBatchAvg = durations.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const lastBatchAvg = durations.slice(-3).reduce((a, b) => a + b, 0) / 3

      expect(lastBatchAvg / firstBatchAvg).toBeLessThan(1.5) // <50% slower
    })

    it('should maintain performance with 300 metric samples per device', () => {
      const engine = new RealtimePreviewEngine()
      engine.registerDevice(mockDevices[0])

      performanceMeasure.start('perf')
      for (let i = 0; i < 300; i++) {
        engine.updatePreview(mockDevices[0].id, mockMetrics)
      }
      const firstDuration = performanceMeasure.end('perf')

      // Do it again and measure
      performanceMeasure.start('perf2')
      for (let i = 0; i < 300; i++) {
        engine.updatePreview(mockDevices[0].id, {
          ...mockMetrics,
          fps: 60 - (i % 30),
        })
      }
      const secondDuration = performanceMeasure.end('perf2')

      expect(secondDuration / firstDuration).toBeLessThan(1.5)
    })
  })

  describe('Performance Consistency', () => {
    it('should have consistent p99 latency <10ms for updates', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      const durations: number[] = []

      for (let i = 0; i < 100; i++) {
        performanceMeasure.start('op')
        editor.updateProperty('metallic', Math.random())
        durations.push(performanceMeasure.end('op'))
      }

      durations.sort((a, b) => a - b)
      const p99 = durations[Math.floor(durations.length * 0.99)]

      expect(p99).toBeLessThan(10)
    })

    it('should have low tail latency for code generation', () => {
      const editor = new TraitAnnotationEditor(mockMaterialConfig)
      const durations: number[] = []

      for (let i = 0; i < 100; i++) {
        performanceMeasure.start('gen')
        editor.generateCode()
        durations.push(performanceMeasure.end('gen'))
      }

      const maxDuration = Math.max(...durations)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      expect(maxDuration / avgDuration).toBeLessThan(2) // Max not more than 2x average
    })
  })
})
