import { db } from './index'
import { companies, users } from './schema'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('Starting database seed...')

  // Check if test company exists
  let company = await db.query.companies.findFirst({
    where: eq(companies.email, 'test@sageflow.com'),
  })

  if (!company) {
    // Create a test company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: 'SageFlow Test Company',
        email: 'test@sageflow.com',
        phone: '+251911234567',
        address: 'Addis Ababa, Ethiopia',
        taxId: 'ETH-123456',
        currency: 'ETB',
      })
      .returning()

    company = newCompany
    console.log('Created test company:', company.name)
  } else {
    console.log('Test company already exists:', company.name)
  }

  // Check if test user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, 'admin@sageflow.com'),
  })

  if (existingUser) {
    // Update existing user
    await db
      .update(users)
      .set({
        passwordHash: '$2a$10$eD90Jd6KMoIcJtHAIjp5MebpZQjP9/OXelw6gHK3IZ8Hpp9WdSAw.', // "password"
        updatedAt: new Date(),
      })
      .where(eq(users.email, 'admin@sageflow.com'))

    console.log('Updated test user:', existingUser.email)
  } else {
    // Create a test user (ADMIN)
    const [user] = await db
      .insert(users)
      .values({
        email: 'admin@sageflow.com',
        passwordHash: '$2a$10$eD90Jd6KMoIcJtHAIjp5MebpZQjP9/OXelw6gHK3IZ8Hpp9WdSAw.', // "password"
        name: 'Admin User',
        role: 'ADMIN',
        companyId: company.id,
      })
      .returning()

    console.log('Created test user:', user.email, '(password: password)')
  }

  console.log('\nDatabase seeding completed!')
  console.log('\nYou can now test the application with:')
  console.log('  Email: admin@sageflow.com')
  console.log('  Password: password')

  process.exit(0)
}

main().catch((e) => {
  console.error('Error seeding database:', e)
  process.exit(1)
})
