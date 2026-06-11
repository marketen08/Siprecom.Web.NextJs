import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/aps/crear-proyecto-desde-nwd-staged (application/json)
// Proxy a /aps/crear-proyecto-desde-nwd-staged. El NWD ya fue subido al blob via
// SAS — acá solo viaja la metadata + la referencia (archivoId/blobName).
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/aps/crear-proyecto-desde-nwd-staged", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: "Error creando proyecto desde NWD" }))
  return Response.json(data, { status: res.status })
}
