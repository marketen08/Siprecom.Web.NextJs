import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pid-archivos — lista los PIDs del proyecto del usuario.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, `/pid-archivos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/pid-archivos  (multipart/form-data: codigo, nombre, descripcion, subSistemaIds[], archivo)
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, `/pid-archivos`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error al subir el PID" }))
  return Response.json(data, { status: res.status })
}
