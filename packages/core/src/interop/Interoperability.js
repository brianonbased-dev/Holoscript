/**
 * @holoscript/core Interoperability
 *
 * TypeScript module resolution, proper import/export handling,
 * async/await support, error boundaries
 */
import * as path from 'path';
import * as fs from 'fs';
/**
 * Module resolver for TypeScript/JavaScript integration
 */
export class ModuleResolver {
    constructor(basePath = process.cwd()) {
        this.cache = new Map();
        this.resolvedPaths = new Map();
        this.basePath = basePath;
    }
    /**
     * Resolve module path
     */
    resolveModule(modulePath, fromPath) {
        const cacheKey = `${modulePath}:${fromPath || 'root'}`;
        if (this.resolvedPaths.has(cacheKey)) {
            return this.resolvedPaths.get(cacheKey);
        }
        const resolved = this.performResolve(modulePath, fromPath);
        this.resolvedPaths.set(cacheKey, resolved);
        return resolved;
    }
    /**
     * Perform actual module resolution
     */
    performResolve(modulePath, fromPath) {
        // Handle built-in modules
        if (this.isBuiltinModule(modulePath)) {
            return modulePath;
        }
        // Handle relative imports
        if (modulePath.startsWith('.')) {
            const basePath = fromPath ? path.dirname(fromPath) : this.basePath;
            const resolved = path.resolve(basePath, modulePath);
            return this.findModuleFile(resolved);
        }
        // Handle node_modules
        if (modulePath.startsWith('@')) {
            // Scoped package
            return this.resolveNodeModule(modulePath);
        }
        // Standard package
        return this.resolveNodeModule(modulePath);
    }
    /**
     * Check if built-in module
     */
    isBuiltinModule(modulePath) {
        const builtins = ['fs', 'path', 'crypto', 'util', 'stream', 'events'];
        return builtins.includes(modulePath);
    }
    /**
     * Resolve from node_modules
     */
    resolveNodeModule(modulePath) {
        let current = this.basePath;
        while (current !== path.dirname(current)) {
            const nodeModulesPath = path.join(current, 'node_modules', modulePath);
            if (fs.existsSync(nodeModulesPath)) {
                return nodeModulesPath;
            }
            // Try package.json main field
            const packageJsonPath = path.join(nodeModulesPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                return this.findModuleFile(path.join(nodeModulesPath, packageJson.main || 'index.js'));
            }
            current = path.dirname(current);
        }
        throw new Error(`Module not found: ${modulePath}`);
    }
    /**
     * Find module file with various extensions
     */
    findModuleFile(basePath) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        // Try exact file
        if (fs.existsSync(basePath)) {
            return basePath;
        }
        // Try with extensions
        for (const ext of extensions) {
            const withExt = basePath + ext;
            if (fs.existsSync(withExt)) {
                return withExt;
            }
        }
        // Try index
        const indexPath = path.join(basePath, 'index');
        for (const ext of extensions) {
            const withExt = indexPath + ext;
            if (fs.existsSync(withExt)) {
                return withExt;
            }
        }
        throw new Error(`Cannot resolve file: ${basePath}`);
    }
    /**
     * Load module (with caching)
     */
    loadModule(modulePath, fromPath) {
        const resolved = this.resolveModule(modulePath, fromPath);
        const cacheKey = resolved;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        // For now, return module info (real implementation would execute)
        const module = {
            path: resolved,
            exports: {},
        };
        this.cache.set(cacheKey, module);
        return module;
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.resolvedPaths.clear();
    }
}
/**
 * Named export/import handler
 */
export class ExportImportHandler {
    constructor() {
        this.exports = new Map();
    }
    /**
     * Define named export
     */
    defineExport(modulePath, name, value) {
        if (!this.exports.has(modulePath)) {
            this.exports.set(modulePath, new Map());
        }
        this.exports.get(modulePath).set(name, value);
    }
    /**
     * Get named export
     */
    getExport(modulePath, name) {
        const moduleExports = this.exports.get(modulePath);
        if (!moduleExports) {
            throw new Error(`Module not found: ${modulePath}`);
        }
        if (!moduleExports.has(name)) {
            throw new Error(`Named export '${name}' not found in ${modulePath}`);
        }
        return moduleExports.get(name);
    }
    /**
     * Get all exports from module
     */
    getAllExports(modulePath) {
        const moduleExports = this.exports.get(modulePath);
        if (!moduleExports) {
            return {};
        }
        const result = {};
        for (const [name, value] of moduleExports) {
            result[name] = value;
        }
        return result;
    }
    /**
     * Check if export exists
     */
    hasExport(modulePath, name) {
        return this.exports.has(modulePath) && this.exports.get(modulePath).has(name);
    }
}
/**
 * Async function handler
 */
export class AsyncFunctionHandler {
    /**
     * Wrap async function for HoloScript
     */
    wrapAsyncFunction(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
                throw this.normalizeError(error);
            }
        };
    }
    /**
     * Check if function is async
     */
    isAsync(fn) {
        if (typeof fn !== 'function') {
            return false;
        }
        const fnStr = fn.toString().trim();
        return fnStr.startsWith('async ') || fn.constructor.name === 'AsyncFunction';
    }
    /**
     * Convert callback to promise
     */
    callbackToPromise(fn) {
        return new Promise((resolve, reject) => {
            fn((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    /**
     * Normalize error from async function
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }
        if (typeof error === 'string') {
            return new Error(error);
        }
        return new Error(JSON.stringify(error));
    }
}
/**
 * Error boundary for isolation
 */
export class ErrorBoundary {
    constructor(onError) {
        this.errors = [];
        this.onError = onError;
    }
    /**
     * Wrap function with error boundary
     */
    wrap(fn) {
        return ((...args) => {
            try {
                const result = fn(...args);
                // Handle async functions
                if (result instanceof Promise) {
                    return result.catch((error) => {
                        this.handleError(error);
                        throw error;
                    });
                }
                return result;
            }
            catch (error) {
                this.handleError(error);
                throw error;
            }
        });
    }
    /**
     * Wrap async function with error boundary
     */
    wrapAsync(fn) {
        return (async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
                this.handleError(error);
                throw error;
            }
        });
    }
    /**
     * Execute function in boundary
     */
    execute(fn) {
        try {
            return fn();
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Execute async function in boundary
     */
    async executeAsync(fn) {
        try {
            return await fn();
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Handle error
     */
    handleError(error) {
        const normalized = this.normalizeError(error);
        this.errors.push(normalized);
        if (this.onError) {
            this.onError(normalized);
        }
    }
    /**
     * Get errors
     */
    getErrors() {
        return [...this.errors];
    }
    /**
     * Clear errors
     */
    clearErrors() {
        this.errors = [];
    }
    /**
     * Normalize error
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }
        if (typeof error === 'string') {
            return new Error(error);
        }
        return new Error(JSON.stringify(error));
    }
}
/**
 * TypeScript type loader
 */
export class TypeScriptTypeLoader {
    /**
     * Load types from TypeScript declaration file
     */
    loadTypes(filePath) {
        const types = new Map();
        // In real implementation, would parse .d.ts file
        // For now, return empty map
        return types;
    }
    /**
     * Convert TypeScript type to HoloScript type
     */
    convertType(tsType) {
        // Basic type mapping
        const mapping = {
            string: 'text',
            number: 'numeric',
            boolean: 'logical',
            void: 'void',
            any: 'dynamic',
            unknown: 'dynamic',
            null: 'null',
            undefined: 'void',
        };
        if (typeof tsType === 'string') {
            return mapping[tsType] || tsType;
        }
        if (Array.isArray(tsType)) {
            return {
                kind: 'array',
                elementType: this.convertType(tsType[0]),
            };
        }
        if (typeof tsType === 'object') {
            return {
                kind: 'object',
                properties: Object.entries(tsType).reduce((acc, [key, val]) => {
                    acc[key] = this.convertType(val);
                    return acc;
                }, {}),
            };
        }
        return tsType;
    }
}
/**
 * Unified interop context
 */
export class InteropContext {
    constructor(basePath) {
        this.moduleResolver = new ModuleResolver(basePath);
        this.exportImportHandler = new ExportImportHandler();
        this.asyncHandler = new AsyncFunctionHandler();
        this.errorBoundary = new ErrorBoundary();
        this.typeLoader = new TypeScriptTypeLoader();
    }
    getModuleResolver() {
        return this.moduleResolver;
    }
    getExportImportHandler() {
        return this.exportImportHandler;
    }
    getAsyncHandler() {
        return this.asyncHandler;
    }
    getErrorBoundary() {
        return this.errorBoundary;
    }
    getTypeLoader() {
        return this.typeLoader;
    }
}
