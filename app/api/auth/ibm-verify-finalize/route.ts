/**
 * /api/auth/ibm-verify-finalize
 *
 * Puente entre la sesión de NextAuth (con los tokens de Siprecom embebidos)
 * y el sistema de cookies httpOnly que usa toda la infraestructura proxy
 * existente de Siprecom (backend-fetch.ts + api-client.ts).
 *
 * Por qué este endpoint existe:
 *  - NextAuth almacena los tokens en su propia cookie cifrada (next-auth.session-token).
 *  - backend-fetch.ts lee las cookies `accessToken` y `refreshToken` para
 *    autenticar llamadas al backend .NET.
 *  - Este endpoint lee la sesión de NextAuth (server-side), extrae los tokens
 *    de Siprecom y los set como cookies httpOnly separadas → toda la
 *    infraestructura proxy funciona sin ningún cambio.
 *
 * Flujo:
 *  1. NextAuth completa el callback OIDC y redirige a callbackUrl=/api/auth/ibm-verify-finalize
 *  2. Este handler lee la sesión NextAuth (incluye siprecomAccessToken/siprecomRefreshToken)
 *  3. Setea las cookies accessToken y refreshToken como httpOnly, Secure, SameSite=Lax
 *  4. Redirige al dashboard
 *
 * Seguridad:
 *  - La sesión NextAuth se valida con NEXTAUTH_SECRET antes de extraer los tokens.
 *  - Las cookies resultantes son httpOnly → no accesibles por JavaScript.
 *  - SameSite=Lax → mitiga CSRF en requests cross-site.
 *  - Secure=true en producción → solo se envían por HTTPS.
 */

import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // getToken lee el JWT de NextAuth de la cookie (cifrado con NEXTAUTH_SECRET).
  // Devuelve el payload completo, incluyendo los campos que guardamos en el
  // callback `jwt` de ibm-verify-auth.ts.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Sin sesión NextAuth válida → redirigir al login.
  // Esto ocurre si el usuario accede directamente a esta URL sin autenticarse.
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Detectar error de intercambio de tokens (ej. backend no disponible).
  if (token.error === "IbmVerifyExchangeFailed" || !token.siprecomAccessToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", "ibm_verify_exchange_failed")
    return NextResponse.redirect(loginUrl)
  }

  // Redirigir al dashboard y setear las cookies de autenticación de Siprecom.
  // Usar NextResponse.redirect con cookies seteadas en la misma respuesta.
  const dashboardUrl = new URL("/dashboard", request.url)
  const response = NextResponse.redirect(dashboardUrl)

  const isProduction = process.env.NODE_ENV === "production"
  const cookieBase = {
    httpOnly: true,       // No accesible por JavaScript del cliente (mitiga XSS)
    secure: isProduction, // Solo HTTPS en producción
    sameSite: "lax" as const, // Protección CSRF: el cookie no se envía en requests cross-site de terceros
    path: "/",
  }

  // Cookie de access token — vida corta (1 hora), igual que el JWT de Siprecom.
  response.cookies.set("accessToken", token.siprecomAccessToken, {
    ...cookieBase,
    maxAge: 60 * 60, // 1 hora
  })

  // Cookie de refresh token — vida larga (15 días), igual que el refresh de Siprecom.
  if (token.siprecomRefreshToken) {
    response.cookies.set("refreshToken", token.siprecomRefreshToken, {
      ...cookieBase,
      maxAge: 60 * 60 * 24 * 15, // 15 días
    })
  }

  return response
}
