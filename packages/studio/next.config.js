/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for Railway/Docker (skip on Windows — symlinks need admin)
  ...(process.platform !== 'win32' && { output: 'standalone' }),
  transpilePackages: ['@holoscript/core', 'three'],
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(glb|gltf|hdr)$/,
      type: 'asset/resource',
    });

    // Stub out optional peer deps from @holoscript/core that aren't needed for Studio
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Alias optional dependencies to empty modules to avoid build failures
    config.resolve.alias = {
      ...config.resolve.alias,
      '@pixiv/three-vrm': false,
      puppeteer: false,
      playwright: false,
    };

    return config;
  },
};

module.exports = nextConfig;
