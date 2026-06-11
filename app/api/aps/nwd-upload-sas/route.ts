import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/aps/nwd-upload-sas (application/json)
// Proxy a /aps/nwd-upload-sas del backend. Request/response chicas — solo metadata,
// el binario NO pasa por acá (el browser lo sube directo al blob con la SAS).
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/aps/nwd-upload-sas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: "Error generando URL de subida" }))
  return Response.json(data, { status: res.status })
}
