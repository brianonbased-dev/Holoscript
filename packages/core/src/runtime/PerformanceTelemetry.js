/**
 * @holoscript/core Performance Telemetry
 *
 * Real-time performance monitoring, profiling, and metrics collection
 * Exports metrics to analytics platforms and provides performance budgets
 */
/**
 * PerformanceTelemetry - Monitor and analyze runtime performance
 */
export class PerformanceTelemetry {
    constructor() {
        this.metrics = [];
        this.budgets = new Map();
        this.frameTimings = [];
        this.memorySnapshots = [];
        this.exporters = [];
        this.frameCounter = 0;
        this.lastFrameTime = Date.now();
        this.frameTimes = [];
        this.maxFrameHistory = 300; // ~5s at 60fps
        this.monitoringEnabled = false;
        this.exportInterval = null;
        this.exportIntervalMs = 10000; // Export every 10s
        this.initializeDefaultBudgets();
    }
    /**
     * Initialize default performance budgets
     */
    initializeDefaultBudgets() {
        // Frame budget: 16.67ms target (60fps)
        this.setBudget({
            metricName: 'frame_duration',
            maxValue: 16.67,
            severity: 'warning',
            enabled: true,
        });
        // Memory budget: 100MB
        this.setBudget({
            metricName: 'heap_used',
            maxValue: 100 * 1024 * 1024,
            severity: 'warning',
            enabled: true,
        });
        // Render time budget: 10ms
        this.setBudget({
            metricName: 'render_time',
            maxValue: 10,
            severity: 'warning',
            enabled: true,
        });
    }
    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.monitoringEnabled)
            return;
        this.monitoringEnabled = true;
        this.lastFrameTime = performance.now();
        // Setup auto-export
        if (this.exporters.length > 0) {
            this.exportInterval = setInterval(() => {
                this.exportMetrics();
            }, this.exportIntervalMs);
        }
        console.log('Performance monitoring started');
    }
    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (!this.monitoringEnabled)
            return;
        this.monitoringEnabled = false;
        if (this.exportInterval) {
            clearInterval(this.exportInterval);
            this.exportInterval = null;
        }
        console.log('Performance monitoring stopped');
    }
    /**
     * Record frame timing
     */
    recordFrame(cpuTime, gpuTime, renderTime, logicTime) {
        if (!this.monitoringEnabled)
            return;
        const now = performance.now();
        const frameDuration = now - this.lastFrameTime;
        const fps = Math.round(1000 / frameDuration);
        this.frameTimes.push(frameDuration);
        if (this.frameTimes.length > this.maxFrameHistory) {
            this.frameTimes.shift();
        }
        const timing = {
            frameNumber: this.frameCounter++,
            fps,
            frameDuration,
            cpuTime,
            gpuTime,
            renderTime,
            logicTime,
            timestamp: now,
        };
        this.frameTimings.push(timing);
        // Record metrics
        this.recordMetric({
            name: 'frame_duration',
            type: 'gauge',
            value: frameDuration,
            unit: 'ms',
            timestamp: now,
        });
        this.recordMetric({
            name: 'fps',
            type: 'gauge',
            value: fps,
            timestamp: now,
        });
        this.recordMetric({
            name: 'render_time',
            type: 'gauge',
            value: renderTime,
            unit: 'ms',
            timestamp: now,
        });
        this.checkBudgets(timing);
        this.lastFrameTime = now;
    }
    /**
     * Record custom metric
     */
    recordMetric(metric) {
        this.metrics.push({
            ...metric,
            timestamp: Date.now(),
        });
    }
    /**
     * Record memory snapshot
     */
    recordMemorySnapshot() {
        if (!this.monitoringEnabled)
            return;
        const perf = performance.memory;
        if (!perf) {
            console.warn('Memory profiling not available');
            return;
        }
        const snapshot = {
            usedJSHeapSize: perf.usedJSHeapSize,
            totalJSHeapSize: perf.totalJSHeapSize,
            jsHeapSizeLimit: perf.jsHeapSizeLimit,
            objectCount: 0, // Would require additional instrumentation
            gcEventsSinceLastSnapshot: 0,
            timestamp: Date.now(),
        };
        this.memorySnapshots.push(snapshot);
        // Record as metrics
        this.recordMetric({
            name: 'heap_used',
            type: 'gauge',
            value: snapshot.usedJSHeapSize,
            unit: 'bytes',
            timestamp: snapshot.timestamp,
        });
        this.recordMetric({
            name: 'heap_total',
            type: 'gauge',
            value: snapshot.totalJSHeapSize,
            unit: 'bytes',
            timestamp: snapshot.timestamp,
        });
        // Check memory budget
        const budget = this.budgets.get('heap_used');
        if (budget && budget.enabled && snapshot.usedJSHeapSize > budget.maxValue) {
            this.emitBudgetViolation('heap_used', snapshot.usedJSHeapSize, budget.maxValue, budget.severity);
        }
    }
    /**
     * Check frame metrics against budgets
     */
    checkBudgets(timing) {
        // Check frame duration budget
        const frameBudget = this.budgets.get('frame_duration');
        if (frameBudget &&
            frameBudget.enabled &&
            timing.frameDuration > frameBudget.maxValue) {
            this.emitBudgetViolation('frame_duration', timing.frameDuration, frameBudget.maxValue, frameBudget.severity);
        }
        // Check render time budget
        const renderBudget = this.budgets.get('render_time');
        if (renderBudget &&
            renderBudget.enabled &&
            timing.renderTime > renderBudget.maxValue) {
            this.emitBudgetViolation('render_time', timing.renderTime, renderBudget.maxValue, renderBudget.severity);
        }
    }
    /**
     * Emit budget violation warning
     */
    emitBudgetViolation(metric, actual, budget, severity) {
        const message = `Budget violation: ${metric} = ${actual.toFixed(2)} (budget: ${budget.toFixed(2)})`;
        if (severity === 'critical') {
            console.error(`❌ ${message}`);
        }
        else if (severity === 'warning') {
            console.warn(`⚠️ ${message}`);
        }
        else {
            console.log(`ℹ️ ${message}`);
        }
    }
    /**
     * Set or update performance budget
     */
    setBudget(budget) {
        this.budgets.set(budget.metricName, budget);
    }
    /**
     * Get average FPS over recent frames
     */
    getAverageFPS() {
        if (this.frameTimes.length === 0)
            return 0;
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        return Math.round(1000 / avgFrameTime);
    }
    /**
     * Get memory usage stats
     */
    getMemoryStats() {
        if (this.memorySnapshots.length === 0) {
            return { used: 0, total: 0, limit: 0, percentage: 0 };
        }
        const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
        return {
            used: latest.usedJSHeapSize,
            total: latest.totalJSHeapSize,
            limit: latest.jsHeapSizeLimit,
            percentage: (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100,
        };
    }
    /**
     * Get recent frame timings
     */
    getRecentFrameTimings(count = 60) {
        return this.frameTimings.slice(-count);
    }
    /**
     * Add analytics exporter
     */
    addExporter(exporter) {
        this.exporters.push(exporter);
    }
    /**
     * Export all metrics to registered exporters
     */
    async exportMetrics() {
        if (this.metrics.length === 0)
            return;
        const metricsToExport = [...this.metrics];
        this.metrics = []; // Clear after export
        for (const exporter of this.exporters) {
            try {
                await exporter.export(metricsToExport);
            }
            catch (error) {
                console.error('Failed to export metrics:', error);
            }
        }
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const avgFps = this.getAverageFPS();
        const memStats = this.getMemoryStats();
        const recentFrames = this.getRecentFrameTimings(60);
        let report = '=== Performance Report ===\n\n';
        report += `Average FPS: ${avgFps}\n`;
        report += `Recent Frame Count: ${recentFrames.length}\n`;
        if (recentFrames.length > 0) {
            const avgFrameTime = recentFrames.reduce((sum, f) => sum + f.frameDuration, 0) /
                recentFrames.length;
            const maxFrameTime = Math.max(...recentFrames.map((f) => f.frameDuration));
            const minFrameTime = Math.min(...recentFrames.map((f) => f.frameDuration));
            report += `Frame Time: min=${minFrameTime.toFixed(2)}ms, avg=${avgFrameTime.toFixed(2)}ms, max=${maxFrameTime.toFixed(2)}ms\n`;
        }
        report += `\nMemory Usage:\n`;
        report += `  Used: ${(memStats.used / 1024 / 1024).toFixed(2)} MB\n`;
        report += `  Total: ${(memStats.total / 1024 / 1024).toFixed(2)} MB\n`;
        report += `  Limit: ${(memStats.limit / 1024 / 1024).toFixed(2)} MB\n`;
        report += `  Percentage: ${memStats.percentage.toFixed(1)}%\n`;
        report += `\nMetrics Recorded: ${this.metrics.length}\n`;
        report += `Memory Snapshots: ${this.memorySnapshots.length}\n`;
        return report;
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.stopMonitoring();
        this.metrics = [];
        this.frameTimings = [];
        this.memorySnapshots = [];
        this.frameTimes = [];
        this.budgets.clear();
        this.exporters = [];
    }
}
/**
 * Singleton instance
 */
let telemetryInstance = null;
/**
 * Get or create telemetry instance
 */
export function getPerformanceTelemetry() {
    if (!telemetryInstance) {
        telemetryInstance = new PerformanceTelemetry();
    }
    return telemetryInstance;
}
