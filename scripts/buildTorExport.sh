#!/bin/bash
set -e

echo "Building OMEN static export for Tor mirror..."

# Temporarily enable static export
sed -i 's|// output: .export.,|output: "export",|g' next.config.ts
sed -i 's|// distDir: .out.,|distDir: "out",|g' next.config.ts

# Build
npm run build

# Restore next.config.ts
sed -i 's|output: "export",|// output: "export",|g' next.config.ts
sed -i 's|distDir: "out",|// distDir: "out",|g' next.config.ts

echo "Static export complete. Files in /out"
echo "Next step: rsync /out to Hetzner VPS"
echo "rsync -avz out/ user@YOUR_HETZNER_IP:/var/www/omen-tor/"
