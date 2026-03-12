#!/bin/bash
# Script to clean webpack cache and rebuild

echo "🧹 Cleaning webpack cache..."
rm -rf node_modules/.cache
rm -rf dist
rm -rf .cache

echo "✅ Cache cleaned. Rebuilding container..."
docker restart gc-registry-app-frontend-1

echo "⏳ Waiting for webpack to compile..."
sleep 15

echo "✅ Done! Hard refresh your browser."

