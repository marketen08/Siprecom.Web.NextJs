/**
 * Configuración de NextAuth.js para IBM Security Verify (OIDC).
 *
 * Flujo de autenticación completo:
 *  1. El usuario hace clic en "Iniciar sesión con IBM Verify" en la página de login.
 *  2. signIn('ibm-verify') redirige al endpoint OIDC de IBM Verify con:
 *     - response_type=code          (Authorization Code Flow)
 *     - code_challenge + method     (PKCE — previene interceptación del code)
 *     - state                       (previene CSRF en el callback)
 *     - nonce                       (previene replay attacks del id_token)
 *  3. El usuario se autentica en IBM Verify (puede incluir MFA, SSO, etc.).
 *  4. IBM Verify redirige a /api/auth/callback/ibm-verify con el code.
 *  5. NextAuth intercambia el code por tokens (id_token, access_token, refresh_token).
 *  6. El callback `jwt` llama al backend Siprecom (/auth/ibm-verify) con el id_token.
 *  7. El backend valida la firma del id_token con el JWKS de IBM Verify,
 *     provisiona el usuario y devuelve el JWT interno de Siprecom.
 *  8. Los tokens de Siprecom se guardan en el NextAuth JWT (cookie httpOnly cifrada).
 *  9. El usuario es redirigido a /api/auth/ibm-verify-finalize que transfiere
 *     los tokens al par de cookies accessToken / refreshToken que usa
 *     backend-fetch.ts (sin cambios en toda la infraestructura proxy existente).
 *
 * Ventajas de seguridad respecto al sistema anterior:
 *  - Sin contraseña gestionada por Siprecom: IBM Verify es el único que la conoce.
 *  - PKCE obligatorio: el code de autorización no sirve si es interceptado.
 *  - id_token firmado con RS256/ES256: el backend verifica la firma con clave
 *    pública descargada del JWKS — la clave privada nunca sale de IBM Verify.
 *  - MFA, políticas de acceso y ciclo de vida de usuarios en IBM Verify.
 */

import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

// URL del backend .NET (server-side, no se expone al cliente)
const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Intercambia el id_token de IBM Verify por el JWT interno de Siprecom.
 * Se llama desde el callback `jwt` de NextAuth (server-side).
 *
 * @param idToken  ID Token emitido por IBM Verify (JWT firmado RS256/ES256)
 * @returns Tokens de Siprecom { accessToken, refreshToken } o null si falla
 */
async function exchangeIbmVerifyToken(
  idToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/ibm-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ IdToken: idToken }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("[IbmVerify] Backend rechazó el id_token:", err)
      return null
    }

    return res.json()
  } catch (err) {
    console.error("[IbmVerify] Error al contactar el backend:", err)
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      // Proveedor OIDC genérico de NextAuth apuntado a IBM Security Verify.
      // NextAuth descarga automáticamente el discovery document desde
      // <issuer>/.well-known/openid-configuration para obtener los endpoints
      // de autorización, token, userinfo y JWKS.
      id: "ibm-verify",
      name: "IBM Verify",
      type: "oauth",
      // issuer: URL base del tenant de IBM Verify.
      // Debe coincidir con el campo "iss" del id_token.
      issuer: process.env.IBM_VERIFY_ISSUER,
      // wellKnown: URL del discovery document. Se construye automáticamente
      // como <issuer>/.well-known/openid-configuration si no se especifica.
      wellKnown: process.env.IBM_VERIFY_ISSUER
        ? `${process.env.IBM_VERIFY_ISSUER}/.well-known/openid-configuration`
        : undefined,
      clientId: process.env.IBM_VERIFY_CLIENT_ID,
      clientSecret: process.env.IBM_VERIFY_CLIENT_SECRET,
      // Authorization Code Flow con PKCE habilitado (idPKCE: true en NextAuth v4).
      // PKCE agrega un code_verifier generado localmente; si el code es
      // interceptado en tránsito, el atacante no puede intercambiarlo sin el verifier.
      authorization: {
        params: {
          scope: "openid profile email",
          // response_type: "code" es el valor por defecto en NextAuth
        },
      },
      // idToken: true le indica a NextAuth que este proveedor devuelve un id_token
      // que debe ser extraído y validado (no solo el access_token).
      idToken: true,
      checks: ["pkce", "state", "nonce"],
      profile(profile) {
        // Mapear el perfil de IBM Verify al formato que espera NextAuth.
        // El campo `id` debe ser único por usuario — usamos `sub` (OIDC subject).
        return {
          id: profile.sub as string,
          name: profile.name ?? `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim(),
          email: profile.email as string,
          image: profile.picture as string | undefined,
        }
      },
    },
  ],

  // Usamos JWT sessions (stateless) para no requerir una base de datos de sesiones.
  // El JWT de NextAuth se almacena en una cookie httpOnly cifrada con NEXTAUTH_SECRET.
  session: {
    strategy: "jwt",
    // Vida máxima de la sesión NextAuth. Debe ser >= al refreshToken de Siprecom.
    maxAge: 60 * 60 * 24 * 15, // 15 días
  },

  callbacks: {
    /**
     * Callback JWT — se ejecuta server-side en cada operación de sesión.
     *
     * En el PRIMER sign-in (account !== null), intercambiamos el id_token de
     * IBM Verify por los tokens internos de Siprecom y los almacenamos en el
     * NextAuth JWT (que viaja cifrado en la cookie httpOnly).
     *
     * En requests posteriores (account === null), solo devolvemos el token
     * existente (o refrescamos si está por expirar — TODO futuro).
     */
    async jwt({ token, account }): Promise<JWT> {
      if (account?.provider === "ibm-verify" && account.id_token) {
        // Primer sign-in: intercambiar id_token de IBM Verify por JWT de Siprecom.
        // Este intercambio valida la firma del id_token en el backend (JWKS).
        const siprecomTokens = await exchangeIbmVerifyToken(account.id_token)

        if (siprecomTokens) {
          // Guardamos los tokens de Siprecom en el JWT de NextAuth.
          // La cookie de NextAuth está cifrada con NEXTAUTH_SECRET (AES-GCM)
          // y marcada httpOnly + Secure → no accesible desde JS del cliente.
          ;(token as any).siprecomAccessToken = siprecomTokens.accessToken
          ;(token as any).siprecomRefreshToken = siprecomTokens.refreshToken
        } else {
          // El intercambio falló: marcar el token como inválido para que
          // el usuario sea redirigido al login en lugar de acceder sin tokens.
          ;(token as any).error = "IbmVerifyExchangeFailed"
        }
      }

      return token
    },

    /**
     * Callback session — construye el objeto `session` que consume el cliente.
     * Solo exponemos lo mínimo necesario (email, name, imagen de perfil).
     * Los tokens de Siprecom NO se exponen en la sesión del cliente — solo
     * se usan server-side en /api/auth/ibm-verify-finalize.
     */
    async session({ session, token }) {
      // Propagar el error si el intercambio de tokens falló
      if ((token as any).error) {
        ;(session as any).error = (token as any).error
      }
      return session
    },

    /**
     * Callback signIn — permite o bloquea el sign-in.
     * Rechazamos sign-ins donde el intercambio de tokens falló para
     * evitar que el usuario quede en un estado de sesión inválido.
     */
    async signIn({ user: _user, account }) {
      if (account?.provider === "ibm-verify") {
        // Si no hay id_token, IBM Verify no devolvió un token válido.
        if (!account.id_token) {
          return false
        }
      }
      return true
    },
  },

  // Páginas personalizadas de NextAuth.
  // Al usar /login como página de sign-in, NextAuth redirige ahí en lugar
  // de mostrar su UI genérica cuando se requiere autenticación.
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // NEXTAUTH_SECRET: clave para cifrar la cookie de sesión de NextAuth.
  // DEBE ser un string aleatorio de ≥ 32 bytes y estar en las variables de entorno.
  // Generarlo con: openssl rand -base64 32
  secret: process.env.NEXTAUTH_SECRET,
}
