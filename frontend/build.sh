#!/bin/bash

# Disable Next.js telemetry
export NEXT_TELEMETRY_DISABLED=1

# Build the application
echo "Building with telemetry disabled..."
npm run build 