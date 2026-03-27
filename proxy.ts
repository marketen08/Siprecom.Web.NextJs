import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/dashboard", "/admin", "/profile"]
const publicRoutes = ["/login", "/register", "/"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isPublic = publicRoutes.some(
    (r) => pathname === r || (r !== "/" && pathname.startsWith(r))
  )

  const token = request.cookies.get("accessToken")?.value

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (token && isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
