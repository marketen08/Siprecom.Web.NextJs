import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/proyectos/[id]/ifc  (multipart/form-data, campos: nombre, disciplina, archivo)
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc">,
) {
  const { id } = await context.params
  const formData = await request.formData()
  const res = await backendFetch(request, `/proyectos/${id}/ifc`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error al cargar el archivo" }))
  return Response.json(data, { status: res.status })
}
