import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Gate de sesión server-side. Cierra el hallazgo #2 del pentest de Personal
 * Tech (jul-2026).
 *
 * La versión anterior protegía una LISTA BLANCA de tres rutas:
 *
 *     const protectedRoutes = ["/dashboard", "/admin", "/profile"]
 *
 * Venía del scaffold y nunca se actualizó. Dos de esas rutas ni siquiera
 * existen, y la aplicación creció hacia /alcance, /configuracion, /ejecucion,
 * /calidad, /administracion y demás — ninguna cubierta. En los hechos el único
 * control sobre esas páginas era el RouteGuard del cliente.
 *
 * Ahora es al revés: todo exige sesión salvo lo que esté en PUBLICAS. Una ruta
 * nueva nace protegida, que es como tiene que ser: olvidarse de sumarla a una
 * lista no puede costar una exposición.
 *
 * Qué NO es: esto no reemplaza la autorización. Sólo constata que haya cookie de
 * sesión; no valida la firma del JWT, porque la clave vive en la API y el BFF no
 * la tiene. Quien decide sobre los datos sigue siendo la API con [Authorize], y
 * el rol lo sigue mirando RouteGuard. Acá se evita entregarle la cáscara de la
 * página a un anónimo.
 */

/** Único conjunto de rutas que funciona sin sesión. */
const PUBLICAS = [
  "/login",
  "/recuperar-contrasena",
  "/establecer-contrasena",
  "/auth-callback",
]

const CACHE_PRIVADA = "private, no-store, max-age=0, must-revalidate"

const esPublica = (pathname: string) =>
  PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const publica = esPublica(pathname)

  // Alcanza con el refreshToken. El accessToken dura 1 hora y el cliente lo
  // renueva solo cuando la API devuelve 401; exigirlo acá mandaría al login a un
  // usuario con sesión válida cada vez que se le vence.
  const haySesion =
    Boolean(request.cookies.get("refreshToken")?.value) ||
    Boolean(request.cookies.get("accessToken")?.value)

  if (!publica && !haySesion) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Con sesión activa, el login no tiene nada que ofrecer. Se mantiene el
  // comportamiento anterior, y sólo para /login: las pantallas de contraseña se
  // abren desde un mail y tienen que seguir funcionando con sesión abierta.
  if (haySesion && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  const res = NextResponse.next()

  // La otra mitad del hallazgo. Sin esto el CDN guarda la respuesta y la sirve
  // sin que la request llegue hasta acá, con lo cual el gate de arriba no se
  // entera. La causa raíz que identificó el evaluador es justamente la
  // combinación de prerenderizado con caché de larga duración.
  if (!publica) res.headers.set("Cache-Control", CACHE_PRIVADA)

  return res
}

export const config = {
  /**
   * Se excluyen:
   *   api          los proxies del BFF ya responden 401 por su cuenta. Un
   *                redirect acá le devolvería HTML a un fetch() que espera JSON
   *                y rompería el manejo de 401 del api-client.
   *   _next        artefactos del build y optimización de imágenes.
   *   archivos     cualquier path con extensión (favicon, imágenes, fuentes).
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
