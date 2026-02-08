#!/usr/bin/env node
/**
 * Fix GET() handlers (no params) in files that already have applyRateLimit for POST.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

function findRouteFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) findRouteFiles(fullPath, results);
    else if (entry.name === 'route.ts') results.push(fullPath);
  }
  return results;
}

function getRouteName(relPath) {
  const parts = relPath.replace(/^src\/app\/api\//, '').replace(/\/route\.ts$/, '').split('/');
  return parts.filter(p => !p.startsWith('[') && !p.startsWith('_')).join('-') || 'api';
}

const files = findRouteFiles(API_DIR);
let fixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  
  // Only process files with parameterless GET AND that already have applyRateLimit (from POST)
  if (!content.includes('export async function GET()')) continue;
  if (!content.includes('applyRateLimit')) continue;
  
  // Skip test/archived routes
  if (relPath.includes('_errors') || relPath.includes('/test/') || relPath.includes('_archived')) continue;
  
  const routeName = getRouteName(relPath);
  const prefix = `${routeName}-get`;
  
  // Ensure NextRequest is imported
  if (!content.includes('NextRequest')) {
    if (content.includes("from 'next/server'")) {
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]next\/server['"]/,
        (m, imports) => imports.includes('NextRequest') ? m : `import {${imports}, NextRequest } from 'next/server'`
      );
    }
  }
  
  // Replace GET() with GET(req: NextRequest) and add rate limit
  content = content.replace(
    /export\s+async\s+function\s+GET\(\)\s*\{/,
    `export async function GET(req: NextRequest) {\n    const rateLimitBlocked = await applyRateLimit(req, '${prefix}', 60);\n    if (rateLimitBlocked) return rateLimitBlocked;\n`
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${relPath} → '${prefix}'`);
  fixed++;
}

console.log(`\nFixed ${fixed} parameterless GET handlers`);
