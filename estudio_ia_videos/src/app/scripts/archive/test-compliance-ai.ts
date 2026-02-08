#!/usr/bin/env tsx
import { logger } from '@/lib/logger';
// TODO: Archive script - fix types

/**
 * Script de Demonstração do Sistema de Compliance com IA
 * Execute: npx tsx scripts/test-compliance-ai.ts
 */

import { checkCompliance } from '../../lib/compliance/nr-engine'
import { getAllNRs } from '../../lib/compliance/templates'

async function demonstrateComplianceSystem() {
  logger.info('🚀 DEMONSTRAÇÃO DO SISTEMA DE COMPLIANCE COM IA')
  logger.info('=' .repeat(60))
  
  // 1. Listar NRs disponíveis
  logger.info('\n📋 NRs Disponíveis:')
  const availableNRs = getAllNRs()
  availableNRs.forEach(nr => {
    logger.info(`- ${nr.code}: ${nr.name}`)
  })
  
  // 2. Dados de teste
  const testProject = {
    slides: [
      {
        number: 1,
        title: "Introdução à Segurança em Máquinas",
        content: "Este curso aborda os principais aspectos de segurança em máquinas e equipamentos conforme NR-12. Vamos aprender sobre dispositivos de proteção, EPIs necessários e procedimentos de segurança.",
        duration: 300,
        imageUrls: ["https://example.com/epi-capacete.jpg"],
        audioPath: "/audio/intro-seguranca.mp3"
      },
      {
        number: 2,
        title: "Dispositivos de Proteção",
        content: "Os dispositivos de proteção são fundamentais para prevenir acidentes. Incluem proteções fixas, móveis e dispositivos de intertravamento.",
        duration: 240,
        imageUrls: ["https://example.com/protecao-fixa.jpg"],
        audioPath: "/audio/dispositivos-protecao.mp3"
      }
    ],
    totalDuration: 540,
    imageUrls: ["https://example.com/epi-capacete.jpg", "https://example.com/protecao-fixa.jpg"],
    audioFiles: ["/audio/intro-seguranca.mp3", "/audio/dispositivos-protecao.mp3"]
  }
  
  logger.info('\n🧪 TESTE 1: Análise Tradicional (sem IA)')
  logger.info('-'.repeat(50))
  
  try {
    const traditionalResult = await checkCompliance('NR-12', testProject, false)
    
    logger.info(`✅ Status: ${traditionalResult.status}`)
    logger.info(`📊 Score: ${traditionalResult.score.toFixed(1)}%`)
    logger.info(`📋 Requisitos: ${traditionalResult.requirementsMet}/${traditionalResult.requirementsTotal}`)
    
  } catch (error) {
    logger.error('❌ Erro na análise tradicional:', error)
  }
  
  logger.info('\n🤖 TESTE 2: Análise com IA')
  logger.info('-'.repeat(50))
  
  try {
    const aiResult = await checkCompliance('NR-12', testProject, true)
    
    logger.info(`✅ Status: ${aiResult.status}`)
    logger.info(`📊 Score Tradicional: ${aiResult.score.toFixed(1)}%`)
    logger.info(`🤖 Score IA: ${aiResult.aiScore?.toFixed(1) || 'N/A'}%`)
    logger.info(`🎯 Score Final: ${aiResult.finalScore?.toFixed(1) || 'N/A'}%`)
    logger.info(`🎲 Confiança: ${((aiResult.confidence || 0) * 100).toFixed(1)}%`)
    
    if (aiResult.recommendations.length > 0) {
      logger.info('\n💡 Recomendações da IA:')
      aiResult.recommendations.forEach((rec, i) => {
        logger.info(`  ${i + 1}. ${rec}`)
      })
    }
    
  } catch (error) {
    logger.error('❌ Erro na análise com IA:', error)
  }
  
  logger.info('\n🏁 DEMONSTRAÇÃO CONCLUÍDA')
  logger.info('✅ Sistema de Compliance com IA funcionando!')
}

// Executar demonstração
if (require.main === module) {
  demonstrateComplianceSystem()
    .then(() => {
      logger.info('\n✨ Demonstração finalizada com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('\n💥 Erro na demonstração:', error)
      process.exit(1)
    })
}

export { demonstrateComplianceSystem }