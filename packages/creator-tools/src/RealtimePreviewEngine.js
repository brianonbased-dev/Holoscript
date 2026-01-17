/**
 * Phase 6: Real-Time Preview Engine
 *
 * Provides live preview of trait changes across multiple devices
 * with performance metrics visualization.
 */
/**
 * Real-time preview engine
 * Renders trait changes across devices with metrics
 */
export class RealtimePreviewEngine {
    constructor() {
        this.previews = new Map();
        this.devices = new Map();
        this.renderCallbacks = new Map();
        this.metricsHistory = new Map();
        this.isRendering = false;
        this.updateInterval = null;
        this.initializeDevices();
    }
    /**
     * Register a device for preview
     */
    registerDevice(device) {
        this.devices.set(device.name, device);
        this.previews.set(device.name, {
            device,
            traitCode: '',
            rendered: false,
            metrics: this.createEmptyMetrics(),
            warnings: [],
            errors: [],
        });
        this.metricsHistory.set(device.name, []);
    }
    /**
     * Update trait code and re-render all previews
     */
    async updatePreview(traitCode) {
        if (this.isRendering)
            return;
        this.isRendering = true;
        try {
            // Update all device previews in parallel
            const renderPromises = Array.from(this.previews.keys()).map((deviceName) => this.renderForDevice(deviceName, traitCode));
            await Promise.all(renderPromises);
            // Emit updates
            this.emit('update', { traitCode, previews: this.previews });
        }
        finally {
            this.isRendering = false;
        }
    }
    /**
     * Get preview for specific device
     */
    getPreview(deviceName) {
        return this.previews.get(deviceName);
    }
    /**
     * Get all previews
     */
    getAllPreviews() {
        return new Map(this.previews);
    }
    /**
     * Get metrics for device
     */
    getMetrics(deviceName) {
        return this.metricsHistory.get(deviceName) || [];
    }
    /**
     * Start continuous monitoring
     */
    startMonitoring(interval = 100) {
        if (this.updateInterval)
            clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            // Update metrics for all devices
            for (const [deviceName, preview] of this.previews) {
                if (preview.rendered) {
                    const newMetrics = this.simulateMetrics(preview.device);
                    preview.metrics = newMetrics;
                    // Store in history
                    const history = this.metricsHistory.get(deviceName) || [];
                    history.push(newMetrics);
                    // Keep only last 300 samples (~30 seconds at 10Hz)
                    if (history.length > 300)
                        history.shift();
                    this.metricsHistory.set(deviceName, history);
                    // Emit metrics update
                    this.emit('metrics', { device: deviceName, metrics: newMetrics });
                    // Check for issues
                    this.checkForIssues(preview);
                }
            }
        }, interval);
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    /**
     * Compare metrics across devices
     */
    compareMetrics() {
        const comparison = {};
        for (const [deviceName, preview] of this.previews) {
            comparison[deviceName] = preview.metrics;
        }
        return comparison;
    }
    /**
     * Get optimization recommendations based on metrics
     */
    getRecommendations() {
        const recommendations = [];
        for (const [deviceName, preview] of this.previews) {
            const metrics = preview.metrics;
            // FPS recommendations
            if (metrics.fps < 30) {
                recommendations.push(`${deviceName}: FPS critically low (${Math.round(metrics.fps)}). Reduce quality or lights.`);
            }
            else if (metrics.fps < 50) {
                recommendations.push(`${deviceName}: FPS below target (${Math.round(metrics.fps)}). Consider medium quality.`);
            }
            // Memory recommendations
            if (metrics.gpuMemoryPercent > 85) {
                recommendations.push(`${deviceName}: GPU memory critical (${Math.round(metrics.gpuMemoryPercent)}%). Enable compression.`);
            }
            else if (metrics.gpuMemoryPercent > 70) {
                recommendations.push(`${deviceName}: GPU memory high (${Math.round(metrics.gpuMemoryPercent)}%). Monitor usage.`);
            }
            // Draw call recommendations
            if (metrics.drawCalls > 5000) {
                recommendations.push(`${deviceName}: High draw calls (${metrics.drawCalls}). Enable batching.`);
            }
        }
        return recommendations;
    }
    /**
     * Subscribe to preview updates
     */
    on(event, callback) {
        if (!this.renderCallbacks.has(event)) {
            this.renderCallbacks.set(event, []);
        }
        this.renderCallbacks.get(event).push(callback);
    }
    /**
     * Export preview results for reporting
     */
    exportResults() {
        const results = {
            devices: Array.from(this.devices.values()),
            previews: Array.from(this.previews.entries()).map(([name, state]) => ({
                device: name,
                traitCode: state.traitCode,
                rendered: state.rendered,
                metrics: state.metrics,
                warnings: state.warnings,
                errors: state.errors,
            })),
            metricsHistory: Object.fromEntries(this.metricsHistory),
        };
        return JSON.stringify(results, null, 2);
    }
    /**
     * Private: Render for specific device
     */
    async renderForDevice(deviceName, traitCode) {
        const preview = this.previews.get(deviceName);
        if (!preview)
            return;
        try {
            // Validate trait code
            const validation = this.validateTraitCode(traitCode);
            if (!validation.valid) {
                preview.errors = validation.errors;
                preview.rendered = false;
                return;
            }
            // Clear previous state
            preview.warnings = [];
            preview.errors = [];
            // Parse and apply traits
            const traits = this.parseTraits(traitCode);
            preview.traitCode = traitCode;
            // Simulate rendering
            preview.metrics = this.simulateMetrics(preview.device, traits);
            preview.rendered = true;
            // Check compatibility
            const compatibility = this.checkDeviceCompatibility(preview.device, traits);
            preview.warnings = compatibility.warnings;
            this.emit('rendered', { device: deviceName, state: preview });
        }
        catch (error) {
            preview.errors = [String(error)];
            preview.rendered = false;
        }
    }
    /**
     * Private: Initialize standard devices
     */
    initializeDevices() {
        const devices = [
            {
                name: 'iPhone 15 Pro',
                platform: 'mobile',
                width: 1179,
                height: 2556,
                dpi: 460,
                gpuMemory: 256,
            },
            {
                name: 'iPad Pro',
                platform: 'mobile',
                width: 2048,
                height: 2732,
                dpi: 264,
                gpuMemory: 512,
            },
            {
                name: 'Meta Quest 3',
                platform: 'vr',
                width: 1920,
                height: 1824,
                dpi: 100,
                gpuMemory: 512,
            },
            {
                name: 'Apple Vision Pro',
                platform: 'vr',
                width: 2992,
                height: 2304,
                dpi: 150,
                gpuMemory: 1024,
            },
            {
                name: 'Desktop (RTX 4090)',
                platform: 'desktop',
                width: 3840,
                height: 2160,
                dpi: 100,
                gpuMemory: 24576,
            },
            {
                name: 'Laptop (RTX 4060)',
                platform: 'desktop',
                width: 2560,
                height: 1440,
                dpi: 96,
                gpuMemory: 8192,
            },
        ];
        devices.forEach((d) => this.registerDevice(d));
    }
    /**
     * Private: Validate trait code
     */
    validateTraitCode(code) {
        const errors = [];
        if (!code.trim()) {
            errors.push('Trait code is empty');
        }
        if (!code.includes('@')) {
            errors.push('No trait annotations found (@material, @lighting, @rendering)');
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Private: Parse trait code
     */
    parseTraits(code) {
        const traits = {};
        // Simple regex-based parsing
        const materialMatch = code.match(/@material\s*\{([^}]+)\}/);
        if (materialMatch)
            traits.material = materialMatch[1];
        const lightingMatch = code.match(/@lighting\s*\{([^}]+)\}/);
        if (lightingMatch)
            traits.lighting = lightingMatch[1];
        const renderingMatch = code.match(/@rendering\s*\{([^}]+)\}/);
        if (renderingMatch)
            traits.rendering = renderingMatch[1];
        return traits;
    }
    /**
     * Private: Simulate rendering metrics
     */
    simulateMetrics(device, traits = {}) {
        // Base metrics vary by platform
        const baseFPS = {
            mobile: 60,
            vr: 90,
            desktop: 144,
        }[device.platform];
        const baseDrawCalls = {
            mobile: 100,
            vr: 300,
            desktop: 1000,
        }[device.platform];
        const baseMemory = {
            mobile: 128,
            vr: 256,
            desktop: 2048,
        }[device.platform];
        // Add variation
        const fpsVariation = (Math.random() - 0.5) * 10;
        const drawCallVariation = Math.floor((Math.random() - 0.5) * 200);
        const memoryVariation = Math.random() * 50;
        return {
            fps: Math.max(15, baseFPS + fpsVariation),
            gpuMemory: baseMemory + memoryVariation,
            gpuMemoryPercent: (baseMemory + memoryVariation) / device.gpuMemory,
            drawCalls: Math.max(10, baseDrawCalls + drawCallVariation),
            verticesRendered: Math.floor(device.width * device.height * 2),
            shaderCompileTime: Math.random() * 50,
            timestamp: Date.now(),
        };
    }
    /**
     * Private: Check device compatibility
     */
    checkDeviceCompatibility(device, traits) {
        const warnings = [];
        // Mobile warnings
        if (device.platform === 'mobile') {
            if (device.gpuMemory < 256) {
                warnings.push('Limited GPU memory for this device');
            }
        }
        // VR warnings
        if (device.platform === 'vr') {
            // Check for high complexity that could cause frame drops in VR
        }
        return { warnings };
    }
    /**
     * Private: Check for performance issues
     */
    checkForIssues(preview) {
        const { metrics, device } = preview;
        const issues = [];
        const targetFPS = {
            mobile: 60,
            vr: 90,
            desktop: 60,
        }[device.platform];
        if (metrics.fps < targetFPS * 0.8) {
            issues.push(`FPS below acceptable threshold for ${device.platform}`);
        }
        if (metrics.gpuMemoryPercent > 0.9) {
            issues.push('GPU memory near capacity');
        }
        if (issues.length > 0) {
            this.emit('issues', { device: device.name, issues });
        }
    }
    /**
     * Private: Create empty metrics
     */
    createEmptyMetrics() {
        return {
            fps: 0,
            gpuMemory: 0,
            gpuMemoryPercent: 0,
            drawCalls: 0,
            verticesRendered: 0,
            shaderCompileTime: 0,
            timestamp: 0,
        };
    }
    /**
     * Private: Emit event
     */
    emit(event, data) {
        const callbacks = this.renderCallbacks.get(event) || [];
        callbacks.forEach((cb) => cb(data));
    }
}
/**
 * Create preview engine with standard devices
 */
export function createPreviewEngine() {
    return new RealtimePreviewEngine();
}
