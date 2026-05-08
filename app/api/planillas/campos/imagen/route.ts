import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/campos/imagen — upload de imagen al storage para uso en campos tipo Imagen.
// Espera multipart/form-data con campo `archivo`. Devuelve { data: { url } }.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, "/planillas/campos/imagen", {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
