import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // You can add additional route protection logic here
    // For example, role-based access control
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
)

// Protect application routes
// Excludes public pages: /welcome, /login, /register
export const config = {
  matcher: [
    "/((?!welcome|login|register|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
