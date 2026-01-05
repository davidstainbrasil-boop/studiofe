#!/usr/bin/env tsx
/**
 * Script para testar conexão com o banco de dados PostgreSQL
 * Uso: tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...\n');

  try {
    // Teste 1: Conexão básica
    console.log('1️⃣ Testando conexão básica...');
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Teste 2: Verificar tabelas
    console.log('2️⃣ Verificando tabelas...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log(`✅ ${tables.length} tabelas encontradas:`);
    tables.forEach((t, i) => console.log(`   ${i + 1}. ${t.tablename}`));
    console.log('');

    // Teste 3: Verificar usuários
    console.log('3️⃣ Verificando usuários iniciais...');
    const userCount = await prisma.user.count();
    console.log(`✅ ${userCount} usuários encontrados`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        take: 5,
      });
      users.forEach((u) => {
        console.log(`   - ${u.email} (${u.role || 'user'})`);
      });
    }
    console.log('');

    // Teste 4: Testar função auxiliar
    console.log('4️⃣ Testando funções auxiliares...');
    try {
      const result = await prisma.$queryRaw<Array<{ get_user_stats: unknown }>>`
        SELECT get_user_stats(id) as get_user_stats 
        FROM users 
        LIMIT 1;
      `;
      console.log('✅ Função get_user_stats() funcionando');
      console.log(`   Resultado: ${JSON.stringify(result[0]?.get_user_stats, null, 2)}`);
    } catch (error) {
      console.log('⚠️  Função get_user_stats() não disponível (pode precisar executar schema)');
    }
    console.log('');

    // Teste 5: Testar view
    console.log('5️⃣ Testando views...');
    try {
      const viewResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM v_projects_with_user;
      `;
      console.log(`✅ View v_projects_with_user funcionando (${viewResult[0]?.count || 0} registros)`);
    } catch (error) {
      console.log('⚠️  Views não disponíveis (pode precisar executar schema)');
    }
    console.log('');

    // Teste 6: Performance - contar índices
    console.log('6️⃣ Verificando índices...');
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname;
    `;
    console.log(`✅ ${indexes.length} índices criados`);
    console.log('');

    console.log('============================================');
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('============================================');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`   - Tabelas: ${tables.length}`);
    console.log(`   - Índices: ${indexes.length}`);
    console.log(`   - Usuários: ${userCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao testar conexão:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar testes
testConnection()
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
