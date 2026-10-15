import { NextRequest, NextResponse } from "next/server"
import {
  COOKIE_FLUJO,
  COOKIE_NONCE,
  COOKIE_STATE,
  COOKIE_VERIFIER,
  YPF_CLIENT_ID,
  YPF_SCOPE,
  codeChallengeDe,
  getDiscovery,
  nuevoCodeVerifier,
  nuevoRandom,
  origenPublico,
  redirectUri,
  ypfHabilitada,
} from "@/lib/ypf-oidc"

export const dynamic = "force-dynamic"

/**
 * GET /api/auth/ypf/login — arranca el login federado.
 *
 * Genera state (anti-CSRF del callback), nonce (liga el id_token a esta request)
 * y el code_verifier de PKCE; los guarda en cookies httpOnly y manda al usuario
 * al authorize endpoint del IDP.
 *
 * Los tres valores viajan en cookies y no en la URL: el callback los necesita
 * para verificar que la respuesta corresponde a este mismo browser.
 */
export async function GET(request: NextRequest) {
  // Esta ruta se alcanza por navegación del browser, así que un JSON de error se
  // vería como texto crudo en pantalla. Volvemos al login con el code y que ahí se
  // muestre el mensaje. No debería pasar (el botón no se dibuja si falta config),
  // pero alguien puede llegar por un link viejo o escribiendo la URL.
  if (!ypfHabilitada()) {
    return NextResponse.redirect(
      new URL(
        "/login?error=FEDERATION_NOT_CONFIGURED",
        origenPublico(request.nextUrl.origin)
      )
    )
  }

  let disc
  try {
    disc = await getDiscovery()
  } catch (e) {
    console.error("[ypf-login] no se pudo leer el well-known:", e)
    return NextResponse.redirect(
      new URL("/login?error=IDP_UNREACHABLE", origenPublico(request.nextUrl.origin))
    )
  }

  const state = nuevoRandom()
  const nonce = nuevoRandom()
  const verifier = nuevoCodeVerifier()

  const authorize = new URL(disc.authorization_endpoint)
  authorize.searchParams.set("response_type", "code")
  authorize.searchParams.set("client_id", YPF_CLIENT_ID)
  authorize.searchParams.set("redirect_uri", redirectUri(request.nextUrl.origin))
  authorize.searchParams.set("scope", YPF_SCOPE)
  authorize.searchParams.set("state", state)
  authorize.searchParams.set("nonce", nonce)
  authorize.searchParams.set("code_challenge", codeChallengeDe(verifier))
  authorize.searchParams.set("code_challenge_method", "S256")

  const response = NextResponse.redirect(authorize)
  response.cookies.set(COOKIE_STATE, state, COOKIE_FLUJO)
  response.cookies.set(COOKIE_NONCE, nonce, COOKIE_FLUJO)
  response.cookies.set(COOKIE_VERIFIER, verifier, COOKIE_FLUJO)
  return response
}
