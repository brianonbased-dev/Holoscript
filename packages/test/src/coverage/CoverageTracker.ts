/**
 * Coverage Tracker - Sprint 2 Priority 9
 *
 * Tracks test coverage across:
 * - Parser AST nodes
 * - Traits (built-in and custom)
 * - Templates
 * - Error paths
 *
 * Generates reports and badges for README
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CoverageCategory {
  name: string;
  total: number;
  covered: number;
  percentage: number;
  items: CoverageItem[];
}

export interface CoverageItem {
  name: string;
  covered: boolean;
  testCount: number;
  lastTested?: Date;
}

export interface CoverageReport {
  timestamp: string;
  version: string;
  overall: {
    total: number;
    covered: number;
    percentage: number;
  };
  categories: CoverageCategory[];
  uncovered: string[];
  trends: CoverageTrend[];
}

export interface CoverageTrend {
  date: string;
  percentage: number;
  commit?: string;
}

export interface PerformanceSnapshot {
  testName: string;
  duration: number;
  memory: number;
  timestamp: string;
}

export interface PerformanceReport {
  timestamp: string;
  snapshots: PerformanceSnapshot[];
  regressions: PerformanceRegression[];
  averages: {
    duration: number;
    memory: number;
  };
}

export interface PerformanceRegression {
  testName: string;
  baseline: number;
  current: number;
  changePercent: number;
  type: 'duration' | 'memory';
}

// =============================================================================
// PARSER NODES TO TRACK
// =============================================================================

const PARSER_NODES = [
  'Composition',
  'Object',
  'Template',
  'SpatialGroup',
  'Environment',
  'State',
  'Logic',
  'Property',
  'Trait',
  'TraitWithArgs',
  'Array',
  'ObjectExpression',
  'StringLiteral',
  'NumberLiteral',
  'BooleanLiteral',
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'ArrowFunction',
  'BinaryExpression',
  'UnaryExpression',
  'ConditionalExpression',
  'SpreadElement',
  'RestElement',
  'Import',
  'Export',
];

const BUILTIN_TRAITS = [
  'physics',
  'static',
  'kinematic',
  'collidable',
  'grabbable',
  'throwable',
  'draggable',
  'climbable',
  'interactable',
  'visible',
  'invisible',
  'glowing',
  'animated',
  'billboard',
  'occluder',
  'navmesh',
  'trigger',
  'audio',
  'spatial_audio',
  'particle',
];

const ERROR_PATHS = [
  'UnexpectedToken',
  'MissingColon',
  'UnclosedBrace',
  'UnclosedBracket',
  'UnclosedParen',
  'InvalidTraitSyntax',
  'UnknownTrait',
  'DuplicateIdentifier',
  'InvalidExpression',
  'MissingValue',
];

// =============================================================================
// COVERAGE TRACKER
// =============================================================================

export class CoverageTracker {
  private coverage: Map<string, Map<string, CoverageItem>> = new Map();
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private performanceBaselines: Map<string, number> = new Map();

  constructor() {
    this.initializeCategories();
  }

  /**
   * Initialize coverage categories with all trackable items
   */
  private initializeCategories(): void {
    // Parser nodes
    const parserItems = new Map<string, CoverageItem>();
    for (const node of PARSER_NODES) {
      parserItems.set(node, { name: node, covered: false, testCount: 0 });
    }
    this.coverage.set('Parser Nodes', parserItems);

    // Traits
    const traitItems = new Map<string, CoverageItem>();
    for (const trait of BUILTIN_TRAITS) {
      traitItems.set(trait, { name: trait, covered: false, testCount: 0 });
    }
    this.coverage.set('Traits', traitItems);

    // Error paths
    const errorItems = new Map<string, CoverageItem>();
    for (const error of ERROR_PATHS) {
      errorItems.set(error, { name: error, covered: false, testCount: 0 });
    }
    this.coverage.set('Error Paths', errorItems);

    // Templates (starts empty, populated dynamically)
    this.coverage.set('Templates', new Map());
  }

  /**
   * Mark an item as covered
   */
  markCovered(category: string, item: string): void {
    const categoryMap = this.coverage.get(category);
    if (categoryMap) {
      const existing = categoryMap.get(item);
      if (existing) {
        existing.covered = true;
        existing.testCount++;
        existing.lastTested = new Date();
      } else {
        // Dynamically add for templates
        categoryMap.set(item, {
          name: item,
          covered: true,
          testCount: 1,
          lastTested: new Date(),
        });
      }
    }
  }

  /**
   * Record a performance snapshot
   */
  recordPerformance(testName: string, duration: number, memory: number): void {
    this.performanceSnapshots.push({
      testName,
      duration,
      memory,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set a performance baseline
   */
  setBaseline(testName: string, duration: number): void {
    this.performanceBaselines.set(testName, duration);
  }

  /**
   * Load baselines from JSON
   */
  loadBaselines(json: string): void {
    const data = JSON.parse(json);
    for (const [name, value] of Object.entries(data)) {
      this.performanceBaselines.set(name, value as number);
    }
  }

  /**
   * Export baselines as JSON
   */
  exportBaselines(): string {
    const obj: Record<string, number> = {};
    for (const [name, value] of this.performanceBaselines) {
      obj[name] = value;
    }
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Generate coverage report
   */
  generateReport(version = '2.1.0'): CoverageReport {
    const categories: CoverageCategory[] = [];
    let totalItems = 0;
    let totalCovered = 0;
    const uncovered: string[] = [];

    for (const [categoryName, items] of this.coverage) {
      const categoryItems: CoverageItem[] = [];
      let categoryCovered = 0;

      for (const item of items.values()) {
        categoryItems.push(item);
        totalItems++;
        if (item.covered) {
          categoryCovered++;
          totalCovered++;
        } else {
          uncovered.push(`${categoryName}: ${item.name}`);
        }
      }

      categories.push({
        name: categoryName,
        total: items.size,
        covered: categoryCovered,
        percentage: items.size > 0 ? Math.round((categoryCovered / items.size) * 100) : 0,
        items: categoryItems,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      version,
      overall: {
        total: totalItems,
        covered: totalCovered,
        percentage: totalItems > 0 ? Math.round((totalCovered / totalItems) * 100) : 0,
      },
      categories,
      uncovered,
      trends: [], // Would be populated from historical data
    };
  }

  /**
   * Generate performance report with regression detection
   */
  generatePerformanceReport(threshold = 10): PerformanceReport {
    const regressions: PerformanceRegression[] = [];
    let totalDuration = 0;
    let totalMemory = 0;

    for (const snapshot of this.performanceSnapshots) {
      totalDuration += snapshot.duration;
      totalMemory += snapshot.memory;

      // Check for regression against baseline
      const baseline = this.performanceBaselines.get(snapshot.testName);
      if (baseline) {
        const changePercent = ((snapshot.duration - baseline) / baseline) * 100;
        if (changePercent > threshold) {
          regressions.push({
            testName: snapshot.testName,
            baseline,
            current: snapshot.duration,
            changePercent,
            type: 'duration',
          });
        }
      }
    }

    const count = this.performanceSnapshots.length || 1;

    return {
      timestamp: new Date().toISOString(),
      snapshots: this.performanceSnapshots,
      regressions,
      averages: {
        duration: totalDuration / count,
        memory: totalMemory / count,
      },
    };
  }

  /**
   * Format coverage report as markdown
   */
  formatMarkdown(report: CoverageReport): string {
    const lines: string[] = [];

    lines.push('# Test Coverage Report');
    lines.push('');
    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Version: ${report.version}`);
    lines.push('');
    lines.push(`## Overall: ${report.overall.percentage}%`);
    lines.push('');
    lines.push(`- Total items: ${report.overall.total}`);
    lines.push(`- Covered: ${report.overall.covered}`);
    lines.push('');

    lines.push('## Coverage by Category');
    lines.push('');
    lines.push('| Category | Coverage | Percentage |');
    lines.push('|----------|----------|------------|');

    for (const category of report.categories) {
      const bar = this.progressBar(category.percentage);
      lines.push(`| ${category.name} | ${category.covered}/${category.total} | ${bar} ${category.percentage}% |`);
    }

    lines.push('');

    if (report.uncovered.length > 0) {
      lines.push('## Uncovered Items');
      lines.push('');
      for (const item of report.uncovered.slice(0, 20)) {
        lines.push(`- ${item}`);
      }
      if (report.uncovered.length > 20) {
        lines.push(`- ... and ${report.uncovered.length - 20} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate shield.io badge URL
   */
  generateBadgeUrl(report: CoverageReport): string {
    const percentage = report.overall.percentage;
    let color = 'red';
    if (percentage >= 80) color = 'brightgreen';
    else if (percentage >= 60) color = 'green';
    else if (percentage >= 40) color = 'yellow';
    else if (percentage >= 20) color = 'orange';

    return `https://img.shields.io/badge/coverage-${percentage}%25-${color}`;
  }

  /**
   * Generate badge markdown
   */
  generateBadgeMarkdown(report: CoverageReport): string {
    const url = this.generateBadgeUrl(report);
    return `![Coverage](${url})`;
  }

  /**
   * Create a simple text progress bar
   */
  private progressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Reset all coverage data
   */
  reset(): void {
    for (const category of this.coverage.values()) {
      for (const item of category.values()) {
        item.covered = false;
        item.testCount = 0;
        item.lastTested = undefined;
      }
    }
    this.performanceSnapshots = [];
  }

  /**
   * Serialize for persistence
   */
  serialize(): string {
    const data: Record<string, Record<string, CoverageItem>> = {};
    for (const [category, items] of this.coverage) {
      data[category] = {};
      for (const [name, item] of items) {
        data[category][name] = item;
      }
    }
    return JSON.stringify({
      version: 1,
      coverage: data,
      baselines: Object.fromEntries(this.performanceBaselines),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Deserialize from persisted data
   */
  static deserialize(json: string): CoverageTracker {
    const tracker = new CoverageTracker();
    const data = JSON.parse(json);

    if (data.version !== 1) {
      throw new Error(`Unsupported coverage data version: ${data.version}`);
    }

    for (const [category, items] of Object.entries(data.coverage)) {
      const categoryMap = tracker.coverage.get(category) || new Map();
      for (const [name, item] of Object.entries(items as Record<string, CoverageItem>)) {
        categoryMap.set(name, item);
      }
      tracker.coverage.set(category, categoryMap);
    }

    if (data.baselines) {
      for (const [name, value] of Object.entries(data.baselines)) {
        tracker.performanceBaselines.set(name, value as number);
      }
    }

    return tracker;
  }
}

// =============================================================================
// GLOBAL TRACKER
// =============================================================================

export const globalCoverageTracker = new CoverageTracker();

// =============================================================================
// VITEST INTEGRATION
// =============================================================================

/**
 * Create a coverage-tracking test wrapper for Vitest
 */
export function createCoverageTest(
  tracker: CoverageTracker = globalCoverageTracker
) {
  return function coverageTest(
    category: string,
    item: string,
    testFn: () => void | Promise<void>
  ) {
    return async () => {
      const start = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        await testFn();
        tracker.markCovered(category, item);
      } finally {
        const duration = performance.now() - start;
        const memory = process.memoryUsage().heapUsed - startMemory;
        tracker.recordPerformance(`${category}:${item}`, duration, memory);
      }
    };
  };
}
