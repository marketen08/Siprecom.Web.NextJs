import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const protectedRoutes = ["/dashboard", "/admin", "/profile"]
const publicRoutes = ["/login", "/register", "/"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir que todas las rutas de NextAuth pasen sin redirección.
  // Esto incluye:
  //  - /api/auth/callback/ibm-verify  → callback OIDC de IBM Verify
  //  - /api/auth/signin/*             → inicio de flujos OAuth
  //  - /api/auth/ibm-verify-finalize  → puente de cookies post-OIDC
  //  - /api/auth/session              → check de sesión de NextAuth
  //  - /api/auth/signout              → logout de NextAuth
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isPublic = publicRoutes.some(
    (r) => pathname === r || (r !== "/" && pathname.startsWith(r))
  )

  // La protección de rutas usa la cookie `accessToken` (seteada tanto por el
  // login local/Microsoft como por ibm-verify-finalize).
  // Si en el futuro se quiere verificar la sesión NextAuth como fallback,
  // se puede usar getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).
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
