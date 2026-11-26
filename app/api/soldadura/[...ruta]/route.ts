import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/**
 * Proxy del módulo de Calidad de Soldadura: `/api/soldadura/<ruta>` → backend
 * `/soldadura/<ruta>`, con el mismo `backendFetch` que el resto (token, refresh,
 * sesión reemplazada).
 *
 * Es un comodín y no una ruta por endpoint porque el módulo tiene más de veinte y
 * todos se reenvían igual. Queda acotado a `/soldadura`: no abre ninguna otra parte
 * del backend.
 *
 * Tres formas de cuerpo:
 *   • JSON, para el ABM.
 *   • multipart, para el PDF de cada registro y el Excel de importación: se reenvía
 *     el FormData tal cual y fetch arma el boundary.
 *   • binario de vuelta, para la plantilla .xlsx: se devuelve el stream con sus
 *     cabeceras en vez de intentar parsearlo como JSON.
 */
type Ctx = RouteContext<"/api/soldadura/[...ruta]">

async function reenviar(request: NextRequest, context: Ctx, method: string) {
  const { ruta } = await context.params
  const path = `/soldadura/${ruta.map(encodeURIComponent).join("/")}${request.nextUrl.search}`

  const init: RequestInit = { method }
  if (method !== "GET" && method !== "DELETE") {
    const ct = request.headers.get("content-type") ?? ""
    if (ct.includes("multipart/form-data")) init.body = await request.formData()
    else {
      const texto = await request.text()
      if (texto) init.body = texto
    }
  }

  const res = await backendFetch(request, path, init)
  const tipo = res.headers.get("content-type") ?? ""

  if (tipo.includes("application/json") || tipo.includes("problem+json")) {
    const data = await res.json()
    return Response.json(data, { status: res.status })
  }
  if (res.status === 204 || res.status === 401 || res.status === 403 || res.status === 404) {
    const texto = await res.text()
    return Response.json({ message: texto || res.statusText }, { status: res.status })
  }

  const headers = new Headers()
  headers.set("Content-Type", tipo || "application/octet-stream")
  const disposicion = res.headers.get("content-disposition")
  if (disposicion) headers.set("Content-Disposition", disposicion)
  return new Response(res.body, { status: res.status, headers })
}

export const GET = (r: NextRequest, c: Ctx) => reenviar(r, c, "GET")
export const POST = (r: NextRequest, c: Ctx) => reenviar(r, c, "POST")
export const PUT = (r: NextRequest, c: Ctx) => reenviar(r, c, "PUT")
export const DELETE = (r: NextRequest, c: Ctx) => reenviar(r, c, "DELETE")
