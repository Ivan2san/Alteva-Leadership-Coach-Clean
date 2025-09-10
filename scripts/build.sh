#!/usr/bin/env bash
set -Eeuo pipefail

echo "🔨 Starting production build..."
echo "📦 Running: npm run build"
npm run build

echo "✅ Build completed successfully!"
