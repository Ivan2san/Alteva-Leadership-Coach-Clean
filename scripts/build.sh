#!/bin/bash

# Custom build script for production deployment
# Only builds the frontend since tsx can run TypeScript directly

echo "🔨 Starting production build process..."

# Build frontend only
echo "📦 Building frontend..."
npm run build:client

echo "✅ Build completed successfully!"
echo "💡 Server will run directly from TypeScript using tsx"