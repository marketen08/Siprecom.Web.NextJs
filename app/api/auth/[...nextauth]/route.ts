/**
 * Route handler de NextAuth para IBM Security Verify.
 *
 * Esta ruta maneja TODOS los endpoints de NextAuth bajo /api/auth/*:
 *  - GET  /api/auth/signin/ibm-verify  → inicia el flujo OIDC (redirige a IBM Verify)
 *  - GET  /api/auth/callback/ibm-verify → procesa el callback con el code
 *  - GET  /api/auth/session             → devuelve la sesión actual
 *  - POST /api/auth/signout             → cierra la sesión de NextAuth
 *
 * El flujo OIDC completo (Authorization Code + PKCE) lo maneja NextAuth
 * automáticamente; solo debemos exportar el handler con nuestra configuración.
 */

import { authOptions } from "@/lib/ibm-verify-auth"
import NextAuth from "next-auth"

const handler = NextAuth(authOptions)

// NextAuth necesita manejar tanto GET (callbacks OAuth, session check)
// como POST (signout, CSRF token). Exportamos el mismo handler para ambos.
export { handler as GET, handler as POST }

