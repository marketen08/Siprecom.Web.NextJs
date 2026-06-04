import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/aps/exchange  Body: { code, state }
// Lo llama la página /aps/callback de Next después de recibir el redirect de Autodesk.
export async function POST(request: NextRequest) {
  const body = await request.text()
  const res = await backendFetch(request, "/aps/exchange", {
    method: "POST",
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
