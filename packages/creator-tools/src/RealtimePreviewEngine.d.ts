/**
 * Phase 6: Real-Time Preview Engine
 *
 * Provides live preview of trait changes across multiple devices
 * with performance metrics visualization.
 */
export interface PreviewDevice {
    name: string;
    platform: 'mobile' | 'vr' | 'desktop';
    width: number;
    height: number;
    dpi: number;
    gpuMemory: number;
}
export interface PreviewMetrics {
    fps: number;
    gpuMemory: number;
    gpuMemoryPercent: number;
    drawCalls: number;
    verticesRendered: number;
    shaderCompileTime: number;
    timestamp: number;
}
export interface PreviewState {
    device: PreviewDevice;
    traitCode: string;
    rendered: boolean;
    metrics: PreviewMetrics;
    warnings: string[];
    errors: string[];
}
/**
 * Real-time preview engine
 * Renders trait changes across devices with metrics
 */
export declare class RealtimePreviewEngine {
    private previews;
    private devices;
    private renderCallbacks;
    private metricsHistory;
    private isRendering;
    private updateInterval;
    constructor();
    /**
     * Register a device for preview
     */
    registerDevice(device: PreviewDevice): void;
    /**
     * Update trait code and re-render all previews
     */
    updatePreview(traitCode: string): Promise<void>;
    /**
     * Get preview for specific device
     */
    getPreview(deviceName: string): PreviewState | undefined;
    /**
     * Get all previews
     */
    getAllPreviews(): Map<string, PreviewState>;
    /**
     * Get metrics for device
     */
    getMetrics(deviceName: string): PreviewMetrics[];
    /**
     * Start continuous monitoring
     */
    startMonitoring(interval?: number): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Compare metrics across devices
     */
    compareMetrics(): Record<string, PreviewMetrics>;
    /**
     * Get optimization recommendations based on metrics
     */
    getRecommendations(): string[];
    /**
     * Subscribe to preview updates
     */
    on(event: string, callback: Function): void;
    /**
     * Export preview results for reporting
     */
    exportResults(): string;
    /**
     * Private: Render for specific device
     */
    private renderForDevice;
    /**
     * Private: Initialize standard devices
     */
    private initializeDevices;
    /**
     * Private: Validate trait code
     */
    private validateTraitCode;
    /**
     * Private: Parse trait code
     */
    private parseTraits;
    /**
     * Private: Simulate rendering metrics
     */
    private simulateMetrics;
    /**
     * Private: Check device compatibility
     */
    private checkDeviceCompatibility;
    /**
     * Private: Check for performance issues
     */
    private checkForIssues;
    /**
     * Private: Create empty metrics
     */
    private createEmptyMetrics;
    /**
     * Private: Emit event
     */
    private emit;
}
/**
 * Create preview engine with standard devices
 */
export declare function createPreviewEngine(): RealtimePreviewEngine;
