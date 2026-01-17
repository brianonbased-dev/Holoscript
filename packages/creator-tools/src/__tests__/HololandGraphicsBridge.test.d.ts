/**
 * HololandGraphicsBridge Test Suite - Comprehensive Graphics Integration Testing
 * Tests material creation, shader compilation, device optimization, and rendering metrics
 */
/**
 * Helper assertion for number range
 */
declare global {
    namespace Vi {
        interface Matchers<R> {
            toBeBetween(min: number, max: number): R;
        }
    }
}
export {};
