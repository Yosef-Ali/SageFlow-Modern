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
export const config = {
  matcher: [
    "/",
    "/customers/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
}
