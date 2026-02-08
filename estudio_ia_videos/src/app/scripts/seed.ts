import { logger } from '@/lib/logger';
// TODO: Script - fix types

/**
 * 🌱 Database Seed Script - Inicialização do banco de dados
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  logger.info('🌱 Starting database seeding...')

  try {
    // Create default system settings
    logger.info('📄 Creating default system settings...')
    
    const existingSettings = await prisma.system_settings.findUnique({
      where: { key: 'theme_config' }
    })

    if (!existingSettings) {
      await prisma.system_settings.create({
        data: {
          id: randomUUID(),
          key: 'theme_config',
          value: {
            primaryColor: "#0066cc",
            secondaryColor: "#f0f0f0",
            backgroundColor: "#ffffff",
            textColor: "#333333",
            companyName: "Estúdio IA de Vídeos",
            subtitle: "Transforme apresentações em vídeos inteligentes",
            fontFamily: "Inter",
            documentTitle: "Estúdio IA de Vídeos",
            version: "1.0",
            isActive: true
          }
        }
      })
      logger.info('✅ Default system settings created')
    } else {
      logger.info('✅ System settings already exist')
    }

    // Create admin user if using email/password auth
    logger.info('👤 Checking for admin user...')
    
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@estudio.ai' }
    })

    if (!adminUser) {
      await prisma.users.create({
        data: {
          id: randomUUID(),
          email: 'admin@estudio.ai',
          name: 'Administrador',
          role: 'admin'
        }
      })
      logger.info('✅ Admin user created: admin@estudio.ai')
    } else {
      logger.info('✅ Admin user already exists')
    }

    logger.info('🎉 Database seeding completed successfully!')

  } catch (error) {
    logger.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    logger.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
