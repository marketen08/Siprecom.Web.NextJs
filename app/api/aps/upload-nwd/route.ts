import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/aps/upload-nwd (multipart/form-data)
// Patrón formData = backend re-serializa multipart con boundary nuevo. Mismo
// approach que el upload de IFC existente.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, "/aps/upload-nwd", {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error al subir NWD" }))
  return Response.json(data, { status: res.status })
}
