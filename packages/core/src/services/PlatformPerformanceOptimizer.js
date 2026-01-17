/**
 * Platform Performance Optimization System
 *
 * Provides adaptive quality and performance tuning for:
 * - Mobile devices (battery/bandwidth constrained)
 * - VR/AR platforms (latency-critical, 90 FPS required)
 * - Desktop (quality-focused, high resolution)
 *
 * Features:
 * - Automatic quality adjustment based on device
 * - Performance profiling and analysis
 * - Bottleneck detection and mitigation
 * - Cross-platform benchmark testing
 */
// ============================================================================
// Platform Performance Optimizer
// ============================================================================
export class PlatformPerformanceOptimizer {
    constructor(device) {
        this.currentFPS = 60;
        this.frameHistory = [];
        this.lastAdaptTime = 0;
        this.deviceInfo = device;
        this.capabilities = this.detectCapabilities(device);
        this.profile = this.createProfile(device);
        this.adaptiveSettings = this.getAdaptiveSettings(device.platform);
    }
    /**
     * Detect device capabilities
     */
    detectCapabilities(device) {
        let maxTexture = 2048;
        let supportsCompression = true;
        let compressionFormats = ['dxt', 'basis'];
        let maxLights = 4;
        let shadowsSupported = true;
        let computeSupported = false;
        let rayTracingSupported = false;
        // Mobile capabilities
        if (device.platform === 'mobile') {
            maxTexture = 512;
            maxLights = 2;
            shadowsSupported = false;
            compressionFormats = ['astc', 'pvrtc'];
            // Check for low memory
            if (device.gpuMemory < 1024) {
                maxTexture = 256;
                maxLights = 1;
                supportsCompression = true;
            }
        }
        // VR capabilities
        if (device.platform === 'vr') {
            maxTexture = 2048;
            maxLights = 4;
            shadowsSupported = true;
            compressionFormats = ['basis', 'dxt'];
            computeSupported = true;
        }
        // Desktop capabilities
        if (device.platform === 'desktop') {
            maxTexture = 4096;
            maxLights = 8;
            shadowsSupported = true;
            compressionFormats = ['none', 'dxt', 'basis'];
            computeSupported = true;
            rayTracingSupported = true;
        }
        return {
            maxTextureResolution: maxTexture,
            supportsCompression,
            compressionFormats,
            maxSimultaneousLights: maxLights,
            shadowsSupported,
            computeShaderSupported: computeSupported,
            rayTracingSupported,
            estimatedMemory: Math.min(device.gpuMemory, 2048),
        };
    }
    /**
     * Create performance profile for device
     */
    createProfile(device) {
        let qualityLevel = 'high';
        let fpsTarget = 60;
        let fpsMin = 30;
        let cpuBudget = 16.67; // ms for 60 FPS
        let gpuBudget = 16.67; // ms for 60 FPS
        // Mobile
        if (device.platform === 'mobile') {
            qualityLevel = 'low';
            fpsTarget = 30;
            fpsMin = 24;
            cpuBudget = 33.33; // ms for 30 FPS
            gpuBudget = 33.33; // ms for 30 FPS
        }
        // VR (more demanding)
        if (device.platform === 'vr') {
            qualityLevel = 'high';
            fpsTarget = 90;
            fpsMin = 75;
            cpuBudget = 11.11; // ms for 90 FPS
            gpuBudget = 11.11; // ms for 90 FPS
        }
        // Desktop (quality-focused)
        if (device.platform === 'desktop') {
            qualityLevel = 'ultra';
            fpsTarget = device.refreshRate || 120;
            fpsMin = 60;
            cpuBudget = 1000 / fpsTarget;
            gpuBudget = 1000 / fpsTarget;
        }
        return {
            device,
            capabilities: this.capabilities,
            targetFPS: fpsTarget,
            qualityLevel,
            adaptiveQuality: device.platform === 'mobile' || device.platform === 'vr',
            fpsTarget,
            fpsMin,
            cpuBudget,
            gpuBudget,
        };
    }
    /**
     * Get adaptive quality settings for platform
     */
    getAdaptiveSettings(platform) {
        if (platform === 'mobile') {
            return {
                enabled: true,
                checkInterval: 500, // Check every 500ms
                fpsDeltaThreshold: 5, // Adjust if FPS changes by 5+
                memoryThreshold: 80, // Adjust if above 80% memory
                temperatureThreshold: 45, // Adjust if above 45C
            };
        }
        if (platform === 'vr') {
            return {
                enabled: true,
                checkInterval: 300, // Check every 300ms
                fpsDeltaThreshold: 3, // Adjust if FPS changes by 3+
                memoryThreshold: 85, // Adjust if above 85% memory
            };
        }
        // Desktop
        return {
            enabled: false, // No adaptive quality needed
            checkInterval: 1000,
            fpsDeltaThreshold: 0,
            memoryThreshold: 90,
        };
    }
    /**
     * Optimize for device - returns recommended rendering settings
     */
    optimizeForDevice() {
        const { platform, gpuMemory, isLowPowerMode } = this.deviceInfo;
        const quality = this.profile.qualityLevel;
        const settings = {
            quality,
            platform,
            textureResolution: this.capabilities.maxTextureResolution,
            compression: this.selectCompression(platform),
            maxLights: this.capabilities.maxSimultaneousLights,
            shadowsEnabled: this.capabilities.shadowsSupported,
            lodEnabled: true,
            cullingEnabled: true,
            instancingEnabled: true,
            gpuMemoryBudget: gpuMemory > 2048 ? 1024 : gpuMemory / 2,
        };
        // Mobile low power adjustments
        if (isLowPowerMode && platform === 'mobile') {
            settings.quality = 'low';
            settings.textureResolution = 256;
            settings.compression = 'astc';
            settings.maxLights = 1;
            settings.shadowsEnabled = false;
            settings.lodEnabled = true;
            settings.cullingEnabled = true;
        }
        return settings;
    }
    /**
     * Select best compression format for platform
     */
    selectCompression(platform) {
        const formats = this.capabilities.compressionFormats;
        if (platform === 'mobile') {
            return formats.includes('astc') ? 'astc' : formats[0];
        }
        if (platform === 'vr') {
            return formats.includes('basis') ? 'basis' : formats[0];
        }
        // Desktop
        return formats.includes('none') ? 'none' : formats[0];
    }
    /**
     * Update frame metrics for adaptive quality
     */
    updateFrameMetrics(fps, gpuMemoryUsed, gpuFrameTime) {
        this.currentFPS = fps;
        this.frameHistory.push(fps);
        // Keep only last 30 frames
        if (this.frameHistory.length > 30) {
            this.frameHistory.shift();
        }
        // Check if adaptation is needed
        if (this.adaptiveSettings.enabled) {
            const now = Date.now();
            if (now - this.lastAdaptTime > this.adaptiveSettings.checkInterval) {
                this.checkAndAdapt(fps, gpuMemoryUsed);
                this.lastAdaptTime = now;
            }
        }
    }
    /**
     * Check and adapt quality settings
     */
    checkAndAdapt(fps, gpuMemoryUsed) {
        const avgFps = this.getAverageFPS();
        const memoryPercent = (gpuMemoryUsed / this.profile.capabilities.estimatedMemory) * 100;
        let shouldDegrade = false;
        let shouldImprove = false;
        // Check FPS
        if (avgFps < this.profile.fpsMin) {
            shouldDegrade = true;
        }
        else if (avgFps > this.profile.fpsTarget + this.adaptiveSettings.fpsDeltaThreshold) {
            shouldImprove = true;
        }
        // Check memory
        if (memoryPercent > this.adaptiveSettings.memoryThreshold) {
            shouldDegrade = true;
        }
        if (shouldDegrade) {
            this.degradeQuality();
        }
        else if (shouldImprove) {
            this.improveQuality();
        }
    }
    /**
     * Degrade quality for better performance
     */
    degradeQuality() {
        switch (this.profile.qualityLevel) {
            case 'ultra':
                this.profile.qualityLevel = 'high';
                break;
            case 'high':
                this.profile.qualityLevel = 'medium';
                break;
            case 'medium':
                this.profile.qualityLevel = 'low';
                break;
            case 'low':
                // Already at minimum
                break;
        }
    }
    /**
     * Improve quality for better visuals
     */
    improveQuality() {
        switch (this.profile.qualityLevel) {
            case 'low':
                this.profile.qualityLevel = 'medium';
                break;
            case 'medium':
                this.profile.qualityLevel = 'high';
                break;
            case 'high':
                if (this.profile.device.platform === 'desktop') {
                    this.profile.qualityLevel = 'ultra';
                }
                break;
            case 'ultra':
                // Already at maximum
                break;
        }
    }
    /**
     * Get average FPS from history
     */
    getAverageFPS() {
        if (this.frameHistory.length === 0) {
            return this.currentFPS;
        }
        const sum = this.frameHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameHistory.length;
    }
    /**
     * Run performance benchmark
     */
    async runBenchmark(name, renderFunc) {
        const iterations = this.getBenchmarkIterations();
        console.log(`Running benchmark: ${name} (${iterations} iterations)...`);
        const startTime = performance.now();
        const result = await renderFunc(iterations);
        const totalTime = performance.now() - startTime;
        const fps = result.fps;
        const passed = fps >= this.profile.fpsMin;
        return {
            testName: name,
            platform: this.deviceInfo.platform,
            fps,
            gpuFrameTime: result.gpuTime,
            cpuFrameTime: result.cpuTime,
            gpuMemoryUsed: 0, // Would be populated from actual measurement
            trianglesPerSecond: result.triangles * fps,
            drawCallsPerSecond: result.drawCalls * fps,
            qualityLevel: this.profile.qualityLevel,
            passed,
        };
    }
    /**
     * Get benchmark iterations based on platform
     */
    getBenchmarkIterations() {
        switch (this.deviceInfo.platform) {
            case 'mobile':
                return 100;
            case 'vr':
                return 200;
            case 'desktop':
                return 300;
        }
    }
    /**
     * Get current performance profile
     */
    getProfile() {
        return { ...this.profile };
    }
    /**
     * Get optimization recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const avgFps = this.getAverageFPS();
        if (avgFps < this.profile.fpsMin) {
            recommendations.push(`FPS below target (${Math.round(avgFps)} < ${this.profile.fpsMin})`);
            recommendations.push('Consider reducing quality preset');
            recommendations.push('Enable texture compression');
            recommendations.push('Reduce shadow quality');
        }
        if (this.profile.device.isLowPowerMode) {
            recommendations.push('Device in low power mode');
            recommendations.push('Consider reducing quality');
            recommendations.push('Disable shadows and lights');
        }
        return recommendations;
    }
}
export default PlatformPerformanceOptimizer;
