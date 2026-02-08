import { logger } from "@/lib/logger";
/**
 * 🔍 DIAGNÓSTICO COMPLETO - API DE UPLOAD PPTX
 * 
 * Este script testa todos os componentes da API de upload:
 * 1. Conexão com banco de dados (Prisma)
 * 2. Parser de PPTX
 * 3. Sistema de arquivos
 * 4. Validação de usuário
 * 
 * Execute: npx tsx test-upload-api.ts
 */

import { prisma as db } from './lib/db';
import { PPTXParser } from './lib/pptx/parser';
import fs from 'fs';
import path from 'path';

logger.info('╔════════════════════════════════════════════════════════════════════╗');
logger.info('║          🔍 DIAGNÓSTICO - API DE UPLOAD PPTX                      ║');
logger.info('╚════════════════════════════════════════════════════════════════════╝\n');

async function testDatabase() {
  logger.info('📊 TESTE 1: CONEXÃO COM BANCO DE DADOS');
  logger.info('─'.repeat(70));
  
  try {
    // Testar conexão
    await db.$connect();
    logger.info('✅ Conexão estabelecida com sucesso\n');
    
    // Testar consulta
    logger.info('🔍 Verificando usuários...');
    const userCount = await db.user.count();
    logger.info(`   Total de usuários: ${userCount}`);
    
    if (userCount === 0) {
      logger.info('⚠️  Nenhum usuário encontrado - criando usuário de teste...');
      const testUser = await db.user.create({
        data: {
          email: 'test@estudioiavideos.com',
          name: 'Usuário de Teste',
          role: 'USER',
        },
      });
      logger.info(`✅ Usuário de teste criado: ${testUser.email} (ID: ${testUser.id})`);
    } else {
      const firstUser = await db.user.findFirst();
      logger.info(`✅ Usuário encontrado: ${firstUser?.email} (ID: ${firstUser?.id})`);
    }
    
    // Testar tabelas do projeto
    logger.info('\n🔍 Verificando estrutura de tabelas...');
    const projectCount = await db.project.count();
    logger.info(`   Projetos existentes: ${projectCount}`);
    
    logger.info('\n✅ BANCO DE DADOS: OK\n');
    return true;
  } catch (error) {
    logger.info('\n❌ ERRO NO BANCO DE DADOS!');
    logger.error('Detalhes:', error);
    logger.info('\n💡 POSSÍVEIS CAUSAS:');
    logger.info('   • DATABASE_URL incorreto no .env');
    logger.info('   • Banco de dados não está rodando');
    logger.info('   • Migrations não foram executadas (npx prisma migrate dev)');
    logger.info('   • Cliente Prisma não foi gerado (npx prisma generate)');
    logger.info('');
    return false;
  }
}

async function testPPTXParser() {
  logger.info('📄 TESTE 2: PARSER DE PPTX');
  logger.info('─'.repeat(70));
  
  try {
    // Verificar se o parser pode ser instanciado
    const parser = new PPTXParser();
    logger.info('✅ PPTXParser instanciado com sucesso');
    
    // Verificar método de validação
    if (typeof PPTXParser.validatePPTX === 'function') {
      logger.info('✅ Método validatePPTX disponível');
    } else {
      logger.info('⚠️  Método validatePPTX não encontrado');
    }
    
    logger.info('\n✅ PARSER PPTX: OK\n');
    return true;
  } catch (error) {
    logger.info('\n❌ ERRO NO PARSER PPTX!');
    logger.error('Detalhes:', error);
    logger.info('\n💡 POSSÍVEIS CAUSAS:');
    logger.info('   • Dependência faltando (npm install)');
    logger.info('   • Arquivo lib/pptx/parser.ts com erro');
    logger.info('');
    return false;
  }
}

async function testFileSystem() {
  logger.info('💾 TESTE 3: SISTEMA DE ARQUIVOS');
  logger.info('─'.repeat(70));
  
  try {
    // Verificar diretório de uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    logger.info(`📁 Diretório de uploads: ${uploadsDir}`);
    
    if (!fs.existsSync(uploadsDir)) {
      logger.info('⚠️  Diretório não existe - criando...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info('✅ Diretório criado');
    } else {
      logger.info('✅ Diretório existe');
    }
    
    // Testar permissão de escrita
    const testFile = path.join(uploadsDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    logger.info('✅ Permissão de escrita OK');
    
    logger.info('\n✅ SISTEMA DE ARQUIVOS: OK\n');
    return true;
  } catch (error) {
    logger.info('\n❌ ERRO NO SISTEMA DE ARQUIVOS!');
    logger.error('Detalhes:', error);
    logger.info('\n💡 POSSÍVEIS CAUSAS:');
    logger.info('   • Sem permissão para criar diretórios');
    logger.info('   • Disco cheio');
    logger.info('   • Caminho inválido');
    logger.info('');
    return false;
  }
}

async function testEnvironmentVariables() {
  logger.info('🔧 TESTE 4: VARIÁVEIS DE AMBIENTE');
  logger.info('─'.repeat(70));
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];
  
  const optionalVars = [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
  ];
  
  let allRequired = true;
  
  logger.info('📋 Variáveis obrigatórias:');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      const preview = varName.includes('SECRET') || varName.includes('KEY') 
        ? `${value.substring(0, 10)}...` 
        : value.substring(0, 30) + '...';
      logger.info(`   ✅ ${varName}: ${preview}`);
    } else {
      logger.info(`   ❌ ${varName}: NÃO DEFINIDA`);
      allRequired = false;
    }
  }
  
  logger.info('\n📋 Variáveis opcionais:');
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      logger.info(`   ✅ ${varName}: configurada`);
    } else {
      logger.info(`   ⚠️  ${varName}: não configurada`);
    }
  }
  
  if (allRequired) {
    logger.info('\n✅ VARIÁVEIS DE AMBIENTE: OK\n');
    return true;
  } else {
    logger.info('\n⚠️  ALGUMAS VARIÁVEIS OBRIGATÓRIAS FALTANDO\n');
    return false;
  }
}

async function runDiagnostics() {
  const results = {
    env: false,
    database: false,
    parser: false,
    filesystem: false,
  };
  
  // Executar testes
  results.env = await testEnvironmentVariables();
  results.database = await testDatabase();
  results.parser = await testPPTXParser();
  results.filesystem = await testFileSystem();
  
  // Resumo final
  logger.info('\n╔════════════════════════════════════════════════════════════════════╗');
  logger.info('║                      📊 RESUMO DO DIAGNÓSTICO                      ║');
  logger.info('╚════════════════════════════════════════════════════════════════════╝\n');
  
  const tests = [
    { name: 'Variáveis de Ambiente', result: results.env },
    { name: 'Banco de Dados', result: results.database },
    { name: 'Parser PPTX', result: results.parser },
    { name: 'Sistema de Arquivos', result: results.filesystem },
  ];
  
  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    const status = test.result ? 'OK' : 'FALHOU';
    logger.info(`${icon} ${test.name.padEnd(25)} ${status}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    logger.info('\n🎉 TODOS OS TESTES PASSARAM!');
    logger.info('   A API de upload deve estar funcionando corretamente.');
    logger.info('   Se ainda assim há erro 500, verifique os logs do servidor.\n');
  } else {
    logger.info('\n⚠️  ALGUNS TESTES FALHARAM!');
    logger.info('   Corrija os problemas acima antes de tentar fazer upload.\n');
  }
  
  // Desconectar do banco
  await db.$disconnect();
}

// Executar diagnóstico
runDiagnostics().catch((error) => {
  logger.error('\n💥 ERRO FATAL NO DIAGNÓSTICO:');
  logger.error(error);
  process.exit(1);
});
