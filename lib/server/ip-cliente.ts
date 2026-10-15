import type { NextRequest } from "next/server"

/**
 * Reenvía al backend la IP real del usuario.
 *
 * La API particiona su rate limiter de autenticación por IP de origen, pero el
 * navegador nunca le habla directo: todo pasa por este BFF. Sin este header,
 * todas las requests web le llegan con la misma IP —la del servidor Next— y los
 * 10 por minuto se vuelven un único balde para la plataforma entera, que
 * cualquiera puede agotar para dejar sin login a todo el mundo.
 *
 * Sólo hace falta en las rutas que pegan contra endpoints limitados: login,
 * refresh, los tres federados, y forgot/reset password.
 *
 * El valor sale del X-Forwarded-For que arma el proxy del hosting. Si no está
 * (desarrollo local), no se manda nada y la API cae a su RemoteIpAddress.
 */
export function headersIpCliente(request: NextRequest): Record<string, string> {
  const ip = ipCliente(request)
  return ip ? { "X-Forwarded-For": ip } : {}
}

/** La IP del cliente según el proxy del hosting, o null si no vino. */
export function ipCliente(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) {
    // "cliente, proxy1, proxy2" — el primero es el cliente original.
    const primera = fwd.split(",")[0]?.trim()
    if (primera) return primera
  }

  // Algunos proxies usan este en vez del estándar.
  const real = request.headers.get("x-real-ip")?.trim()
  return real || null
}
