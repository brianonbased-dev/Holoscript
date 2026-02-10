/**
 * HoloScript Edge Deployment Pipeline - Vercel Deployer
 *
 * Deploys HoloScript applications to Vercel.
 * Supports instant rollback via alias, environment variable management,
 * and serverless function configuration.
 */

import {
  BaseDeployer,
  DeployConfig,
  DeployResult,
  DeploymentInfo,
  BuildOutput,
} from './BaseDeployer';

// ============================================================================
// Vercel-Specific Configuration
// ============================================================================

export interface VercelConfig {
  apiToken: string;
  teamId?: string;
  orgId?: string;
}

export interface VercelEnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type?: 'plain' | 'encrypted' | 'secret';
}

export interface VercelServerlessConfig {
  runtime: 'nodejs18.x' | 'nodejs20.x' | 'edge';
  memory?: number;
  maxDuration?: number;
  regions?: string[];
}

interface VercelApiResponse {
  id?: string;
  url?: string;
  readyState?: string;
  alias?: string[];
  deployments?: Array<{
    uid: string;
    url: string;
    state: string;
    created: number;
    meta?: { environment?: string };
    regions?: string[];
  }>;
  error?: { message: string; code: string };
}

// ============================================================================
// Vercel Deployer
// ============================================================================

export class VercelDeployer extends BaseDeployer {
  private apiToken: string;
  private teamId?: string;
  private orgId?: string;
  private projectName: string = '';

  // Deployment history (in-memory)
  private deploymentHistory: DeploymentInfo[] = [];

  // Environment variables managed for the project
  private envVars: VercelEnvironmentVariable[] = [];

  // Serverless config
  private serverlessConfig: VercelServerlessConfig = {
    runtime: 'nodejs20.x',
    memory: 1024,
    maxDuration: 30,
  };

  // API base URL (configurable for testing)
  private apiBaseUrl: string;

  constructor(config: VercelConfig) {
    super('vercel');
    this.apiToken = config.apiToken;
    this.teamId = config.teamId;
    this.orgId = config.orgId;
    this.apiBaseUrl = 'https://api.vercel.com';
  }

  /**
   * Override the API base URL (useful for testing).
   */
  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }

  /**
   * Set serverless function configuration.
   */
  setServerlessConfig(config: Partial<VercelServerlessConfig>): void {
    this.serverlessConfig = { ...this.serverlessConfig, ...config };
  }

  /**
   * Add an environment variable for the project.
   */
  addEnvVar(envVar: VercelEnvironmentVariable): void {
    // Remove existing entry for same key + targets
    this.envVars = this.envVars.filter(v => v.key !== envVar.key);
    this.envVars.push(envVar);
  }

  /**
   * Get all configured environment variables.
   */
  getEnvVars(): VercelEnvironmentVariable[] {
    return [...this.envVars];
  }

  /**
   * Remove an environment variable by key.
   */
  removeEnvVar(key: string): boolean {
    const before = this.envVars.length;
    this.envVars = this.envVars.filter(v => v.key !== key);
    return this.envVars.length < before;
  }

  /**
   * Deploy a HoloScript project to Vercel.
   */
  async deploy(config: DeployConfig, buildOutput: BuildOutput): Promise<DeployResult> {
    this.validateConfig(config);
    this.projectName = config.projectName;

    const startTime = Date.now();
    const deploymentId = this.generateDeploymentId();

    this.emit('deploy:start', config);

    try {
      // Step 1: Ensure Vercel project exists
      await this.ensureProject(config);

      // Step 2: Sync environment variables
      await this.syncEnvVars(config);

      // Step 3: Upload build files
      await this.uploadFiles(config, buildOutput);

      // Step 4: Create deployment
      const deployUrl = await this.createDeployment(config, deploymentId);

      // Step 5: Configure serverless functions
      await this.configureServerless(config);

      // Step 6: Set up alias (custom domain) if provided
      if (config.customDomain) {
        await this.setAlias(config, deploymentId);
      }

      // Step 7: Configure edge headers
      if (config.edgeConfig) {
        await this.configureEdge(config);
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
   * Rollback to a previous deployment via alias swap.
   * Vercel supports instant rollback by re-aliasing a previous deployment.
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
      // Vercel instant rollback: re-alias the old deployment to production
      const teamQuery = this.teamId ? `?teamId=${this.teamId}` : '';
      await this.apiRequest(
        'POST',
        `/v2/deployments/${deploymentId}/aliases${teamQuery}`,
        { alias: `${this.projectName}.vercel.app` }
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
      const teamQuery = this.teamId ? `&teamId=${this.teamId}` : '';
      const response = await this.apiRequest(
        'GET',
        `/v6/deployments?projectId=${this.projectName}${teamQuery}`
      );

      if (response.deployments) {
        return response.deployments.map(d => ({
          id: d.uid,
          url: `https://${d.url}`,
          environment: d.meta?.environment || 'production',
          status: this.mapVercelState(d.state),
          createdAt: new Date(d.created),
          regions: d.regions || [],
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
    return `https://${this.projectName}-git-${safeBranch}.vercel.app`;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Ensure the Vercel project exists.
   */
  private async ensureProject(config: DeployConfig): Promise<void> {
    const teamQuery = this.teamId ? `?teamId=${this.teamId}` : '';

    try {
      await this.apiRequest('GET', `/v9/projects/${config.projectName}${teamQuery}`);
    } catch {
      // Project doesn't exist; create it
      await this.apiRequest('POST', `/v9/projects${teamQuery}`, {
        name: config.projectName,
        framework: null,
        publicSource: false,
      });
    }
  }

  /**
   * Sync environment variables to the Vercel project.
   */
  private async syncEnvVars(config: DeployConfig): Promise<void> {
    if (this.envVars.length === 0) return;

    // Stubbed: In production, POST to /v10/projects/:projectId/env
    // for each environment variable.
    void config;
  }

  /**
   * Upload build files to Vercel.
   */
  private async uploadFiles(_config: DeployConfig, _buildOutput: BuildOutput): Promise<void> {
    // Stubbed: In production, this would:
    // 1. Compute SHA1 hashes for each file
    // 2. POST /v2/files to upload each file
    // 3. Create deployment referencing the uploaded files
  }

  /**
   * Create a deployment on Vercel.
   */
  private async createDeployment(config: DeployConfig, _deploymentId: string): Promise<string> {
    // Stubbed: In production this creates the deployment via API.
    const url = config.customDomain
      ? `https://${config.customDomain}`
      : `https://${config.projectName}.vercel.app`;

    return url;
  }

  /**
   * Configure serverless function settings.
   */
  private async configureServerless(_config: DeployConfig): Promise<void> {
    // Stubbed: In production, this writes vercel.json or uses the API
    // to configure serverless function runtime, memory, and max duration.
    //
    // vercel.json:
    // {
    //   "functions": {
    //     "api/**/*.js": {
    //       "runtime": this.serverlessConfig.runtime,
    //       "memory": this.serverlessConfig.memory,
    //       "maxDuration": this.serverlessConfig.maxDuration
    //     }
    //   }
    // }
  }

  /**
   * Set an alias (custom domain) on the deployment.
   */
  private async setAlias(config: DeployConfig, deploymentId: string): Promise<void> {
    if (!config.customDomain) return;

    // Stubbed: POST /v2/deployments/:id/aliases
    void deploymentId;
  }

  /**
   * Configure edge-specific settings (cache-control, headers).
   */
  private async configureEdge(_config: DeployConfig): Promise<void> {
    // Stubbed: In production, this writes a vercel.json headers config:
    // {
    //   "headers": [
    //     {
    //       "source": "/(.*)",
    //       "headers": [
    //         { "key": "Cache-Control", "value": config.edgeConfig.cacheControl },
    //         ...Object.entries(config.edgeConfig.headers).map(...)
    //       ]
    //     }
    //   ]
    // }
  }

  /**
   * Make a Vercel API request. Stubbed for real HTTP calls.
   */
  private async apiRequest(
    method: string,
    endpoint: string,
    _body?: unknown
  ): Promise<VercelApiResponse> {
    // Stubbed: In production, this would use fetch():
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
      id: this.generateDeploymentId(),
      url: `${this.projectName}.vercel.app`,
      readyState: 'READY',
    };
  }

  /**
   * Map Vercel deployment state to our status enum.
   */
  private mapVercelState(
    state: string
  ): 'building' | 'deploying' | 'ready' | 'failed' {
    switch (state) {
      case 'READY':
        return 'ready';
      case 'BUILDING':
      case 'INITIALIZING':
        return 'building';
      case 'DEPLOYING':
        return 'deploying';
      case 'ERROR':
      case 'CANCELED':
        return 'failed';
      default:
        return 'ready';
    }
  }
}
