/**
 * Performance Tracker - Monitors parser performance over time
 * Tracks baseline metrics and alerts on degradation >5%
 * Generates reports for CI/CD integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PerformanceMetric {
  name: string;
  timing: number; // milliseconds
  opsPerSec: number;
  timestamp: string;
  environment?: string;
}

export interface PerformanceBaseline {
  version: string;
  timestamp: string;
  metrics: Record<string, PerformanceMetric>;
}

export interface PerformanceReport {
  timestamp: string;
  baseline: PerformanceBaseline | null;
  current: PerformanceMetric[];
  comparisons: PerformanceComparison[];
  status: 'PASS' | 'WARN' | 'FAIL';
  alerts: string[];
}

export interface PerformanceComparison {
  name: string;
  baseline?: number;
  current: number;
  changePercent?: number;
  status: 'OK' | 'WARN' | 'FAIL';
}

const METRICS_DIR = path.join(__dirname, '../../../.perf-metrics');
const BASELINE_FILE = path.join(METRICS_DIR, 'baseline.json');
const HISTORY_FILE = path.join(METRICS_DIR, 'history.json');
const DEGRADATION_THRESHOLD = 5; // percent

export class PerformanceTracker {
  private baseline: PerformanceBaseline | null = null;
  private currentMetrics: PerformanceMetric[] = [];

  constructor() {
    this.ensureMetricsDir();
    this.loadBaseline();
  }

  private ensureMetricsDir(): void {
    if (!fs.existsSync(METRICS_DIR)) {
      fs.mkdirSync(METRICS_DIR, { recursive: true });
    }
  }

  private loadBaseline(): void {
    if (fs.existsSync(BASELINE_FILE)) {
      try {
        const content = fs.readFileSync(BASELINE_FILE, 'utf-8');
        this.baseline = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to load baseline metrics:', e);
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, timing: number, opsPerSec: number): void {
    this.currentMetrics.push({
      name,
      timing,
      opsPerSec,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test'
    });
  }

  /**
   * Compare current metrics against baseline
   */
  compare(): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = [];

    for (const metric of this.currentMetrics) {
      const baselineMetric = this.baseline?.metrics[metric.name];
      
      const comparison: PerformanceComparison = {
        name: metric.name,
        current: metric.timing,
        baseline: baselineMetric?.timing,
        status: 'OK'
      };

      if (baselineMetric) {
        const changePercent = ((metric.timing - baselineMetric.timing) / baselineMetric.timing) * 100;
        comparison.changePercent = Math.round(changePercent * 100) / 100;

        if (changePercent > DEGRADATION_THRESHOLD) {
          comparison.status = 'FAIL';
        } else if (changePercent > DEGRADATION_THRESHOLD / 2) {
          comparison.status = 'WARN';
        }
      }

      comparisons.push(comparison);
    }

    return comparisons;
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const comparisons = this.compare();
    const alerts: string[] = [];
    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';

    for (const comp of comparisons) {
      if (comp.status === 'FAIL') {
        status = 'FAIL';
        alerts.push(
          `❌ PERFORMANCE DEGRADATION: ${comp.name} ${comp.changePercent}% slower (${comp.current?.toFixed(3)}ms vs baseline ${comp.baseline?.toFixed(3)}ms)`
        );
      } else if (comp.status === 'WARN') {
        status = status === 'FAIL' ? 'FAIL' : 'WARN';
        alerts.push(
          `⚠️ PERFORMANCE TREND: ${comp.name} ${comp.changePercent}% slower (${comp.current?.toFixed(3)}ms)`
        );
      }
    }

    return {
      timestamp: new Date().toISOString(),
      baseline: this.baseline,
      current: this.currentMetrics,
      comparisons,
      status,
      alerts
    };
  }

  /**
   * Save current metrics as new baseline
   */
  saveAsBaseline(version: string = 'current'): void {
    const baseline: PerformanceBaseline = {
      version,
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    for (const metric of this.currentMetrics) {
      baseline.metrics[metric.name] = metric;
    }

    this.baseline = baseline;
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    console.log(`✅ Baseline metrics saved (${this.currentMetrics.length} metrics)`);
  }

  /**
   * Append to history for tracking trends
   */
  archiveToHistory(label: string = ''): void {
    let history: Array<{ label: string; timestamp: string; metrics: PerformanceMetric[] }> = [];

    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        history = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to load history:', e);
      }
    }

    history.push({
      label: label || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      metrics: this.currentMetrics
    });

    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(-50);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  }

  /**
   * Print report to console
   */
  printReport(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE REPORT');
    console.log('='.repeat(60));

    console.log(`\n${report.status === 'PASS' ? '✅' : report.status === 'WARN' ? '⚠️' : '❌'} Status: ${report.status}`);
    console.log(`Timestamp: ${report.timestamp}`);

    if (report.baseline) {
      console.log(`Baseline Version: ${report.baseline.version} (${report.baseline.timestamp})`);
    }

    console.log('\nMetrics:');
    for (const comp of report.comparisons) {
      const change = comp.changePercent !== undefined ? ` (${comp.changePercent > 0 ? '+' : ''}${comp.changePercent}%)` : '';
      const emoji = comp.status === 'OK' ? '✅' : comp.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${emoji} ${comp.name}: ${comp.current?.toFixed(3)}ms${change}`);
    }

    if (report.alerts.length > 0) {
      console.log('\nAlerts:');
      for (const alert of report.alerts) {
        console.log(`  ${alert}`);
      }
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get all metrics grouped by name
   */
  getAllMetrics(): Map<string, number[]> {
    const grouped = new Map<string, number[]>();
    for (const metric of this.currentMetrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric.timing);
    }
    return grouped;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalMetrics: number;
    avgTiming: number;
    minTiming: number;
    maxTiming: number;
    hasBaseline: boolean;
    percentWithinThreshold: number;
  } {
    if (this.currentMetrics.length === 0) {
      return {
        totalMetrics: 0,
        avgTiming: 0,
        minTiming: 0,
        maxTiming: 0,
        hasBaseline: !!this.baseline,
        percentWithinThreshold: 0
      };
    }

    const timings = this.currentMetrics.map(m => m.timing);
    const comparisons = this.compare();
    const withinThreshold = comparisons.filter(c => c.status === 'OK' || c.status === 'WARN').length;

    return {
      totalMetrics: this.currentMetrics.length,
      avgTiming: timings.reduce((a, b) => a + b, 0) / timings.length,
      minTiming: Math.min(...timings),
      maxTiming: Math.max(...timings),
      hasBaseline: !!this.baseline,
      percentWithinThreshold: (withinThreshold / comparisons.length) * 100
    };
  }
}

/**
 * Global singleton instance
 */
export const performanceTracker = new PerformanceTracker();
