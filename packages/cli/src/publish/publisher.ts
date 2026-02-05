/**
 * Package Publisher
 *
 * Sprint 6 Priority 1: holoscript publish command
 *
 * Handles uploading packages to the HoloScript registry.
 */

import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  PublishValidator,
  validateForPublish,
  type ValidationResult,
} from './validator';
import { PackagePackager, packPackage, type PackageResult } from './packager';

// ============================================================================
// Types
// ============================================================================

export interface PublishOptions {
  /** Registry URL */
  registry?: string;
  /** Authentication token */
  token?: string;
  /** Allow publishing without tests passing */
  skipTests?: boolean;
  /** Skip lint validation */
  skipLint?: boolean;
  /** Allow console.log statements */
  allowConsole?: boolean;
  /** Don't actually publish, just validate and pack */
  dryRun?: boolean;
  /** Force publish even with warnings */
  force?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Tag for the published version (default: "latest") */
  tag?: string;
  /** Access level: public or restricted */
  access?: 'public' | 'restricted';
  /** OTP code for 2FA */
  otp?: string;
}

export interface PublishResult {
  success: boolean;
  packageName?: string;
  version?: string;
  tarballPath?: string;
  registryUrl?: string;
  errors?: string[];
  warnings?: string[];
}

interface RegistryResponse {
  success: boolean;
  message?: string;
  error?: string;
  url?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REGISTRY = 'https://registry.holoscript.dev';
const TOKEN_FILE = '.holoscript-token';

// ============================================================================
// Publisher
// ============================================================================

export class PackagePublisher {
  private cwd: string;
  private options: PublishOptions;

  constructor(cwd: string = process.cwd(), options: PublishOptions = {}) {
    this.cwd = cwd;
    this.options = {
      registry: options.registry || process.env.HOLOSCRIPT_REGISTRY || DEFAULT_REGISTRY,
      tag: options.tag || 'latest',
      access: options.access || 'public',
      ...options,
    };
  }

  /**
   * Publish package to registry
   */
  async publish(): Promise<PublishResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate package
    console.log('\x1b[36m📋 Validating package...\x1b[0m');

    const validation = await validateForPublish(this.cwd, {
      skipTests: this.options.skipTests,
      skipLint: this.options.skipLint,
      allowConsole: this.options.allowConsole,
      verbose: this.options.verbose,
    });

    if (!validation.valid) {
      console.log('\n\x1b[31m✗ Validation failed:\x1b[0m');
      for (const error of validation.errors) {
        console.log(`  \x1b[31m• [${error.code}] ${error.message}\x1b[0m`);
        if (error.file) console.log(`    \x1b[2m${error.file}${error.line ? `:${error.line}` : ''}\x1b[0m`);
        if (error.fix) console.log(`    \x1b[33mFix: ${error.fix}\x1b[0m`);
      }
      return {
        success: false,
        errors: validation.errors.map((e) => e.message),
      };
    }

    // Show warnings
    if (validation.warnings.length > 0) {
      console.log('\n\x1b[33m⚠ Warnings:\x1b[0m');
      for (const warning of validation.warnings) {
        console.log(`  \x1b[33m• [${warning.code}] ${warning.message}\x1b[0m`);
        warnings.push(warning.message);
      }

      if (!this.options.force && !this.options.dryRun) {
        console.log('\n\x1b[2mUse --force to publish anyway\x1b[0m');
      }
    }

    console.log('\x1b[32m✓ Validation passed\x1b[0m\n');

    // 2. Pack package
    console.log('\x1b[36m📦 Creating package tarball...\x1b[0m');

    const packResult = await packPackage(this.cwd, {
      verbose: this.options.verbose,
      dryRun: this.options.dryRun,
    });

    if (!packResult.success) {
      console.log(`\x1b[31m✗ Failed to create package: ${packResult.error}\x1b[0m`);
      return {
        success: false,
        errors: [packResult.error || 'Unknown packaging error'],
      };
    }

    // Get package info
    const pkgJson = JSON.parse(readFileSync(join(this.cwd, 'package.json'), 'utf-8'));
    const { name, version } = pkgJson;

    if (this.options.dryRun) {
      console.log(`\x1b[32m✓ Would publish ${name}@${version}\x1b[0m`);
      console.log(`\x1b[2m  Files: ${packResult.files?.length || 0}\x1b[0m`);
      console.log(`\x1b[2m  Size: ${this.formatSize(packResult.size || 0)}\x1b[0m`);

      if (this.options.verbose && packResult.files) {
        console.log('\n\x1b[2mFiles to include:\x1b[0m');
        for (const file of packResult.files.slice(0, 20)) {
          console.log(`  \x1b[2m${file}\x1b[0m`);
        }
        if (packResult.files.length > 20) {
          console.log(`  \x1b[2m... and ${packResult.files.length - 20} more\x1b[0m`);
        }
      }

      return {
        success: true,
        packageName: name,
        version,
        warnings,
      };
    }

    console.log(`\x1b[32m✓ Created ${packResult.tarballPath}\x1b[0m`);
    console.log(`\x1b[2m  Size: ${this.formatSize(packResult.size || 0)}\x1b[0m\n`);

    // 3. Upload to registry
    console.log('\x1b[36m🚀 Publishing to registry...\x1b[0m');

    const token = this.getAuthToken();
    if (!token) {
      console.log('\x1b[31m✗ Not logged in. Run "holoscript login" first.\x1b[0m');
      return {
        success: false,
        errors: ['Authentication required. Run "holoscript login" first.'],
        tarballPath: packResult.tarballPath,
      };
    }

    try {
      const uploadResult = await this.uploadToRegistry(
        packResult.tarballPath!,
        name,
        version,
        token
      );

      if (!uploadResult.success) {
        console.log(`\x1b[31m✗ Publish failed: ${uploadResult.error}\x1b[0m`);
        return {
          success: false,
          errors: [uploadResult.error || 'Unknown upload error'],
          tarballPath: packResult.tarballPath,
        };
      }

      console.log(`\x1b[32m✓ Published ${name}@${version}\x1b[0m`);
      console.log(`\x1b[2m  ${this.options.registry}/packages/${name}\x1b[0m\n`);

      // Cleanup tarball
      if (packResult.tarballPath && existsSync(packResult.tarballPath)) {
        unlinkSync(packResult.tarballPath);
      }

      return {
        success: true,
        packageName: name,
        version,
        registryUrl: `${this.options.registry}/packages/${name}`,
        tarballPath: packResult.tarballPath,
        warnings,
      };
    } catch (err: any) {
      console.log(`\x1b[31m✗ Publish failed: ${err.message}\x1b[0m`);
      return {
        success: false,
        errors: [err.message],
        tarballPath: packResult.tarballPath,
      };
    }
  }

  /**
   * Preview what would be published
   */
  async preview(): Promise<PublishResult> {
    return this.publish();
  }

  // ============================================================================
  // Registry Communication
  // ============================================================================

  private async uploadToRegistry(
    tarballPath: string,
    name: string,
    version: string,
    token: string
  ): Promise<RegistryResponse> {
    const tarball = readFileSync(tarballPath);
    const encodedName = encodeURIComponent(name);

    // Build publish URL
    const url = `${this.options.registry}/-/package/${encodedName}/publish`;

    // Build request body
    const boundary = '----HoloScriptPublish' + Date.now();
    const body = this.buildMultipartBody(boundary, {
      'package': {
        filename: `${name}-${version}.tgz`,
        contentType: 'application/gzip',
        content: tarball,
      },
      'metadata': {
        contentType: 'application/json',
        content: Buffer.from(JSON.stringify({
          name,
          version,
          tag: this.options.tag,
          access: this.options.access,
          otp: this.options.otp,
        })),
      },
    });

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'holoscript-cli/1.0.0',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message,
        url: result.url,
      };
    } catch (err: any) {
      // Handle network errors gracefully
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return {
          success: false,
          error: `Unable to connect to registry: ${this.options.registry}`,
        };
      }
      return {
        success: false,
        error: err.message,
      };
    }
  }

  private buildMultipartBody(
    boundary: string,
    parts: Record<string, { filename?: string; contentType: string; content: Buffer }>
  ): Buffer {
    const chunks: Buffer[] = [];

    for (const [name, part] of Object.entries(parts)) {
      chunks.push(Buffer.from(`--${boundary}\r\n`));

      if (part.filename) {
        chunks.push(Buffer.from(
          `Content-Disposition: form-data; name="${name}"; filename="${part.filename}"\r\n`
        ));
      } else {
        chunks.push(Buffer.from(
          `Content-Disposition: form-data; name="${name}"\r\n`
        ));
      }

      chunks.push(Buffer.from(`Content-Type: ${part.contentType}\r\n\r\n`));
      chunks.push(part.content);
      chunks.push(Buffer.from('\r\n'));
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    return Buffer.concat(chunks);
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  private getAuthToken(): string | null {
    // 1. Check options
    if (this.options.token) {
      return this.options.token;
    }

    // 2. Check environment variable
    if (process.env.HOLOSCRIPT_TOKEN) {
      return process.env.HOLOSCRIPT_TOKEN;
    }

    // 3. Check token file in home directory
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const tokenPath = join(homeDir, TOKEN_FILE);

    if (existsSync(tokenPath)) {
      try {
        const tokenData = JSON.parse(readFileSync(tokenPath, 'utf-8'));
        return tokenData.token || null;
      } catch {
        return null;
      }
    }

    // 4. Check token file in current directory
    const localTokenPath = join(this.cwd, TOKEN_FILE);
    if (existsSync(localTokenPath)) {
      try {
        const tokenData = JSON.parse(readFileSync(localTokenPath, 'utf-8'));
        return tokenData.token || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createPublisher(cwd?: string, options?: PublishOptions): PackagePublisher {
  return new PackagePublisher(cwd, options);
}

export async function publishPackage(
  cwd?: string,
  options?: PublishOptions
): Promise<PublishResult> {
  const publisher = createPublisher(cwd, options);
  return publisher.publish();
}
