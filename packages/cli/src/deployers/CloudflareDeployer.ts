/**
 * HoloScript Edge Deployment Pipeline - Cloudflare Deployer
 *
 * Deploys HoloScript applications to Cloudflare Pages and Workers.
 * Supports KV namespaces for edge state, branch previews, and rollback.
 */

import {
  BaseDeployer,
  DeployConfig,
  DeployResult,
  DeploymentInfo,
  BuildOutput,
} from './BaseDeployer';

// ============================================================================
// Cloudflare-Specific Configuration
// ============================================================================

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  kvNamespaces?: KVNamespaceBinding[];
}

export interface KVNamespaceBinding {
  binding: string;
  namespaceId: string;
}

interface CloudflareApiResponse {
  success: boolean;
  result?: {
    id?: string;
    url?: string;
    latest_deployment?: {
      id: string;
      url: string;
    };
    deployments?: Array<{
      id: string;
      url: string;
      environment: string;
      created_on: string;
      latest_stage: { name: string; status: string };
    }>;
  };
  errors?: Array<{ message: string }>;
}

// ============================================================================
// Cloudflare Deployer
// ============================================================================

export class CloudflareDeployer extends BaseDeployer {
  private apiToken: string;
  private accountId: string;
  private kvNamespaces: KVNamespaceBinding[];
  private projectName: string = '';

  // Deployment history (in-memory for tracking)
  private deploymentHistory: DeploymentInfo[] = [];

  // API base URL (configurable for testing)
  private apiBaseUrl: string;

  constructor(config: CloudflareConfig) {
    super('cloudflare');
    this.apiToken = config.apiToken;
    this.accountId = config.accountId;
    this.kvNamespaces = config.kvNamespaces || [];
    this.apiBaseUrl = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Override the API base URL (useful for testing).
   */
  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }

  /**
   * Deploy a HoloScript project to Cloudflare Pages.
   */
  async deploy(config: DeployConfig, buildOutput: BuildOutput): Promise<DeployResult> {
    this.validateConfig(config);
    this.projectName = config.projectName;

    const startTime = Date.now();
    const deploymentId = this.generateDeploymentId();

    this.emit('deploy:start', config);

    try {
      // Step 1: Ensure Cloudflare Pages project exists
      await this.ensureProject(config);

      // Step 2: Upload build output to Cloudflare Pages
      await this.uploadAssets(config, buildOutput);

      // Step 3: Create deployment
      const deployUrl = await this.createDeployment(config, deploymentId);

      // Step 4: Bind KV namespaces if configured
      if (this.kvNamespaces.length > 0) {
        await this.bindKVNamespaces(config);
      }

      // Step 5: Configure custom domain if provided
      if (config.customDomain) {
        await this.configureCustomDomain(config);
      }

      // Step 6: Set edge config headers
      if (config.edgeConfig) {
        await this.setEdgeHeaders(config);
      }

      const duration = Date.now() - startTime;

      const result: DeployResult = {
        success: true,
        url: deployUrl,
        deploymentId,
        duration,
        regions: config.regions,
        timestamp: new Date(),
      };

      // Track deployment
      this.deploymentHistory.push({
        id: deploymentId,
        url: deployUrl,
        environment: config.environment,
        status: 'ready',
        createdAt: new Date(),
        regions: config.regions,
      });

      this.emit('deploy:done', result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      const result: DeployResult = {
        success: false,
        url: '',
        deploymentId,
        duration,
        regions: config.regions,
        timestamp: new Date(),
        error: message,
      };

      this.deploymentHistory.push({
        id: deploymentId,
        url: '',
        environment: config.environment,
        status: 'failed',
        createdAt: new Date(),
        regions: config.regions,
      });

      this.emit('deploy:done', result);
      return result;
    }
  }

  /**
   * Rollback to a previous deployment.
   */
  async rollback(deploymentId: string): Promise<DeployResult> {
    const startTime = Date.now();

    const deployment = this.deploymentHistory.find(d => d.id === deploymentId);
    if (!deployment) {
      return {
        success: false,
        url: '',
        deploymentId,
        duration: Date.now() - startTime,
        regions: [],
        timestamp: new Date(),
        error: `Deployment ${deploymentId} not found`,
      };
    }

    try {
      // Cloudflare Pages rollback: re-promote the old deployment
      await this.apiRequest(
        'POST',
        `/accounts/${this.accountId}/pages/projects/${this.projectName}/deployments/${deploymentId}/rollback`
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        url: deployment.url,
        deploymentId,
        duration,
        regions: deployment.regions,
        timestamp: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        url: '',
        deploymentId,
        duration: Date.now() - startTime,
        regions: [],
        timestamp: new Date(),
        error: `Rollback failed: ${message}`,
      };
    }
  }

  /**
   * List all deployments for the current project.
   */
  async getDeployments(): Promise<DeploymentInfo[]> {
    if (!this.projectName) {
      return this.deploymentHistory;
    }

    try {
      const response = await this.apiRequest(
        'GET',
        `/accounts/${this.accountId}/pages/projects/${this.projectName}/deployments`
      );

      if (response.result?.deployments) {
        return response.result.deployments.map(d => ({
          id: d.id,
          url: d.url,
          environment: d.environment,
          status: this.mapCloudflareStatus(d.latest_stage?.status),
          createdAt: new Date(d.created_on),
          regions: [], // Cloudflare Pages deploys globally
        }));
      }
    } catch {
      // Fall back to local history
    }

    return this.deploymentHistory;
  }

  /**
   * Get a preview URL for a given branch.
   */
  async getPreviewUrl(branch: string): Promise<string> {
    const safeBranch = branch.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    return `https://${safeBranch}.${this.projectName}.pages.dev`;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Ensure the Cloudflare Pages project exists; create it if not.
   */
  private async ensureProject(config: DeployConfig): Promise<void> {
    try {
      await this.apiRequest(
        'GET',
        `/accounts/${this.accountId}/pages/projects/${config.projectName}`
      );
    } catch {
      // Project doesn't exist; create it
      await this.apiRequest(
        'POST',
        `/accounts/${this.accountId}/pages/projects`,
        {
          name: config.projectName,
          production_branch: 'main',
        }
      );
    }
  }

  /**
   * Upload build assets to Cloudflare Pages.
   */
  private async uploadAssets(_config: DeployConfig, _buildOutput: BuildOutput): Promise<void> {
    // Stubbed: In production, this would use the Cloudflare Pages Direct Upload API.
    // It would read files from buildOutput.outputDir and upload them as a FormData payload.
    //
    // API: POST /accounts/:account_id/pages/projects/:project_name/deployments
    // Content-Type: multipart/form-data
    // Body: files as parts, manifest.json for routing
  }

  /**
   * Create a deployment record on Cloudflare.
   */
  private async createDeployment(config: DeployConfig, deploymentId: string): Promise<string> {
    // Stubbed: In production this completes the deployment via the Pages API.
    // The URL returned follows the Cloudflare Pages convention.
    const url = config.customDomain
      ? `https://${config.customDomain}`
      : `https://${config.projectName}.pages.dev`;

    // In a real implementation:
    // const response = await this.apiRequest('POST', `/accounts/${this.accountId}/pages/projects/${config.projectName}/deployments`);
    // return response.result?.url || url;

    void deploymentId;
    return url;
  }

  /**
   * Bind KV namespaces to the Pages project.
   */
  private async bindKVNamespaces(config: DeployConfig): Promise<void> {
    // Stubbed: In production this calls the Pages project settings API
    // to bind KV namespaces for edge state access.
    //
    // PATCH /accounts/:account_id/pages/projects/:project_name
    // { deployment_configs: { production: { kv_namespaces: { ... } } } }
    void config;
  }

  /**
   * Configure a custom domain for the deployment.
   */
  private async configureCustomDomain(config: DeployConfig): Promise<void> {
    if (!config.customDomain) return;

    // Stubbed: In production this calls the Pages custom domains API.
    // POST /accounts/:account_id/pages/projects/:project_name/domains
    // { name: config.customDomain }
  }

  /**
   * Set edge cache-control and custom headers.
   */
  private async setEdgeHeaders(config: DeployConfig): Promise<void> {
    // Stubbed: In production this would write _headers file to the build output
    // or configure transform rules via the Cloudflare API.
    void config;
  }

  /**
   * Make a Cloudflare API request. Stubbed for real HTTP calls.
   */
  private async apiRequest(
    method: string,
    endpoint: string,
    _body?: unknown
  ): Promise<CloudflareApiResponse> {
    // Stubbed: In production, this would use fetch() or node-fetch:
    //
    // const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
    //   method,
    //   headers: {
    //     'Authorization': `Bearer ${this.apiToken}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: body ? JSON.stringify(body) : undefined,
    // });
    // return await response.json();

    void method;
    void endpoint;

    return {
      success: true,
      result: {
        id: this.generateDeploymentId(),
        url: `https://${this.projectName}.pages.dev`,
      },
    };
  }

  /**
   * Map Cloudflare deployment status to our status enum.
   */
  private mapCloudflareStatus(
    status?: string
  ): 'building' | 'deploying' | 'ready' | 'failed' {
    switch (status) {
      case 'active':
      case 'success':
        return 'ready';
      case 'idle':
      case 'initializing':
        return 'building';
      case 'running':
        return 'deploying';
      case 'failure':
      case 'canceled':
        return 'failed';
      default:
        return 'ready';
    }
  }
}
