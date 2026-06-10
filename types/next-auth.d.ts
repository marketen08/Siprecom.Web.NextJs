/**
 * Augmentaciones de tipos para NextAuth.
 *
 * NextAuth almacena información adicional en la sesión y en el JWT server-side.
 * Estas declaraciones de módulo permiten acceder a esas propiedades de forma
 * tipada en los callbacks y en el código de la aplicación.
 */

import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    /**
     * Error propagado desde el callback `jwt` si el intercambio de tokens
     * con el backend falló (ej. "IbmVerifyExchangeFailed").
     * Si está presente, la sesión NO tiene tokens válidos de Siprecom.
     */
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /**
     * Access token emitido por el backend Siprecom (JWT firmado con HMAC-SHA256).
     * Se almacena en la cookie de NextAuth (cifrada, httpOnly).
     * Se transfiere a la cookie `accessToken` en /api/auth/ibm-verify-finalize.
     */
    siprecomAccessToken?: string

    /**
     * Refresh token emitido por el backend Siprecom.
     * Se transfiere a la cookie `refreshToken` en /api/auth/ibm-verify-finalize.
     */
    siprecomRefreshToken?: string

    /** Error de intercambio de tokens para detectar sesiones inválidas */
    error?: string
  }
}
