import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/pdf/bulk
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/planillas/pdf/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/zip",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="Planillas_Bulk.zip"`,
    },
  })
}
