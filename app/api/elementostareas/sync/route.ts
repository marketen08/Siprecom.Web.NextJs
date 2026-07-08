import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/sync — reconciliación masiva de ElementoTareas.
export async function POST(request: NextRequest) {
  const res = await backendFetch(request, "/elementostareas/sync", {
    method: "POST",
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
