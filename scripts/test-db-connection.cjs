const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mvp_admin:MvpVideo2025@Secure!@localhost:5432/mvp_videos'
});

async function testConnection() {
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    const client = await pool.connect();
    
    console.log('✅ Conexão estabelecida!\n');
    
    // Testar query
    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as usuarios,
        (SELECT COUNT(*) FROM projects) as projetos,
        (SELECT COUNT(*) FROM nr_courses) as cursos_nr,
        (SELECT COUNT(*) FROM nr_modules) as modulos_nr,
        (SELECT COUNT(*) FROM templates) as templates,
        (SELECT COUNT(*) FROM system_settings) as configuracoes
    `);
    
    console.log('📊 Dados no Banco:');
    console.log('   Usuários:', result.rows[0].usuarios);
    console.log('   Projetos:', result.rows[0].projetos);
    console.log('   Cursos NR:', result.rows[0].cursos_nr);
    console.log('   Módulos NR:', result.rows[0].modulos_nr);
    console.log('   Templates:', result.rows[0].templates);
    console.log('   Configurações:', result.rows[0].configuracoes);
    
    // Listar cursos NR
    const courses = await client.query('SELECT code, name, duration_minutes FROM nr_courses ORDER BY code');
    console.log('\n📚 Cursos NR Disponíveis:');
    courses.rows.forEach(c => {
      console.log('   •', c.code, '-', c.name, '(' + c.duration_minutes + ' min)');
    });
    
    // Listar usuários
    const users = await client.query('SELECT email, role, is_active FROM users');
    console.log('\n👤 Usuários:');
    users.rows.forEach(u => {
      console.log('   •', u.email, '(' + u.role + ')');
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testConnection();
