// Importing env files here to validate on build
import "./src/env.mjs";
import "@repo/auth/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@repo/api", "@repo/auth", "@repo/db"],
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: ["image.tmdb.org"],
    formats: ["image/avif", "image/webp"],
  },
};

export default config;
