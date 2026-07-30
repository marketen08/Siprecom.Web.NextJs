import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/coordinacion/counts → conteos por bucket para los chips.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const res = await backendFetch(request, "/elementos-tareas/coordinacion/counts", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
