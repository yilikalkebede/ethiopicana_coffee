/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  // Constrains Next's build-time worker parallelism. On CPU-constrained CI
  // runners (GitHub's hosted runners are 2 cores), Next's default worker
  // pool can race writing shared webpack chunks during static generation,
  // surfacing as "Cannot find module './XXXX.js'" — a well-documented
  // Next.js build bug, not an app issue. Single-threaded build is slower
  // but deterministic; this app's route count doesn't make that costly.
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
