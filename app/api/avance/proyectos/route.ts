import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/proyectos?estado=&page=&pageSize= — avance resumen de los
// proyectos accesibles.
//
// El query string se reenvía: sin esto el filtro por estado y la paginación no
// llegaban al backend y la pantalla pedía los 149 proyectos en cada carga.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/avance/proyectos${search}`)
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
