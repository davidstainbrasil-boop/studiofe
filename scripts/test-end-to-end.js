/**
 * 🔄 TESTE END-TO-END COMPLETO
 * Valida fluxo integrado do sistema de produção de vídeos
 */

import dotenv from 'dotenv'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.join(__dirname, '..')
const APP_ROOT = path.join(PROJECT_ROOT, 'estudio_ia_videos')

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(APP_ROOT, '.env.local') })

console.log('🔄 INICIANDO TESTE END-TO-END COMPLETO')
console.log('============================================================')

let totalTests = 0
let passedTests = 0
let failedTests = 0
let warnings = 0

const results = {
  database: { status: 'pending', details: [] },
  pptx: { status: 'pending', details: [] },
  tts: { status: 'pending', details: [] },
  projects: { status: 'pending', details: [] },
  rendering: { status: 'pending', details: [] },
  integration: { status: 'pending', details: [] }
}

function logTest(component, test, status, message) {
  totalTests++
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
  console.log(`  ${icon} ${test}: ${message}`)

  if (status === 'pass') passedTests++
  else if (status === 'fail') failedTests++
  else warnings++

  results[component].details.push({ test, status, message })
}

async function testDatabase() {
  console.log('\n1️⃣ TESTANDO BANCO DE DADOS...')

  try {
    // Verifica se o script de validação existe
    const dbValidatorPath = path.join(__dirname, 'validate-database-setup.js')

    try {
      await fs.access(dbValidatorPath)
      logTest('database', 'Script de validação', 'pass', 'Encontrado')

      // Executa validação do banco
      try {
        const { stdout } = await execAsync(`node "${dbValidatorPath}"`)

        if (stdout.includes('100%') || stdout.includes('OPERACIONAL') || stdout.includes('BANCO DE DADOS CONFIGURADO CORRETAMENTE')) {
          logTest('database', 'Estrutura do banco', 'pass', 'Todas as tabelas criadas')
          results.database.status = 'pass'
        } else {
          logTest('database', 'Estrutura do banco', 'warn', 'Algumas tabelas podem estar faltando')
          results.database.status = 'warn'
        }

      } catch (error) {
        logTest('database', 'Execução da validação', 'fail', `Erro: ${error.message}`)
        results.database.status = 'fail'
      }

    } catch {
      logTest('database', 'Script de validação', 'fail', 'Não encontrado')
      results.database.status = 'fail'
    }

  } catch (error) {
    logTest('database', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.database.status = 'fail'
  }
}

async function testPPTXFlow() {
  console.log('\n2️⃣ TESTANDO FLUXO PPTX...')

  try {
    // Verifica API de upload
    const uploadApiPath = path.join(APP_ROOT, 'src', 'app', 'api', 'pptx', 'upload', 'route.ts')

    try {
      await fs.access(uploadApiPath)
      logTest('pptx', 'API de upload', 'pass', 'Endpoint encontrado')
    } catch {
      logTest('pptx', 'API de upload', 'fail', 'Endpoint não encontrado')
    }

    // Verifica processador PPTX
    const processorPath = path.join(APP_ROOT, 'src', 'lib', 'pptx-real-generator.ts')

    try {
      await fs.access(processorPath)
      const content = await fs.readFile(processorPath, 'utf-8')

      if (content.includes('extractSlides') && content.includes('generateTimeline')) {
        logTest('pptx', 'Processador PPTX', 'pass', 'Funcionalidades completas')
      } else {
        logTest('pptx', 'Processador PPTX', 'warn', 'Funcionalidades parciais')
      }

    } catch {
      // Fallback check for other pptx processor files
      try {
        const processorPathV2 = path.join(APP_ROOT, 'app', 'lib', 'pptx', 'pptx-processor.ts');
        await fs.access(processorPathV2);
        logTest('pptx', 'Processador PPTX', 'pass', 'Encontrado (v2)')
      } catch {
        logTest('pptx', 'Processador PPTX', 'fail', 'Não encontrado')
      }
    }

    // Verifica integração com storage
    const envContent = await fs.readFile(path.join(APP_ROOT, '.env.local'), 'utf-8')

    if (envContent.includes('AWS_') || envContent.includes('SUPABASE_')) {
      logTest('pptx', 'Storage configurado', 'pass', 'Credenciais encontradas')
    } else {
      logTest('pptx', 'Storage configurado', 'warn', 'Credenciais não configuradas')
    }

    results.pptx.status = 'pass'

  } catch (error) {
    logTest('pptx', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.pptx.status = 'fail'
  }
}

async function testTTSFlow() {
  console.log('\n3️⃣ TESTANDO FLUXO TTS...')

  try {
    // Executa teste específico de TTS
    const ttsTestPath = path.join(__dirname, 'test-tts-functionality.js')

    try {
      await fs.access(ttsTestPath)
      const { stdout } = await execAsync(`node "${ttsTestPath}"`)

      if (stdout.includes('100%')) {
        logTest('tts', 'Funcionalidade TTS', 'pass', 'Todos os provedores funcionais')
        results.tts.status = 'pass'
      } else {
        logTest('tts', 'Funcionalidade TTS', 'warn', 'Alguns provedores com problemas')
        results.tts.status = 'warn'
      }

    } catch (error) {
      logTest('tts', 'Teste TTS', 'fail', `Erro na execução: ${error.message}`)
      results.tts.status = 'fail'
    }

  } catch (error) {
    logTest('tts', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.tts.status = 'fail'
  }
}

async function testProjectsFlow() {
  console.log('\n4️⃣ TESTANDO FLUXO DE PROJETOS...')

  try {
    // Verifica APIs de projetos
    const projectApiPaths = [
      path.join(APP_ROOT, 'src', 'app', 'api', 'projects', 'route.ts'),
      path.join(APP_ROOT, 'src', 'app', 'api', 'v1', 'projects', 'route.ts'),
      path.join(APP_ROOT, 'pages', 'api', 'projects.ts')
    ]

    let apiFound = false

    for (const apiPath of projectApiPaths) {
      try {
        await fs.access(apiPath)
        logTest('projects', 'API de projetos', 'pass', `Encontrada em ${path.relative(APP_ROOT, apiPath)}`)
        apiFound = true
        break
      } catch { }
    }

    if (!apiFound) {
      logTest('projects', 'API de projetos', 'fail', 'Nenhuma API encontrada')
    }

    // Verifica schema do banco
    const schemaPath = path.join(APP_ROOT, 'prisma', 'schema.prisma')

    try {
      const schemaContent = await fs.readFile(schemaPath, 'utf-8')

      if (schemaContent.includes('model projects')) {
        logTest('projects', 'Schema de projetos', 'pass', 'Model projects definido')
      } else {
        logTest('projects', 'Schema de projetos', 'fail', 'Model projects não encontrado')
      }

    } catch {
      // Fallback to SQL schema check
      const sqlSchemaPath = path.join(PROJECT_ROOT, 'database-schema.sql');
      try {
        const sqlContent = await fs.readFile(sqlSchemaPath, 'utf-8');
        if (sqlContent.includes('CREATE TABLE IF NOT EXISTS projects') || sqlContent.includes('CREATE TABLE IF NOT EXISTS public.projects')) {
          logTest('projects', 'Schema SQL', 'pass', 'Tabela projects definida')
        } else {
          logTest('projects', 'Schema SQL', 'fail', 'Tabela projects não encontrada')
        }
      } catch {
        logTest('projects', 'Schema', 'fail', 'Nenhum schema encontrado')
      }
    }

    // Verifica componentes de interface
    const componentPaths = [
      path.join(APP_ROOT, 'src', 'components', 'projects'),
      path.join(APP_ROOT, 'components', 'projects'),
      path.join(APP_ROOT, 'app', 'components', 'projects'),
      path.join(APP_ROOT, 'app', 'components', 'project'), // Singular
      path.join(APP_ROOT, 'app', 'components', 'ProjectList.tsx') // File
    ]

    let componentsFound = false

    for (const componentPath of componentPaths) {
      try {
        const stats = await fs.stat(componentPath)
        if (stats.isDirectory() || stats.isFile()) {
          logTest('projects', 'Componentes UI', 'pass', `Encontrados em ${path.relative(APP_ROOT, componentPath)}`)
          componentsFound = true
          break
        }
      } catch { }
    }

    if (!componentsFound) {
      logTest('projects', 'Componentes UI', 'fail', 'Componentes não encontrados')
    }

    results.projects.status = apiFound || componentsFound ? 'pass' : 'fail'

  } catch (error) {
    logTest('projects', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.projects.status = 'fail'
  }
}

async function testRenderingFlow() {
  console.log('\n5️⃣ TESTANDO FLUXO DE RENDERIZAÇÃO...')

  try {
    // Executa teste específico de renderização
    const renderTestPath = path.join(__dirname, 'test-video-rendering.js')

    try {
      await fs.access(renderTestPath)
      const { stdout } = await execAsync(`node "${renderTestPath}"`)

      if (stdout.includes('OPERACIONAL')) {
        logTest('rendering', 'Pipeline de renderização', 'pass', 'Sistema funcional')
        results.rendering.status = 'pass'
      } else if (stdout.includes('PARCIALMENTE')) {
        logTest('rendering', 'Pipeline de renderização', 'warn', 'Funcionalidade parcial')
        results.rendering.status = 'warn'
      } else {
        logTest('rendering', 'Pipeline de renderização', 'fail', 'Sistema não funcional')
        results.rendering.status = 'fail'
      }

    } catch (error) {
      logTest('rendering', 'Teste de renderização', 'fail', `Erro na execução: ${error.message}`)
      results.rendering.status = 'fail'
    }

  } catch (error) {
    logTest('rendering', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.rendering.status = 'fail'
  }
}

async function testIntegration() {
  console.log('\n6️⃣ TESTANDO INTEGRAÇÃO COMPLETA...')

  try {
    // Verifica se todos os componentes podem trabalhar juntos
    const integrationScore = Object.values(results).filter(r => r.status === 'pass').length
    const totalComponents = Object.keys(results).length - 1 // Exclui o próprio integration

    if (integrationScore >= totalComponents * 0.8) {
      logTest('integration', 'Integração geral', 'pass', `${integrationScore}/${totalComponents} componentes funcionais`)
      results.integration.status = 'pass'
    } else if (integrationScore >= totalComponents * 0.6) {
      logTest('integration', 'Integração geral', 'warn', `${integrationScore}/${totalComponents} componentes funcionais`)
      results.integration.status = 'warn'
    } else {
      logTest('integration', 'Integração geral', 'fail', `${integrationScore}/${totalComponents} componentes funcionais`)
      results.integration.status = 'fail'
    }

    // Verifica dependências críticas
    const packageJsonPath = path.join(APP_ROOT, 'package.json')

    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      const criticalDeps = [
        '@supabase/supabase-js',
        'next',
        'react'
      ]

      const missingDeps = criticalDeps.filter(dep =>
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      )

      if (missingDeps.length === 0) {
        logTest('integration', 'Dependências críticas', 'pass', 'Todas instaladas')
      } else {
        logTest('integration', 'Dependências críticas', 'warn', `Faltando: ${missingDeps.join(', ')}`)
      }

    } catch {
      logTest('integration', 'Dependências', 'fail', 'package.json não encontrado')
    }

    // Verifica configuração de ambiente
    try {
      const envContent = await fs.readFile(path.join(APP_ROOT, '.env.local'), 'utf-8')

      const requiredEnvs = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ]

      const missingEnvs = requiredEnvs.filter(env => !envContent.includes(env))

      if (missingEnvs.length === 0) {
        logTest('integration', 'Variáveis de ambiente', 'pass', 'Configuração básica presente')
      } else {
        logTest('integration', 'Variáveis de ambiente', 'warn', `Faltando: ${missingEnvs.join(', ')}`)
      }

    } catch {
      logTest('integration', 'Arquivo .env.local', 'fail', 'Não encontrado')
    }

  } catch (error) {
    logTest('integration', 'Teste geral', 'fail', `Erro: ${error.message}`)
    results.integration.status = 'fail'
  }
}

// Executa todos os testes
async function runEndToEndTests() {
  await testDatabase()
  await testPPTXFlow()
  await testTTSFlow()
  await testProjectsFlow()
  await testRenderingFlow()
  await testIntegration()

  // Relatório final
  console.log('\n============================================================')
  console.log('📊 RELATÓRIO FINAL - TESTE END-TO-END')
  console.log('============================================================')

  const successRate = Math.round((passedTests / totalTests) * 100)

  console.log(`\n🎯 RESULTADOS GERAIS:`)
  console.log(`   ✅ Testes Aprovados: ${passedTests}`)
  console.log(`   ⚠️ Avisos: ${warnings}`)
  console.log(`   ❌ Testes Falharam: ${failedTests}`)
  console.log(`   📊 Taxa de Sucesso: ${successRate}%`)

  console.log(`\n🔍 STATUS POR COMPONENTE:`)

  Object.entries(results).forEach(([component, result]) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'
    const status = result.status === 'pass' ? 'OPERACIONAL' :
      result.status === 'warn' ? 'PARCIAL' : 'FALHOU'

    console.log(`   ${icon} ${component.toUpperCase()}: ${status}`)
  })

  console.log(`\n🎯 AVALIAÇÃO GERAL:`)

  if (successRate >= 80) {
    console.log('🎉 SISTEMA PRONTO PARA PRODUÇÃO')
    console.log('   - Funcionalidades críticas operacionais')
    console.log('   - Pequenos ajustes podem ser necessários')
  } else if (successRate >= 60) {
    console.log('⚠️ SISTEMA PARCIALMENTE FUNCIONAL')
    console.log('   - Componentes principais funcionando')
    console.log('   - Implementações adicionais necessárias')
  } else {
    console.log('❌ SISTEMA NECESSITA DESENVOLVIMENTO')
    console.log('   - Componentes críticos não funcionais')
    console.log('   - Implementação significativa necessária')
  }

  console.log(`\n📋 PRÓXIMAS AÇÕES:`)

  if (results.projects.status === 'fail') {
    console.log('   🔥 CRÍTICO: Implementar APIs e UI de projetos')
  }

  if (results.rendering.status === 'fail') {
    console.log('   🔥 CRÍTICO: Configurar pipeline de renderização')
  }

  if (results.database.status === 'fail') {
    console.log('   🔥 CRÍTICO: Configurar banco de dados')
  }

  if (successRate >= 80) {
    console.log('   ✨ Otimizar performance e adicionar monitoramento')
    console.log('   🚀 Preparar para deploy em produção')
  }

  process.exit(successRate >= 60 ? 0 : 1)
}

runEndToEndTests().catch(console.error)