/**
 * HoloScriptTypeChecker Tests - Simplified
 *
 * Tests for type checking system
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptTypeChecker } from '../HoloScriptTypeChecker';
describe('HoloScriptTypeChecker', () => {
    let typeChecker;
    beforeEach(() => {
        typeChecker = new HoloScriptTypeChecker();
    });
    describe('Type Inference', () => {
        it('should initialize type checker', () => {
            expect(typeChecker).toBeDefined();
        });
        it('should infer number type', () => {
            const result = typeChecker.inferType(42);
            expect(result.type).toBe('number');
        });
        it('should infer string type', () => {
            const result = typeChecker.inferType('hello');
            expect(result.type).toBe('string');
        });
        it('should infer boolean type', () => {
            const result = typeChecker.inferType(true);
            expect(result.type).toBe('boolean');
        });
        it('should infer array type', () => {
            const result = typeChecker.inferType([1, 2, 3]);
            expect(result.type).toBe('array');
            expect(result.elementType).toBe('number');
        });
        it('should infer object type', () => {
            const result = typeChecker.inferType({ x: 1 });
            expect(result.type).toBe('object');
            expect(result.properties?.size).toBeGreaterThan(0);
        });
        it('should infer null/undefined as any with nullable', () => {
            const result = typeChecker.inferType(null);
            expect(result.type).toBe('any');
            expect(result.nullable).toBe(true);
        });
    });
    describe('Type Checking', () => {
        it('should check AST nodes', () => {
            const ast = [];
            const result = typeChecker.check(ast);
            expect(result.valid).toBeDefined();
            expect(result.diagnostics).toBeDefined();
            expect(result.typeMap).toBeDefined();
        });
        it('should return valid result for empty AST', () => {
            const ast = [];
            const result = typeChecker.check(ast);
            expect(result.valid).toBe(true);
            expect(result.diagnostics.length).toBe(0);
        });
    });
});
