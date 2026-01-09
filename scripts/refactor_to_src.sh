#!/bin/bash
set -x

# Navigate to project root
cd estudio_ia_videos

# Create directories if they don't exist
mkdir -p src/app src/components/ui src/lib src/hooks src/types

# Remove garbage files from app
rm -rf app/node_modules app/package.json app/package-lock.json app/tsconfig.json app/tailwind.config.ts app/next.config.js app/next.config.production.js

# Backup app globals.css if it exists
if [ -f app/globals.css ]; then
    mv app/globals.css app/globals.css.backup
fi

# Move ROOT level folders to src (if they contain files)
# Check if directory exists and is not empty before moving
if [ -d components ] && [ "$(ls -A components)" ]; then
    mv components/* src/components/
fi

if [ -d lib ] && [ "$(ls -A lib)" ]; then
    mv lib/* src/lib/
fi

# hooks might not exist in root
if [ -d hooks ] && [ "$(ls -A hooks)" ]; then
    mv hooks/* src/hooks/
fi

if [ -d types ] && [ "$(ls -A types)" ]; then
    mv types/* src/types/
fi

# Move APP level folders to src (Centralization strategy)
if [ -d app/components ] && [ "$(ls -A app/components)" ]; then
    mv app/components/* src/components/
    rm -rf app/components
fi

if [ -d app/lib ] && [ "$(ls -A app/lib)" ]; then
    mv app/lib/* src/lib/
    rm -rf app/lib
fi

if [ -d app/hooks ] && [ "$(ls -A app/hooks)" ]; then
    mv app/hooks/* src/hooks/
    rm -rf app/hooks
fi

if [ -d app/types ] && [ "$(ls -A app/types)" ]; then
    mv app/types/* src/types/
    rm -rf app/types
fi

# Now move the rest of app/ into src/app/
# We use rsync to merge directories
if [ -d app ]; then
    rsync -av --remove-source-files app/ src/app/
    rm -rf app
fi

echo "Migration script completed successfully"
