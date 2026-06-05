import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/aps/crear-proyecto-desde-nwd (multipart/form-data)
// Proxy a /aps/crear-proyecto-desde-nwd del backend .NET.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, "/aps/crear-proyecto-desde-nwd", {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error creando proyecto desde NWD" }))
  return Response.json(data, { status: res.status })
}
