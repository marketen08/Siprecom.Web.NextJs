import { NextRequest, NextResponse } from "next/server"
import { COOKIE_SESION_YPF, origenPublico } from "@/lib/ypf-oidc"

export const dynamic = "force-dynamic"

/**
 * GET /api/auth/logout/callback — post-logout del IDP de YPF.
 *
 * Es la URI que YPF registró como post_logout_redirect_uri. El IDP manda al
 * usuario acá después de cerrar la sesión federada; nosotros limpiamos las
 * cookies de SIPRECOM y lo dejamos en el login.
 *
 * Borramos igual aunque el logout local ya las haya limpiado: esta ruta también
 * se alcanza si el usuario cerró sesión desde otra aplicación federada, y ahí
 * nuestras cookies siguen vivas.
 */

// El path "/" tiene que coincidir con el del seteo, si no el Set-Cookie toma el
// default-path (/api/auth/logout) y la cookie real sobrevive.
const EXPIRE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", origenPublico(request.nextUrl.origin)))
  response.cookies.set("accessToken", "", EXPIRE_COOKIE)
  response.cookies.set("refreshToken", "", EXPIRE_COOKIE)
  response.cookies.set(COOKIE_SESION_YPF, "", EXPIRE_COOKIE)
  return response
}
