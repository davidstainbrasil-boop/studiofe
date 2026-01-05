const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
    path.join(process.cwd(), 'app/api'),
    path.join(process.cwd(), 'app/dashboard')
];

const SERVER_SYMBOLS = [
    'getSupabaseForRequest',
    'createServerSupabaseClient',
    'supabaseAdmin',
    'createClient' // Only if used in server context, but safer to move all generic 'createClient' to server if it matches services import
    // Note: createBrowserSupabaseClient was aliased in index.ts, so createClient might be the server one.
    // In index.ts: export { createClient, ... } from '../supabase/server';
    // So yes, createClient exported from services is SERVER.
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let hasChanges = false;
    let addedServerImport = false;

    // Check if imports from @/lib/services
    if (!content.includes("@/lib/services'")) {
        if (!content.includes('@/lib/services"')) return;
    }

    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/lib\/services['"]/g;

    content = content.replace(importRegex, (match, importsBody) => {
        let imports = importsBody.split(',').map(s => s.trim()).filter(s => s.length > 0);
        let keptImports = [];
        let movedImports = [];

        imports.forEach(imp => {
            const symbol = imp.split(' as ')[0].trim(); // Handle aliases if any, though usually simple imports
            // But we match strictly on the name used in import list
            if (SERVER_SYMBOLS.some(s => imp === s || imp.startsWith(s + ' as '))) {
                movedImports.push(imp);
            } else {
                keptImports.push(imp);
            }
        });

        if (movedImports.length > 0) {
            hasChanges = true;
            // Add server import statement
            // We'll append it after the replacement or handle it globally?
            // Safer to return the kept imports and append a marker we swap later, or just return kept string
            // and append connection string?
            // Actually, we can return:
            // import { kept... } from '@/lib/services';
            // import { moved... } from '@/lib/services/server';

            let result = '';
            if (keptImports.length > 0) {
                result += `import { ${keptImports.join(', ')} } from '@/lib/services'`;
            }
            // We want to avoid duplicate server imports if multiple matches (rare for one module)
            // But regex handles each match.
            if (movedImports.length > 0) {
                if (result) result += '\n';
                result += `import { ${movedImports.join(', ')} } from '@/lib/services/server'`;
            }
            return result;
        }
        return match;
    });

    if (hasChanges && content !== originalContent) {
        console.log(`Fixing: ${filePath}`);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

TARGET_DIRS.forEach(dir => walkDir(dir));
console.log('Finished fixing imports.');
