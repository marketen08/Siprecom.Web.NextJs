import crypto from "node:crypto"

/**
 * Federación OIDC con el IDP del cliente (YPF / IBM Verify), flujo Authorization
 * Code + PKCE con cliente confidencial.
 *
 * Este módulo es el BFF: el client secret vive acá y el canje del código ocurre
 * server-side. El browser nunca ve un token del IDP — solo la cookie de sesión de
 * SIPRECOM, igual que en el login con mail y contraseña.
 *
 * La validación de los tokens NO se hace acá: se delega a la API .NET
 * (POST /auth/ypf), que es la que tiene el JWKS y decide si el usuario entra.
 *
 * Ver Siprecom.Server.Api/Docs/federacion-de-usuarios-mails-ypf.txt
 */

export const YPF_AUTHORITY = (process.env.YPF_AUTHORITY ?? "").replace(/\/+$/, "")
export const YPF_CLIENT_ID = process.env.YPF_CLIENT_ID ?? ""

/**
 * YPF_CS y no YPF_CLIENT_SECRET: la policy del tenant Tepsi bloquea Application
 * Settings que tengan "Secret" (o Key/Password/Connection) en el nombre — el mismo
 * motivo por el que el backend usa ABS_CS. YPF_CLIENT_SECRET queda como fallback
 * para .env.local en desarrollo, donde esa policy no aplica.
 */
export const YPF_CLIENT_SECRET =
  process.env.YPF_CS ?? process.env.YPF_CLIENT_SECRET ?? ""

/** Scopes básicos de OIDC: YPF confirmó que los claims viajan en el id_token. */
export const YPF_SCOPE = process.env.YPF_SCOPE ?? "openid profile email"

/** Si falta cualquiera de los tres, el sitio no tiene federación (no es un error). */
export function ypfHabilitada(): boolean {
  return Boolean(YPF_AUTHORITY && YPF_CLIENT_ID && YPF_CLIENT_SECRET)
}

/**
 * Origen público de la app.
 *
 * En Railway (y detrás de cualquier proxy) el origin que Next deriva de la request
 * puede ser el interno del contenedor, no el que ve el usuario. Eso rompe dos cosas
 * distintas: el redirect_uri que mandamos al IDP —que tiene que coincidir EXACTO
 * con el registrado— y los redirects a /dashboard y /login, que terminarían
 * apuntando a un host que el browser no puede resolver.
 *
 * Por eso preferimos siempre la URL configurada y dejamos el origin de la request
 * como último recurso (sirve en desarrollo local, donde no hay proxy).
 */
export function origenPublico(origenRequest: string): string {
  const configurado = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL
  return (configurado || origenRequest).replace(/\/+$/, "")
}

/** Tiene que coincidir EXACTO con la URI registrada en el IDP. */
export function redirectUri(origenRequest: string): string {
  return (
    process.env.YPF_REDIRECT_URI ||
    `${origenPublico(origenRequest)}/api/auth/callback`
  )
}

export function postLogoutRedirectUri(origenRequest: string): string {
  return (
    process.env.YPF_POST_LOGOUT_REDIRECT_URI ||
    `${origenPublico(origenRequest)}/api/auth/logout/callback`
  )
}

// --- Discovery --------------------------------------------------------------

export interface OidcDiscovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
  token_endpoint_auth_methods_supported?: string[]
}

// Cache en memoria del proceso: el well-known cambia muy de vez en cuando y
// bajarlo en cada login agrega latencia y un punto de falla por request.
let cache: { doc: OidcDiscovery; expira: number } | null = null
const TTL_MS = 60 * 60 * 1000

export async function getDiscovery(): Promise<OidcDiscovery> {
  const ahora = Date.now()
  if (cache && cache.expira > ahora) return cache.doc

  const url = `${YPF_AUTHORITY}/.well-known/openid-configuration`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`No se pudo leer el well-known del IDP (${res.status}) en ${url}`)
  }
  const doc = (await res.json()) as OidcDiscovery
  cache = { doc, expira: ahora + TTL_MS }
  return doc
}

// --- PKCE y valores de un solo uso ------------------------------------------

const b64url = (b: Buffer) => b.toString("base64url")

/** 32 bytes → 43 chars base64url, dentro del rango que pide RFC 7636. */
export const nuevoCodeVerifier = () => b64url(crypto.randomBytes(32))

export const codeChallengeDe = (verifier: string) =>
  b64url(crypto.createHash("sha256").update(verifier).digest())

/** Para state y nonce. */
export const nuevoRandom = () => b64url(crypto.randomBytes(16))

// --- Cookies temporales del flujo -------------------------------------------

export const COOKIE_STATE = "ypf_state"
export const COOKIE_VERIFIER = "ypf_verifier"
export const COOKIE_NONCE = "ypf_nonce"

/**
 * sameSite "lax" es obligatorio acá: el callback llega como navegación top-level
 * desde el dominio del IDP. Con "strict" el browser no manda estas cookies y el
 * flujo falla siempre con INVALID_STATE.
 */
export const COOKIE_FLUJO = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 10 * 60,
}

export const COOKIE_BORRAR = { ...COOKIE_FLUJO, maxAge: 0 }

/**
 * Header o body para autenticar el cliente en el token endpoint. Preferimos
 * client_secret_basic si el IDP lo declara; si no, mandamos las credenciales en
 * el body. Elegirlo mal devuelve 401 sin más detalle, así que lo resolvemos con
 * lo que publica el well-known en vez de asumir.
 */
export function authDelCliente(disc: OidcDiscovery): {
  headers: Record<string, string>
  bodyExtra: Record<string, string>
} {
  const metodos = disc.token_endpoint_auth_methods_supported ?? []
  const usaBasic = metodos.includes("client_secret_basic")

  if (usaBasic) {
    const cred = Buffer.from(
      `${encodeURIComponent(YPF_CLIENT_ID)}:${encodeURIComponent(YPF_CLIENT_SECRET)}`
    ).toString("base64")
    return {
      headers: { Authorization: `Basic ${cred}` },
      bodyExtra: { client_id: YPF_CLIENT_ID },
    }
  }

  return {
    headers: {},
    bodyExtra: { client_id: YPF_CLIENT_ID, client_secret: YPF_CLIENT_SECRET },
  }
}
