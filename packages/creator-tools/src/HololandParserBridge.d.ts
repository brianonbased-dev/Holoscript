/**
 * Hololand Parser Bridge
 *
 * Connects Phase 6 trait system to Hololand parser
 * Handles code generation, registration, validation, and error recovery
 *
 * @module HololandParserBridge
 */
import { TraitAnnotationEditor } from './TraitAnnotationEditor';
/**
 * Parser registration result
 */
export interface ParserRegistrationResult {
    success: boolean;
    traitId?: string;
    error?: string;
    warnings?: string[];
    metadata?: {
        deviceOptimizations?: string[];
        estimatedMemory?: number;
        performanceImpact?: 'low' | 'medium' | 'high';
    };
}
/**
 * Parser validation error with recovery suggestion
 */
export interface ParserValidationError {
    type: 'syntax' | 'semantic' | 'runtime' | 'device';
    message: string;
    line?: number;
    column?: number;
    suggestion?: string;
    recoverable: boolean;
}
/**
 * Device-specific optimization context
 */
export interface DeviceOptimizationContext {
    deviceId: string;
    gpuCapability: 'low' | 'medium' | 'high' | 'extreme';
    cpuCapability: 'low' | 'medium' | 'high' | 'extreme';
    targetFPS: number;
    maxGPUMemory: number;
    supportedShaderLevel: 'es2' | 'es3' | 'es31' | 'core';
}
/**
 * Code generation options for Hololand parser
 */
export interface CodeGenerationOptions {
    includeMetadata?: boolean;
    optimizeForDevice?: DeviceOptimizationContext;
    generateImports?: boolean;
    strictMode?: boolean;
    validateDependencies?: boolean;
}
/**
 * Hololand Parser Bridge
 *
 * Bridges Phase 6 trait system with Hololand parser
 * Handles:
 * - Code generation for HSPlus
 * - Parser registration and validation
 * - Device-specific optimization
 * - Error handling and recovery
 */
export declare class HololandParserBridge {
    private editor;
    private registeredTraits;
    private validationErrors;
    private deviceOptimizations;
    constructor(editor: TraitAnnotationEditor);
    /**
     * Generate HSPlus code with Hololand parser compatibility
     *
     * @param options Code generation options
     * @returns Generated HSPlus code string
     * @throws ParserValidationError if validation fails in strict mode
     */
    generateHoloScriptPlusCode(options?: CodeGenerationOptions): string;
    /**
     * Register trait with Hololand parser
     *
     * @param traitId Unique trait identifier
     * @param options Registration options
     * @returns Registration result with success status
     */
    registerTraitWithParser(traitId: string, options?: CodeGenerationOptions): ParserRegistrationResult;
    /**
     * Validate HSPlus code for parser compatibility
     *
     * @param code Code to validate
     * @returns Validation result with errors and warnings
     */
    validateHoloScriptPlus(code: string): {
        valid: boolean;
        errors: ParserValidationError[];
        warnings: ParserValidationError[];
    };
    /**
     * Register device for optimization
     *
     * @param context Device optimization context
     */
    registerDevice(context: DeviceOptimizationContext): void;
    /**
     * Apply device-specific optimizations to code
     *
     * @param code Original code
     * @param context Device context
     * @returns Optimized code
     */
    private applyDeviceOptimizations;
    /**
     * Estimate memory usage of generated code
     *
     * @param code Generated code
     * @returns Estimated memory in MB
     */
    private estimateMemoryUsage;
    /**
     * Assess performance impact of code
     *
     * @param code Generated code
     * @returns Performance impact level
     */
    private assessPerformanceImpact;
    /**
     * Generate import statements for HSPlus
     *
     * @returns Import statement string
     */
    private generateImports;
    /**
     * Generate metadata header with trait information
     *
     * @returns Metadata header string
     */
    private generateMetadataHeader;
    /**
     * Generate optimization comments for device context
     *
     * @param context Device context
     * @returns Optimization comments
     */
    private generateOptimizationComments;
    /**
     * Get registered trait code
     *
     * @param traitId Trait identifier
     * @returns Trait code or undefined
     */
    getRegisteredTraitCode(traitId: string): string | undefined;
    /**
     * Get all registered traits
     *
     * @returns Map of trait IDs to code
     */
    getAllRegisteredTraits(): Map<string, {
        code: string;
        metadata: any;
    }>;
    /**
     * Clear registration errors
     */
    clearErrors(): void;
    /**
     * Get recent validation errors
     *
     * @param limit Maximum number of errors to return
     * @returns Array of validation errors
     */
    getValidationErrors(limit?: number): ParserValidationError[];
    /**
     * Attempt error recovery
     *
     * @param error Validation error
     * @returns Recovered code or undefined if not recoverable
     */
    recoverFromError(error: ParserValidationError): string | undefined;
    /**
     * Export registration data for persistence
     *
     * @returns JSON-serializable registration data
     */
    exportRegistrationData(): string;
    /**
     * Import registration data
     *
     * @param jsonData JSON string with registration data
     * @returns Success status
     */
    importRegistrationData(jsonData: string): boolean;
}
