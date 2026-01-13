// TODO: Script - fix types

/**
 * 🌱 Database Seed Script - Inicialização do banco de dados
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Create default system settings
    console.log('📄 Creating default system settings...')
    
    const existingSettings = await prisma.system_settings.findUnique({
      where: { key: 'theme_config' }
    })

    if (!existingSettings) {
      await prisma.system_settings.create({
        data: {
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
      console.log('✅ Default system settings created')
    } else {
      console.log('✅ System settings already exist')
    }

    // Create admin user if using email/password auth
    console.log('👤 Checking for admin user...')
    
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@estudio.ai' }
    })

    if (!adminUser) {
      await prisma.users.create({
        data: {
          email: 'admin@estudio.ai',
          name: 'Administrador',
          role: 'admin'
        }
      })
      console.log('✅ Admin user created: admin@estudio.ai')
    } else {
      console.log('✅ Admin user already exists')
    }

    console.log('🎉 Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
