/**
 * @holoscript/infinityassistant Basic Tests
 *
 * Placeholder test file for Infinity Builder client integration
 */

import { describe, it, expect } from 'vitest';

describe('@holoscript/infinityassistant', () => {
  it('should be importable', () => {
    expect(true).toBe(true);
  });

  it('should have version', () => {
    const pkg = require('../../package.json');
    expect(pkg.version).toBeDefined();
  });
});
