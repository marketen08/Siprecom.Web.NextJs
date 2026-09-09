import { NextRequest, NextResponse } from "next/server"
import type { BackendAuthResponse } from "@/types/auth"
import {
  COOKIE_BORRAR,
  COOKIE_NONCE,
  COOKIE_STATE,
  COOKIE_VERIFIER,
  authDelCliente,
  getDiscovery,
  redirectUri,
  ypfHabilitada,
} from "@/lib/ypf-oidc"

export const dynamic = "force-dynamic"

const API_URL = process.env.API_URL

/** Destino después de un login exitoso. */
const DESTINO_OK = "/dashboard"

/**
 * Mismas opciones que usa el login con mail y contraseña (app/api/auth/login).
 * El path "/" importa: sin él la cookie queda scopeada a /api/auth y el resto de
 * la app no la ve.
 */
const COOKIE_SESION = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

function volverAlLogin(request: NextRequest, code: string) {
  const url = new URL("/login", request.nextUrl.origin)
  url.searchParams.set("error", code)
  const res = NextResponse.redirect(url)
  // Las cookies del flujo son de un solo uso: si algo falló, que no queden dando
  // vueltas para un intento posterior.
  res.cookies.set(COOKIE_STATE, "", COOKIE_BORRAR)
  res.cookies.set(COOKIE_NONCE, "", COOKIE_BORRAR)
  res.cookies.set(COOKIE_VERIFIER, "", COOKIE_BORRAR)
  return res
}

/**
 * GET /api/auth/callback — vuelta del IDP con el authorization code.
 *
 * Canjea el code por tokens (server-side, con el client secret y el code_verifier
 * de PKCE), se los pasa a la API para que los valide y emita la sesión de
 * SIPRECOM, y deja las mismas cookies que el login local.
 *
 * Los tokens del IDP mueren acá: no se guardan ni se mandan al browser. La sesión
 * de SIPRECOM es independiente de la vigencia del access token de YPF (300s).
 */
export async function GET(request: NextRequest) {
  if (!ypfHabilitada()) return volverAlLogin(request, "FEDERATION_NOT_CONFIGURED")

  const params = request.nextUrl.searchParams

  // El IDP puede volver con error en vez de code (ej: el usuario canceló).
  const errorIdp = params.get("error")
  if (errorIdp) {
    console.warn("[ypf-callback] el IDP devolvió error:", errorIdp, params.get("error_description"))
    return volverAlLogin(request, "IDP_ERROR")
  }

  const code = params.get("code")
  const state = params.get("state")
  const stateCookie = request.cookies.get(COOKIE_STATE)?.value
  const verifier = request.cookies.get(COOKIE_VERIFIER)?.value
  const nonce = request.cookies.get(COOKIE_NONCE)?.value

  // State: que la respuesta corresponda a una request que arrancó ESTE browser.
  // Si las cookies no llegaron, casi siempre es sameSite o que el usuario tardó
  // más que el maxAge de 10 minutos.
  if (!code || !state || !stateCookie || state !== stateCookie || !verifier) {
    console.warn("[ypf-callback] state/verifier inválido o ausente.")
    return volverAlLogin(request, "INVALID_STATE")
  }

  let disc
  try {
    disc = await getDiscovery()
  } catch (e) {
    console.error("[ypf-callback] no se pudo leer el well-known:", e)
    return volverAlLogin(request, "IDP_UNREACHABLE")
  }

  // --- Canje del code ------------------------------------------------------
  const { headers, bodyExtra } = authDelCliente(disc)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(request.nextUrl.origin),
    code_verifier: verifier,
    ...bodyExtra,
  })

  let tokens: { id_token?: string; access_token?: string }
  try {
    const tokenRes = await fetch(disc.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      body,
      cache: "no-store",
    })

    if (!tokenRes.ok) {
      // El cuerpo trae el motivo real (invalid_client, invalid_grant, ...) y es
      // lo primero que hay que mirar cuando el login falla en el ambiente nuevo.
      const detalle = await tokenRes.text().catch(() => "")
      console.error("[ypf-callback] token endpoint", tokenRes.status, detalle)
      return volverAlLogin(request, "TOKEN_EXCHANGE_FAILED")
    }
    tokens = await tokenRes.json()
  } catch (e) {
    console.error("[ypf-callback] error de red contra el token endpoint:", e)
    return volverAlLogin(request, "IDP_UNREACHABLE")
  }

  if (!tokens.id_token || !tokens.access_token) {
    console.error("[ypf-callback] el IDP no devolvió id_token y/o access_token.")
    return volverAlLogin(request, "TOKEN_EXCHANGE_FAILED")
  }

  // --- Validación y sesión de SIPRECOM -------------------------------------
  let backendRes: Response
  try {
    backendRes = await fetch(`${API_URL}/auth/ypf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: tokens.id_token,
        accessToken: tokens.access_token,
        nonce,
      }),
      cache: "no-store",
    })
  } catch (e) {
    console.error("[ypf-callback] no se pudo contactar a la API:", e)
    return volverAlLogin(request, "API_UNREACHABLE")
  }

  if (!backendRes.ok) {
    const err = await backendRes.json().catch(() => ({}) as { code?: string })
    // Los codes vienen de la API: ACCESS_NOT_PROVISIONED, NOT_IN_ALLOWED_GROUP,
    // WRONG_LOGIN_METHOD, INVALID_ID_TOKEN... La pantalla de login decide qué
    // mensaje mostrar según cuál sea.
    const code = (err as { code?: string }).code ?? "LOGIN_FAILED"
    console.warn("[ypf-callback] la API rechazó el login:", backendRes.status, code)
    return volverAlLogin(request, code)
  }

  const data: BackendAuthResponse = await backendRes.json()

  const response = NextResponse.redirect(new URL(DESTINO_OK, request.nextUrl.origin))
  response.cookies.set("accessToken", data.accessToken, {
    ...COOKIE_SESION,
    maxAge: 60 * 60, // 1 hora
  })
  response.cookies.set("refreshToken", data.refreshToken, {
    ...COOKIE_SESION,
    maxAge: 60 * 60 * 24 * 15, // 15 días
  })
  response.cookies.set(COOKIE_STATE, "", COOKIE_BORRAR)
  response.cookies.set(COOKIE_NONCE, "", COOKIE_BORRAR)
  response.cookies.set(COOKIE_VERIFIER, "", COOKIE_BORRAR)
  return response
}
