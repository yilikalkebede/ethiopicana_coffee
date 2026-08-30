/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  // Serializes static-page generation. On memory-constrained CI runners
  // (GitHub's hosted runners: 2 vCPU / 7GB RAM, shared with the Postgres
  // service container), Next's default parallel worker pool for this
  // app's 92 routes can hit memory pressure severe enough to crash
  // mid-render, surfacing as wildly different, non-deterministic errors
  // on every run — never reproducible on a well-resourced local machine.
  // Slower, but deterministic; this app's route count doesn't make the
  // slowdown costly. Paired with NODE_OPTIONS=--max-old-space-size in CI.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    remotePatterns: [
      // Add the domain(s) your product photography is served from, e.g.
      // an S3 bucket or a CMS's media host.
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
