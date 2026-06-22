import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "../..");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(repoRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pmo/shared-types", "@pmo/shared-ui", "@pmo/shared-mocks"]
};

export default nextConfig;
