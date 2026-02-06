/**
 * Runtime Observability for HoloScript
 * 
 * Provides metrics, health checks, and tracing for production monitoring.
 * Catches issues that unit tests miss:
 * - Memory leaks over time
 * - Performance degradation under load
 * - Intermittent failures in parsing
 * - External dependency failures
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

export interface Metrics {
  // Counter metrics
  parseRequests: number;
  parseErrors: number;
  validateRequests: number;
  validateErrors: number;
  generateRequests: number;
  generateErrors: number;
  
  // Timing metrics (ms)
  avgParseLatency: number;
  maxParseLatency: number;
  p95ParseLatency: number;
  
  // Resource metrics
  memoryUsageMB: number;
  heapUsedMB: number;
  
  // Throughput
  requestsPerSecond: number;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  tags: Record<string, string | number | boolean>;
  logs: Array<{ timestamp: number; message: string }>;
}

/**
 * Observability singleton for HoloScript runtime
 */
class Observability {
  private startTime = Date.now();
  private counters = new Map<string, number>();
  private latencies = new Map<string, number[]>();
  private traces = new Map<string, TraceSpan>();
  private healthChecks: (() => Promise<HealthCheck>)[] = [];
  private isEnabled = true;

  constructor() {
    // Initialize counters
    this.counters.set('parse.requests', 0);
    this.counters.set('parse.errors', 0);
    this.counters.set('validate.requests', 0);
    this.counters.set('validate.errors', 0);
    this.counters.set('generate.requests', 0);
    this.counters.set('generate.errors', 0);
  }

  /**
   * Enable/disable observability (useful for tests)
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Increment a counter
   */
  increment(name: string, value = 1) {
    if (!this.isEnabled) return;
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a latency measurement
   */
  recordLatency(name: string, latencyMs: number) {
    if (!this.isEnabled) return;
    const latencies = this.latencies.get(name) || [];
    latencies.push(latencyMs);
    // Keep last 1000 measurements
    if (latencies.length > 1000) {
      latencies.shift();
    }
    this.latencies.set(name, latencies);
  }

  /**
   * Start a trace span
   */
  startSpan(operationName: string, parentSpanId?: string): TraceSpan {
    const span: TraceSpan = {
      traceId: parentSpanId ? this.traces.get(parentSpanId)?.traceId || this.generateId() : this.generateId(),
      spanId: this.generateId(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: {},
      logs: [],
    };
    
    if (this.isEnabled) {
      this.traces.set(span.spanId, span);
    }
    
    return span;
  }

  /**
   * End a trace span
   */
  endSpan(span: TraceSpan, status: 'ok' | 'error' = 'ok') {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    
    if (this.isEnabled) {
      this.recordLatency(`trace.${span.operationName}`, span.duration);
    }
  }

  /**
   * Add a log to a span
   */
  addSpanLog(span: TraceSpan, message: string) {
    span.logs.push({ timestamp: Date.now(), message });
  }

  /**
   * Add a tag to a span
   */
  addSpanTag(span: TraceSpan, key: string, value: string | number | boolean) {
    span.tags[key] = value;
  }

  /**
   * Register a health check function
   */
  registerHealthCheck(check: () => Promise<HealthCheck>) {
    this.healthChecks.push(check);
  }

  /**
   * Run all health checks
   */
  async getHealth(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];
    
    // Built-in checks
    checks.push(this.checkMemory());
    checks.push(this.checkLatency());
    checks.push(this.checkErrorRate());
    
    // Run registered checks
    for (const check of this.healthChecks) {
      try {
        checks.push(await check());
      } catch (error) {
        checks.push({
          name: 'custom_check',
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    // Determine overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const hasWarning = checks.some(c => c.status === 'warn');
    const status = hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';
    
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    const parseLatencies = this.latencies.get('parse') || [];
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    const totalRequests = (this.counters.get('parse.requests') || 0) +
                          (this.counters.get('validate.requests') || 0) +
                          (this.counters.get('generate.requests') || 0);

    return {
      parseRequests: this.counters.get('parse.requests') || 0,
      parseErrors: this.counters.get('parse.errors') || 0,
      validateRequests: this.counters.get('validate.requests') || 0,
      validateErrors: this.counters.get('validate.errors') || 0,
      generateRequests: this.counters.get('generate.requests') || 0,
      generateErrors: this.counters.get('generate.errors') || 0,
      
      avgParseLatency: this.calculateAverage(parseLatencies),
      maxParseLatency: Math.max(...parseLatencies, 0),
      p95ParseLatency: this.calculatePercentile(parseLatencies, 95),
      
      memoryUsageMB: process.memoryUsage().rss / 1024 / 1024,
      heapUsedMB: process.memoryUsage().heapUsed / 1024 / 1024,
      
      requestsPerSecond: uptimeSeconds > 0 ? totalRequests / uptimeSeconds : 0,
    };
  }

  /**
   * Memory health check
   */
  private checkMemory(): HealthCheck {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    const heapTotalMB = memory.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (usagePercent > 90) status = 'fail';
    else if (usagePercent > 70) status = 'warn';
    
    return {
      name: 'memory',
      status,
      message: `Heap usage: ${usagePercent.toFixed(1)}%`,
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        rssMB: Math.round(memory.rss / 1024 / 1024),
      },
    };
  }

  /**
   * Latency health check
   */
  private checkLatency(): HealthCheck {
    const parseLatencies = this.latencies.get('parse') || [];
    if (parseLatencies.length === 0) {
      return { name: 'latency', status: 'pass', message: 'No data yet' };
    }
    
    const p95 = this.calculatePercentile(parseLatencies, 95);
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (p95 > 1000) status = 'fail'; // > 1s is bad
    else if (p95 > 500) status = 'warn'; // > 500ms is concerning
    
    return {
      name: 'latency',
      status,
      latency: p95,
      message: `P95 parse latency: ${p95}ms`,
    };
  }

  /**
   * Error rate health check
   */
  private checkErrorRate(): HealthCheck {
    const parseRequests = this.counters.get('parse.requests') || 0;
    const parseErrors = this.counters.get('parse.errors') || 0;
    
    if (parseRequests === 0) {
      return { name: 'error_rate', status: 'pass', message: 'No requests yet' };
    }
    
    const errorRate = (parseErrors / parseRequests) * 100;
    
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (errorRate > 10) status = 'fail'; // > 10% error rate
    else if (errorRate > 5) status = 'warn'; // > 5% error rate
    
    return {
      name: 'error_rate',
      status,
      message: `Parse error rate: ${errorRate.toFixed(1)}%`,
      details: {
        requests: parseRequests,
        errors: parseErrors,
        rate: errorRate.toFixed(2),
      },
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.startTime = Date.now();
    this.counters.clear();
    this.latencies.clear();
    this.traces.clear();
    
    // Re-initialize counters
    this.counters.set('parse.requests', 0);
    this.counters.set('parse.errors', 0);
    this.counters.set('validate.requests', 0);
    this.counters.set('validate.errors', 0);
    this.counters.set('generate.requests', 0);
    this.counters.set('generate.errors', 0);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Export singleton
export const observability = new Observability();

/**
 * Decorator to add tracing to a function
 */
export function traced(operationName?: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const name = operationName || propertyKey;
    
    descriptor.value = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
      const span = observability.startSpan(name);
      try {
        const result = originalMethod.apply(this, args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((value) => {
              observability.endSpan(span, 'ok');
              return value;
            })
            .catch((error) => {
              observability.endSpan(span, 'error');
              observability.addSpanLog(span, `Error: ${error.message}`);
              throw error;
            }) as ReturnType<T>;
        }
        
        observability.endSpan(span, 'ok');
        return result as ReturnType<T>;
      } catch (error) {
        observability.endSpan(span, 'error');
        if (error instanceof Error) {
          observability.addSpanLog(span, `Error: ${error.message}`);
        }
        throw error;
      }
    } as T;
    
    return descriptor;
  };
}

/**
 * Wrapper to instrument any async function
 */
export async function withTracing<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const span = observability.startSpan(operationName);
  try {
    const result = await fn();
    observability.endSpan(span, 'ok');
    return result;
  } catch (error) {
    observability.endSpan(span, 'error');
    if (error instanceof Error) {
      observability.addSpanLog(span, `Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Wrapper to instrument sync functions
 */
export function withTracingSync<T>(
  operationName: string,
  fn: () => T
): T {
  const span = observability.startSpan(operationName);
  try {
    const result = fn();
    observability.endSpan(span, 'ok');
    return result;
  } catch (error) {
    observability.endSpan(span, 'error');
    if (error instanceof Error) {
      observability.addSpanLog(span, `Error: ${error.message}`);
    }
    throw error;
  }
}
