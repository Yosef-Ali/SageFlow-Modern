import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // If user is authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Otherwise, redirect to welcome page
  redirect('/welcome')
}
