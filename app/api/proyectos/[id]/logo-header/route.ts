import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/logo-header — multipart, sube el logo combinado del proyecto.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const fd = await request.formData()
  const res = await backendFetch(request, `/proyectos/${id}/logo-header`, {
    method: "POST",
    body: fd,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/proyectos/[id]/logo-header — desconfigura, PDF cae al fallback.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/logo-header`, { method: "DELETE" })
  const data = await res.json().catch(() => ({ message: "OK" }))
  return Response.json(data, { status: res.status })
}
