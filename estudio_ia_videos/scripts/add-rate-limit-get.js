#!/usr/bin/env node
/**
 * Script to add rate limiting to GET handlers that are missing it.
 * Categorizes routes and applies appropriate limits.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// Category → rate limit per minute
const CATEGORIES = [
  { pattern: /\/health\//,        limit: 120, prefix: 'health' },
  { pattern: /\/health$/,          limit: 120, prefix: 'health' },
  { pattern: /\/_errors\//,        limit: 120, prefix: 'test', skip: true },
  { pattern: /\/test\//,           limit: 120, prefix: 'test', skip: true },
  { pattern: /\/debug/,            limit: 120, prefix: 'debug', skip: true },
  { pattern: /\/docs$/,            limit: 120, prefix: 'docs', skip: true },
  { pattern: /\/placeholder\//,    limit: 120, prefix: 'placeholder', skip: true },
  { pattern: /\/_archived\//,      limit: 60,  prefix: 'archived', skip: true },
  { pattern: /\/auth\//,           limit: 20, prefix: 'auth' },
  { pattern: /\/auth$/,            limit: 20, prefix: 'auth' },
  { pattern: /\/admin\//,          limit: 30, prefix: 'admin' },
  { pattern: /\/user\//,           limit: 30, prefix: 'user' },
  { pattern: /\/billing\//,        limit: 30, prefix: 'billing' },
  { pattern: /\/subscription/,     limit: 30, prefix: 'subscription' },
  { pattern: /\/storage\//,        limit: 30, prefix: 'storage' },
  { pattern: /\/upload/,           limit: 20, prefix: 'upload' },
  { pattern: /\/export\//,         limit: 20, prefix: 'export' },
  { pattern: /\/render\//,         limit: 60, prefix: 'render' },
  { pattern: /\/render-status\//,  limit: 60, prefix: 'render-status' },
  { pattern: /\/video/,            limit: 60, prefix: 'video' },
  { pattern: /\/tts\//,            limit: 30, prefix: 'tts' },
  { pattern: /\/voice/,            limit: 30, prefix: 'voice' },
  { pattern: /\/ai/,               limit: 30, prefix: 'ai' },
  { pattern: /\/analytics\//,      limit: 60, prefix: 'analytics' },
  { pattern: /\/metrics/,          limit: 60, prefix: 'metrics' },
  { pattern: /\/monitoring/,       limit: 60, prefix: 'monitoring' },
  { pattern: /\/projects\//,       limit: 60, prefix: 'projects' },
  { pattern: /\/projects$/,        limit: 60, prefix: 'projects' },
  { pattern: /\/pptx/,             limit: 30, prefix: 'pptx' },
  { pattern: /\/pipeline\//,       limit: 30, prefix: 'pipeline' },
  { pattern: /\/pipeline$/,        limit: 30, prefix: 'pipeline' },
];

const DEFAULT_LIMIT = 60;

function getCategory(relPath) {
  for (const cat of CATEGORIES) {
    if (cat.pattern.test(relPath)) {
      return cat;
    }
  }
  return { limit: DEFAULT_LIMIT, prefix: 'api' };
}

function getRouteName(relPath) {
  // Extract a meaningful prefix from the route path
  const parts = relPath.replace(/^src\/app\/api\//, '').replace(/\/route\.ts$/, '').split('/');
  return parts.filter(p => !p.startsWith('[') && !p.startsWith('_')).join('-') || 'api';
}

function findRouteFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findRouteFiles(fullPath, results);
    } else if (entry.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  
  // Check if it has a GET handler
  if (!content.includes('export async function GET')) return null;
  
  // Check if it already has applyRateLimit
  if (content.includes('applyRateLimit')) return null;
  
  const cat = getCategory(relPath);
  if (cat.skip) return null;
  
  const routeName = getRouteName(relPath);
  const prefix = `${routeName}-get`;
  const limit = cat.limit;
  
  // Step 1: Add import if missing
  const hasRateLimitImport = content.includes("from '@/lib/rate-limit'") || content.includes('from "@/lib/rate-limit"');
  if (!hasRateLimitImport) {
    // Find the last import line
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || (lines[i].includes('import') && lines[i].includes('from'))) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "import { applyRateLimit } from '@/lib/rate-limit';");
      content = lines.join('\n');
    } else {
      // No imports found, add at top after comments
      const lines2 = content.split('\n');
      let insertAt = 0;
      for (let i = 0; i < lines2.length; i++) {
        if (lines2[i].startsWith('//') || lines2[i].startsWith('/*') || lines2[i].startsWith(' *') || lines2[i].startsWith('*/') || lines2[i].trim() === '') {
          insertAt = i + 1;
        } else {
          break;
        }
      }
      lines2.splice(insertAt, 0, "import { applyRateLimit } from '@/lib/rate-limit';");
      content = lines2.join('\n');
    }
  } else {
    // Import exists but we might need to add applyRateLimit to existing import
    if (!content.includes('applyRateLimit')) {
      // Check if import has other items from rate-limit
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/rate-limit['"]/,
        (match, imports) => {
          if (!imports.includes('applyRateLimit')) {
            return `import {${imports}, applyRateLimit } from '@/lib/rate-limit'`;
          }
          return match;
        }
      );
    }
  }
  
  // Step 2: Check if GET handler has req/request parameter
  const getMatch = content.match(/export\s+async\s+function\s+GET\s*\(([^)]*)\)/);
  if (!getMatch) return null;
  
  const params = getMatch[1].trim();
  let reqVarName = 'req';
  
  if (params) {
    // Extract the first parameter name (could be req, request, etc.)
    const firstParam = params.split(',')[0].trim().split(':')[0].trim();
    if (firstParam) {
      reqVarName = firstParam;
    }
  } else {
    // No parameters - need to add req parameter
    // Check if NextRequest is imported
    if (!content.includes('NextRequest')) {
      // Add NextRequest to imports
      if (content.includes("from 'next/server'")) {
        content = content.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]next\/server['"]/,
          (match, imports) => {
            if (!imports.includes('NextRequest')) {
              return `import {${imports}, NextRequest } from 'next/server'`;
            }
            return match;
          }
        );
      } else {
        // Add NextRequest import
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, "import { NextRequest } from 'next/server';");
          content = lines.join('\n');
        }
      }
    }
    
    // Add req parameter to GET function
    content = content.replace(
      /export\s+async\s+function\s+GET\s*\(\)/,
      'export async function GET(req: NextRequest)'
    );
  }
  
  // Step 3: Add rate limiting code after the opening of the GET function body
  // Find the GET function and its body opening
  const getBodyRegex = /export\s+async\s+function\s+GET\s*\([^)]*\)\s*(?::\s*[^{]*)?\{/;
  const bodyMatch = content.match(getBodyRegex);
  if (!bodyMatch) return null;
  
  const insertPos = bodyMatch.index + bodyMatch[0].length;
  
  // Check if there's a try block right after
  const afterBody = content.slice(insertPos).trimStart();
  
  const rateLimitCode = `\n    const rateLimitBlocked = await applyRateLimit(${reqVarName}, '${prefix}', ${limit});\n    if (rateLimitBlocked) return rateLimitBlocked;\n`;
  
  if (afterBody.startsWith('try')) {
    // Insert after the try { 
    const tryBlockRegex = /export\s+async\s+function\s+GET\s*\([^)]*\)\s*(?::\s*[^{]*)?\{\s*try\s*\{/;
    const tryMatch = content.match(tryBlockRegex);
    if (tryMatch) {
      const tryInsertPos = tryMatch.index + tryMatch[0].length;
      content = content.slice(0, tryInsertPos) + rateLimitCode + content.slice(tryInsertPos);
    } else {
      content = content.slice(0, insertPos) + rateLimitCode + content.slice(insertPos);
    }
  } else {
    content = content.slice(0, insertPos) + rateLimitCode + content.slice(insertPos);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return { relPath, prefix, limit };
}

// Main
const files = findRouteFiles(API_DIR);
let modified = 0;
let skipped = 0;
const results = [];

for (const f of files) {
  const result = processFile(f);
  if (result) {
    modified++;
    results.push(result);
  } else {
    skipped++;
  }
}

console.log(`\n=== Rate Limit Addition Complete ===`);
console.log(`Modified: ${modified} files`);
console.log(`Skipped: ${skipped} files (already have RL, no GET, or excluded)`);
console.log(`\nModified files:`);
results.forEach(r => {
  console.log(`  ${r.relPath} → prefix: '${r.prefix}', limit: ${r.limit}/min`);
});
