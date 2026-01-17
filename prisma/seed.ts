import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create a test company
  let company = await prisma.company.findFirst({
    where: { email: 'test@sageflow.com' },
  })

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'SageFlow Test Company',
        email: 'test@sageflow.com',
        phone: '+251911234567',
        address: 'Addis Ababa, Ethiopia',
        taxId: 'ETH-123456',
        currency: 'ETB',
      },
    })
    console.log('✓ Created test company:', company.name)
  } else {
    console.log('✓ Test company already exists:', company.name)
  }

  // Create a test user (ADMIN)
  const user = await prisma.user.upsert({
    where: { email: 'admin@sageflow.com' },
    update: {},
    create: {
      email: 'admin@sageflow.com',
      passwordHash: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u', // "password"
      name: 'Admin User',
      role: 'ADMIN',
      companyId: company.id,
    },
  })

  console.log('✓ Created test user:', user.email, '(password: password)')

  console.log('\n✨ Database seeding completed!')
  console.log('\nYou can now test the customer management feature with:')
  console.log('  Email: admin@sageflow.com')
  console.log('  Password: password')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
