/**
 * Phase 6: Test Setup and Utilities
 *
 * Common test utilities and setup for all component tests.
 */
import React from 'react';
import { RenderOptions } from '@testing-library/react';
export declare const mockMaterialConfig: {
    type: "material";
    properties: {
        metallic: {
            name: string;
            value: number;
            type: "number";
            min: number;
            max: number;
            step: number;
            description: string;
            category: string;
        };
        roughness: {
            name: string;
            value: number;
            type: "number";
            min: number;
            max: number;
            step: number;
            description: string;
            category: string;
        };
        baseColor: {
            name: string;
            value: string;
            type: "color";
            description: string;
            category: string;
        };
        type: {
            name: string;
            value: string;
            type: "enum";
            options: string[];
            description: string;
            category: string;
        };
        useNormalMap: {
            name: string;
            value: boolean;
            type: "boolean";
            description: string;
            category: string;
        };
    };
    isDirty: boolean;
};
export declare const mockDevices: ({
    name: string;
    platform: "mobile";
    width: number;
    height: number;
    dpi: number;
    gpuMemory: number;
} | {
    name: string;
    platform: "vr";
    width: number;
    height: number;
    dpi: number;
    gpuMemory: number;
} | {
    name: string;
    platform: "desktop";
    width: number;
    height: number;
    dpi: number;
    gpuMemory: number;
})[];
export declare const mockMetrics: {
    fps: number;
    gpuMemory: number;
    gpuMemoryPercent: number;
    drawCalls: number;
    verticesRendered: number;
    shaderCompileTime: number;
    timestamp: number;
};
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
}
export declare function render(ui: React.ReactElement, options?: CustomRenderOptions): any;
export declare class PerformanceMeasure {
    private marks;
    start(label: string): void;
    end(label: string): number;
    getDuration(label: string): number;
    getReport(): Record<string, number>;
    clear(): void;
}
export declare class MemoryMeasure {
    private initialMemory;
    start(): void;
    getDelta(): number;
    reset(): void;
}
export declare function waitFor(callback: () => void, timeout?: number): Promise<void>;
export declare function delay(ms: number): Promise<void>;
export declare const createMouseEvent: (type: string, options?: {}) => MouseEvent;
export declare const createChangeEvent: (value: unknown) => Event;
export declare const createSpyFunction: <T extends any[], R>(fn?: (...args: T) => R) => import("vitest").Mock<any[], any>;
export default render;
