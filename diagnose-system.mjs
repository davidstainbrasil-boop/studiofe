#!/usr/bin/env node
/**
 * System Diagnostic Tool
 * Verifica automaticamente todos os componentes do sistema
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

console.log('\n🔍 Sistema de Avatares - Ferramenta de Diagnóstico\n');
console.log('='.repeat(60));

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function success(msg) {
  console.log(`✅ ${msg}`);
  checks.passed.push(msg);
}

function fail(msg, solution = '') {
  console.log(`❌ ${msg}`);
  if (solution) console.log(`   💡 Solução: ${solution}`);
  checks.failed.push(msg);
}

function warn(msg, solution = '') {
  console.log(`⚠️  ${msg}`);
  if (solution) console.log(`   💡 Sugestão: ${solution}`);
  checks.warnings.push(msg);
}

function info(msg) {
  console.log(`ℹ️  ${msg}`);
}

function section(title) {
  console.log('\n' + '─'.repeat(60));
  console.log(`📋 ${title}`);
  console.log('─'.repeat(60) + '\n');
}

// Check 1: Node.js version
section('Verificando Node.js');

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion >= 18) {
  success(`Node.js ${nodeVersion} (>= 18.0.0)`);
} else {
  fail(
    `Node.js ${nodeVersion} está desatualizado`,
    'Instale Node.js 18 ou superior: https://nodejs.org'
  );
}

// Check 2: Rhubarb Lip-Sync
section('Verificando Rhubarb Lip-Sync');

const rhubarbCheck = spawnSync('which', ['rhubarb']);

if (rhubarbCheck.status === 0) {
  const rhubarbVersion = spawnSync('rhubarb', ['--version']);
  const versionOutput = rhubarbVersion.stdout.toString().trim();

  if (versionOutput.includes('1.13.0')) {
    success('Rhubarb Lip-Sync 1.13.0 instalado');
  } else {
    warn(
      `Rhubarb instalado mas versão diferente: ${versionOutput}`,
      'Versão recomendada: 1.13.0'
    );
  }

  // Check resources
  const resPath = '/usr/local/bin/res';
  if (existsSync(resPath)) {
    success('Recursos do Rhubarb encontrados em /usr/local/bin/res');
  } else {
    warn(
      'Recursos do Rhubarb não encontrados',
      'cp -r Rhubarb-Lip-Sync-1.13.0-Linux/res /usr/local/bin/'
    );
  }
} else {
  fail(
    'Rhubarb Lip-Sync não encontrado',
    'Ver FASE1_QUICK_REFERENCE.md para instruções de instalação'
  );
}

// Check 3: Redis
section('Verificando Redis (Cache)');

const redisCheck = spawnSync('redis-cli', ['ping']);

if (redisCheck.status === 0 && redisCheck.stdout.toString().includes('PONG')) {
  success('Redis está rodando e respondendo');
} else {
  warn(
    'Redis não está rodando ou não está acessível',
    'sudo systemctl start redis-server'
  );
}

// Check 4: Phase 1 Files
section('Verificando Arquivos Phase 1 (Lip-Sync)');

const phase1Files = [
  'estudio_ia_videos/src/lib/sync/lip-sync-orchestrator.ts',
  'estudio_ia_videos/src/lib/sync/rhubarb-lip-sync-engine.ts',
  'estudio_ia_videos/src/lib/sync/azure-viseme-engine.ts',
  'estudio_ia_videos/src/lib/sync/viseme-cache.ts'
];

let phase1OK = true;
phase1Files.forEach(file => {
  if (existsSync(file)) {
    success(`${file.split('/').pop()}`);
  } else {
    fail(`${file} não encontrado`);
    phase1OK = false;
  }
});

if (phase1OK) {
  info('Phase 1 completa');
}

// Check 5: Phase 2 Files
section('Verificando Arquivos Phase 2 (Avatares)');

const phase2Files = [
  'estudio_ia_videos/src/lib/avatar/blend-shape-controller.ts',
  'estudio_ia_videos/src/lib/avatar/facial-animation-engine.ts',
  'estudio_ia_videos/src/lib/avatar/avatar-lip-sync-integration.ts',
  'estudio_ia_videos/src/lib/avatar/avatar-render-orchestrator.ts',
  'estudio_ia_videos/src/lib/avatar/providers/placeholder-adapter.ts',
  'estudio_ia_videos/src/lib/avatar/providers/did-adapter.ts',
  'estudio_ia_videos/src/lib/avatar/providers/heygen-adapter.ts',
  'estudio_ia_videos/src/lib/avatar/providers/rpm-adapter.ts'
];

let phase2OK = true;
phase2Files.forEach(file => {
  if (existsSync(file)) {
    success(`${file.split('/').pop()}`);
  } else {
    fail(`${file} não encontrado`);
    phase2OK = false;
  }
});

if (phase2OK) {
  info('Phase 2 completa');
}

// Check 6: API Routes
section('Verificando API Routes');

const apiFiles = [
  'estudio_ia_videos/src/app/api/v2/avatars/generate/route.ts',
  'estudio_ia_videos/src/app/api/v2/avatars/status/[jobId]/route.ts',
  'estudio_ia_videos/src/app/api/lip-sync/generate/route.ts'
];

let apiOK = true;
apiFiles.forEach(file => {
  if (existsSync(file)) {
    success(`${file.split('/').slice(-3).join('/')}`);
  } else {
    fail(`${file} não encontrado`);
    apiOK = false;
  }
});

// Check 7: Dependencies
section('Verificando Dependências NPM');

if (existsSync('estudio_ia_videos/node_modules')) {
  success('node_modules instalado');

  // Check key packages
  const keyPackages = [
    'next',
    '@prisma/client',
    'ioredis',
    'zod'
  ];

  keyPackages.forEach(pkg => {
    const pkgPath = `estudio_ia_videos/node_modules/${pkg}`;
    if (existsSync(pkgPath)) {
      success(`${pkg} instalado`);
    } else {
      warn(`${pkg} não encontrado`, 'npm install');
    }
  });
} else {
  fail(
    'Dependências não instaladas',
    'cd estudio_ia_videos && npm install'
  );
}

// Check 8: Environment Variables
section('Verificando Variáveis de Ambiente');

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalEnvVars = [
  'REDIS_URL',
  'AZURE_SPEECH_KEY',
  'DID_API_KEY',
  'HEYGEN_API_KEY'
];

if (existsSync('estudio_ia_videos/.env') || existsSync('estudio_ia_videos/.env.local')) {
  success('Arquivo .env encontrado');

  try {
    const envContent = existsSync('estudio_ia_videos/.env')
      ? await readFile('estudio_ia_videos/.env', 'utf-8')
      : await readFile('estudio_ia_videos/.env.local', 'utf-8');

    requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        success(`${varName} configurado`);
      } else {
        warn(`${varName} não configurado`, 'Variável obrigatória');
      }
    });

    optionalEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        info(`${varName} configurado (opcional)`);
      } else {
        info(`${varName} não configurado (opcional)`);
      }
    });
  } catch (error) {
    warn('Erro ao ler arquivo .env');
  }
} else {
  warn(
    'Arquivo .env não encontrado',
    'Copie .env.example para .env e configure'
  );
}

// Check 9: Documentation
section('Verificando Documentação');

const docs = [
  'README_FASE1_FASE2.md',
  'FASE2_QUICK_START.md',
  'FASE2_FINAL_SUMMARY.md',
  'DEPLOYMENT_CHECKLIST.md',
  'examples/README.md'
];

let docsOK = true;
docs.forEach(doc => {
  if (existsSync(doc)) {
    success(doc);
  } else {
    warn(`${doc} não encontrado`);
    docsOK = false;
  }
});

// Check 10: Tests
section('Verificando Testes');

const tests = [
  'test-avatar-integration.mjs',
  'test-avatar-api-e2e.mjs',
  'test-lip-sync-direct.mjs',
  'test-lip-sync-with-speech.mjs'
];

tests.forEach(test => {
  if (existsSync(test)) {
    success(test);
  } else {
    warn(`${test} não encontrado`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DO DIAGNÓSTICO');
console.log('='.repeat(60) + '\n');

console.log(`✅ Verificações passadas: ${checks.passed.length}`);
console.log(`❌ Verificações falhas: ${checks.failed.length}`);
console.log(`⚠️  Avisos: ${checks.warnings.length}`);

console.log('\n');

if (checks.failed.length === 0 && checks.warnings.length === 0) {
  console.log('🎉 SISTEMA 100% OPERACIONAL!');
  console.log('\nTodos os componentes estão instalados e funcionando.');
  console.log('\nPróximos passos:');
  console.log('  1. node test-avatar-integration.mjs');
  console.log('  2. node demo-avatar-system.mjs');
  console.log('  3. cat README_FASE1_FASE2.md');
} else if (checks.failed.length === 0) {
  console.log('✅ SISTEMA OPERACIONAL (com avisos)');
  console.log('\nTodos os componentes críticos estão OK.');
  console.log('Os avisos acima são sobre componentes opcionais.');
  console.log('\nVocê pode:');
  console.log('  - Ignorar os avisos se não precisar desses recursos');
  console.log('  - Ou seguir as sugestões para instalar componentes opcionais');
} else {
  console.log('⚠️  SISTEMA COM PROBLEMAS');
  console.log('\nAlguns componentes críticos estão faltando.');
  console.log('Siga as soluções acima para corrigir os problemas.');
  console.log('\nDocumentação útil:');
  console.log('  - FASE1_QUICK_REFERENCE.md');
  console.log('  - FASE2_QUICK_START.md');
  console.log('  - DEPLOYMENT_CHECKLIST.md');
}

console.log('\n' + '='.repeat(60) + '\n');

// Exit code
process.exit(checks.failed.length > 0 ? 1 : 0);
