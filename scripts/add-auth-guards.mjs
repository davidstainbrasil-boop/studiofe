#!/usr/bin/env node
/**
 * Script para adicionar auth guards (getServerSession) em rotas sem autenticação.
 * 
 * Regras:
 * 1. Só atua em rotas com POST/PUT/DELETE/PATCH
 * 2. Pula rotas que já têm auth (getServerSession, requireAdmin, requireAuth, supabase.auth.getUser)
 * 3. Pula rotas em auth/, webhook, health, test, _archived, debug, public
 * 4. Adiciona import de getServerSession + authOptions
 * 5. Adiciona guard no início de cada handler POST/PUT/DELETE/PATCH
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const API_DIR = join(process.cwd(), 'estudio_ia_videos/src/app/api');
const SKIP_PATTERNS = ['/auth/', '/webhook', '/health', '/test', '/_archived', '/debug', '/public'];
const AUTH_PATTERNS = ['getServerSession', 'requireAdmin', 'requireAuth', 'supabase.auth.getUser'];
const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Imports to add
const AUTH_IMPORT_TS = `import { getServerSession } from 'next-auth';\nimport { authOptions } from '@lib/auth';`;

function findRouteFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

function shouldSkip(filePath) {
  const rel = relative(API_DIR, filePath);
  return SKIP_PATTERNS.some(p => rel.includes(p.replace(/^\//, '')));
}

function hasAuth(content) {
  return AUTH_PATTERNS.some(p => content.includes(p));
}

function hasMutationHandler(content) {
  return MUTATION_METHODS.some(m => content.includes(`export async function ${m}`));
}

function addAuthGuard(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const rel = relative(API_DIR, filePath);
  
  if (shouldSkip(filePath) || hasAuth(content) || !hasMutationHandler(content)) {
    return { skipped: true, file: rel };
  }
  
  let modified = false;
  
  // Step 1: Add auth imports if not present
  if (!content.includes('getServerSession')) {
    // Find the best place to add imports - after existing imports
    // Strategy: find the last import line, add auth imports after it
    const lines = content.split('\n');
    let lastImportIdx = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('import ') || lines[i].trimStart().startsWith("import '")) {
        lastImportIdx = i;
        // Handle multi-line imports
        if (!lines[i].includes(';') && !lines[i].includes("'") && !lines[i].includes('"')) {
          // Multi-line import - find the closing
          while (i < lines.length && !lines[i].includes(';') && !lines[i].includes("from ")) {
            i++;
          }
          lastImportIdx = i;
        }
      }
    }
    
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, AUTH_IMPORT_TS);
      content = lines.join('\n');
      modified = true;
    } else {
      // No imports found - add at the top (after any initial comments/jsdoc)
      const firstCodeIdx = lines.findIndex(l => l.trim() && !l.trimStart().startsWith('*') && !l.trimStart().startsWith('/**') && !l.trimStart().startsWith('//'));
      if (firstCodeIdx >= 0) {
        lines.splice(firstCodeIdx, 0, AUTH_IMPORT_TS);
        content = lines.join('\n');
        modified = true;
      }
    }
  }
  
  // Step 2: Add guard to each mutation handler
  for (const method of MUTATION_METHODS) {
    // Match various handler signatures
    const patterns = [
      // Standard: export async function POST(request: NextRequest) {
      new RegExp(`(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s*)(try\\s*\\{)`, 'g'),
      // Without try: export async function POST(request: NextRequest) {
      new RegExp(`(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s*)(?!.*getServerSession)`, 'g'),
    ];
    
    // Try pattern 1: handler with try block
    const tryPattern = new RegExp(
      `(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s*)(try\\s*\\{)`,
      'g'
    );
    
    if (tryPattern.test(content)) {
      content = content.replace(
        new RegExp(
          `(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s*)(try\\s*\\{)`,
          'g'
        ),
        (match, funcDecl, indent, tryBlock) => {
          // Check if guard already exists between function declaration and try
          if (match.includes('getServerSession')) return match;
          return `${funcDecl}\n${indent}const session = await getServerSession(authOptions);\n${indent}if (!session?.user?.id) {\n${indent}  return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });\n${indent}}\n\n${indent}${tryBlock}`;
        }
      );
      modified = true;
    } else {
      // Pattern 2: handler without try (directly starts with code)
      const directPattern = new RegExp(
        `(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s+)(?!.*getServerSession)([^\\n]+)`,
        'g'
      );
      
      if (directPattern.test(content)) {
        content = content.replace(
          new RegExp(
            `(export async function ${method}\\([^)]*\\)\\s*\\{)\\s*\\n(\\s+)(?!.*getServerSession)([^\\n]+)`,
            'g'
          ),
          (match, funcDecl, indent, nextLine) => {
            if (match.includes('getServerSession')) return match;
            return `${funcDecl}\n${indent}const session = await getServerSession(authOptions);\n${indent}if (!session?.user?.id) {\n${indent}  return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });\n${indent}}\n\n${indent}${nextLine}`;
          }
        );
        modified = true;
      }
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    return { skipped: false, file: rel, modified: true };
  }
  
  return { skipped: false, file: rel, modified: false, reason: 'no pattern matched' };
}

// Main
const files = findRouteFiles(API_DIR);
const results = { modified: [], skipped: [], failed: [] };

for (const f of files) {
  try {
    const result = addAuthGuard(f);
    if (result.skipped) {
      results.skipped.push(result.file);
    } else if (result.modified) {
      results.modified.push(result.file);
    } else {
      results.failed.push(`${result.file} (${result.reason})`);
    }
  } catch (err) {
    results.failed.push(`${relative(API_DIR, f)} (${err.message})`);
  }
}

console.log(`\n✅ Modified: ${results.modified.length}`);
results.modified.forEach(f => console.log(`  + ${f}`));

console.log(`\n⏭️  Skipped (already has auth or excluded): ${results.skipped.length}`);

console.log(`\n⚠️  Failed/No match: ${results.failed.length}`);
results.failed.forEach(f => console.log(`  ! ${f}`));
