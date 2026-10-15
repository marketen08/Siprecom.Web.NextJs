import { NextRequest, NextResponse } from "next/server"
import {
  YPF_CLIENT_ID,
  COOKIE_SESION_YPF,
  getDiscovery,
  postLogoutRedirectUri,
  ypfHabilitada,
} from "@/lib/ypf-oidc"

// Para borrar una cookie hay que matchear el path con el que se seteó ("/" en el
// login). Si se borra sin path, el Set-Cookie toma el default-path del request
// (/api/auth) y NO elimina la cookie real (path "/"): queda viva y al volver a "/"
// te redirige a /dashboard como si siguieras logueado.
const EXPIRE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
}

export async function POST(request: NextRequest) {
  // En los sitios federados no alcanza con borrar nuestras cookies: si no se
  // cierra también la sesión del IDP, el próximo "Ingresar con YPF" vuelve a
  // entrar sin pedir credenciales (single sign-on sigue activo).
  //
  // Devolvemos la URL en vez de redirigir porque este endpoint se llama por fetch
  // desde el cliente: el navegador tiene que ir al IDP con una navegación real.
  // El cliente que no la use sigue funcionando igual — solo queda la sesión del
  // IDP abierta.
  // Solo si ESTA sesión entró por el IDP. Antes alcanzaba con que el sitio tuviera
  // la federación habilitada, así que un usuario de mail y contraseña también
  // terminaba rebotando por el end_session de YPF — donde no tiene ninguna sesión
  // que cerrar.
  const vinoPorYpf = request.cookies.get(COOKIE_SESION_YPF)?.value === "1"

  let logoutUrl: string | null = null
  if (vinoPorYpf && ypfHabilitada()) {
    try {
      const disc = await getDiscovery()
      if (disc.end_session_endpoint) {
        const url = new URL(disc.end_session_endpoint)
        url.searchParams.set("client_id", YPF_CLIENT_ID)
        url.searchParams.set(
          "post_logout_redirect_uri",
          postLogoutRedirectUri(request.nextUrl.origin)
        )
        logoutUrl = url.toString()
      }
    } catch (e) {
      // Que no se pueda cerrar la sesión federada no puede impedir el logout
      // local: seguimos y borramos igual.
      console.error("[logout] no se pudo armar el logout federado:", e)
    }
  }

  const response = NextResponse.json({ ok: true, logoutUrl })
  response.cookies.set("accessToken", "", EXPIRE_COOKIE)
  response.cookies.set("refreshToken", "", EXPIRE_COOKIE)
  response.cookies.set(COOKIE_SESION_YPF, "", EXPIRE_COOKIE)
  return response
}
