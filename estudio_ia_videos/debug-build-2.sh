#!/bin/bash
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build > build-debug-2.log 2>&1
