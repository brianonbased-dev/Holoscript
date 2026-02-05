/**
 * HoloScript Registry API Client
 *
 * Provides programmatic access to the HoloScript package registry.
 */

/**
 * Partner authentication credentials
 */
export interface PartnerCredentials {
  partnerId: string;
  apiKey: string;
  secretKey?: string;
}

/**
 * API client configuration
 */
export interface RegistryClientConfig {
  credentials: PartnerCredentials;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Package metadata from registry
 */
export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  author?: string | { name: string; email?: string };
  license?: string;
  downloads: {
    total: number;
    lastMonth: number;
    lastWeek: number;
  };
  certified: boolean;
  certificationGrade?: string;
  publishedAt: string;
  updatedAt: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  maintainers: Array<{ name: string; email?: string }>;
}

/**
 * Package version info
 */
export interface VersionInfo {
  version: string;
  publishedAt: string;
  deprecated?: boolean;
  deprecationReason?: string;
  downloadCount: number;
  tarballUrl: string;
  integrity: string;
}

/**
 * Search result from registry
 */
export interface SearchResult {
  packages: Array<{
    name: string;
    version: string;
    description?: string;
    certified: boolean;
    downloads: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
}

/**
 * Rate limiting error
 */
export class RateLimitError extends Error {
  constructor(
    public readonly retryAfter: number,
    public readonly limit: number
  ) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    this.name = 'RateLimitError';
  }
}

/**
 * API authentication error
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Registry API Client
 *
 * Main client for interacting with the HoloScript package registry.
 */
export class RegistryClient {
  private config: Required<RegistryClientConfig>;
  private rateLimitRemaining: number = 1000;
  private rateLimitResetAt: Date | null = null;

  constructor(config: RegistryClientConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://registry.holoscript.dev/api/v1',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };
  }

  /**
   * Get package information
   */
  async getPackage(name: string): Promise<ApiResponse<PackageInfo>> {
    return this.request<PackageInfo>('GET', `/packages/${encodeURIComponent(name)}`);
  }

  /**
   * Get specific version information
   */
  async getVersion(name: string, version: string): Promise<ApiResponse<VersionInfo>> {
    return this.request<VersionInfo>(
      'GET',
      `/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`
    );
  }

  /**
   * List all versions of a package
   */
  async listVersions(name: string): Promise<ApiResponse<VersionInfo[]>> {
    return this.request<VersionInfo[]>(
      'GET',
      `/packages/${encodeURIComponent(name)}/versions`
    );
  }

  /**
   * Search for packages
   */
  async search(
    query: string,
    options?: {
      page?: number;
      pageSize?: number;
      certified?: boolean;
      keywords?: string[];
      sort?: 'relevance' | 'downloads' | 'recent';
    }
  ): Promise<ApiResponse<SearchResult>> {
    const params = new URLSearchParams({ q: query });

    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options?.certified !== undefined) params.set('certified', options.certified.toString());
    if (options?.keywords?.length) params.set('keywords', options.keywords.join(','));
    if (options?.sort) params.set('sort', options.sort);

    return this.request<SearchResult>('GET', `/packages/search?${params}`);
  }

  /**
   * Get download statistics for a package
   */
  async getDownloadStats(
    name: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<{ date: string; downloads: number }[]>> {
    return this.request<{ date: string; downloads: number }[]>(
      'GET',
      `/packages/${encodeURIComponent(name)}/stats/downloads?period=${period}`
    );
  }

  /**
   * Check if a package name is available
   */
  async checkNameAvailability(name: string): Promise<ApiResponse<{ available: boolean; reason?: string }>> {
    return this.request<{ available: boolean; reason?: string }>(
      'GET',
      `/packages/check-name/${encodeURIComponent(name)}`
    );
  }

  /**
   * Get partner's published packages
   */
  async getMyPackages(
    options?: { page?: number; pageSize?: number }
  ): Promise<ApiResponse<{ packages: PackageInfo[]; total: number }>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString());

    return this.request<{ packages: PackageInfo[]; total: number }>(
      'GET',
      `/partner/packages?${params}`
    );
  }

  /**
   * Deprecate a package version
   */
  async deprecateVersion(
    name: string,
    version: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>('POST', `/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}/deprecate`, {
      reason,
    });
  }

  /**
   * Add or update package keywords
   */
  async updateKeywords(name: string, keywords: string[]): Promise<ApiResponse<void>> {
    return this.request<void>('PATCH', `/packages/${encodeURIComponent(name)}`, { keywords });
  }

  /**
   * Transfer package ownership
   */
  async transferOwnership(
    name: string,
    newOwnerId: string
  ): Promise<ApiResponse<{ transferToken: string; expiresAt: string }>> {
    return this.request<{ transferToken: string; expiresAt: string }>(
      'POST',
      `/packages/${encodeURIComponent(name)}/transfer`,
      { newOwnerId }
    );
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetAt: Date | null } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitResetAt,
    };
  }

  /**
   * Validate partner credentials
   */
  async validateCredentials(): Promise<ApiResponse<{ valid: boolean; partnerId: string; tier: string }>> {
    return this.request<{ valid: boolean; partnerId: string; tier: string }>('GET', '/partner/validate');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Partner-ID': this.config.credentials.partnerId,
      'X-API-Key': this.config.credentials.apiKey,
    };

    if (this.config.credentials.secretKey) {
      // Generate request signature for enhanced security
      const timestamp = Date.now().toString();
      const signature = this.generateSignature(method, endpoint, timestamp, body);
      headers['X-Timestamp'] = timestamp;
      headers['X-Signature'] = signature;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        // Simulate API call (in production, use fetch)
        const response = await this.simulateRequest<T>(method, endpoint, body);

        // Update rate limit tracking
        if (response.rateLimit) {
          this.rateLimitRemaining = response.rateLimit.remaining;
          this.rateLimitResetAt = new Date(response.rateLimit.resetAt);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof RateLimitError) {
          // Don't retry rate limit errors
          throw error;
        }

        if (error instanceof AuthenticationError) {
          // Don't retry auth errors
          throw error;
        }

        // Wait before retry
        if (attempt < this.config.retries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Generate request signature for secure endpoints
   */
  private generateSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    body?: unknown
  ): string {
    const payload = `${method}:${endpoint}:${timestamp}:${body ? JSON.stringify(body) : ''}`;
    // In production, use HMAC-SHA256 with secretKey
    return this.simpleHash(payload + (this.config.credentials.secretKey || ''));
  }

  /**
   * Simple hash function (placeholder - use crypto in production)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Simulate API request (for SDK testing without backend)
   */
  private async simulateRequest<T>(
    method: string,
    endpoint: string,
    _body?: unknown
  ): Promise<ApiResponse<T>> {
    // Simulate network delay
    await this.sleep(50);

    // Return mock data for common endpoints
    if (endpoint.includes('/packages/') && method === 'GET') {
      const packageName = endpoint.split('/packages/')[1]?.split('/')[0];
      if (packageName && !endpoint.includes('/search')) {
        return {
          success: true,
          data: {
            name: decodeURIComponent(packageName),
            version: '1.0.0',
            description: 'A mock package',
            downloads: { total: 1000, lastMonth: 100, lastWeek: 25 },
            certified: true,
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            maintainers: [{ name: 'Partner', email: 'partner@example.com' }],
          } as T,
          rateLimit: {
            remaining: 999,
            limit: 1000,
            resetAt: new Date(Date.now() + 3600000).toISOString(),
          },
        };
      }
    }

    if (endpoint.includes('/search')) {
      return {
        success: true,
        data: {
          packages: [],
          total: 0,
          page: 1,
          pageSize: 20,
        } as T,
        rateLimit: {
          remaining: 999,
          limit: 1000,
          resetAt: new Date(Date.now() + 3600000).toISOString(),
        },
      };
    }

    if (endpoint === '/partner/validate') {
      return {
        success: true,
        data: {
          valid: true,
          partnerId: this.config.credentials.partnerId,
          tier: 'standard',
        } as T,
      };
    }

    return {
      success: true,
      data: {} as T,
      rateLimit: {
        remaining: 999,
        limit: 1000,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a registry client instance
 */
export function createRegistryClient(config: RegistryClientConfig): RegistryClient {
  return new RegistryClient(config);
}
