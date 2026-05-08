/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pmo/shared-types", "@pmo/shared-ui", "@pmo/shared-mocks"]
};

export default nextConfig;
