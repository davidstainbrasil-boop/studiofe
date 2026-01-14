import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.users.findUnique({ where: { email: 'admin@estudio.ai' } })
  if (!user) throw new Error('User not found')
  
  const projectId = randomUUID();
  const project = await prisma.projects.create({
    data: {
      id: projectId,
      userId: user.id,
      name: 'Test Project',
      type: 'custom',
      status: 'draft'
    }
  })
  console.log('PROJECT_ID:', project.id)
  console.log('USER_ID:', user.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())