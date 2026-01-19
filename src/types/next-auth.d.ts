import "next-auth"
import { UserRole } from "@/db/schema"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name: string | null
    role: UserRole
    companyId: string
    companyName: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      companyId: string
      companyName: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string | null
    role: string
    companyId: string
    companyName: string
  }
}
