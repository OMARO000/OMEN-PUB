import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // TOR MIRROR: To build static export for .onion hosting:
  // 1. Uncomment output: 'export' below
  // 2. Run: npm run build
  // 3. Output will be in /out directory
  // 4. Copy /out to Hetzner VPS at /var/www/omen-tor/
  // 5. Re-comment output: 'export' before normal deploys

  // Uncomment for Tor static export:
  // output: 'export',
  // distDir: 'out',
};

export default nextConfig;
