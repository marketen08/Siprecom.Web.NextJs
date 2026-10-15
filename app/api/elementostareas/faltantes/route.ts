import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementostareas/faltantes → proxy al backend, propaga query params.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.toString()
  const res = await backendFetch(
    request,
    `/elementos-tareas/faltantes${query ? `?${query}` : ""}`,
  )
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
