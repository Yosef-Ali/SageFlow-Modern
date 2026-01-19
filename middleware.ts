import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that should redirect to /dashboard/*
const legacyRoutes = [
  '/customers',
  '/invoices',
  '/payments',
  '/reports',
  '/inventory',
  '/banking',
]

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl

    // Redirect legacy routes to /dashboard/*
    for (const route of legacyRoutes) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        const newPath = `/dashboard${pathname}`
        const url = req.nextUrl.clone()
        url.pathname = newPath
        return NextResponse.redirect(url)
      }
    }

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
// Excludes public pages: /welcome, /login, /register and the root /
export const config = {
  matcher: [
    "/((?!welcome|login|register|api/auth|_next/static|_next/image|favicon.ico|$).*)",
  ],
}
