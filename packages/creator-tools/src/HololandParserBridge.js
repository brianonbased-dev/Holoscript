/**
 * Hololand Parser Bridge
 *
 * Connects Phase 6 trait system to Hololand parser
 * Handles code generation, registration, validation, and error recovery
 *
 * @module HololandParserBridge
 */
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
export class HololandParserBridge {
    constructor(editor) {
        this.registeredTraits = new Map();
        this.validationErrors = [];
        this.deviceOptimizations = new Map();
        this.editor = editor;
    }
    /**
     * Generate HSPlus code with Hololand parser compatibility
     *
     * @param options Code generation options
     * @returns Generated HSPlus code string
     * @throws ParserValidationError if validation fails in strict mode
     */
    generateHoloScriptPlusCode(options = {}) {
        const { includeMetadata = true, optimizeForDevice, generateImports = true, strictMode = true, } = options;
        try {
            // Generate base code from editor
            const baseCode = this.editor.generateCode();
            // Start building HSPlus compatible code
            let hsCode = '';
            // Add imports if requested
            if (generateImports) {
                hsCode += this.generateImports();
            }
            // Add metadata comments if requested
            if (includeMetadata) {
                hsCode += this.generateMetadataHeader();
            }
            // Apply device-specific optimizations if provided
            let optimizedCode = baseCode;
            if (optimizeForDevice) {
                optimizedCode = this.applyDeviceOptimizations(baseCode, optimizeForDevice);
            }
            // Validate code if strict mode
            if (strictMode) {
                const validation = this.validateHoloScriptPlus(optimizedCode);
                if (!validation.valid) {
                    throw new Error(`Code validation failed: ${validation.errors.map((e) => e.message).join('; ')}`);
                }
            }
            hsCode += optimizedCode;
            // Add optimization hints as comments
            if (optimizeForDevice) {
                hsCode += this.generateOptimizationComments(optimizeForDevice);
            }
            return hsCode;
        }
        catch (error) {
            const err = error;
            this.validationErrors.push({
                type: 'semantic',
                message: `Code generation failed: ${err.message}`,
                recoverable: true,
            });
            if (strictMode) {
                throw error;
            }
            // Return base code as fallback
            return this.editor.generateCode();
        }
    }
    /**
     * Register trait with Hololand parser
     *
     * @param traitId Unique trait identifier
     * @param options Registration options
     * @returns Registration result with success status
     */
    registerTraitWithParser(traitId, options = {}) {
        try {
            // Validate trait configuration
            const config = this.editor.config;
            if (!config) {
                return {
                    success: false,
                    error: 'No trait configuration available',
                };
            }
            // Generate HSPlus code
            const code = this.generateHoloScriptPlusCode({
                ...options,
                validateDependencies: true,
            });
            // Validate against parser
            const validation = this.validateHoloScriptPlus(code);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Parser validation failed: ${validation.errors[0]?.message}`,
                };
            }
            // Register with parser
            this.registeredTraits.set(traitId, {
                code,
                metadata: {
                    timestamp: Date.now(),
                    editor: 'Phase6TraitEditor',
                    version: '1.0',
                    config,
                },
            });
            // Determine optimization metadata
            const deviceOptimizations = Array.from(this.deviceOptimizations.keys());
            const estimatedMemory = this.estimateMemoryUsage(code);
            const performanceImpact = this.assessPerformanceImpact(code);
            return {
                success: true,
                traitId,
                metadata: {
                    deviceOptimizations,
                    estimatedMemory,
                    performanceImpact,
                },
            };
        }
        catch (error) {
            const err = error;
            return {
                success: false,
                error: `Registration failed: ${err.message}`,
            };
        }
    }
    /**
     * Validate HSPlus code for parser compatibility
     *
     * @param code Code to validate
     * @returns Validation result with errors and warnings
     */
    validateHoloScriptPlus(code) {
        const errors = [];
        const warnings = [];
        try {
            // Check syntax: basic structure validation
            if (!code.includes('@') || (!code.includes('{') && !code.includes('}'))) {
                errors.push({
                    type: 'syntax',
                    message: 'Invalid HSPlus syntax: missing trait decorator or braces',
                    line: 1,
                    suggestion: 'Ensure code starts with @traitType { ... }',
                    recoverable: true,
                });
            }
            // Check for valid trait decorators
            const validDecorators = [
                '@material',
                '@trait',
                '@shader',
                '@animation',
                '@interaction',
            ];
            const hasValidDecorator = validDecorators.some((dec) => code.includes(dec));
            if (!hasValidDecorator) {
                warnings.push({
                    type: 'semantic',
                    message: 'No recognized trait decorator found',
                    suggestion: `Use one of: ${validDecorators.join(', ')}`,
                    recoverable: true,
                });
            }
            // Check for property types
            const propertyTypes = [':number', ':color', ':enum', ':boolean', ':string', ':vec3'];
            const usesValidTypes = propertyTypes.some((type) => code.includes(type));
            if (!usesValidTypes) {
                warnings.push({
                    type: 'semantic',
                    message: 'No recognized property types found',
                    suggestion: `Use types: ${propertyTypes.join(', ')}`,
                    recoverable: true,
                });
            }
            // Semantic validation
            if (code.match(/undefined|null/gi)) {
                errors.push({
                    type: 'semantic',
                    message: 'Code contains undefined or null references',
                    recoverable: false,
                });
            }
            // Check for nested braces balance
            const openBraces = (code.match(/{/g) || []).length;
            const closeBraces = (code.match(/}/g) || []).length;
            if (openBraces !== closeBraces) {
                errors.push({
                    type: 'syntax',
                    message: `Unbalanced braces: ${openBraces} open, ${closeBraces} closed`,
                    recoverable: true,
                });
            }
            // Parser-specific restrictions
            if (code.length > 100000) {
                warnings.push({
                    type: 'runtime',
                    message: 'Code exceeds 100KB, may impact parsing performance',
                    recoverable: true,
                });
            }
            // Reserved keywords check
            const reservedKeywords = ['override', 'interface', 'abstract', 'virtual'];
            reservedKeywords.forEach((keyword) => {
                if (new RegExp(`\\b${keyword}\\b`, 'i').test(code)) {
                    warnings.push({
                        type: 'semantic',
                        message: `Code uses reserved keyword: ${keyword}`,
                        recoverable: true,
                    });
                }
            });
            return {
                valid: errors.length === 0,
                errors,
                warnings,
            };
        }
        catch (error) {
            errors.push({
                type: 'runtime',
                message: `Validation error: ${error.message}`,
                recoverable: true,
            });
            return {
                valid: false,
                errors,
                warnings,
            };
        }
    }
    /**
     * Register device for optimization
     *
     * @param context Device optimization context
     */
    registerDevice(context) {
        this.deviceOptimizations.set(context.deviceId, context);
    }
    /**
     * Apply device-specific optimizations to code
     *
     * @param code Original code
     * @param context Device context
     * @returns Optimized code
     */
    applyDeviceOptimizations(code, context) {
        let optimized = code;
        // GPU capability optimizations
        if (context.gpuCapability === 'low') {
            // Reduce shader complexity
            optimized = optimized.replace(/@shader|complex|advanced/gi, '@shader.simple');
            // Disable normal maps on low-end
            optimized = optimized.replace(/useNormalMap:\s*true/gi, 'useNormalMap: false');
        }
        else if (context.gpuCapability === 'extreme') {
            // Enable advanced features
            optimized = optimized.replace(/@shader/gi, '@shader.advanced');
        }
        // Memory optimization
        if (context.maxGPUMemory < 512) {
            // Reduce texture resolution hints
            optimized = optimized
                .replace(/resolution:\s*'?high'?/gi, "resolution: 'medium'")
                .replace(/resolution:\s*'?ultra'?/gi, "resolution: 'high'");
        }
        // FPS target optimization
        if (context.targetFPS <= 30) {
            // Add performance hints
            optimized = `/* Target FPS: ${context.targetFPS} - optimizing for performance */\n${optimized}`;
        }
        // Shader level adjustments
        if (context.supportedShaderLevel === 'es2') {
            optimized = optimized.replace(/es3|es31|core/gi, 'es2');
        }
        return optimized;
    }
    /**
     * Estimate memory usage of generated code
     *
     * @param code Generated code
     * @returns Estimated memory in MB
     */
    estimateMemoryUsage(code) {
        // Very rough estimation: assume ~1KB per 1MB of GPU allocation
        const codeSize = code.length / 1024; // KB
        // Count resource declarations
        const textureCount = (code.match(/texture/gi) || []).length;
        const bufferCount = (code.match(/buffer|array/gi) || []).length;
        const shaderCount = (code.match(/@shader/gi) || []).length;
        // Estimate: base + textures (2MB each) + buffers (1MB each) + shaders (0.5MB each)
        const estimated = codeSize + textureCount * 2 + bufferCount * 1 + shaderCount * 0.5;
        return Math.round(estimated * 100) / 100; // Round to 2 decimals
    }
    /**
     * Assess performance impact of code
     *
     * @param code Generated code
     * @returns Performance impact level
     */
    assessPerformanceImpact(code) {
        let score = 0;
        // Complexity factors
        score += (code.match(/loop|for|while/gi) || []).length * 2; // Loops are expensive
        score += (code.match(/texture|sample/gi) || []).length; // Texture samples
        score += (code.match(/shader|fragment|vertex/gi) || []).length; // Shader operations
        score += Math.round(code.length / 1000); // Code size factor
        if (score > 20)
            return 'high';
        if (score > 10)
            return 'medium';
        return 'low';
    }
    /**
     * Generate import statements for HSPlus
     *
     * @returns Import statement string
     */
    generateImports() {
        return `import { Trait, Material, Shader } from '@hololand/traits'
import { vec3, vec4, Quat } from '@hololand/math'

`;
    }
    /**
     * Generate metadata header with trait information
     *
     * @returns Metadata header string
     */
    generateMetadataHeader() {
        const config = this.editor.config;
        const timestamp = new Date().toISOString();
        return `/**
 * Generated by Phase 6 Trait Editor
 * Timestamp: ${timestamp}
 * Trait Type: ${config?.type || 'unknown'}
 * Properties: ${Object.keys(config?.properties || {}).length}
 * Parser Version: 1.0
 */

`;
    }
    /**
     * Generate optimization comments for device context
     *
     * @param context Device context
     * @returns Optimization comments
     */
    generateOptimizationComments(context) {
        return `

// Optimization hints for device: ${context.deviceId}
// GPU Capability: ${context.gpuCapability}
// CPU Capability: ${context.cpuCapability}
// Target FPS: ${context.targetFPS}
// Max GPU Memory: ${context.maxGPUMemory}MB
// Shader Level: ${context.supportedShaderLevel}
`;
    }
    /**
     * Get registered trait code
     *
     * @param traitId Trait identifier
     * @returns Trait code or undefined
     */
    getRegisteredTraitCode(traitId) {
        return this.registeredTraits.get(traitId)?.code;
    }
    /**
     * Get all registered traits
     *
     * @returns Map of trait IDs to code
     */
    getAllRegisteredTraits() {
        return new Map(this.registeredTraits);
    }
    /**
     * Clear registration errors
     */
    clearErrors() {
        this.validationErrors = [];
    }
    /**
     * Get recent validation errors
     *
     * @param limit Maximum number of errors to return
     * @returns Array of validation errors
     */
    getValidationErrors(limit = 10) {
        return this.validationErrors.slice(-limit);
    }
    /**
     * Attempt error recovery
     *
     * @param error Validation error
     * @returns Recovered code or undefined if not recoverable
     */
    recoverFromError(error) {
        if (!error.recoverable) {
            return undefined;
        }
        try {
            // Get current code
            let code = this.editor.generateCode();
            // Apply recovery based on error type
            switch (error.type) {
                case 'syntax':
                    // Add missing braces
                    if (!code.includes('{')) {
                        code = code.replace(/(@\w+)/, '$1 {');
                        code += '}';
                    }
                    break;
                case 'semantic':
                    // Remove undefined references
                    code = code.replace(/undefined|null/gi, '0');
                    break;
                case 'device':
                    // Simplify for device
                    code = code.replace(/complex|advanced/gi, 'simple');
                    break;
            }
            return code;
        }
        catch {
            return undefined;
        }
    }
    /**
     * Export registration data for persistence
     *
     * @returns JSON-serializable registration data
     */
    exportRegistrationData() {
        const data = {
            timestamp: new Date().toISOString(),
            traits: Array.from(this.registeredTraits.entries()).map(([id, { code, metadata }]) => ({
                id,
                code,
                metadata,
            })),
            deviceOptimizations: Array.from(this.deviceOptimizations.entries()).map(([id, context]) => ({
                id,
                context,
            })),
            errors: this.validationErrors,
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Import registration data
     *
     * @param jsonData JSON string with registration data
     * @returns Success status
     */
    importRegistrationData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            // Restore traits
            if (Array.isArray(data.traits)) {
                data.traits.forEach((trait) => {
                    this.registeredTraits.set(trait.id, {
                        code: trait.code,
                        metadata: trait.metadata,
                    });
                });
            }
            // Restore device optimizations
            if (Array.isArray(data.deviceOptimizations)) {
                data.deviceOptimizations.forEach((item) => {
                    this.deviceOptimizations.set(item.id, item.context);
                });
            }
            return true;
        }
        catch {
            return false;
        }
    }
}
