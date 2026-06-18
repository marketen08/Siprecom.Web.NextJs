import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/concurrencia/pdf → PDF del reporte de concurrencia
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/concurrencia/pdf")
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="concurrencia.pdf"`,
    },
  })
}
