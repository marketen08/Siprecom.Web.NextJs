import type { NextRequest } from "next/server"

/**
 * Consume 1 llamada de IA del usuario logueado (pega a POST /ia/consumir del
 * backend). Debe llamarse ANTES de gastar tokens con Anthropic.
 *
 * Retorna:
 *  - `{ ok: true, restante }` si hay saldo → seguir.
 *  - `{ ok: false, status, message }` si excedió (429), está apagado (403) o
 *    no está autenticado (401) → la route debe devolver ese status al front
 *    con el mensaje para que el sheet lo muestre y no pegue a Anthropic.
 */
export async function consumirIA(
  request: NextRequest,
): Promise<
  | { ok: true; restante: number | null }
  | { ok: false; status: number; message: string }
> {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) {
    return { ok: false, status: 401, message: "No autenticado." }
  }

  const backendUrl = process.env.API_URL
  if (!backendUrl) {
    return { ok: false, status: 500, message: "API_URL no configurada." }
  }

  const res = await fetch(`${backendUrl}/ia/consumir`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as { restante?: number | null }
    return { ok: true, restante: body.restante ?? null }
  }

  // 429 / 403 / 401 / etc. — devolvemos tal cual para propagar.
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  return {
    ok: false,
    status: res.status,
    message: body.message ?? "No se pudo verificar el uso de IA.",
  }
}
